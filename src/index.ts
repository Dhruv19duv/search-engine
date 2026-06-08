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

import { Crawler } from './crawler/crawler';
import { Indexer } from './indexer/indexer';
import { Tokenizer } from './indexer/tokenizer';
import { InvertedIndex } from './indexer/inverted-index';
import { QueryProcessor } from './search/query-processor';
import { Ranker } from './search/ranker';
import { SpellCorrector } from './search/spell-corrector';
import { SnippetGenerator } from './search/snippet-generator';
import { QueryUnderstanding } from './ml/query-understanding';
import { LearningToRank } from './ml/learning-to-rank';
import { DenseRetrieval } from './ml/dense-retrieval';
import { SemanticDriftDetector } from './ml/semantic-drift';
import { SpamFilter } from './ml/spam-filter';
import { QueryServer } from './server/query-server';
import { Document, SearchResponse, SearchResult, SearchIntent, ParsedQuery, IndexStats, HealthStatus, ServerConfig, CrawlerConfig, DriftResult, QueryType, Posting, RankingFeatures, AutocompleteSuggestion } from './types';
import * as crypto from 'crypto';
import { URL } from 'url';

export class SearchEngine {
  // Core components
  private crawler: Crawler;
  private indexer: Indexer;
  private queryProcessor: QueryProcessor;
  private ranker: Ranker;
  private spellCorrector: SpellCorrector;
  private snippetGenerator: SnippetGenerator;

  // ML components
  private queryUnderstanding: QueryUnderstanding;
  private learningToRank: LearningToRank;
  private denseRetrieval: DenseRetrieval;
  private semanticDriftDetector: SemanticDriftDetector;
  private spamFilter: SpamFilter;

  // Server
  private server: QueryServer | null;

  constructor() {
    // Initialize core components
    this.indexer = new Indexer(1000, 1000000);
    this.queryProcessor = new QueryProcessor();
    this.ranker = new Ranker(this.indexer.getMainIndex());
    this.spellCorrector = new SpellCorrector();
    this.snippetGenerator = new SnippetGenerator();
    this.crawler = new Crawler({
      maxPages: 1000000,
      maxDepth: 10,
      politenessDelayMs: 1000,
      maxConcurrentRequests: 50
    });

    // Initialize ML components
    this.queryUnderstanding = new QueryUnderstanding();
    this.learningToRank = new LearningToRank(50, 0.1, 6);
    this.denseRetrieval = new DenseRetrieval(256);
    this.semanticDriftDetector = new SemanticDriftDetector(30, 64, 0.35);
    this.spamFilter = new SpamFilter(50, 0.5);

    this.server = null;

    // Seed with sample data
    this.seedSampleData();
  }

