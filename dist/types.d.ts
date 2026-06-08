/** A single document/page in the index */
export interface Document {
    id: number;
    url: string;
    title: string;
    content: string;
    snippet: string;
    timestamp: Date;
    domain: string;
    pageRank: number;
    crawlDepth: number;
    outgoingLinks: string[];
    headers: Record<string, string>;
    contentType: string;
    contentLength: number;
    language: string;
    isRemoved: boolean;
}
/** Posting list entry: document ID + term frequency */
export interface Posting {
    docId: number;
    termFrequency: number;
    positions: number[];
}
/** A term's entry in the inverted index */
export interface TermEntry {
    term: string;
    documentFrequency: number;
    postings: Posting[];
}
/** Query types supported by the search engine */
export declare enum QueryType {
    BOOLEAN = "boolean",
    PHRASE = "phrase",
    FUZZY = "fuzzy",
    SEMANTIC = "semantic",
    NATURAL = "natural"
}
/** Search intent classification */
export declare enum SearchIntent {
    NAVIGATIONAL = "navigational",
    INFORMATIONAL = "informational",
    TRANSACTIONAL = "transactional"
}
/** A parsed query */
export interface ParsedQuery {
    original: string;
    terms: string[];
    type: QueryType;
    intent: SearchIntent;
    booleanOperators?: {
        term: string;
        operator: 'AND' | 'OR' | 'NOT';
    }[];
    phraseTerms?: string[];
    fuzzyTerms?: {
        term: string;
        maxDistance: number;
    }[];
    correctedTerms?: {
        original: string;
        corrected: string;
        distance: number;
    }[];
}
/** A search result to return to the user */
export interface SearchResult {
    docId: number;
    url: string;
    title: string;
    snippet: string;
    score: number;
    rank: number;
    timestamp: Date;
    domain: string;
    matchedTerms: string[];
}
/** Search response */
export interface SearchResponse {
    query: string;
    results: SearchResult[];
    totalResults: number;
    searchTimeMs: number;
    correctedQuery?: string;
    suggestions?: string[];
    intent?: SearchIntent;
}
/** Ranking features used by LTR model */
export interface RankingFeatures {
    tfIdf: number;
    bm25: number;
    pageRank: number;
    freshness: number;
    domainAuthority: number;
    contentLength: number;
    keywordDensity: number;
    dwellTime: number;
    clickThroughRate: number;
    isExactMatch: number;
    isTitleMatch: number;
    isNavigational: number;
    readabilityScore: number;
    spamScore: number;
    semanticScore: number;
    driftScore: number;
}
/** Semantic drift detection result */
export interface DriftResult {
    term: string;
    driftDetected: boolean;
    driftMagnitude: number;
    previousCentroid: number[];
    currentCentroid: number[];
    windowsAnalyzed: number;
    timestamp: Date;
}
/** Index shard metadata */
export interface IndexShard {
    shardId: number;
    nodeId: string;
    termRange: {
        start: string;
        end: string;
    };
    docCount: number;
    sizeBytes: number;
    isActive: boolean;
}
/** Crawler configuration */
export interface CrawlerConfig {
    seedUrls: string[];
    maxPages: number;
    maxDepth: number;
    politenessDelayMs: number;
    respectRobotsTxt: boolean;
    userAgent: string;
    maxConcurrentRequests: number;
    requestTimeoutMs: number;
    maxRetries: number;
}
/** Server configuration */
export interface ServerConfig {
    port: number;
    clusterSize: number;
    rateLimit: number;
    cacheSize: number;
    cacheTTLMs: number;
    enableHttps: boolean;
    corsOrigins: string[];
    indexSwapDir: string;
}
/** Index statistics */
export interface IndexStats {
    totalDocuments: number;
    totalTerms: number;
    totalTokens: number;
    indexSizeBytes: number;
    averageDocumentLength: number;
    shardCount: number;
    lastUpdated: Date;
    uniqueDomains: number;
}
/** Health check status */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    queryLatencyP99: number;
    activeConnections: number;
    indexSizeGB: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    lastReplication: Date;
}
/** Autocomplete suggestion */
export interface AutocompleteSuggestion {
    text: string;
    frequency: number;
    category?: string;
}
/** Index update operation */
export interface IndexUpdate {
    type: 'add' | 'update' | 'remove';
    document: Document;
    timestamp: Date;
    ttlMs?: number;
}
//# sourceMappingURL=types.d.ts.map