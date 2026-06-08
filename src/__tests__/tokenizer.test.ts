import { Tokenizer } from '../indexer/tokenizer';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  test('should tokenize text', () => {
    const tokens = tokenizer.tokenize('Hello World! This is a test.');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  test('should remove stop words', () => {
    const tokens = tokenizer.tokenize('The cat and the dog are playing');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('and');
  });

  test('should stem words', () => {
    const tokens = tokenizer.tokenize('running jumped walked quickly');
    expect(tokens).toContain('run');
    expect(tokens).toContain('jump');
    expect(tokens).toContain('walk');
  });

  test('should normalize text', () => {
    const normalized = tokenizer.normalize('  Hello   WORLD!  ');
    expect(normalized).toBe('hello world');
  });

  test('should tokenize with positions for phrase queries', () => {
    const result = tokenizer.tokenizeWithPositions('The quick brown fox');
    
    expect(result.has('quick')).toBe(true);
    expect(result.has('brown')).toBe(true);
    expect(result.has('fox')).toBe(true);
    
    // Check positions
    const quickPositions = result.get('quick');
    expect(quickPositions).toBeDefined();
  });

  test('should generate n-grams', () => {
    const tokens = ['the', 'quick', 'brown', 'fox'];
    const ngrams = tokenizer.generateNGrams(tokens, 2);
    expect(ngrams).toContain('the_quick');
    expect(ngrams).toContain('quick_brown');
    expect(ngrams).toContain('brown_fox');
  });

  test('should compute term frequency', () => {
    const tokens = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
    const tf = tokenizer.computeTermFrequency(tokens);
    expect(tf.get('apple')).toBe(3);
    expect(tf.get('banana')).toBe(2);
    expect(tf.get('cherry')).toBe(1);
  });

  test('should handle empty input', () => {
    expect(tokenizer.tokenize('')).toEqual([]);
    expect(tokenizer.tokenize('   ')).toEqual([]);
  });

  test('should stem irregular words', () => {
    expect(tokenizer.stem('better')).toBe('better');
    expect(tokenizer.stem('running')).toBe('run');
    expect(tokenizer.stem('happiness')).toBe('happi');
    expect(tokenizer.stem('quickly')).toBe('quick');
  });

  test('should batch stem', () => {
    const stems = tokenizer.stemBatch(['running', 'jumped', 'walks']);
    expect(stems).toContain('run');
    expect(stems).toContain('jump');
    expect(stems).toContain('walk');
  });

  test('should clear cache', () => {
    tokenizer.stem('running');
    tokenizer.clearCache();
    // Should still work after cache clear
    expect(tokenizer.stem('running')).toBe('run');
  });
});