  /** Seed sample data for demonstration */
  private seedSampleData(): void {
    const sampleData: Array<{ title: string; content: string; domain: string }> = [
      {
        title: 'Apple Inc. - Technology Company',
        content: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. Known for iPhone, iPad, Mac, Apple Watch, and services like iCloud and Apple Music. Founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976. Headquartered in Cupertino, California. Recent innovations include the M-series chips and Vision Pro headset. Apple is one of the Big Five American technology companies.',
        domain: 'apple.com'
      },
      {
        title: 'Apple - Fruit Nutrition Facts',
        content: 'Apples are one of the most popular fruits worldwide. Rich in fiber, vitamin C, and various antioxidants. A medium apple contains about 95 calories, 25 grams of carbs, and 4 grams of fiber. Apples come in many varieties including Red Delicious, Granny Smith, Gala, and Fuji. Regular consumption of apples may reduce the risk of heart disease, diabetes, and cancer. The saying "an apple a day keeps the doctor away" reflects their health benefits.',
        domain: 'nutrition.org'
      },
      {
        title: 'Web Crawler Architecture - Building Search Engines',
        content: 'A web crawler systematically browses the World Wide Web for the purpose of web indexing. The crawler starts with seed URLs and visits pages, extracts links, and recursively visits them. Key considerations include politeness policies, robots.txt compliance, rate limiting, and duplicate detection. Modern crawlers use BFS strategies with priority queues, Bloom filters for visited URL detection, and distributed architectures for scaling to billions of pages.',
        domain: 'cs-architecture.edu'
      },
      {
        title: 'Inverted Index Data Structure',
        content: 'An inverted index maps content to its location in a set of documents. For each term, it stores a posting list of document IDs where the term appears along with term frequency and positional information. Variable Byte Encoding (VBE) compresses these postings efficiently. Skip lists enable fast merging during AND/OR query operations. The inverted index is the fundamental data structure powering modern search engines.',
        domain: 'datastructures.org'
      },
      {
        title: 'Machine Learning in Information Retrieval',
        content: 'Learning to Rank (LTR) applies machine learning to construct ranking models for search. LambdaMART combines gradient boosted trees with pairwise ranking optimization. Features include TF-IDF, BM25, PageRank, document freshness, and user behavior signals. Modern approaches add dense retrieval with bi-encoder models and BERT-based query understanding for semantic matching beyond keyword overlap.',
        domain: 'ml-research.edu'
      },
      {
        title: 'Semantic Search and Natural Language Processing',
        content: 'Semantic search aims to improve search accuracy by understanding the searcher\'s intent and the contextual meaning of terms. Unlike keyword-based search, semantic search considers synonyms, concept matching, and natural language queries. Modern semantic search uses transformer-based models like BERT for query understanding and dense passage retrieval for neural ranking.',
        domain: 'nlp-advances.org'
      },
      {
        title: 'Distributed Systems Design for Search',
        content: 'Large-scale search engines distribute their index across hundreds of servers using consistent hashing. This ensures that adding or removing nodes only rebalances a fraction of keys. Replication provides fault tolerance and high availability. Zero-downtime index swaps enable continuous updates. Load balancing, connection pooling, and result caching are essential for handling 10,000+ queries per second.',
        domain: 'distributed-systems.net'
      },
      {
        title: 'Bloom Filter: Space-Efficient Probabilistic Data Structure',
        content: 'A Bloom filter is a space-efficient probabilistic data structure used to test whether an element is a member of a set. False positives are possible but false negatives are not. Elements can be added but not removed. Bloom filters are used in web crawlers to avoid revisiting URLs, in databases to reduce disk lookups, and in networks for routing. With 1% false positive rate, a Bloom filter for 1 million items uses only about 1.2 MB.',
        domain: 'algorithms.org'
      },
      {
        title: 'JavaScript Programming Language Guide',
        content: 'JavaScript is a high-level, interpreted programming language that conforms to the ECMAScript specification. It is a prototype-based, multi-paradigm language supporting event-driven, functional, and imperative programming styles. JavaScript runs on the client side of the web and server-side with Node.js. It has dynamic typing, first-class functions, and is one of the core technologies of the World Wide Web.',
        domain: 'javascript-guide.com'
      },
      {
        title: 'TypeScript: Typed Superset of JavaScript',
        content: 'TypeScript adds optional static typing and class-based object-oriented programming to JavaScript. Developed by Microsoft, TypeScript compiles to plain JavaScript. It supports interfaces, generics, enums, and advanced type inference. TypeScript improves developer productivity through better tooling, refactoring support, and early error detection. It is widely used in large-scale applications.',
        domain: 'typescript.org'
      },
      {
        title: 'Natural Language Processing with Transformers',
        content: 'Transformers have revolutionized natural language processing. The attention mechanism allows models to weigh the importance of different parts of input. BERT (Bidirectional Encoder Representations from Transformers) pre-trains on large text corpora and can be fine-tuned for specific tasks. Applications include text classification, named entity recognition, question answering, and semantic search.',
        domain: 'ai-research.edu'
      },
      {
        title: 'PageRank Algorithm: Web Graph Ranking',
        content: 'PageRank is an algorithm used by Google Search to rank web pages in their search results. It works by counting the number and quality of links to a page to determine a rough estimate of the website\'s importance. The underlying assumption is that more important websites are likely to receive more links from other websites. PageRank is named after Larry Page and is a trademark of Google.',
        domain: 'googleresearch.com'
      },
      {
        title: 'BM25: Probabilistic Relevance Framework',
        content: 'BM25 is a ranking function used by search engines to estimate the relevance of documents to a given search query. It is based on the probabilistic relevance framework and is an extension of TF-IDF. BM25 considers term frequency saturation and document length normalization. The parameters k1 (term frequency saturation) and b (length normalization) control the ranking behavior. BM25 remains a strong baseline for information retrieval.',
        domain: 'ir-classes.org'
      },
      {
        title: 'Cybersecurity Best Practices 2024',
        content: 'Cybersecurity involves protecting systems, networks, and programs from digital attacks. Key practices include using strong unique passwords, enabling two-factor authentication, keeping software updated, backing up data regularly, and being cautious of phishing attempts. Zero-trust architecture assumes no implicit trust and verifies every access request. AI-powered threat detection helps identify novel attack patterns.',
        domain: 'cybersecurity.gov'
      },
      {
        title: 'Cloud Computing and Scalable Infrastructure',
        content: 'Cloud computing provides on-demand availability of computer system resources, especially data storage and computing power, without direct active management by the user. Major cloud providers include AWS, Azure, and Google Cloud. Key benefits include scalability, reliability, and cost efficiency. Microservices architecture and containerization with Docker and Kubernetes enable flexible deployment at scale.',
        domain: 'cloud-infra.com'
      },
      {
        title: 'Artificial Intelligence: A Comprehensive Overview',
        content: 'Artificial Intelligence (AI) is the simulation of human intelligence in machines. Key subfields include machine learning, deep learning, natural language processing, computer vision, and robotics. Deep learning uses neural networks with multiple layers to learn hierarchical representations. Reinforcement learning trains agents through trial and error. Generative AI creates new content including text, images, and code.',
        domain: 'ai-research.org'
      },
      {
        title: 'Database Systems: From SQL to NoSQL',
        content: 'Database systems organize and store data for efficient retrieval. Relational databases (SQL) use structured schemas with tables, rows, and relationships. NoSQL databases include document stores (MongoDB), key-value stores (Redis), column stores (Cassandra), and graph databases (Neo4j). NewSQL combines SQL with horizontal scalability. Vector databases enable similarity search for AI applications.',
        domain: 'database-guide.com'
      },
      {
        title: 'Blockchain Technology and Cryptocurrency',
        content: 'Blockchain is a distributed ledger technology that maintains a growing list of records called blocks. Each block contains a cryptographic hash of the previous block, creating an immutable chain. Bitcoin introduced the first cryptocurrency using proof-of-work consensus. Ethereum extended blockchain with smart contracts. Applications include decentralized finance (DeFi), NFTs, and supply chain tracking.',
        domain: 'blockchain.org'
      },
      {
        title: 'React: Building Modern Web Applications',
        content: 'React is a JavaScript library for building user interfaces maintained by Meta. It uses a component-based architecture with a virtual DOM for efficient rendering. React introduces JSX syntax, hooks for state management, and a unidirectional data flow. Server-side rendering with Next.js and static site generation have expanded React\'s capabilities beyond single-page applications.',
        domain: 'reactjs.org'
      },
      {
        title: 'TensorFlow and Deep Learning Framework Comparison',
        content: 'TensorFlow is an open-source machine learning platform developed by Google. It provides a comprehensive ecosystem for building and deploying ML models. PyTorch, developed by Meta, offers dynamic computation graphs and is popular in research. JAX provides high-performance numerical computing. Keras offers a high-level API for neural networks. Each framework has strengths for different use cases.',
        domain: 'ml-frameworks.com'
      }
    ];

    for (let i = 0; i < sampleData.length; i++) {
      const sample = sampleData[i];
      const doc: Document = {
        id: i + 1,
        url: `https://www.${sample.domain}/page-${i + 1}`,
        title: sample.title,
        content: sample.content,
        snippet: sample.content.substring(0, 200),
        timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        domain: sample.domain,
        pageRank: Math.random() * 10,
        crawlDepth: Math.floor(Math.random() * 3),
        outgoingLinks: [],
        headers: { 'content-type': 'text/html' },
        contentType: 'text/html',
        contentLength: sample.content.length,
        language: 'en',
        isRemoved: false
      };

      this.indexer.indexDocument(doc);
      this.denseRetrieval.indexDocument(doc.id, doc.title + ' ' + doc.content);
      this.semanticDriftDetector.processDocument(doc.id, doc.content, doc.timestamp);

      // Add to autocomplete trie
      const titleWords = doc.title.toLowerCase().split(/\s+/);
      for (const word of titleWords) {
        if (word.length >= 2) {
          this.queryProcessor.addToAutocomplete(word, 10);
        }
      }
    }

    // Merge delta index
    this.indexer.mergeDelta();

    console.log(`Seeded ${sampleData.length} sample documents`);
  }

