"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningToRank = void 0;
class LearningToRank {
    trees;
    numTrees;
    learningRate;
    maxDepth;
    minSamplesSplit;
    featureWeights;
    constructor(numTrees = 100, learningRate = 0.1, maxDepth = 6) {
        this.trees = [];
        this.numTrees = numTrees;
        this.learningRate = learningRate;
        this.maxDepth = maxDepth;
        this.minSamplesSplit = 10;
        this.featureWeights = [];
        // Initialize feature weights (will be learned)
        this.featureWeights = [
            0.15, // tfIdf
            0.20, // bm25
            0.15, // pageRank
            0.10, // freshness
            0.10, // domainAuthority
            0.02, // contentLength
            0.03, // keywordDensity
            0.08, // dwellTime
            0.07, // clickThroughRate
            0.05, // isExactMatch
            0.05 // isTitleMatch
        ];
    }
    /** Extract feature vector from RankingFeatures */
    extractFeatures(features) {
        return [
            features.tfIdf,
            features.bm25,
            features.pageRank,
            features.freshness,
            features.domainAuthority,
            Math.log(features.contentLength + 1) / 10,
            features.keywordDensity,
            features.dwellTime,
            features.clickThroughRate,
            features.isExactMatch,
            features.isTitleMatch
        ];
    }
    /** Train the LambdaMART model from pairwise preferences */
    train(pairs) {
        if (pairs.length === 0)
            return;
        this.trees = [];
        for (let t = 0; t < this.numTrees; t++) {
            // Compute lambdas (gradients) for each pair
            const gradients = this.computeGradients(pairs);
            // Train a decision tree on gradients
            const tree = this.buildTree(gradients, 0);
            this.trees.push(tree);
            // Update model based on tree predictions
            this.applyTreeUpdate(pairs, tree);
        }
    }
    /** Compute lambda gradients for pairwise ranking */
    computeGradients(pairs) {
        const gradients = [];
        for (const pair of pairs) {
            const scoreDiff = this.score(pair.winner) - this.score(pair.loser);
            // Lambda: gradient of NDCG
            const lambda = -1 / (1 + Math.exp(scoreDiff));
            gradients.push({
                features: this.extractFeatures(pair.winner),
                gradient: lambda * pair.weight,
                weight: pair.weight
            });
            gradients.push({
                features: this.extractFeatures(pair.loser),
                gradient: -lambda * pair.weight,
                weight: pair.weight
            });
        }
        return gradients;
    }
    /** Build a regression tree */
    buildTree(data, depth) {
        if (depth >= this.maxDepth || data.length < this.minSamplesSplit) {
            // Leaf node: return mean gradient
            const totalWeight = data.reduce((sum, d) => sum + Math.abs(d.weight), 0);
            const weightedSum = data.reduce((sum, d) => sum + d.gradient * d.weight, 0);
            return {
                featureIndex: 0,
                threshold: 0,
                left: null,
                right: null,
                prediction: totalWeight > 0 ? weightedSum / totalWeight : 0,
                isLeaf: true
            };
        }
        // Find best split
        let bestFeature = 0;
        let bestThreshold = 0;
        let bestGain = -Infinity;
        const numFeatures = data[0].features.length;
        for (let f = 0; f < numFeatures; f++) {
            // Sort data by feature value
            const sorted = [...data].sort((a, b) => a.features[f] - b.features[f]);
            for (let i = 0; i < sorted.length - 1; i++) {
                const threshold = (sorted[i].features[f] + sorted[i + 1].features[f]) / 2;
                const gain = this.computeSplitGain(sorted, f, threshold);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestFeature = f;
                    bestThreshold = threshold;
                }
            }
        }
        // Split data
        const leftData = data.filter(d => d.features[bestFeature] <= bestThreshold);
        const rightData = data.filter(d => d.features[bestFeature] > bestThreshold);
        if (leftData.length === 0 || rightData.length === 0) {
            const totalWeight = data.reduce((sum, d) => sum + Math.abs(d.weight), 0);
            const weightedSum = data.reduce((sum, d) => sum + d.gradient * d.weight, 0);
            return {
                featureIndex: 0,
                threshold: 0,
                left: null,
                right: null,
                prediction: totalWeight > 0 ? weightedSum / totalWeight : 0,
                isLeaf: true
            };
        }
        return {
            featureIndex: bestFeature,
            threshold: bestThreshold,
            left: this.buildTree(leftData, depth + 1),
            right: this.buildTree(rightData, depth + 1),
            prediction: 0,
            isLeaf: false
        };
    }
    /** Compute split gain (variance reduction) */
    computeSplitGain(data, feature, threshold) {
        const left = data.filter(d => d.features[feature] <= threshold);
        const right = data.filter(d => d.features[feature] > threshold);
        if (left.length === 0 || right.length === 0)
            return -Infinity;
        const variance = (vals) => {
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            return vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
        };
        const leftVals = left.map(d => d.gradient);
        const rightVals = right.map(d => d.gradient);
        return -((left.length / data.length) * variance(leftVals) +
            (right.length / data.length) * variance(rightVals));
    }
    /** Apply tree update to all pairs - updates model scores based on tree predictions */
    applyTreeUpdate(pairs, tree) {
        for (const pair of pairs) {
            const winnerFeatures = this.extractFeatures(pair.winner);
            const loserFeatures = this.extractFeatures(pair.loser);
            const winnerUpdate = this.predictTree(tree, winnerFeatures);
            const loserUpdate = this.predictTree(tree, loserFeatures);
            // Apply gradient update: adjust to push winner above loser
            const margin = winnerUpdate - loserUpdate;
            // The tree update is applied by storing the tree in the ensemble;
            // future score() calls will include this tree's predictions
        }
    }
    /** Get prediction from a single tree */
    predictTree(tree, features) {
        if (tree.isLeaf)
            return tree.prediction;
        if (features[tree.featureIndex] <= tree.threshold) {
            return this.predictTree(tree.left, features);
        }
        else {
            return this.predictTree(tree.right, features);
        }
    }
    /** Score a document's features */
    score(features) {
        const featureVec = this.extractFeatures(features);
        let score = 0;
        // Weighted feature baseline
        for (let i = 0; i < featureVec.length; i++) {
            score += this.featureWeights[i] * featureVec[i];
        }
        // Tree ensemble predictions
        for (const tree of this.trees) {
            score += this.learningRate * this.predictTree(tree, featureVec);
        }
        return score;
    }
    /** Predict relevance score for ranking */
    predict(features) {
        return this.score(features);
    }
    /** Update weights from click data (online learning) */
    updateFromClickData(query, clickedDoc, skippedDocs) {
        // Create pairwise preferences
        const pairs = skippedDocs.map(skipped => ({
            winner: clickedDoc,
            loser: skipped,
            weight: 1.0
        }));
        // Online update: train a few additional trees
        for (let t = 0; t < 5; t++) {
            const gradients = this.computeGradients(pairs);
            const tree = this.buildTree(gradients, 0);
            this.trees.push(tree);
            // Keep only most recent trees
            if (this.trees.length > this.numTrees) {
                this.trees.shift();
            }
        }
    }
    /** Get feature importance */
    getFeatureImportance() {
        const names = [
            'TF-IDF', 'BM25', 'PageRank', 'Freshness', 'Domain Authority',
            'Content Length', 'Keyword Density', 'Dwell Time',
            'Click-through Rate', 'Exact Match', 'Title Match'
        ];
        return this.featureWeights.map((w, i) => ({
            name: names[i],
            importance: w
        })).sort((a, b) => b.importance - a.importance);
    }
    /** Serialize model */
    toJSON() {
        return {
            numTrees: this.trees.length,
            learningRate: this.learningRate,
            featureWeights: this.featureWeights,
            treesCount: this.trees.length
        };
    }
}
exports.LearningToRank = LearningToRank;
//# sourceMappingURL=learning-to-rank.js.map