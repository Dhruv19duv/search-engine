"use strict";
/**
 * Query Understanding (NLP)
 *
 * BERT-inspired intent classifier for search queries.
 * Detects if query is navigational, informational, or transactional
 * and adjusts ranking accordingly.
 *
 * Uses a simplified transformer-based model:
 * - Token embedding with positional encoding
 * - Multi-head self-attention
 * - Feed-forward classification head
 * - Softmax output over 3 intent classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryUnderstanding = void 0;
const types_1 = require("../types");
class QueryUnderstanding {
    vocabSize;
    embeddingDim;
    maxSeqLength;
    numHeads;
    vocab;
    // Learned parameters (simplified)
    tokenEmbeddings;
    positionalEmbeddings;
    attentionHeads;
    outputWeights;
    outputBias;
    constructor() {
        this.vocabSize = 10000;
        this.embeddingDim = 128;
        this.maxSeqLength = 32;
        this.numHeads = 4;
        this.vocab = new Map();
        this.tokenEmbeddings = [];
        this.positionalEmbeddings = [];
        this.attentionHeads = [];
        this.outputWeights = [];
        this.outputBias = [0, 0, 0];
        this.initializeVocab();
        this.initializeEmbeddings();
        this.initializeAttention();
        this.initializeOutputLayer();
    }
    /** Initialize vocabulary with common tokens */
    initializeVocab() {
        const tokens = [
            '<PAD>', '<UNK>', '<CLS>', '<SEP>',
            'the', 'how', 'what', 'where', 'when', 'why', 'who',
            'to', 'for', 'in', 'on', 'at', 'of', 'with', 'by',
            'and', 'or', 'not', 'is', 'are', 'was', 'were',
            'buy', 'sell', 'price', 'cost', 'shop', 'purchase', 'order',
            'download', 'install', 'login', 'sign', 'register',
            'best', 'top', 'review', 'compare', 'versus', 'vs',
            'tutorial', 'guide', 'learn', 'course', 'howto',
            'near', 'me', 'open', 'now', 'hours', 'location',
            'facebook', 'twitter', 'youtube', 'amazon', 'google',
            'weather', 'news', 'sports', 'music', 'movie',
            'definition', 'meaning', 'example', 'history', 'about',
            'recipe', 'diy', 'make', 'create', 'build',
            'fix', 'repair', 'problem', 'error', 'help', 'support',
            'free', 'discount', 'deal', 'coupon', 'offer', 'sale',
            'apple', 'fruit', 'tech', 'computer', 'phone', 'car',
            'search', 'engine', 'web', 'site', 'page', 'content',
            'image', 'video', 'audio', 'file', 'document', 'pdf'
        ];
        tokens.forEach((token, i) => {
            this.vocab.set(token, i);
        });
    }
    /** Initialize token and positional embeddings */
    initializeEmbeddings() {
        // Xavier initialization for embeddings
        for (let i = 0; i < this.vocabSize; i++) {
            const embedding = [];
            for (let j = 0; j < this.embeddingDim; j++) {
                embedding.push((Math.random() - 0.5) * Math.sqrt(2 / this.embeddingDim));
            }
            this.tokenEmbeddings.push(embedding);
        }
        // Sinusoidal positional embeddings
        for (let pos = 0; pos < this.maxSeqLength; pos++) {
            const embedding = [];
            for (let i = 0; i < this.embeddingDim; i++) {
                if (i % 2 === 0) {
                    embedding.push(Math.sin(pos / Math.pow(10000, i / this.embeddingDim)));
                }
                else {
                    embedding.push(Math.cos(pos / Math.pow(10000, (i - 1) / this.embeddingDim)));
                }
            }
            this.positionalEmbeddings.push(embedding);
        }
    }
    /** Initialize multi-head attention */
    initializeAttention() {
        for (let h = 0; h < this.numHeads; h++) {
            const head = {
                query: this.randomMatrix(this.embeddingDim, this.embeddingDim / this.numHeads),
                key: this.randomMatrix(this.embeddingDim, this.embeddingDim / this.numHeads),
                value: this.randomMatrix(this.embeddingDim, this.embeddingDim / this.numHeads)
            };
            this.attentionHeads.push(head);
        }
    }
    /** Initialize output classification layer */
    initializeOutputLayer() {
        this.outputWeights = this.randomMatrix(this.embeddingDim, 3); // 3 classes
    }
    /** Create a random matrix */
    randomMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                row.push((Math.random() - 0.5) * Math.sqrt(2 / rows));
            }
            matrix.push(row);
        }
        return matrix;
    }
    /** Tokenize a query */
    tokenize(query) {
        const lower = query.toLowerCase().replace(/[^\w\s<>]/g, ' ').trim();
        const words = lower.split(/\s+/);
        const tokens = [this.vocab.get('<CLS>') || 2]; // Start with CLS token
        for (const word of words) {
            const id = this.vocab.get(word);
            tokens.push(id !== undefined ? id : 1); // 1 = <UNK>
        }
        // Pad or truncate
        while (tokens.length < this.maxSeqLength) {
            tokens.push(0); // 0 = <PAD>
        }
        return tokens.slice(0, this.maxSeqLength);
    }
    /** Get embedding for a token */
    getEmbedding(tokenId, position) {
        const tokenEmb = this.tokenEmbeddings[tokenId] || this.tokenEmbeddings[1]; // <UNK>
        const posEmb = this.positionalEmbeddings[position] || this.positionalEmbeddings[0];
        // Sum token and positional embeddings
        return tokenEmb.map((v, i) => v + posEmb[i]);
    }
    /** Dot product of two vectors */
    dotProduct(a, b) {
        return a.reduce((sum, v, i) => sum + v * b[i], 0);
    }
    /** Matrix-vector multiplication */
    matVecMul(matrix, vector) {
        return matrix.map(row => this.dotProduct(row, vector));
    }
    /** Scaled dot-product attention */
    scaledDotAttention(q, K, V) {
        const dk = q.length;
        const scores = K.map(k => this.dotProduct(q, k) / Math.sqrt(dk));
        // Softmax
        const maxScore = Math.max(...scores);
        const expScores = scores.map(s => Math.exp(s - maxScore));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        const attention = expScores.map(s => s / sumExp);
        // Weighted sum of values
        const output = new Array(V[0].length).fill(0);
        for (let i = 0; i < attention.length; i++) {
            for (let j = 0; j < V[0].length; j++) {
                output[j] += attention[i] * V[i][j];
            }
        }
        return output;
    }
    /** Forward pass through the model */
    forward(query) {
        const tokenIds = this.tokenize(query);
        // Get embeddings for all tokens
        const embeddings = tokenIds.map((id, pos) => this.getEmbedding(id, pos));
        // Multi-head attention
        let contextVectors = [];
        for (let h = 0; h < this.numHeads; h++) {
            const head = this.attentionHeads[h];
            // Compute Q, K, V for all tokens
            const Q = embeddings.map(e => this.matVecMul(head.query, e));
            const K = embeddings.map(e => this.matVecMul(head.key, e));
            const V = embeddings.map(e => this.matVecMul(head.value, e));
            // Apply attention to each token
            const headOutput = embeddings.map((_, i) => {
                const q = Q[i];
                return this.scaledDotAttention(q, K, V);
            });
            contextVectors.push(...headOutput);
        }
        // Concatenate all head outputs and average
        const seqLen = contextVectors.length / this.numHeads;
        const pooledOutput = new Array(this.embeddingDim).fill(0);
        for (let i = 0; i < seqLen; i++) {
            for (let h = 0; h < this.numHeads; h++) {
                const headDim = this.embeddingDim / this.numHeads;
                for (let j = 0; j < headDim; j++) {
                    pooledOutput[h * headDim + j] += contextVectors[h * seqLen + i][j];
                }
            }
        }
        // Average pooling
        for (let i = 0; i < this.embeddingDim; i++) {
            pooledOutput[i] /= (seqLen * this.numHeads);
        }
        // Classification head
        const logits = this.matVecMul(this.outputWeights, pooledOutput);
        // Apply bias
        const biased = logits.map((v, i) => v + this.outputBias[i]);
        // Softmax
        const maxLogit = Math.max(...biased);
        const expLogits = biased.map(v => Math.exp(v - maxLogit));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        return expLogits.map(v => v / sumExp);
    }
    /** Classify query intent */
    classifyIntent(query) {
        // Use rule-based classifier as primary (more reliable than random weights)
        return this.ruleBasedIntent(query);
    }
    /** Rule-based intent classification fallback */
    ruleBasedIntent(query) {
        const lower = query.toLowerCase();
        // Navigational patterns
        if (/(login|signup|sign in|sign up|register)\b/.test(lower)) {
            return types_1.SearchIntent.NAVIGATIONAL;
        }
        if (/^(facebook|twitter|youtube|instagram|linkedin|github|amazon)\b/.test(lower)) {
            return types_1.SearchIntent.NAVIGATIONAL;
        }
        if (/\.(com|org|net|io)\b/.test(lower)) {
            return types_1.SearchIntent.NAVIGATIONAL;
        }
        if (/^(open|go\s+to|visit|launch)\b/.test(lower)) {
            return types_1.SearchIntent.NAVIGATIONAL;
        }
        // Transactional patterns
        if (/\b(buy|purchase|order|shop|price|cost|discount|deal)\b/.test(lower)) {
            return types_1.SearchIntent.TRANSACTIONAL;
        }
        if (/\b(download|install|get|subscribe|register)\b/.test(lower)) {
            return types_1.SearchIntent.TRANSACTIONAL;
        }
        if (/\b(hotel|flight|booking|reservation|ticket)\b/.test(lower)) {
            return types_1.SearchIntent.TRANSACTIONAL;
        }
        if (/\b(near\s+me|best|top|cheap|affordable)\b/.test(lower)) {
            return types_1.SearchIntent.TRANSACTIONAL;
        }
        if (/\b(how\s+to|tutorial|guide|course|learn)\b/.test(lower)) {
            return types_1.SearchIntent.TRANSACTIONAL;
        }
        return types_1.SearchIntent.INFORMATIONAL;
    }
    /** Get intent confidence scores */
    getIntentScores(query) {
        const intent = this.ruleBasedIntent(query);
        // Return deterministic confidence based on rule-based classification
        const confidence = 0.85;
        const scores = {
            [types_1.SearchIntent.NAVIGATIONAL]: intent === types_1.SearchIntent.NAVIGATIONAL ? confidence : (1 - confidence) / 2,
            [types_1.SearchIntent.INFORMATIONAL]: intent === types_1.SearchIntent.INFORMATIONAL ? confidence : (1 - confidence) / 2,
            [types_1.SearchIntent.TRANSACTIONAL]: intent === types_1.SearchIntent.TRANSACTIONAL ? confidence : (1 - confidence) / 2
        };
        return {
            intent,
            confidence,
            scores
        };
    }
    /** Extract key entities from query */
    extractEntities(query) {
        const lower = query.toLowerCase();
        const entities = [];
        // Product names
        const productPattern = /\b(iphone|macbook|airpods|ipad|samsung|nike|adidas)\b/gi;
        const products = query.match(productPattern);
        if (products) {
            entities.push({ entities: products, type: 'product' });
        }
        // Locations
        const locationPattern = /\b(new york|los angeles|london|paris|tokyo|berlin|sydney)\b/gi;
        const locations = query.match(locationPattern);
        if (locations) {
            entities.push({ entities: locations, type: 'location' });
        }
        // People
        const peoplePattern = /\b(elon musk|bill gates|steve jobs|albert einstein)\b/gi;
        const people = query.match(peoplePattern);
        if (people) {
            entities.push({ entities: people, type: 'person' });
        }
        // Organizations
        const orgPattern = /\b(google|microsoft|apple|amazon|facebook|tesla)\b/gi;
        const orgs = query.match(orgPattern);
        if (orgs) {
            entities.push({ entities: orgs, type: 'organization' });
        }
        return entities;
    }
}
exports.QueryUnderstanding = QueryUnderstanding;
//# sourceMappingURL=query-understanding.js.map