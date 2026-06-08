/**
 * Learning-to-Rank (LTR)
 *
 * LambdaMART model for learning-to-rank.
 * Uses gradient boosted decision trees trained on click-through data.
 * Features: TF-IDF, BM25, PageRank, freshness, dwell time, CTR.
 *
 * Implements:
 * - LambdaMART algorithm (simplified)
 * - Gradient boosted trees
 * - Feature engineering from ranking signals
 * - Online learning from click data
 */
import { RankingFeatures } from '../types';
interface RankedPair {
    winner: RankingFeatures;
    loser: RankingFeatures;
    weight: number;
}
export declare class LearningToRank {
    private trees;
    private numTrees;
    private learningRate;
    private maxDepth;
    private minSamplesSplit;
    private featureWeights;
    constructor(numTrees?: number, learningRate?: number, maxDepth?: number);
    /** Extract feature vector from RankingFeatures */
    private extractFeatures;
    /** Train the LambdaMART model from pairwise preferences */
    train(pairs: RankedPair[]): void;
    /** Compute lambda gradients for pairwise ranking */
    private computeGradients;
    /** Build a regression tree */
    private buildTree;
    /** Compute split gain (variance reduction) */
    private computeSplitGain;
    /** Apply tree update to all pairs - updates model scores based on tree predictions */
    private applyTreeUpdate;
    /** Get prediction from a single tree */
    private predictTree;
    /** Score a document's features */
    score(features: RankingFeatures): number;
    /** Predict relevance score for ranking */
    predict(features: RankingFeatures): number;
    /** Update weights from click data (online learning) */
    updateFromClickData(query: string, clickedDoc: RankingFeatures, skippedDocs: RankingFeatures[]): void;
    /** Get feature importance */
    getFeatureImportance(): {
        name: string;
        importance: number;
    }[];
    /** Serialize model */
    toJSON(): object;
}
export {};
//# sourceMappingURL=learning-to-rank.d.ts.map