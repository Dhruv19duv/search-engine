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
export declare class QueryUnderstanding {
    private vocabSize;
    private embeddingDim;
    private maxSeqLength;
    private numHeads;
    private vocab;
    private tokenEmbeddings;
    private positionalEmbeddings;
    private attentionHeads;
    private outputWeights;
    private outputBias;
    constructor();
    /** Initialize vocabulary with common tokens */
    private initializeVocab;
    /** Initialize token and positional embeddings */
    private initializeEmbeddings;
    /** Initialize multi-head attention */
    private initializeAttention;
    /** Initialize output classification layer */
    private initializeOutputLayer;
    /** Create a random matrix */
    private randomMatrix;
    /** Tokenize a query */
    private tokenize;
    /** Get embedding for a token */
    private getEmbedding;
    /** Dot product of two vectors */
    private dotProduct;
    /** Matrix-vector multiplication */
    private matVecMul;
    /** Scaled dot-product attention */
    private scaledDotAttention;
    /** Forward pass through the model */
    private forward;
    /** Classify query intent */
    classifyIntent(query: string): SearchIntent;
    /** Rule-based intent classification fallback */
    private ruleBasedIntent;
    /** Get intent confidence scores */
    getIntentScores(query: string): {
        intent: SearchIntent;
        confidence: number;
        scores: Record<string, number>;
    };
    /** Extract key entities from query */
    extractEntities(query: string): {
        entities: string[];
        type: string;
    }[];
}
//# sourceMappingURL=query-understanding.d.ts.map