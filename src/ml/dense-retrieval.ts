/**
 * Dense Retrieval (DPR)
 * 
 * Bi-encoder that embeds queries and documents into dense vector space.
 * Uses FAISS-style approximate nearest neighbor (ANN) search.
 * Retrieves semantic matches beyond keyword overlap.
 * 
 * Components:
 * - Query encoder: Maps query to embedding
 * - Document encoder: Maps document to embedding
 * - ANN index: Product quantization for efficient similarity search
 * - Hybrid search: Combines dense + sparse (BM25) scores
 */

import { Tokenizer } from '../indexer/tokenizer';

interface EncodedDocument {
  docId: number;
  embedding: number[];
  text: string;
}

interface ANNIndexEntry {
  docId: number;
  code: number[]; // Product quantized code
  residual: number[];
}

export class DenseRetrieval {
  private embeddingDim: number;
  private queryEncoder: Map<string, number[]>;
  private docEncodings: Map<number, EncodedDocument>;
  private annIndex: ANNIndexEntry[];
  private numCentroids: number;
  private centroids: number[][];
  private tokenizer: Tokenizer;
  private projectionMatrix: number[][];

  constructor(embeddingDim: number = 256) {
    this.embeddingDim = embeddingDim;
    this.queryEncoder = new Map();
    this.docEncodings = new Map();
    this.annIndex = [];
    this.numCentroids = 256;
    this.centroids = [];
    this.tokenizer = new Tokenizer();
    this.projectionMatrix = [];

    this.initializeProjection();
    this.initializeCentroids();
  }

