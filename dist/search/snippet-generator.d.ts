/**
 * Snippet Generator
 *
 * Generates search result snippets using:
 * - MMR (Maximal Marginal Relevance) extractive summarization
 * - Query term highlighting with positional alignment
 * - Sentence scoring by relevance and diversity
 * - Dynamic snippet length based on query
 */
export declare class SnippetGenerator {
    private maxSnippetLength;
    private minSnippetLength;
    private lambda;
    constructor(maxLength?: number, minLength?: number, lambda?: number);
    /** Generate a snippet for a document given a query */
    generateSnippet(content: string, query: string, title: string): string;
    /** Split content into sentences */
    private splitSentences;
    /** Extract meaningful query terms */
    private extractQueryTerms;
    /** Check if word is a stop word */
    private isStopWord;
    /** MMR scoring for sentences */
    private mmrScoring;
    /** Compute similarity between a sentence and the query */
    private sentenceQuerySimilarity;
    /** Compute cosine similarity between two sentences using word overlap */
    private sentenceSimilarity;
    /** Build the final snippet from scored sentences */
    private buildSnippet;
    /** Truncate text to fit max length (at sentence boundary if possible) */
    private truncateToFit;
    /** Highlight query terms in snippet */
    private highlightTerms;
    /** Generate a summary highlighting metadata */
    generateMetadataSnippet(doc: {
        title: string;
        content: string;
        domain: string;
        timestamp: Date;
    }, query: string): string;
    /** Batch generate snippets */
    generateSnippets(docs: Array<{
        title: string;
        content: string;
    }>, query: string): string[];
}
//# sourceMappingURL=snippet-generator.d.ts.map