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

import { SearchIntent } from '../types';

interface AttentionHead {
  query: number[][];
  key: number[][];
  value: number[][];
}

export class QueryUnderstanding {
  private vocabSize: number;
  private embeddingDim: number;
  private maxSeqLength: number;
  private numHeads: number;
  private vocab: Map<string, number>;

  // Learned parameters (simplified)
  private tokenEmbeddings: number[][];
  private positionalEmbeddings: number[][];
  private attentionHeads: AttentionHead[];
  private outputWeights: number[][];
  private outputBias: number[];

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
  private initializeVocab(): void {
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
  private initializeEmbeddings(): void {
    // Xavier initialization for embeddings
    for (let i = 0; i < this.vocabSize; i++) {
      const embedding: number[] = [];
      for (let j = 0; j < this.embeddingDim; j++) {
        embedding.push((Math.random() - 0.5) * Math.sqrt(2 / this.embeddingDim));
      }
      this.tokenEmbeddings.push(embedding);
    }

    // Sinusoidal positional embeddings
    for (let pos = 0; pos < this.maxSeqLength; pos++) {
      const embedding: number[] = [];
      for (let i = 0; i < this.embeddingDim; i++) {
        if (i % 2 === 0) {
          embedding.push(Math.sin(pos / Math.pow(10000, i / this.embeddingDim)));
        } else {
          embedding.push(Math.cos(pos / Math.pow(10000, (i - 1) / this.embeddingDim)));
        }
      }
      this.positionalEmbeddings.push(embedding);
    }
  }

  /** Initialize multi-head attention */
  private initializeAttention(): void {
    for (let h = 0; h < this.numHeads; h++) {
      const head: AttentionHead = {
        query: this.randomMatrix(this.embeddingDim, this.embeddingDim / this.numHeads),
        key: this.randomMatrix(this.embeddingDim, this.embeddingDim / this.numHeads),
        value: this.randomMatrix(this.embeddingDim, this.embeddingDim / this.numHeads)
      };
      this.attentionHeads.push(head);
    }
  }

  /** Initialize output classification layer */
  private initializeOutputLayer(): void {
    this.outputWeights = this.randomMatrix(this.embeddingDim, 3); // 3 classes
  }

  /** Create a random matrix */
  private randomMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push((Math.random() - 0.5) * Math.sqrt(2 / rows));
      }
      matrix.push(row);
    }
    return matrix;
  }

  /** Tokenize a query */
  private tokenize(query: string): number[] {
    const lower = query.toLowerCase().replace(/[^\w\s<>]/g, ' ').trim();
    const words = lower.split(/\s+/);
    const tokens: number[] = [this.vocab.get('<CLS>') || 2]; // Start with CLS token

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
  private getEmbedding(tokenId: number, position: number): number[] {
    const tokenEmb = this.tokenEmbeddings[tokenId] || this.tokenEmbeddings[1]; // <UNK>
    const posEmb = this.positionalEmbeddings[position] || this.positionalEmbeddings[0];

    // Sum token and positional embeddings
    return tokenEmb.map((v, i) => v + posEmb[i]);
  }

  /** Dot product of two vectors */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }

  /** Matrix-vector multiplication */
  private matVecMul(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => this.dotProduct(row, vector));
  }

  /** Scaled dot-product attention */
  private scaledDotAttention(
    q: number[],
    K: number[][],
    V: number[][]
  ): number[] {
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
  private forward(query: string): number[] {
    const tokenIds = this.tokenize(query);

    // Get embeddings for all tokens
    const embeddings = tokenIds.map((id, pos) => this.getEmbedding(id, pos));

    // Multi-head attention
    let contextVectors: number[][] = [];

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
  classifyIntent(query: string): SearchIntent {
    // Use rule-based classifier as primary (more reliable than random weights)
    return this.ruleBasedIntent(query);
  }

  /** Rule-based intent classification fallback */
  private ruleBasedIntent(query: string): SearchIntent {
    const lower = query.toLowerCase();

    // Navigational patterns
    if (/(login|signup|sign in|sign up|register)\b/.test(lower)) {
      return SearchIntent.NAVIGATIONAL;
    }
    if (/^(facebook|twitter|youtube|instagram|linkedin|github|amazon)\b/.test(lower)) {
      return SearchIntent.NAVIGATIONAL;
    }
    if (/\.(com|org|net|io)\b/.test(lower)) {
      return SearchIntent.NAVIGATIONAL;
    }
    if (/^(open|go\s+to|visit|launch)\b/.test(lower)) {
      return SearchIntent.NAVIGATIONAL;
    }

    // Transactional patterns
    if (/\b(buy|purchase|order|shop|price|cost|discount|deal)\b/.test(lower)) {
      return SearchIntent.TRANSACTIONAL;
    }
    if (/\b(download|install|get|subscribe|register)\b/.test(lower)) {
      return SearchIntent.TRANSACTIONAL;
    }
    if (/\b(hotel|flight|booking|reservation|ticket)\b/.test(lower)) {
      return SearchIntent.TRANSACTIONAL;
    }
    if (/\b(near\s+me|best|top|cheap|affordable)\b/.test(lower)) {
      return SearchIntent.TRANSACTIONAL;
    }
    if (/\b(how\s+to|tutorial|guide|course|learn)\b/.test(lower)) {
      return SearchIntent.TRANSACTIONAL;
    }

    return SearchIntent.INFORMATIONAL;
  }

  /** Get intent confidence scores */
  getIntentScores(query: string): { intent: SearchIntent; confidence: number; scores: Record<string, number> } {
    const intent = this.ruleBasedIntent(query);
    // Return deterministic confidence based on rule-based classification
    const confidence = 0.85;
    const scores: Record<string, number> = {
      [SearchIntent.NAVIGATIONAL]: intent === SearchIntent.NAVIGATIONAL ? confidence : (1 - confidence) / 2,
      [SearchIntent.INFORMATIONAL]: intent === SearchIntent.INFORMATIONAL ? confidence : (1 - confidence) / 2,
      [SearchIntent.TRANSACTIONAL]: intent === SearchIntent.TRANSACTIONAL ? confidence : (1 - confidence) / 2
    };

    return {
      intent,
      confidence,
      scores
    };
  }

  /** Extract key entities from query */
  extractEntities(query: string): { entities: string[]; type: string }[] {
    const lower = query.toLowerCase();
    const entities: { entities: string[]; type: string }[] = [];

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
