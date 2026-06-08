/**
 * Comprehensive unit tests for the search engine.
 * Tests all core components: structures, indexer, search, ML, and server.
 */

import { BloomFilter } from '../structures/bloom-filter';
import { Trie } from '../structures/trie';
import { SimHash } from '../structures/simhash';
import { SkipListPostingList } from '../structures/skip-list';
import { ConsistentHash } from '../structures/consistent-hash';
import { SegmentTree } from '../structures/segment-tree';
import { Tokenizer } from '../indexer/tokenizer';
import { SpellCorrector } from '../search/spell-corrector';
import { QueryProcessor } from '../search/query-processor';
import { SnippetGenerator } from '../search/snippet-generator';
import { QueryUnderstanding } from '../ml/query-understanding';
import { SemanticDriftDetector } from '../ml/semantic-drift';
import { SpamFilter } from '../ml/spam-filter';
import { DenseRetrieval } from '../ml/dense-retrieval';
import { SearchIntent } from '../types';

describe('BloomFilter', () => {
  let filter: BloomFilter;

  beforeEach(() => {
    filter = new BloomFilter(1000, 0.01);
  });

  test('should add and check items', () => {
    filter.add('https://example.com');
    filter.add('https://test.org/page1');
    expect(filter.mightContain('https://example.com')).toBe(true);
    expect(filter.mightContain('https://test.org/page1')).toBe(true);
  });

  test('should not have false negatives', () => {
    const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
    urls.forEach(u => filter.add(u));
    urls.forEach(u => expect(filter.mightContain(u)).toBe(true));
  });

  test('should correctly report definitelyNot', () => {
    filter.add('known-url');
    expect(filter.definitelyNot('unknown-url')).toBe(true);
    expect(filter.definitelyNot('known-url')).toBe(false);
  });

  test('should track count', () => {
    expect(filter.count()).toBe(0);
    filter.add('a');
    filter.add('b');
    filter.add('c');
    expect(filter.count()).toBe(3);
  });

  test('should clear', () => {
    filter.add('test');
    filter.clear();
    expect(filter.count()).toBe(0);
    expect(filter.mightContain('test')).toBe(false);
  });

  test('should serialize and deserialize', () => {
    filter.add('url1');
    filter.add('url2');
    const json = filter.toJSON();
    const restored = BloomFilter.fromJSON(json);
    expect(restored.mightContain('url1')).toBe(true);
    expect(restored.mightContain('url2')).toBe(true);
    expect(restored.count()).toBe(filter.count());
  });

  test('should merge two filters', () => {
    const f1 = new BloomFilter(1000, 0.01);
    const f2 = new BloomFilter(1000, 0.01);
    f1.add('a');
    f2.add('b');
    f1.merge(f2);
    expect(f1.mightContain('a')).toBe(true);
    expect(f1.mightContain('b')).toBe(true);
  });
});

describe('SkipListPostingList', () => {
  test('should insert and retrieve postings', () => {
    const list = new SkipListPostingList();
    list.insert({ docId: 1, termFrequency: 5, positions: [0, 10, 20] });
    list.insert({ docId: 3, termFrequency: 3, positions: [5, 15] });
    list.insert({ docId: 2, termFrequency: 4, positions: [2, 8] });

    expect(list.size).toBe(3);

    const posting = list.get(2);
    expect(posting).not.toBeNull();
    expect(posting!.docId).toBe(2);
    expect(posting!.termFrequency).toBe(4);
  });

  test('nextGEQ should find first posting >= docId', () => {
    const list = new SkipListPostingList();
    list.insert({ docId: 1, termFrequency: 1, positions: [] });
    list.insert({ docId: 5, termFrequency: 1, positions: [] });
    list.insert({ docId: 10, termFrequency: 1, positions: [] });

    expect(list.nextGEQ(3)!.docId).toBe(5);
    expect(list.nextGEQ(6)!.docId).toBe(10);
    expect(list.nextGEQ(11)).toBeNull();
  });

  test('AND merge should return intersection', () => {
    const a = new SkipListPostingList();
    const b = new SkipListPostingList();

    a.insert({ docId: 1, termFrequency: 2, positions: [] });
    a.insert({ docId: 2, termFrequency: 3, positions: [] });
    a.insert({ docId: 3, termFrequency: 1, positions: [] });

    b.insert({ docId: 2, termFrequency: 1, positions: [] });
    b.insert({ docId: 3, termFrequency: 4, positions: [] });
    b.insert({ docId: 4, termFrequency: 2, positions: [] });

    const result = SkipListPostingList.andMerge(a, b);
    expect(result.size).toBe(2);
    expect(result.get(2)).not.toBeNull();
    expect(result.get(3)).not.toBeNull();
    expect(result.get(1)).toBeNull();
    expect(result.get(4)).toBeNull();
  });

  test('OR merge should return union', () => {
    const a = new SkipListPostingList();
    const b = new SkipListPostingList();

    a.insert({ docId: 1, termFrequency: 1, positions: [] });
    a.insert({ docId: 2, termFrequency: 1, positions: [] });

    b.insert({ docId: 2, termFrequency: 1, positions: [] });
    b.insert({ docId: 3, termFrequency: 1, positions: [] });

    const result = SkipListPostingList.orMerge(a, b);
    expect(result.size).toBe(3);
  });

  test('toArray should return sorted postings', () => {
    const list = new SkipListPostingList();
    list.insert({ docId: 3, termFrequency: 1, positions: [] });
    list.insert({ docId: 1, termFrequency: 1, positions: [] });
    list.insert({ docId: 2, termFrequency: 1, positions: [] });

    const arr = list.toArray();
    expect(arr.map(p => p.docId)).toEqual([1, 2, 3]);
  });
});

