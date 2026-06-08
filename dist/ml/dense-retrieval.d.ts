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
export declare class DenseRetrieval {
    private embeddingDim;
    private queryEncoder;
    private docEncodings;
    private annIndex;
    private numCentroids;
    private centroids;
    private tokenizer;
    private projectionMatrix;
    constructor(embeddingDim?: number);
    /** Initialize random projection matrix */
    private initializeProjection;
    /** Initialize centroids for product quantization */
    private initializeCentroids;
    /** Encode text to embedding vector */
    encode(text: string): number[];
    /** Simple hash function for tokens */
    private hashToken;
    /** Index a document */
    indexDocument(docId: number, text: string): void;
    /** Product quantization: compress embedding into code + residual */
    private quantize;
    /** Cosine distance between two vectors */
    private cosineDistance;
    /** Search for similar documents */
    search(query: string, topK?: number): Array<{
        docId: number;
        score: number;
        text: string;
    }>;
    /** Cosine similarity */
    private cosineSimilarity;
    /** ANN search using product quantization (faster, approximate) */
    annSearch(query: string, topK?: number, nprobe?: number): Array<{
        docId: number;
        score: number;
    }>;
    /** Hybrid search: combine dense and sparse scores */
    hybridSearch(query: string, bm25Scores: Map<number, number>, topK?: number, alpha?: number): Array<{
        docId: number;
        score: number;
    }>;
    /** Get embedding statistics */
    getStats(): {
        numDocuments: number;
        embeddingDim: number;
        indexSize: number;
    };
    /** Clear index */
    clear(): void;
}
//# sourceMappingURL=dense-retrieval.d.ts.map