  /** Initialize random projection matrix */
  private initializeProjection(): void {
    for (let i = 0; i < this.embeddingDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < 300; j++) { // Input feature dim
        row.push((Math.random() - 0.5) * Math.sqrt(2 / 300));
      }
      this.projectionMatrix.push(row);
    }
  }

  /** Initialize centroids for product quantization */
  private initializeCentroids(): void {
    for (let i = 0; i < this.numCentroids; i++) {
      const centroid: number[] = [];
      for (let j = 0; j < this.embeddingDim; j++) {
        centroid.push((Math.random() - 0.5) * 2);
      }
      const norm = Math.sqrt(centroid.reduce((s, v) => s + v * v, 0));
      this.centroids.push(centroid.map(v => v / norm));
    }
  }

  /** Encode text to embedding vector */
  encode(text: string): number[] {
    // Simplified bi-encoder: use token statistics + projection
    const tokens = this.tokenizer.tokenize(text);
    const tf = new Map<string, number>();
    
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Build bag-of-embeddings
    const inputVector = new Array(300).fill(0);
    for (const [token, freq] of tf) {
      const hash = this.hashToken(token);
      for (let i = 0; i < 10; i++) {
        const idx = Math.abs((hash >> (i * 5)) % 300);
        inputVector[idx] += Math.log(1 + freq);
      }
    }

    // Normalize
    const norm = Math.sqrt(inputVector.reduce((s, v) => s + v * v, 0));
    const normalized = norm > 0 ? inputVector.map(v => v / norm) : inputVector;

    // Project to embedding dimension
    const embedding = this.projectionMatrix.map(row => {
      return row.reduce((sum, v, i) => sum + v * normalized[i], 0);
    });

    // Final normalization
    const embNorm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embNorm > 0 ? embedding.map(v => v / embNorm) : embedding;
  }

  /** Simple hash function for tokens */
  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /** Index a document */
  indexDocument(docId: number, text: string): void {
    const embedding = this.encode(text);
    
    this.docEncodings.set(docId, {
      docId,
      embedding,
      text
    });

    // Add to ANN index with product quantization
    const quantized = this.quantize(embedding);
    this.annIndex.push(quantized);
  }

  /** Product quantization: compress embedding into code + residual */
  private quantize(embedding: number[]): ANNIndexEntry {
    // Find nearest centroid
    let bestCentroid = -1;
    let bestDist = Infinity;

    for (let i = 0; i < this.centroids.length; i++) {
      const dist = this.cosineDistance(embedding, this.centroids[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestCentroid = i;
      }
    }

    // Compute residual
    const residual = embedding.map((v, i) => v - this.centroids[bestCentroid][i]);

    // Encode centroid index
    const code: number[] = [];
    for (let i = 0; i < this.embeddingDim; i += 2) {
      // Simple scalar quantization per dimension pair
      const pair1 = residual[i] || 0;
      const pair2 = residual[i + 1] || 0;
      const quantized = Math.round(pair1 * 127) * 128 + Math.round(pair2 * 127);
      code.push(quantized);
    }

    return {
      docId: this.docEncodings.size, // placeholder
      code,
      residual
    };
  }

  /** Cosine distance between two vectors */
  private cosineDistance(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    return 1 - dot; // cosine distance = 1 - cosine similarity
  }

  /** Search for similar documents */
  search(query: string, topK: number = 10): Array<{ docId: number; score: number; text: string }> {
    const queryEmbedding = this.encode(query);

    // Compute scores for all indexed documents
    const scores: Array<{ docId: number; score: number; text: string }> = [];

    for (const [docId, doc] of this.docEncodings) {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      scores.push({
        docId,
        score: similarity,
        text: doc.text.substring(0, 100)
      });
    }

    // Sort by score descending and return top K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** Cosine similarity */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return normA * normB > 0 ? dot / (normA * normB) : 0;
  }

  /** ANN search using product quantization (faster, approximate) */
  annSearch(query: string, topK: number = 10, nprobe: number = 10): Array<{ docId: number; score: number }> {
    const queryEmbedding = this.encode(query);

    // Find nearest centroids
    const centroidDists = this.centroids.map((c, i) => ({
      index: i,
      dist: this.cosineDistance(queryEmbedding, c)
    }));
    centroidDists.sort((a, b) => a.dist - b.dist);

    // Search within nearest centroids
    const candidates = new Map<number, number>();

    for (let c = 0; c < Math.min(nprobe, centroidDists.length); c++) {
      const centroid = this.centroids[centroidDists[c].index];

      for (const entry of this.annIndex) {
        const doc = this.docEncodings.get(entry.docId);
        if (!doc) continue;

        // Approximate: compare against centroid + residual
        const approx = centroid.map((v, i) => v + entry.residual[i]);
        const dist = this.cosineDistance(queryEmbedding, approx);

        if (!candidates.has(entry.docId) || dist < candidates.get(entry.docId)!) {
          candidates.set(entry.docId, dist);
        }
      }
    }

    return Array.from(candidates.entries())
      .map(([docId, dist]) => ({ docId, score: 1 - dist }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** Hybrid search: combine dense and sparse scores */
  hybridSearch(
    query: string,
    bm25Scores: Map<number, number>,
    topK: number = 10,
    alpha: number = 0.5
  ): Array<{ docId: number; score: number }> {
    const denseResults = this.search(query, this.docEncodings.size);

    // Normalize scores
    const denseMap = new Map<number, number>();
    const maxDense = denseResults.length > 0 ? denseResults[0].score : 1;
    
    for (const r of denseResults) {
      denseMap.set(r.docId, r.score / maxDense);
    }

    const maxBM25 = Math.max(...Array.from(bm25Scores.values()), 1);
    const scores: Array<{ docId: number; score: number }> = [];

    const allDocIds = new Set([
      ...denseResults.map(r => r.docId),
      ...bm25Scores.keys()
    ]);

    for (const docId of allDocIds) {
      const denseScore = denseMap.get(docId) || 0;
      const bm25Score = (bm25Scores.get(docId) || 0) / maxBM25;
      
      scores.push({
        docId,
        score: alpha * denseScore + (1 - alpha) * bm25Score
      });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** Get embedding statistics */
  getStats(): { numDocuments: number; embeddingDim: number; indexSize: number } {
    return {
      numDocuments: this.docEncodings.size,
      embeddingDim: this.embeddingDim,
      indexSize: this.annIndex.length
    };
  }

  /** Clear index */
  clear(): void {
    this.docEncodings.clear();
    this.annIndex = [];
  }
}