  /** Execute a search query */
  async search(query: string, page: number = 1, pageSize: number = 10): Promise<SearchResponse> {
    const startTime = Date.now();

    // Process query
    const parsedQuery: ParsedQuery = this.queryProcessor.processQuery(query);

    // Classify intent
    const intent = this.queryUnderstanding.classifyIntent(query);

    // Spell correction
    const correctionResult = this.spellCorrector.correctText(query);
    const effectiveQuery = correctionResult.corrections.length > 0
      ? correctionResult.corrected
      : query;

    // Tokenize and search index
    const queryTerms = this.indexer.getTokenizer().tokenize(effectiveQuery);
    const { postings, docs } = this.indexer.searchIndex(effectiveQuery);

    // Rank results
    let results = this.ranker.rank(effectiveQuery, docs);

    // Dense retrieval hybrid scoring
    if (queryTerms.length > 0) {
      const bm25Scores = new Map<number, number>();
      for (const result of results) {
        bm25Scores.set(result.docId, result.score);
      }
      const hybridResults = this.denseRetrieval.hybridSearch(effectiveQuery, bm25Scores, 50, 0.3);
      
      // Merge hybrid scores
      const hybridMap = new Map(hybridResults.map(r => [r.docId, r.score]));
      for (const result of results) {
        const hybridScore = hybridMap.get(result.docId);
        if (hybridScore !== undefined) {
          result.score = result.score * 0.7 + hybridScore * 0.3;
        }
      }
      results.sort((a, b) => b.score - a.score);
      results.forEach((r, i) => { r.rank = i + 1; });
    }

    // Apply semantic drift re-ranking
    if (queryTerms.length > 0) {
      const driftScores = new Map<number, number>();
      
      // Check if any query term has drifted
      const driftedTerms = this.semanticDriftDetector.getDriftedTerms();
      const hasDrift = queryTerms.some(t => driftedTerms.includes(t));

      if (hasDrift) {
        for (const result of results) {
          const doc = docs.get(result.docId);
          if (doc) {
            const driftScore = this.semanticDriftDetector.computeDocumentDriftScore(
              doc.title + ' ' + doc.content
            );
            driftScores.set(result.docId, driftScore);
          }
        }
        results = this.ranker.applyDriftRerank(results, driftScores);
      }
    }

    // Generate snippets
    for (const result of results) {
      const doc = docs.get(result.docId);
      if (doc) {
        result.snippet = this.snippetGenerator.generateSnippet(
          doc.content,
          effectiveQuery,
          doc.title
        );
      }
    }

    // Apply spam filter
    results = results.filter(result => {
      const doc = docs.get(result.docId);
      if (!doc) return false;
      const spamResult = this.spamFilter.classify(
        doc.content, doc.title, doc.url, doc.domain, doc.outgoingLinks, doc.headers
      );
      return !spamResult.isSpam || spamResult.spamScore < 0.8; // Allow borderline
    });

    // Get autocomplete suggestions
    const suggestions = this.queryProcessor.getAutocomplete(query, 5);

    // Paginate
    const startIdx = (page - 1) * pageSize;
    const paginatedResults = results.slice(startIdx, startIdx + pageSize);

    const searchTimeMs = Date.now() - startTime;

    return {
      query,
      results: paginatedResults,
      totalResults: results.length,
      searchTimeMs,
      correctedQuery: correctionResult.corrections.length > 0 ? correctionResult.corrected : undefined,
      suggestions,
      intent
    };
  }

