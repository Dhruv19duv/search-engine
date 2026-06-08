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
import { SegmentTree, TemporalData } from '../structures/segment-tree';

interface TermEmbedding {
  term: string;
  embedding: number[];
  velocity: number[]; // rate of change of embedding
  acceleration: number[]; // acceleration of embedding change
}

interface CoOccurrence {
  term: string;
  count: number;
  contexts: Map<string, number>; // context word -> count
}

interface TimeWindow {
  startTime: number;
  endTime: number;
  embeddings: Map<string, number[]>;
  centroid: number[];
  documentCount: number;
}

export class SemanticDriftDetector {
  private windowSizeMs: number;
  private embeddingDim: number;
  private driftThreshold: number;
  private windows: TimeWindow[];
  private termHistory: Map<string, TermEmbedding>;
  private coOccurrenceMatrix: Map<string, Map<string, number>>;
  private segmentTree: SegmentTree;
  private totalDocuments: number;
  private contextWindowSize: number;

  constructor(
    windowSizeDays: number = 30,
    embeddingDim: number = 64,
    driftThreshold: number = 0.35
  ) {
    this.windowSizeMs = windowSizeDays * 24 * 60 * 60 * 1000;
    this.embeddingDim = embeddingDim;
    this.driftThreshold = driftThreshold;
    this.windows = [];
    this.termHistory = new Map();
    this.coOccurrenceMatrix = new Map();
    this.segmentTree = new SegmentTree([]);
    this.totalDocuments = 0;
    this.contextWindowSize = 5; // words before/after target
  }

  /** Process a document for temporal word embedding training */
  processDocument(
    docId: number,
    text: string,
    timestamp: Date
  ): void {
    const ts = timestamp.getTime();
    const tokens = this.tokenize(text);

    // Update co-occurrence matrix
    for (let i = 0; i < tokens.length; i++) {
      const term = tokens[i];
      if (!this.coOccurrenceMatrix.has(term)) {
        this.coOccurrenceMatrix.set(term, new Map());
      }

      const contextMap = this.coOccurrenceMatrix.get(term)!;

      // Get surrounding context words
      const start = Math.max(0, i - this.contextWindowSize);
      const end = Math.min(tokens.length - 1, i + this.contextWindowSize);

      for (let j = start; j <= end; j++) {
        if (i !== j) {
          const ctx = tokens[j];
          contextMap.set(ctx, (contextMap.get(ctx) || 0) + 1);
        }
      }
    }

    // Find or create time window
    const windowIdx = this.findOrCreateWindow(ts);

    // Train embeddings incrementally
    this.trainWindowEmbeddings(windowIdx, tokens);

    this.totalDocuments++;

    // Rebuild segment tree periodically
    if (this.totalDocuments % 100 === 0) {
      this.rebuildSegmentTree();
    }
  }

