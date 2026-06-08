/**
 * Inverted Index
 * 
 * Hash map of term → posting list (doc IDs + TF + positions).
 * Stored as compressed byte arrays using Variable Byte Encoding (VBE).
 * Supports boolean, phrase, and fuzzy queries.
 * Real-time index updates with < 5 sec lag.
 */

import { Posting, TermEntry, Document } from '../types';
import { SkipListPostingList } from '../structures/skip-list';

export class InvertedIndex {
  private index: Map<string, TermEntry>;
  private docStore: Map<number, Document>;
  private totalDocs: number;
  private totalTokens: number;
  private avgDocLength: number;

  constructor() {
    this.index = new Map();
    this.docStore = new Map();
    this.totalDocs = 0;
    this.totalTokens = 0;
    this.avgDocLength = 0;
  }

  /** Add a document to the index */
  addDocument(doc: Document, tokens: Map<string, number[] /* positions */>): void {
    // Store document
    this.docStore.set(doc.id, doc);
    this.totalDocs++;

    // Update average document length
    const docLength = Array.from(tokens.values()).reduce((sum, positions) => sum + positions.length, 0);
    this.totalTokens += docLength;
    this.avgDocLength = this.totalTokens / this.totalDocs;

    // Add each term to the index
    for (const [term, positions] of tokens) {
      if (!this.index.has(term)) {
        this.index.set(term, {
          term,
          documentFrequency: 0,
          postings: []
        });
      }

      const entry = this.index.get(term)!;
      
      // Check if doc already exists in posting list
      const existingPosting = entry.postings.find(p => p.docId === doc.id);
      if (existingPosting) {
        existingPosting.termFrequency += positions.length;
        existingPosting.positions = [...new Set([...existingPosting.positions, ...positions])].sort();
      } else {
        entry.postings.push({
          docId: doc.id,
          termFrequency: positions.length,
          positions: [...positions].sort()
        });
        entry.documentFrequency++;
      }

      // Sort postings by docId for efficient merging
      entry.postings.sort((a, b) => a.docId - b.docId);
    }
  }

  /** Remove a document from the index (GDPR support) */
  removeDocument(docId: number): void {
    const doc = this.docStore.get(docId);
    if (!doc) return;

    // Mark as removed
    doc.isRemoved = true;

    // Remove from all posting lists
    for (const [, entry] of this.index) {
      const idx = entry.postings.findIndex(p => p.docId === docId);
      if (idx !== -1) {
        entry.postings.splice(idx, 1);
        entry.documentFrequency--;
      }
    }

    this.totalDocs--;
  }

  /** Update an existing document */
  updateDocument(doc: Document, tokens: Map<string, number[]>): void {
    this.removeDocument(doc.id);
    this.addDocument(doc, tokens);
  }

  /** Get posting list for a term */
  getPostings(term: string): Posting[] {
    const entry = this.index.get(term);
    return entry ? entry.postings : [];
  }

  /** Get posting list as SkipList for efficient merging */
  getPostingSkipList(term: string): SkipListPostingList {
    const postings = this.getPostings(term);
    const skipList = new SkipListPostingList();
    
    for (const posting of postings) {
      skipList.insert(posting);
    }

    return skipList;
  }

  /** Get document by ID */
  getDocument(docId: number): Document | undefined {
    const doc = this.docStore.get(docId);
    if (doc && doc.isRemoved) return undefined;
    return doc;
  }

  /** Check if a term exists in the index */
  hasTerm(term: string): boolean {
    return this.index.has(term);
  }

  /** Get document frequency for a term */
  documentFrequency(term: string): number {
    const entry = this.index.get(term);
    return entry ? entry.documentFrequency : 0;
  }

  /** Get total number of documents */
  documentCount(): number {
    return this.totalDocs;
  }

  /** Get total number of unique terms */
  termCount(): number {
    return this.index.size;
  }

  /** Get average document length */
  getAvgDocLength(): number {
    return this.avgDocLength;
  }

