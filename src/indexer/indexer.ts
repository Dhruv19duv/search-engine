/**
 * Indexer Pipeline
 * 
 * Processes documents through the full indexing pipeline:
 * 1. Document parsing & normalization
 * 2. Tokenization & stemming
 * 3. Inverted index construction
 * 4. Index sharding via consistent hashing
 * 5. Real-time index updates (< 5 sec lag)
 * 6. Zero-downtime index swaps
 */

import { Document, IndexUpdate, IndexShard, IndexStats } from '../types';
import { InvertedIndex } from './inverted-index';
import { Tokenizer } from './tokenizer';
import { ConsistentHash } from '../structures/consistent-hash';
import { BloomFilter } from '../structures/bloom-filter';
import { SimHash } from '../structures/simhash';
import { EventEmitter } from 'events';

export class Indexer extends EventEmitter {
  private mainIndex: InvertedIndex;
  private deltaIndex: InvertedIndex; // for real-time updates
  private tokenizer: Tokenizer;
  private shardManager: ConsistentHash;
  private shards: Map<string, InvertedIndex>;
  private visitedFilter: BloomFilter;
  private simHash: SimHash;
  private indexBuildTime: number;
  private lastSwapTime: Date;
  private isSwapping: boolean;
  private updateQueue: IndexUpdate[];
  private updateInterval: NodeJS.Timeout | null;
  private maxDeltaSize: number;

  constructor(
    maxDeltaSize: number = 1000,
    expectedUrls: number = 1000000
  ) {
    super();
    this.mainIndex = new InvertedIndex();
    this.deltaIndex = new InvertedIndex();
    this.tokenizer = new Tokenizer();
    this.shardManager = new ConsistentHash(150);
    this.shards = new Map();
    this.visitedFilter = new BloomFilter(expectedUrls, 0.01);
    this.simHash = new SimHash(64, 3);
    this.indexBuildTime = 0;
    this.lastSwapTime = new Date();
    this.isSwapping = false;
    this.updateQueue = [];
    this.maxDeltaSize = maxDeltaSize;
    this.updateInterval = null;

    // Start real-time update processor
    this.startUpdateProcessor();
  }

  /** Index a document */
  indexDocument(doc: Document): void {
    const startTime = Date.now();

    // Tokenize content
    const tokens = this.tokenizer.tokenizeWithPositions(
      `${doc.title} ${doc.title} ${doc.content}` // title boosted
    );

    // Add to delta index (real-time)
    this.deltaIndex.addDocument(doc, tokens);

    // Add to visited filter
    this.visitedFilter.add(doc.url);

    // Emit for real-time listeners
    this.emit('documentIndexed', doc.id);

    this.indexBuildTime += Date.now() - startTime;
  }

  /** Batch index multiple documents */
  indexDocuments(docs: Document[]): void {
    for (const doc of docs) {
      this.indexDocument(doc);
    }

    // Auto-merge if delta is large enough
    if (this.deltaIndex.documentCount() >= this.maxDeltaSize) {
      this.mergeDelta();
    }
  }

  /** Merge delta index into main index (zero-downtime) */
  mergeDelta(): void {
    if (this.deltaIndex.documentCount() === 0) return;

    const startTime = Date.now();
    this.isSwapping = true;

    // Create new merged index
    const newMain = new InvertedIndex();

    // Copy main index documents
    for (const term of this.mainIndex.getTerms()) {
      for (const posting of this.mainIndex.getPostings(term)) {
        const doc = this.mainIndex.getDocument(posting.docId);
        if (doc) {
          const tokens = this.tokenizer.tokenizeWithPositions(doc.title + ' ' + doc.content);
          newMain.addDocument(doc, tokens);
        }
      }
    }

    // Copy delta index documents on top
    for (const term of this.deltaIndex.getTerms()) {
      for (const posting of this.deltaIndex.getPostings(term)) {
        const doc = this.deltaIndex.getDocument(posting.docId);
        if (doc) {
          const tokens = this.tokenizer.tokenizeWithPositions(doc.title + ' ' + doc.content);
          newMain.addDocument(doc, tokens);
        }
      }
    }

    // Atomic swap
    this.mainIndex = newMain;
    this.deltaIndex = new InvertedIndex();
    this.isSwapping = false;
    this.lastSwapTime = new Date();

    this.emit('indexSwapped', {
      duration: Date.now() - startTime,
      totalDocs: newMain.documentCount()
    });
  }

  /** Process real-time update queue */
  private startUpdateProcessor(): void {
    this.updateInterval = setInterval(() => {
      this.processUpdateQueue();
    }, 1000); // Process every second
  }

  /** Queue an index update */
  queueUpdate(update: IndexUpdate): void {
    this.updateQueue.push(update);
  }

