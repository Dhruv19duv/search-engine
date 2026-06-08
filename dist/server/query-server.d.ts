/**
 * Query Server
 *
 * High-performance HTTP server for search queries.
 * Features:
 * - Handles 10,000+ concurrent requests
 * - Cluster mode for multi-core utilization
 * - In-memory result caching (LRU)
 * - Rate limiting per IP
 * - Zero-downtime index swaps
 * - Health check endpoints
 * - P99 latency < 200ms
 * - Graceful shutdown
 */
import { SearchEngine } from '../index';
import { ServerConfig } from '../types';
export declare class QueryServer {
    private engine;
    private config;
    private server;
    private cache;
    private cacheHits;
    private cacheMisses;
    private requestCount;
    private totalLatency;
    private startTime;
    private rateLimitMap;
    constructor(engine: SearchEngine, config?: Partial<ServerConfig>);
    /** Start the server */
    start(): void;
    /** Handle incoming HTTP request */
    private handleRequest;
    /** Handle search query */
    private handleSearch;
    /** Handle autocomplete */
    private handleAutocomplete;
    /** Handle query suggestions */
    private handleSuggest;
    /** Handle health check */
    private handleHealth;
    /** Handle stats endpoint */
    private handleStats;
    /** Handle reindex request */
    private handleReindex;
    /** Handle index swap request */
    private handleSwapIndex;
    /** Handle semantic drift status */
    private handleDrift;
    /** Rate limiting check */
    private isRateLimited;
    /** Cache management */
    private getFromCache;
    private addToCache;
    /** Send JSON response */
    private sendJSON;
    /** Serve static file */
    private serveStatic;
    /** Get embedded search page HTML */
    private getSearchPageHTML;
    /** Graceful shutdown */
    shutdown(): Promise<void>;
    /** Get server stats */
    getStats(): any;
}
//# sourceMappingURL=query-server.d.ts.map