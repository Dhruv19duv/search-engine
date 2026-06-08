/**
 * Semantic Drift Detector
 *
 * NOVEL: Trains a temporal word2vec. Tracks centroid shift of a term's
 * embedding over 30-day windows. Flags drift > threshold.
 *
 * The key innovation: Most search engines treat documents as static.
 * This system detects when a term's meaning shifts over time (e.g., "Apple"
 * from fruit → tech) and re-ranks results accordingly without full re-indexing.
 *
 * Implementation:
 * 1. Maintain temporal co-occurrence matrices per time window
 * 2. Train lightweight word embeddings for each window
 * 3. Track embedding centroid drift between consecutive windows
 * 4. Flag terms with drift > threshold for re-ranking
 * 5. Apply temporal awareness to search results
 */
import { DriftResult } from '../types';
import { TemporalData } from '../structures/segment-tree';
interface TimeWindow {
    startTime: number;
    endTime: number;
    embeddings: Map<string, number[]>;
    centroid: number[];
    documentCount: number;
}
export declare class SemanticDriftDetector {
    private windowSizeMs;
    private embeddingDim;
    private driftThreshold;
    private windows;
    private termHistory;
    private coOccurrenceMatrix;
    private segmentTree;
    private totalDocuments;
    private contextWindowSize;
    constructor(windowSizeDays?: number, embeddingDim?: number, driftThreshold?: number);
    /** Process a document for temporal word embedding training */
    processDocument(docId: number, text: string, timestamp: Date): void;
    /** Tokenize and normalize text */
    private tokenize;
    /** Check for stop words */
    private isStopWord;
    /** Find or create the appropriate time window for a timestamp */
    private findOrCreateWindow;
    /** Train word embeddings for a specific time window */
    private trainWindowEmbeddings;
    /** Update the centroid embedding for a window */
    private updateWindowCentroid;
    /** Generate a random embedding vector */
    private randomEmbedding;
    /** Get a random term from the vocabulary */
    private getRandomTerm;
    /** Dot product of two vectors */
    private dotProduct;
    /** Cosine similarity */
    private cosineSimilarity;
    /** Detect semantic drift for a specific term */
    detectDrift(term: string): DriftResult;
    /** Detect drift for all monitored terms */
    detectAllDrift(): DriftResult[];
    /** Get drift-affected documents for re-ranking */
    getDriftedTerms(threshold?: number): string[];
    /** Compute drift score for a document (how much its content is affected by drift) */
    computeDocumentDriftScore(text: string): number;
    /** Rebuild segment tree from current windows */
    private rebuildSegmentTree;
    /** Query temporal range for drift analysis */
    queryTemporalRange(startTime: number, endTime: number): TemporalData;
    /** Get all time windows */
    getWindows(): TimeWindow[];
    /** Get the number of terms being tracked */
    getTrackedTermCount(): number;
    /** Get drift statistics */
    getStats(): {
        totalWindows: number;
        trackedTerms: number;
        driftedTerms: number;
        averageDriftMagnitude: number;
    };
    /** Clear all data */
    clear(): void;
}
export {};
//# sourceMappingURL=semantic-drift.d.ts.map