  /** Get autocomplete suggestions */
  getAutocomplete(prefix: string): string[] {
    return this.queryProcessor.getAutocomplete(prefix, 8);
  }

  /** Get query suggestions */
  getSuggestions(query: string): string[] {
    return this.queryProcessor.getSuggestions(query, 5);
  }

  /** Crawl the web (starts async) */
  async startCrawling(): Promise<void> {
    console.log('Starting web crawler...');
    const docs = await this.crawler.start();
    console.log(`Crawled ${docs.length} pages`);

    // Index crawled documents
    for (const doc of docs) {
      this.indexer.indexDocument(doc);
      this.denseRetrieval.indexDocument(doc.id, doc.title + ' ' + doc.content);
      this.semanticDriftDetector.processDocument(doc.id, doc.content, doc.timestamp);
    }

    this.indexer.mergeDelta();
  }

  /** Reindex all documents */
  async reindex(): Promise<void> {
    console.log('Reindexing...');
    this.indexer = new Indexer();
    this.denseRetrieval = new DenseRetrieval();
    this.semanticDriftDetector = new SemanticDriftDetector();
    this.ranker = new Ranker(this.indexer.getMainIndex());

    // Re-crawl and re-index
    await this.startCrawling();
    console.log('Reindex complete');
  }

  /** Swap index (zero-downtime) */
  async swapIndex(): Promise<void> {
    this.indexer.mergeDelta();
  }

