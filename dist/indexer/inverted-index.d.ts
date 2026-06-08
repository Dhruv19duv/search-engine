/**
 * Inverted Index
 *
 * Hash map of term → posting list (doc IDs + TF + positions).
 * Stored as compressed byte arrays using Variable Byte Encoding (VBE).
 * Supports boolean, phrase, and fuzzy queries.
 * Real-time index updates with < 5 sec lag.
 */
import { Posting, Document } from '../types';
import { SkipListPostingList } from '../structures/skip-list';
export declare class InvertedIndex {
    private index;
    private docStore;
    private totalDocs;
    private totalTokens;
    private avgDocLength;
    constructor();
    /** Add a document to the index */
    addDocument(doc: Document, tokens: Map<string, number[]>): void;
    /** Remove a document from the index (GDPR support) */
    removeDocument(docId: number): void;
    /** Update an existing document */
    updateDocument(doc: Document, tokens: Map<string, number[]>): void;
    /** Get posting list for a term */
    getPostings(term: string): Posting[];
    /** Get posting list as SkipList for efficient merging */
    getPostingSkipList(term: string): SkipListPostingList;
    /** Get document by ID */
    getDocument(docId: number): Document | undefined;
    /** Check if a term exists in the index */
    hasTerm(term: string): boolean;
    /** Get document frequency for a term */
    documentFrequency(term: string): number;
    /** Get total number of documents */
    documentCount(): number;
    /** Get total number of unique terms */
    termCount(): number;
    /** Get average document length */
    getAvgDocLength(): number;
    /**
     * Variable Byte Encoding (VBE)
     * Compresses posting list doc IDs using delta encoding + VBE.
     * Doc IDs are stored as gaps (d-gaps) for better compression.
     */
    /** Encode posting list to VBE bytes */
    encodePostings(postings: Posting[]): Buffer;
    /** Decode VBE bytes to posting list */
    decodePostings(buffer: Buffer): Posting[];
    /** VBE encode a single integer */
    private encodeVBE;
    /** VBE decode a single integer starting at offset */
    private decodeVBE;
    /** Count VBE bytes for an integer at offset */
    private getVBEByteCount;
    /** Compute index size estimate */
    estimateSize(): number;
    /** Get index statistics */
    getStats(): {
        totalDocs: number;
        totalTerms: number;
        avgDocLength: number;
        sizeBytes: number;
    };
    /** Get all terms (for iteration) */
    getTerms(): string[];
    /** Clear the index */
    clear(): void;
}
//# sourceMappingURL=inverted-index.d.ts.map