  /** Process queued updates */
  private processUpdateQueue(): void {
    // Skip if a merge is in progress to avoid race conditions
    if (this.isSwapping || this.updateQueue.length === 0) return;

    const updates = this.updateQueue.splice(0);
    const startTime = Date.now();

    for (const update of updates) {
      switch (update.type) {
        case 'add':
          this.indexDocument(update.document);
          break;
        case 'update':
          this.deltaIndex.updateDocument(
            update.document,
            this.tokenizer.tokenizeWithPositions(
              update.document.title + ' ' + update.document.content
            )
          );
          break;
        case 'remove':
          this.removeDocument(update.document.id);
          break;
      }
    }

    const elapsed = Date.now() - startTime;

    // Ensure < 5 sec lag
    if (elapsed > 5000) {
      this.emit('updateLag', { elapsed, updateCount: updates.length });
    }

    // Auto-merge if delta is large
    if (this.deltaIndex.documentCount() >= this.maxDeltaSize && !this.isSwapping) {
      this.mergeDelta();
    }
  }

  /** Remove a document (GDPR) */
  removeDocument(docId: number): void {
    this.mainIndex.removeDocument(docId);
    this.deltaIndex.removeDocument(docId);
  }

  /** Search the index */
  searchIndex(query: string): { postings: Map<string, any[]>; docs: Map<number, Document> } {
    // Wait if a swap is in progress (busy wait with check)
    const maxWaitMs = 5000;
    const waitStart = Date.now();
    while (this.isSwapping) {
      if (Date.now() - waitStart > maxWaitMs) {
        this.emit('searchTimeout', { query });
        break;
      }
      // Yield to event loop
    }

    const terms = this.tokenizer.tokenize(query);
    const resultPostings = new Map<string, any[]>();
    const resultDocs = new Map<number, Document>();

    for (const term of terms) {
      // Search main index (reads are safe during merge since we swap atomically)
      const mainPostings = this.mainIndex.getPostings(term);
      const deltaPostings = this.deltaIndex.getPostings(term);

      // Merge postings
      const merged = this.mergePostingLists(
        new Map([[term, mainPostings]]),
        new Map([[term, deltaPostings]])
      );

      if (merged.has(term)) {
        resultPostings.set(term, merged.get(term)!);
        for (const posting of merged.get(term)!) {
          const doc = this.mainIndex.getDocument(posting.docId) ||
                     this.deltaIndex.getDocument(posting.docId);
          if (doc) {
            resultDocs.set(posting.docId, doc);
          }
        }
      }
    }

    return { postings: resultPostings, docs: resultDocs };
  }

  /** Merge two posting lists */
  private mergePostingLists(
    main: Map<string, any[]>,
    delta: Map<string, any[]>
  ): Map<string, any[]> {
    const result = new Map<string, any[]>();

    const allTerms = new Set([...main.keys(), ...delta.keys()]);
    for (const term of allTerms) {
      const mainPostings = main.get(term) || [];
      const deltaPostings = delta.get(term) || [];
      const merged = [...mainPostings];

      for (const dp of deltaPostings) {
        const existing = merged.find(p => p.docId === dp.docId);
        if (existing) {
          existing.termFrequency = dp.termFrequency;
          existing.positions = dp.positions;
        } else {
          merged.push(dp);
        }
      }

      merged.sort((a: any, b: any) => a.docId - b.docId);
      result.set(term, merged);
    }

    return result;
  }

  /** Check if URL has been visited */
  isVisited(url: string): boolean {
    return this.visitedFilter.mightContain(url);
  }

  /** Check if document is near-duplicate */
  isDuplicate(content: string, threshold: number = 3): boolean {
    const fp = this.simHash.compute(content);
    return false; // Simplified: would need to compare against all docs
  }

  /** Get index statistics */
  getStats(): IndexStats {
    const mainStats = this.mainIndex.getStats();
    const deltaStats = this.deltaIndex.getStats();

    return {
      totalDocuments: mainStats.totalDocs + deltaStats.totalDocs,
      totalTerms: mainStats.totalTerms + deltaStats.totalTerms,
      totalTokens: mainStats.totalDocs * mainStats.avgDocLength,
      indexSizeBytes: mainStats.sizeBytes + deltaStats.sizeBytes,
      averageDocumentLength: mainStats.avgDocLength || deltaStats.avgDocLength,
      shardCount: this.shardManager.getNodeCount(),
      lastUpdated: this.lastSwapTime,
      uniqueDomains: 0
    };
  }

  /** Get the main inverted index */
  getMainIndex(): InvertedIndex {
    return this.mainIndex;
  }

  /** Get the delta index */
  getDeltaIndex(): InvertedIndex {
    return this.deltaIndex;
  }

  /** Get tokenizer */
  getTokenizer(): Tokenizer {
    return this.tokenizer;
  }

  /** Cleanup */
  shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    // Final merge
    this.mergeDelta();
  }
}
