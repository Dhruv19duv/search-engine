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
import { Document, IndexUpdate, IndexStats } from '../types';
import { InvertedIndex } from './inverted-index';
import { Tokenizer } from './tokenizer';
import { EventEmitter } from 'events';
export declare class Indexer extends EventEmitter {
    private mainIndex;
    private deltaIndex;
    private tokenizer;
    private shardManager;
    private shards;
    private visitedFilter;
    private simHash;
    private indexBuildTime;
    private lastSwapTime;
    private isSwapping;
    private updateQueue;
    private updateInterval;
    private maxDeltaSize;
    constructor(maxDeltaSize?: number, expectedUrls?: number);
    /** Index a document */
    indexDocument(doc: Document): void;
    /** Batch index multiple documents */
    indexDocuments(docs: Document[]): void;
    /** Merge delta index into main index (zero-downtime) */
    mergeDelta(): void;
    /** Process real-time update queue */
    private startUpdateProcessor;
    /** Queue an index update */
    queueUpdate(update: IndexUpdate): void;
    /** Process queued updates */
    private processUpdateQueue;
    /** Remove a document (GDPR) */
    removeDocument(docId: number): void;
    /** Search the index */
    searchIndex(query: string): {
        postings: Map<string, any[]>;
        docs: Map<number, Document>;
    };
    /** Merge two posting lists */
    private mergePostingLists;
    /** Check if URL has been visited */
    isVisited(url: string): boolean;
    /** Check if document is near-duplicate */
    isDuplicate(content: string, threshold?: number): boolean;
    /** Get index statistics */
    getStats(): IndexStats;
    /** Get the main inverted index */
    getMainIndex(): InvertedIndex;
    /** Get the delta index */
    getDeltaIndex(): InvertedIndex;
    /** Get tokenizer */
    getTokenizer(): Tokenizer;
    /** Cleanup */
    shutdown(): void;
}
//# sourceMappingURL=indexer.d.ts.map