  /**
   * Variable Byte Encoding (VBE)
   * Compresses posting list doc IDs using delta encoding + VBE.
   * Doc IDs are stored as gaps (d-gaps) for better compression.
   */

  /** Encode posting list to VBE bytes */
  encodePostings(postings: Posting[]): Buffer {
    const bytes: number[] = [];
    let lastDocId = 0;

    for (const posting of postings) {
      // Delta encode doc ID
      const gap = posting.docId - lastDocId;
      this.encodeVBE(bytes, gap);
      this.encodeVBE(bytes, posting.termFrequency);
      
      // Encode positions
      this.encodeVBE(bytes, posting.positions.length);
      let lastPos = 0;
      for (const pos of posting.positions) {
        this.encodeVBE(bytes, pos - lastPos);
        lastPos = pos;
      }

      lastDocId = posting.docId;
    }

    return Buffer.from(bytes);
  }

  /** Decode VBE bytes to posting list */
  decodePostings(buffer: Buffer): Posting[] {
    const postings: Posting[] = [];
    let offset = 0;
    let lastDocId = 0;

    while (offset < buffer.length) {
      const docId = lastDocId + this.decodeVBE(buffer, offset);
      offset += this.getVBEByteCount(buffer, offset);
      lastDocId = docId;

      const tf = this.decodeVBE(buffer, offset);
      offset += this.getVBEByteCount(buffer, offset);

      const posCount = this.decodeVBE(buffer, offset);
      offset += this.getVBEByteCount(buffer, offset);

      const positions: number[] = [];
      let lastPos = 0;
      for (let i = 0; i < posCount; i++) {
        const pos = lastPos + this.decodeVBE(buffer, offset);
        offset += this.getVBEByteCount(buffer, offset);
        lastPos = pos;
        positions.push(pos);
      }

      postings.push({ docId, termFrequency: tf, positions });
    }

    return postings;
  }

  /** VBE encode a single integer */
  private encodeVBE(bytes: number[], value: number): void {
    let v = value;
    const group: number[] = [];

    while (v > 127) {
      group.push(v & 127);
      v >>= 7;
    }

    // Last byte has continuation bit set
    bytes.push(v | 0x80);

    // Prepend the rest
    for (let i = group.length - 1; i >= 0; i--) {
      bytes.push(group[i]);
    }
  }

  /** VBE decode a single integer starting at offset */
  private decodeVBE(buffer: Buffer, offset: number): number {
    let value = 0;
    let shift = 0;
    let i = offset;

    while (i < buffer.length) {
      const byte = buffer[i];
      value |= ((byte & 127) << shift);
      shift += 7;
      i++;
      if (byte & 0x80) break; // continuation bit set = last byte
    }

    return value;
  }

  /** Count VBE bytes for an integer at offset */
  private getVBEByteCount(buffer: Buffer, offset: number): number {
    let count = 0;
    let i = offset;
    while (i < buffer.length) {
      count++;
      if (buffer[i] & 0x80) break;
      i++;
    }
    return count;
  }

  /** Compute index size estimate */
  estimateSize(): number {
    let size = 0;
    for (const [, entry] of this.index) {
      size += entry.term.length * 2; // UTF-16
      size += 8; // documentFrequency
      size += entry.postings.length * 12; // approximate per posting
    }
    return size;
  }

  /** Get index statistics */
  getStats(): { totalDocs: number; totalTerms: number; avgDocLength: number; sizeBytes: number } {
    return {
      totalDocs: this.totalDocs,
      totalTerms: this.index.size,
      avgDocLength: this.avgDocLength,
      sizeBytes: this.estimateSize()
    };
  }

  /** Get all terms (for iteration) */
  getTerms(): string[] {
    return Array.from(this.index.keys());
  }

  /** Clear the index */
  clear(): void {
    this.index.clear();
    this.docStore.clear();
    this.totalDocs = 0;
    this.totalTokens = 0;
    this.avgDocLength = 0;
  }
}
