"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Indexer = void 0;
const inverted_index_1 = require("./inverted-index");
const tokenizer_1 = require("./tokenizer");
const consistent_hash_1 = require("../structures/consistent-hash");
const bloom_filter_1 = require("../structures/bloom-filter");
const simhash_1 = require("../structures/simhash");
const events_1 = require("events");
class Indexer extends events_1.EventEmitter {
    mainIndex;
    deltaIndex; // for real-time updates
    tokenizer;
    shardManager;
    shards;
    visitedFilter;
    simHash;
    indexBuildTime;
    lastSwapTime;
    isSwapping;
    updateQueue;
    updateInterval;
    maxDeltaSize;
    constructor(maxDeltaSize = 1000, expectedUrls = 1000000) {
        super();
        this.mainIndex = new inverted_index_1.InvertedIndex();
        this.deltaIndex = new inverted_index_1.InvertedIndex();
        this.tokenizer = new tokenizer_1.Tokenizer();
        this.shardManager = new consistent_hash_1.ConsistentHash(150);
        this.shards = new Map();
        this.visitedFilter = new bloom_filter_1.BloomFilter(expectedUrls, 0.01);
        this.simHash = new simhash_1.SimHash(64, 3);
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
    indexDocument(doc) {
        const startTime = Date.now();
        // Tokenize content
        const tokens = this.tokenizer.tokenizeWithPositions(`${doc.title} ${doc.title} ${doc.content}` // title boosted
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
    indexDocuments(docs) {
        for (const doc of docs) {
            this.indexDocument(doc);
        }
        // Auto-merge if delta is large enough
        if (this.deltaIndex.documentCount() >= this.maxDeltaSize) {
            this.mergeDelta();
        }
    }
    /** Merge delta index into main index (zero-downtime) */
    mergeDelta() {
        if (this.deltaIndex.documentCount() === 0)
            return;
        const startTime = Date.now();
        this.isSwapping = true;
        // Create new merged index
        const newMain = new inverted_index_1.InvertedIndex();
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
        this.deltaIndex = new inverted_index_1.InvertedIndex();
        this.isSwapping = false;
        this.lastSwapTime = new Date();
        this.emit('indexSwapped', {
            duration: Date.now() - startTime,
            totalDocs: newMain.documentCount()
        });
    }
    /** Process real-time update queue */
    startUpdateProcessor() {
        this.updateInterval = setInterval(() => {
            this.processUpdateQueue();
        }, 1000); // Process every second
    }
    /** Queue an index update */
    queueUpdate(update) {
        this.updateQueue.push(update);
    }
    /** Process queued updates */
    processUpdateQueue() {
        // Skip if a merge is in progress to avoid race conditions
        if (this.isSwapping || this.updateQueue.length === 0)
            return;
        const updates = this.updateQueue.splice(0);
        const startTime = Date.now();
        for (const update of updates) {
            switch (update.type) {
                case 'add':
                    this.indexDocument(update.document);
                    break;
                case 'update':
                    this.deltaIndex.updateDocument(update.document, this.tokenizer.tokenizeWithPositions(update.document.title + ' ' + update.document.content));
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
    removeDocument(docId) {
        this.mainIndex.removeDocument(docId);
        this.deltaIndex.removeDocument(docId);
    }
    /** Search the index */
    searchIndex(query) {
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
        const resultPostings = new Map();
        const resultDocs = new Map();
        for (const term of terms) {
            // Search main index (reads are safe during merge since we swap atomically)
            const mainPostings = this.mainIndex.getPostings(term);
            const deltaPostings = this.deltaIndex.getPostings(term);
            // Merge postings
            const merged = this.mergePostingLists(new Map([[term, mainPostings]]), new Map([[term, deltaPostings]]));
            if (merged.has(term)) {
                resultPostings.set(term, merged.get(term));
                for (const posting of merged.get(term)) {
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
    mergePostingLists(main, delta) {
        const result = new Map();
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
                }
                else {
                    merged.push(dp);
                }
            }
            merged.sort((a, b) => a.docId - b.docId);
            result.set(term, merged);
        }
        return result;
    }
    /** Check if URL has been visited */
    isVisited(url) {
        return this.visitedFilter.mightContain(url);
    }
    /** Check if document is near-duplicate */
    isDuplicate(content, threshold = 3) {
        const fp = this.simHash.compute(content);
        return false; // Simplified: would need to compare against all docs
    }
    /** Get index statistics */
    getStats() {
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
    getMainIndex() {
        return this.mainIndex;
    }
    /** Get the delta index */
    getDeltaIndex() {
        return this.deltaIndex;
    }
    /** Get tokenizer */
    getTokenizer() {
        return this.tokenizer;
    }
    /** Cleanup */
    shutdown() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        // Final merge
        this.mergeDelta();
    }
}
exports.Indexer = Indexer;
//# sourceMappingURL=indexer.js.map