  /** Tokenize and normalize text */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !this.isStopWord(t));
  }

  /** Check for stop words */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
      'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some',
      'them', 'than', 'what', 'when', 'where', 'which', 'while', 'who', 'will',
      'with', 'would', 'about', 'after', 'before', 'between', 'into', 'over',
      'just', 'like', 'make', 'many', 'more', 'most', 'much', 'only', 'other',
      'such', 'than', 'that', 'their', 'then', 'there', 'these', 'they',
      'this', 'those', 'through', 'under', 'very', 'were'
    ]);
    return stopWords.has(word);
  }

  /** Find or create the appropriate time window for a timestamp */
  private findOrCreateWindow(timestamp: number): number {
    for (let i = 0; i < this.windows.length; i++) {
      if (timestamp >= this.windows[i].startTime && timestamp < this.windows[i].endTime) {
        this.windows[i].documentCount++;
        return i;
      }
    }

    // Create new window
    const windowStart = Math.floor(timestamp / this.windowSizeMs) * this.windowSizeMs;
    const newWindow: TimeWindow = {
      startTime: windowStart,
      endTime: windowStart + this.windowSizeMs,
      embeddings: new Map(),
      centroid: new Array(this.embeddingDim).fill(0),
      documentCount: 1
    };

    this.windows.push(newWindow);
    this.windows.sort((a, b) => a.startTime - b.startTime);
    return this.windows.indexOf(newWindow);
  }

  /** Train word embeddings for a specific time window */
  private trainWindowEmbeddings(windowIdx: number, tokens: string[]): void {
    const window = this.windows[windowIdx];
    const vocab = new Set(tokens);

    // Initialize random embeddings for new terms
    for (const term of vocab) {
      if (!window.embeddings.has(term)) {
        window.embeddings.set(term, this.randomEmbedding());
      }
    }

    // Simplified word2vec training (skip-gram with negative sampling)
    const learningRate = 0.01;
    for (let i = 0; i < tokens.length; i++) {
      const target = tokens[i];
      const targetEmb = window.embeddings.get(target)!;

      // Positive context window
      const start = Math.max(0, i - this.contextWindowSize);
      const end = Math.min(tokens.length - 1, i + this.contextWindowSize);

      for (let j = start; j <= end; j++) {
        if (i === j) continue;
        const context = tokens[j];
        const contextEmb = window.embeddings.get(context);

        if (!contextEmb) continue;

        // Positive sample update
        const dotProduct = this.dotProduct(targetEmb, contextEmb);
        const sigmoid = 1 / (1 + Math.exp(-dotProduct));
        const grad = (1 - sigmoid) * learningRate;

        for (let k = 0; k < this.embeddingDim; k++) {
          targetEmb[k] += grad * contextEmb[k];
          contextEmb[k] += grad * targetEmb[k];
        }
      }

      // Negative samples (simplified: use random noise)
      for (let s = 0; s < 5; s++) {
        const negTerm = this.getRandomTerm(tokens);
        if (negTerm === target) continue;

        const negEmb = window.embeddings.get(negTerm);
        if (!negEmb) continue;

        const dotProduct = this.dotProduct(targetEmb, negEmb);
        const sigmoid = 1 / (1 + Math.exp(-dotProduct));
        const grad = -sigmoid * learningRate;

        for (let k = 0; k < this.embeddingDim; k++) {
          targetEmb[k] += grad * negEmb[k];
        }
      }
    }

    // Update window centroid
    this.updateWindowCentroid(window);
  }

  /** Update the centroid embedding for a window */
  private updateWindowCentroid(window: TimeWindow): void {
    const terms = Array.from(window.embeddings.keys());
    if (terms.length === 0) return;

    const centroid = new Array(this.embeddingDim).fill(0);

    for (const term of terms) {
      const emb = window.embeddings.get(term)!;
      for (let i = 0; i < this.embeddingDim; i++) {
        centroid[i] += emb[i];
      }
    }

    // Average
    for (let i = 0; i < this.embeddingDim; i++) {
      centroid[i] /= terms.length;
    }

    window.centroid = centroid;
  }

  /** Generate a random embedding vector */
  private randomEmbedding(): number[] {
    const emb: number[] = [];
    for (let i = 0; i < this.embeddingDim; i++) {
      emb.push((Math.random() - 0.5) * 0.1);
    }
    // Normalize
    const norm = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? emb.map(v => v / norm) : emb;
  }

  /** Get a random term from the vocabulary */
  private getRandomTerm(exclude: string[]): string {
    const allTerms = Array.from(this.coOccurrenceMatrix.keys());
    const filtered = allTerms.filter(t => !exclude.includes(t));
    if (filtered.length === 0) return 'the';
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  /** Dot product of two vectors */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }

  /** Cosine similarity */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = this.dotProduct(a, b);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return normA * normB > 0 ? dot / (normA * normB) : 0;
  }

  /** Detect semantic drift for a specific term */
  detectDrift(term: string): DriftResult {
    const lower = term.toLowerCase();

    // Get embeddings across all windows
    const windowEmbeddings: Array<{ windowIdx: number; embedding: number[] }> = [];

    for (let i = 0; i < this.windows.length; i++) {
      const emb = this.windows[i].embeddings.get(lower);
      if (emb) {
        windowEmbeddings.push({ windowIdx: i, embedding: emb });
      }
    }

    if (windowEmbeddings.length < 2) {
      return {
        term: lower,
        driftDetected: false,
        driftMagnitude: 0,
        previousCentroid: [],
        currentCentroid: [],
        windowsAnalyzed: windowEmbeddings.length,
        timestamp: new Date()
      };
    }

    // Compare most recent two non-empty windows
    const current = windowEmbeddings[windowEmbeddings.length - 1];
    const previous = windowEmbeddings[windowEmbeddings.length - 2];

    // Compute centroid shift magnitude
    const driftMagnitude = 1 - this.cosineSimilarity(
      current.embedding,
      previous.embedding
    );

    // Update term history
    if (!this.termHistory.has(lower)) {
      this.termHistory.set(lower, {
        term: lower,
        embedding: current.embedding,
        velocity: new Array(this.embeddingDim).fill(0),
        acceleration: new Array(this.embeddingDim).fill(0)
      });
    }

    const history = this.termHistory.get(lower)!;
    history.velocity = current.embedding.map((v, i) => v - history.embedding[i]);
    history.acceleration = history.velocity.map(
      (v, i) => v - (history.embedding[i] - (history.embedding[i] - v))
    );
    history.embedding = current.embedding;

    return {
      term: lower,
      driftDetected: driftMagnitude > this.driftThreshold,
      driftMagnitude,
      previousCentroid: previous.embedding,
      currentCentroid: current.embedding,
      windowsAnalyzed: windowEmbeddings.length,
      timestamp: new Date()
    };
  }

  /** Detect drift for all monitored terms */
  detectAllDrift(): DriftResult[] {
    const terms = Array.from(this.coOccurrenceMatrix.keys());
    return terms.map(term => this.detectDrift(term));
  }

  /** Get drift-affected documents for re-ranking */
  getDriftedTerms(threshold?: number): string[] {
    const t = threshold || this.driftThreshold;
    const driftedTerms: string[] = [];

    for (const term of this.coOccurrenceMatrix.keys()) {
      const drift = this.detectDrift(term);
      if (drift.driftDetected && drift.driftMagnitude > t) {
        driftedTerms.push(term);
      }
    }

    return driftedTerms;
  }

  /** Compute drift score for a document (how much its content is affected by drift) */
  computeDocumentDriftScore(text: string): number {
    const tokens = this.tokenize(text);
    const driftedTerms = this.getDriftedTerms();
    let driftScore = 0;
    let matchCount = 0;

    for (const token of tokens) {
      if (driftedTerms.includes(token)) {
        const drift = this.detectDrift(token);
        driftScore += drift.driftMagnitude;
        matchCount++;
      }
    }

    return matchCount > 0 ? driftScore / matchCount : 0;
  }

  /** Rebuild segment tree from current windows */
  private rebuildSegmentTree(): void {
    const timestamps = this.windows.map(w => w.startTime);
    this.segmentTree = new SegmentTree(timestamps);

    for (let i = 0; i < this.windows.length; i++) {
      const window = this.windows[i];
      this.segmentTree.update(i, {
        timestamp: window.startTime,
        termFrequency: window.documentCount * 10, // approximate
        docCount: window.documentCount,
        avgEmbedding: window.centroid
      });
    }
  }

  /** Query temporal range for drift analysis */
  queryTemporalRange(
    startTime: number,
    endTime: number
  ): TemporalData {
    return this.segmentTree.queryByTime(startTime, endTime);
  }

  /** Get all time windows */
  getWindows(): TimeWindow[] {
    return this.windows;
  }

  /** Get the number of terms being tracked */
  getTrackedTermCount(): number {
    return this.coOccurrenceMatrix.size;
  }

  /** Get drift statistics */
  getStats(): {
    totalWindows: number;
    trackedTerms: number;
    driftedTerms: number;
    averageDriftMagnitude: number;
  } {
    const drifts = this.detectAllDrift();
    const drifted = drifts.filter(d => d.driftDetected);
    const avgMagnitude = drifts.length > 0
      ? drifts.reduce((s, d) => s + d.driftMagnitude, 0) / drifts.length
      : 0;

    return {
      totalWindows: this.windows.length,
      trackedTerms: this.coOccurrenceMatrix.size,
      driftedTerms: drifted.length,
      averageDriftMagnitude: avgMagnitude
    };
  }

  /** Clear all data */
  clear(): void {
    this.windows = [];
    this.termHistory.clear();
    this.coOccurrenceMatrix.clear();
    this.totalDocuments = 0;
  }
}