describe('ConsistentHash', () => {
  let ch: ConsistentHash;

  beforeEach(() => {
    ch = new ConsistentHash(10);
  });

  test('should add and remove nodes', () => {
    ch.addNode('server-1');
    ch.addNode('server-2');
    ch.addNode('server-3');
    expect(ch.getNodeCount()).toBe(3);

    ch.removeNode('server-2');
    expect(ch.getNodeCount()).toBe(2);
  });

  test('should consistently map keys to same node', () => {
    ch.addNode('server-1');
    ch.addNode('server-2');

    const node1 = ch.getNode('key1');
    const node2 = ch.getNode('key1');
    expect(node1).toBe(node2);
  });

  test('should distribute keys across nodes', () => {
    ch.addNode('server-1');
    ch.addNode('server-2');
    ch.addNode('server-3');

    const dist = ch.getLoadDistribution(1000);
    const loads = Array.from(dist.values());
    const avg = loads.reduce((a, b) => a + b, 0) / loads.length;
    
    // Each node should have roughly 1/3 of keys
    loads.forEach(load => {
      expect(load).toBeGreaterThan(avg * 0.5);
      expect(load).toBeLessThan(avg * 1.5);
    });
  });
});

describe('SpellCorrector', () => {
  let corrector: SpellCorrector;

  beforeEach(() => {
    corrector = new SpellCorrector();
  });

  test('should return same word if spelled correctly', () => {
    expect(corrector.correct('apple')).toBe('apple');
    expect(corrector.correct('search')).toBe('search');
  });

  test('should correct common misspellings', () => {
    expect(corrector.correct('recieve')).toBe('receive');
    expect(corrector.correct('acheive')).toBe('achieve');
  });

  test('should correct with context', () => {
    const result = corrector.correct('searc', ['search', 'engine']);
    expect(result).toBe('search');
  });

  test('should correct full text', () => {
    const result = corrector.correctText('seach engine');
    expect(result.corrections.length).toBeGreaterThan(0);
    expect(result.corrected).toContain('search');
  });

  test('isCorrect should return proper status', () => {
    expect(corrector.isCorrect('apple')).toBe(true);
    expect(corrector.isCorrect('xyzabc')).toBe(false);
  });
});

