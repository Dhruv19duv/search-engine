"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ranker = void 0;
const tokenizer_1 = require("../indexer/tokenizer");
class Ranker {
    index;
    tokenizer;
    // BM25 parameters
    k1 = 1.2;
    b = 0.75;
    k3 = 8.0;
    // Ranking weights
    weights = {
        bm25: 0.35,
        pageRank: 0.20,
        freshness: 0.15,
        domainAuthority: 0.10,
        exactMatch: 0.10,
        titleMatch: 0.10
    };
    domainAuthorityCache;
    constructor(index) {
        this.index = index;
        this.tokenizer = new tokenizer_1.Tokenizer();
        this.domainAuthorityCache = new Map();
    }
    /** Set ranking weights */
    setWeights(weights) {
        this.weights = { ...this.weights, ...weights };
    }
    /** Rank documents for a given query */
    rank(query, candidateDocs) {
        const queryTerms = this.tokenizer.tokenize(query);
        const results = [];
        for (const [docId, doc] of candidateDocs) {
            // Compute ranking features
            const features = this.computeFeatures(queryTerms, docId, doc);
            // Compute combined score
            const score = this.computeScore(features, queryTerms, query);
            if (score > 0) {
                results.push({
                    docId,
                    url: doc.url,
                    title: doc.title,
                    snippet: doc.snippet,
                    score,
                    rank: 0, // Will be set after sorting
                    timestamp: doc.timestamp,
                    domain: doc.domain,
                    matchedTerms: queryTerms.filter(t => {
                        const content = (doc.title + ' ' + doc.content).toLowerCase();
                        return content.includes(t.toLowerCase());
                    })
                });
            }
        }
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        // Assign ranks
        results.forEach((r, i) => { r.rank = i + 1; });
        return results;
    }
    /** Compute all ranking features for a document */
    computeFeatures(queryTerms, docId, doc) {
        const allContent = (doc.title + ' ' + doc.content).toLowerCase();
        const docLength = this.tokenizer.tokenize(doc.content).length;
        // BM25 score
        const bm25 = this.computeBM25(queryTerms, docId, docLength);
        // TF-IDF score
        const tfIdf = this.computeTFIDF(queryTerms, docId, docLength);
        // PageRank (normalized)
        const pageRank = Math.min(1, (doc.pageRank || 0) / 10);
        // Freshness score (recency)
        const freshness = this.computeFreshness(doc.timestamp);
        // Domain authority
        const domainAuthority = this.getDomainAuthority(doc.domain);
        // Keyword density
        const keywordDensity = queryTerms.reduce((sum, term) => {
            const count = (allContent.match(new RegExp(term, 'gi')) || []).length;
            return sum + (count / Math.max(1, docLength));
        }, 0) / Math.max(1, queryTerms.length);
        // Exact match (query appears as phrase in content)
        const queryPhrase = queryTerms.join(' ');
        const isExactMatch = allContent.includes(queryPhrase) ? 1 : 0;
        // Title match
        const titleLower = doc.title.toLowerCase();
        const isTitleMatch = queryTerms.some(t => titleLower.includes(t)) ? 1 : 0;
        return {
            tfIdf,
            bm25,
            pageRank,
            freshness,
            domainAuthority,
            contentLength: docLength,
            keywordDensity,
            dwellTime: 0, // Requires user interaction data
            clickThroughRate: 0, // Requires historical data
            isExactMatch,
            isTitleMatch,
            isNavigational: 0, // Set by query intent classifier
            readabilityScore: this.computeReadability(doc.content),
            spamScore: 0, // Set by spam filter
            semanticScore: 0, // Set by dense retrieval
            driftScore: 0 // Set by semantic drift detector
        };
    }
    /** Compute BM25 score */
    computeBM25(queryTerms, docId, docLength) {
        const avgDocLength = this.index.getAvgDocLength() || 1;
        const N = this.index.documentCount();
        let score = 0;
        for (const term of queryTerms) {
            const df = this.index.documentFrequency(term);
            if (df === 0)
                continue;
            const postings = this.index.getPostings(term);
            const posting = postings.find(p => p.docId === docId);
            if (!posting)
                continue;
            const tf = posting.termFrequency;
            const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
            // BM25 formula
            const numerator = tf * (this.k1 + 1);
            const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / avgDocLength));
            score += idf * (numerator / denominator);
        }
        return score;
    }
    /** Compute TF-IDF score */
    computeTFIDF(queryTerms, docId, docLength) {
        const N = this.index.documentCount();
        let score = 0;
        for (const term of queryTerms) {
            const df = this.index.documentFrequency(term);
            if (df === 0)
                continue;
            const postings = this.index.getPostings(term);
            const posting = postings.find(p => p.docId === docId);
            if (!posting)
                continue;
            // Term frequency (normalized)
            const tf = posting.termFrequency / Math.max(1, docLength);
            // Inverse document frequency
            const idf = Math.log(N / Math.max(1, df));
            score += tf * idf;
        }
        return score;
    }
    /** Compute freshness score (decay over time) */
    computeFreshness(timestamp) {
        const now = Date.now();
        const age = now - timestamp.getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneYear = 365 * oneDay;
        // Exponential decay: score = e^(-age / halfLife)
        const halfLife = 30 * oneDay; // 30 days half-life
        return Math.exp(-age / halfLife);
    }
    /** Get domain authority score */
    getDomainAuthority(domain) {
        if (this.domainAuthorityCache.has(domain)) {
            return this.domainAuthorityCache.get(domain);
        }
        // Compute based on domain characteristics
        let score = 0.3; // baseline
        // TLD boost
        if (domain.endsWith('.edu'))
            score += 0.4;
        else if (domain.endsWith('.gov'))
            score += 0.4;
        else if (domain.endsWith('.org'))
            score += 0.2;
        // Domain length (shorter = more authoritative generally)
        const mainDomain = domain.split('.')[0];
        if (mainDomain.length >= 3 && mainDomain.length <= 12)
            score += 0.1;
        // Known authoritative domains
        const authoritative = [
            'wikipedia.org', 'github.com', 'stackoverflow.com', 'medium.com',
            'nytimes.com', 'bbc.com', 'nature.com', 'sciencedirect.com',
            'acm.org', 'ieee.org', 'arxiv.org', 'springer.com'
        ];
        if (authoritative.some(a => domain.includes(a))) {
            score += 0.3;
        }
        const clamped = Math.min(1, score);
        this.domainAuthorityCache.set(domain, clamped);
        return clamped;
    }
    /** Compute readability score (Flesch-Kincaid simplified) */
    computeReadability(content) {
        const words = content.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0)
            return 0;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const syllables = words.reduce((sum, w) => sum + this.countSyllables(w), 0);
        const avgWordsPerSentence = words.length / Math.max(1, sentences.length);
        const avgSyllablesPerWord = syllables / words.length;
        // Flesch Reading Ease (simplified)
        const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
        // Normalize to 0-1
        return Math.max(0, Math.min(1, score / 100));
    }
    /** Count syllables in a word */
    countSyllables(word) {
        const lower = word.toLowerCase();
        let count = 0;
        let prevVowel = false;
        for (const char of lower) {
            const isVowel = 'aeiou'.includes(char);
            if (isVowel && !prevVowel)
                count++;
            prevVowel = isVowel;
        }
        // Adjust for silent e
        if (lower.endsWith('e') && count > 1)
            count--;
        return Math.max(1, count);
    }
    /** Combine features into final score */
    computeScore(features, queryTerms, rawQuery) {
        // Normalize BM25 and TF-IDF to 0-1 range using sigmoid
        const bm25Norm = 1 / (1 + Math.exp(-features.bm25));
        const tfIdfNorm = 1 / (1 + Math.exp(-features.tfIdf));
        // Weighted combination
        let score = this.weights.bm25 * bm25Norm +
            this.weights.pageRank * features.pageRank +
            this.weights.freshness * features.freshness +
            this.weights.domainAuthority * features.domainAuthority +
            this.weights.exactMatch * features.isExactMatch +
            this.weights.titleMatch * features.isTitleMatch;
        // Apply penalties
        // Spam penalty (0-1, higher = more spammy)
        if (features.spamScore > 0.5) {
            score *= (1 - features.spamScore);
        }
        // Keyword stuffing penalty
        if (features.keywordDensity > 0.3) {
            score *= 0.5;
        }
        return score;
    }
    /** Rerank results based on semantic drift */
    applyDriftRerank(results, driftScores) {
        for (const result of results) {
            const drift = driftScores.get(result.docId) || 0;
            // Reduce score for documents affected by semantic drift
            result.score *= (1 - drift * 0.3);
        }
        // Re-sort
        results.sort((a, b) => b.score - a.score);
        results.forEach((r, i) => { r.rank = i + 1; });
        return results;
    }
    /** Apply LTR model scores */
    applyLTRScoring(results, ltrScores) {
        for (const result of results) {
            const ltrScore = ltrScores.get(result.docId);
            if (ltrScore !== undefined) {
                result.score = result.score * 0.7 + ltrScore * 0.3;
            }
        }
        results.sort((a, b) => b.score - a.score);
        results.forEach((r, i) => { r.rank = i + 1; });
        return results;
    }
}
exports.Ranker = Ranker;
//# sourceMappingURL=ranker.js.map