/**
 * Ranker
 *
 * Multi-factor relevance ranking system:
 * - BM25: State-of-the-art probabilistic ranking
 * - TF-IDF: Classic term frequency-inverse document frequency
 * - PageRank: Link analysis algorithm
 * - Freshness: Temporal recency scoring
 * - Domain authority: Domain-level reputation
 * - Learning-to-Rank: ML model integration
 *
 * All scores are normalized and combined via configurable weights.
 */
import { Document, SearchResult } from '../types';
import { InvertedIndex } from '../indexer/inverted-index';
export declare class Ranker {
    private index;
    private tokenizer;
    private readonly k1;
    private readonly b;
    private readonly k3;
    private weights;
    private domainAuthorityCache;
    constructor(index: InvertedIndex);
    /** Set ranking weights */
    setWeights(weights: Partial<typeof this.weights>): void;
    /** Rank documents for a given query */
    rank(query: string, candidateDocs: Map<number, Document>): SearchResult[];
    /** Compute all ranking features for a document */
    private computeFeatures;
    /** Compute BM25 score */
    private computeBM25;
    /** Compute TF-IDF score */
    private computeTFIDF;
    /** Compute freshness score (decay over time) */
    private computeFreshness;
    /** Get domain authority score */
    private getDomainAuthority;
    /** Compute readability score (Flesch-Kincaid simplified) */
    private computeReadability;
    /** Count syllables in a word */
    private countSyllables;
    /** Combine features into final score */
    private computeScore;
    /** Rerank results based on semantic drift */
    applyDriftRerank(results: SearchResult[], driftScores: Map<number, number>): SearchResult[];
    /** Apply LTR model scores */
    applyLTRScoring(results: SearchResult[], ltrScores: Map<number, number>): SearchResult[];
}
//# sourceMappingURL=ranker.d.ts.map