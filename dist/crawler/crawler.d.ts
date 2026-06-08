/**
 * Web Crawler
 *
 * BFS-based crawler with priority queue for PageRank-biased URL ordering.
 * Features:
 * - BFS frontier with min-heap prioritizing by PageRank
 * - Politeness delays between requests to same domain
 * - robots.txt parsing and respect
 * - Bloom filter for O(1) visited URL checking
 * - Rate limiting per domain
 * - Concurrent request handling
 * - Retry logic with exponential backoff
 */
import { Document, CrawlerConfig } from '../types';
import { EventEmitter } from 'events';
export declare class Crawler extends EventEmitter {
    private config;
    private visited;
    private frontier;
    private domainStates;
    private activeRequests;
    private totalCrawled;
    private isRunning;
    private crawledDocuments;
    constructor(config?: Partial<CrawlerConfig>);
    /** Add a URL to the frontier with priority */
    addToFrontier(url: string, depth: number, pageRank?: number): void;
    /** Sort frontier by priority (min-heap simulation) */
    private sortFrontier;
    /** Start crawling */
    start(): Promise<Document[]>;
    /** Stop crawling */
    stop(): void;
    /** Crawl a single URL */
    private crawlUrl;
    /** Fetch URL with timeout and retry logic */
    private fetchWithTimeout;
    /** Parse HTML content */
    private parseContent;
    /** Extract links from HTML */
    private extractLinks;
    /** Check if a URL is allowed by robots.txt */
    private isAllowedByRobots;
    /** Get or create domain state */
    private getDomainState;
    /** Check if we can crawl a domain (politeness check) */
    private canCrawl;
    /** Simple language detection */
    private detectLanguage;
    /** Sleep utility */
    private sleep;
    /** Get crawled documents */
    getDocuments(): Document[];
    /** Get total crawled count */
    getCrawledCount(): number;
    /** Check if crawler is running */
    getIsRunning(): boolean;
    /** Get frontier size */
    getFrontierSize(): number;
    /** Clear all data */
    clear(): void;
}
//# sourceMappingURL=crawler.d.ts.map