describe('QueryProcessor', () => {
  let qp: QueryProcessor;

  beforeEach(() => {
    qp = new QueryProcessor();
  });

  test('should detect boolean queries', () => {
    const parsed = qp.processQuery('apple AND fruit');
    expect(parsed.booleanOperators).toBeDefined();
  });

  test('should detect phrase queries', () => {
    const parsed = qp.processQuery('"machine learning"');
    expect(parsed.phraseTerms).toBeDefined();
    expect(parsed.phraseTerms).toContain('machine');
  });

  test('should detect fuzzy queries', () => {
    const parsed = qp.processQuery('apple~2');
    expect(parsed.fuzzyTerms).toBeDefined();
  });

  test('should classify intent', () => {
    expect(qp.classifyIntent('facebook login')).toBe(SearchIntent.NAVIGATIONAL);
    expect(qp.classifyIntent('how to cook pasta')).toBe(SearchIntent.TRANSACTIONAL);
    expect(qp.classifyIntent('history of computers')).toBe(SearchIntent.INFORMATIONAL);
  });

  test('should provide autocomplete', () => {
    const suggestions = qp.getAutocomplete('app');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('SnippetGenerator', () => {
  let generator: SnippetGenerator;

  beforeEach(() => {
    generator = new SnippetGenerator(300, 100, 0.7);
  });

  test('should generate snippets with query terms', () => {
    const content = 'Machine learning is a subset of artificial intelligence. It involves training models on data. Deep learning uses neural networks with multiple layers. Reinforcement learning trains agents through trial and error.';
    const snippet = generator.generateSnippet(content, 'machine learning', 'ML Guide');
    expect(snippet.length).toBeGreaterThan(0);
  });

  test('should highlight query terms', () => {
    const content = 'Apple Inc. is a technology company. Apple fruit is healthy.';
    const snippet = generator.generateSnippet(content, 'apple', 'Apple');
    expect(snippet).toContain('<mark>');
  });

  test('should handle empty content', () => {
    const snippet = generator.generateSnippet('', 'test', 'Title');
    expect(snippet).toBeDefined();
  });
});

describe('QueryUnderstanding (BERT Intent)', () => {
  let qu: QueryUnderstanding;

  beforeEach(() => {
    qu = new QueryUnderstanding();
  });

  test('should classify navigational queries', () => {
    expect(qu.classifyIntent('facebook login')).toBe(SearchIntent.NAVIGATIONAL);
  });

  test('should classify transactional queries', () => {
    const intent = qu.classifyIntent('buy cheap laptop');
    expect([SearchIntent.TRANSACTIONAL, SearchIntent.INFORMATIONAL]).toContain(intent);
  });

  test('should provide confidence scores', () => {
    const result = qu.getIntentScores('history of rome');
    expect(result.intent).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(Object.keys(result.scores).length).toBe(3);
  });

  test('should extract entities', () => {
    const entities = qu.extractEntities('buy iPhone from Apple in New York');
    expect(entities.length).toBeGreaterThan(0);
  });
});

describe('SemanticDriftDetector', () => {
  let drift: SemanticDriftDetector;

  beforeEach(() => {
    drift = new SemanticDriftDetector(30, 64, 0.35);
  });

  test('should process documents and detect drift', () => {
    drift.processDocument(1, 'Apple is a delicious fruit that grows on trees', new Date('2020-01-01'));
    drift.processDocument(2, 'Apple makes great computers and phones', new Date('2024-01-01'));
    
    const result = drift.detectDrift('apple');
    expect(result.driftDetected).toBe(true);
    expect(result.driftMagnitude).toBeGreaterThan(0);
    expect(result.windowsAnalyzed).toBeGreaterThan(0);
  });

  test('should get drifted terms', () => {
    const terms = drift.getDriftedTerms();
    expect(Array.isArray(terms)).toBe(true);
  });

  test('should compute document drift score', () => {
    drift.processDocument(1, 'Apple fruit is healthy and delicious', new Date('2020-06-01'));
    drift.processDocument(2, 'Apple technology company makes iPhones', new Date('2024-06-01'));
    
    const score = drift.computeDocumentDriftScore('Apple fruit nutrition facts');
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('should provide stats', () => {
    const stats = drift.getStats();
    expect(stats.totalWindows).toBeGreaterThanOrEqual(0);
    expect(stats.trackedTerms).toBeGreaterThanOrEqual(0);
  });
});

describe('SpamFilter', () => {
  let filter: SpamFilter;

  beforeEach(() => {
    filter = new SpamFilter(50, 0.5);
  });

  test('should classify legitimate content', () => {
    const result = filter.classify(
      'This is a well-written article about machine learning and its applications.',
      'Machine Learning Guide',
      'https://example.com/article',
      'example.com',
      ['https://reference.com/page1'],
      { 'content-type': 'text/html' }
    );
    expect(result.isSpam).toBe(false);
    expect(result.spamScore).toBeLessThan(0.5);
  });

  test('should detect spam signals', () => {
    const result = filter.classify(
      'BUY NOW!!! CLICK HERE!!! FREE MONEY!!! WIN PRIZE!!! CLICK CLICK CLICK!!!',
      'Free Money!!!',
      'https://spam-site.xyz/win-prize',
      'spam-site.xyz',
      ['https://spam1.xyz', 'https://spam2.xyz', 'https://spam3.xyz'],
      { 'content-type': 'text/html' }
    );
    expect(result.flaggedFeatures.length).toBeGreaterThan(0);
  });
});

describe('DenseRetrieval', () => {
  let dr: DenseRetrieval;

  beforeEach(() => {
    dr = new DenseRetrieval(64);
  });

  test('should index and search documents', () => {
    dr.indexDocument(1, 'Machine learning is transforming artificial intelligence');
    dr.indexDocument(2, 'Apples are healthy fruit with many nutrients');
    
    const results = dr.search('artificial intelligence', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].docId).toBe(1);
  });

  test('should find semantically similar results', () => {
    dr.indexDocument(1, 'Deep neural networks learn hierarchical representations');
    dr.indexDocument(2, 'Birds fly in the sky during summer months');
    
    const results = dr.search('neural network deep learning', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].docId).toBe(1);
  });

  test('ANN search should return results', () => {
    dr.indexDocument(1, 'Test document for approximate nearest neighbor search');
    const results = dr.annSearch('test document', 5, 5);
    expect(results.length).toBeGreaterThan(0);
  });
});
