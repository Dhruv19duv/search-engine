/**
 * SearchEngine - Main entry point
 *
 * Integrates all components:
 * - Web Crawler (BFS + priority queue)
 * - Indexer with inverted index + delta index for real-time updates
 * - Tokenizer & Stemmer
 * - Query Processor (boolean, phrase, fuzzy)
 * - Ranker (BM25, TF-IDF, PageRank, freshness)
 * - Spell Corrector & Autocomplete
 * - ML Components (BERT intent, LambdaMART LTR, DPR, semantic drift, spam filter)
 * - Snippet Generator (MMR-based)
 * - Query Server (HTTP, clustering, caching)
 */
import { SearchResponse, IndexStats } from './types';
export declare class SearchEngine {
    private crawler;
    private indexer;
    private queryProcessor;
    private ranker;
    private spellCorrector;
    private snippetGenerator;
    private queryUnderstanding;
    private learningToRank;
    private denseRetrieval;
    private semanticDriftDetector;
    private spamFilter;
    private server;
    constructor();
    /** Seed sample data for demonstration */
    private seedSampleData;
    /** Execute a search query */
    search(query: string, page?: number, pageSize?: number): Promise<SearchResponse>;
    /** Get autocomplete suggestions */
    getAutocomplete(prefix: string): string[];
    /** Get query suggestions */
    getSuggestions(query: string): string[];
    /** Crawl the web (starts async) */
    startCrawling(): Promise<void>;
    /** Reindex all documents */
    reindex(): Promise<void>;
    /** Swap index (zero-downtime) */
    swapIndex(): Promise<void>;
    /** Get index stats */
    getIndexStats(): IndexStats;
    /** Get index size */
    getIndexSizeBytes(): number;
    /** Get drift info */
    getDriftInfo(): any;
    /** Start the HTTP server */
    startServer(port?: number): void;
    /** Stop the server */
    stopServer(): void;
}
//# sourceMappingURL=index.d.ts.map