  /** Get index stats */
  getIndexStats(): IndexStats {
    return this.indexer.getStats();
  }

  /** Get index size */
  getIndexSizeBytes(): number {
    return this.indexer.getStats().indexSizeBytes;
  }

  /** Get drift info */
  getDriftInfo(): any {
    const driftStats = this.semanticDriftDetector.getStats();
    const driftedTerms = this.semanticDriftDetector.getDriftedTerms().slice(0, 20);
    
    return {
      ...driftStats,
      driftedTerms,
      recentDrifts: driftedTerms.map(t => this.semanticDriftDetector.detectDrift(t))
    };
  }

  /** Start the HTTP server */
  startServer(port: number = 3000): void {
    this.server = new QueryServer(this, { port });
    this.server.start();
  }

  /** Stop the server */
  stopServer(): void {
    if (this.server) {
      this.server.shutdown();
    }
  }
}

// Run if executed directly
if (require.main === module || process.env.NODE_ENV === 'production') {
  const engine = new SearchEngine();
  
  const port = parseInt(process.env.PORT || '3000', 10);
  engine.startServer(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Search Engine                             ║
║  Full-text search with ML ranking & semantic drift detection ║
╚══════════════════════════════════════════════════════════════╝

Server running at http://localhost:${port}

Features:
- Inverted index with VBE compression
- BM25 + TF-IDF + PageRank ranking
- BERT-style query intent classification
- LambdaMART learning-to-rank
- Dense passage retrieval (DPR)
- Semantic drift detection (temporal word2vec)
- XGBoost-style spam filtering
- Trie-based autocomplete & spell correction
- SimHash near-duplicate detection
- MMR-based snippet generation
- Bloom filter for URL dedup
- Consistent hashing for sharding
- Zero-downtime index swaps

Try it: http://localhost:${port}
`);
}
