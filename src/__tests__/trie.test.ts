import { Trie } from '../structures/trie';

describe('Trie', () => {
  let trie: Trie;

  beforeEach(() => {
    trie = new Trie();
  });

  test('should insert and search words', () => {
    trie.insert('hello');
    trie.insert('world');
    trie.insert('help');

    expect(trie.search('hello')).toBe(true);
    expect(trie.search('world')).toBe(true);
    expect(trie.search('help')).toBe(true);
    expect(trie.search('hell')).toBe(false);
    expect(trie.search('notfound')).toBe(false);
  });

  test('should check prefixes', () => {
    trie.insert('hello');
    trie.insert('help');
    trie.insert('helicopter');

    expect(trie.startsWith('he')).toBe(true);
    expect(trie.startsWith('hel')).toBe(true);
    expect(trie.startsWith('hello')).toBe(true);
    expect(trie.startsWith('hex')).toBe(false);
  });

  test('should provide autocomplete suggestions', () => {
    trie.insert('apple', 100);
    trie.insert('application', 80);
    trie.insert('appetite', 30);
    trie.insert('banana', 50);
    trie.insert('appreciate', 20);

    const results = trie.autocomplete('app', 5);
    expect(results.length).toBe(4);
    expect(results[0].word).toBe('apple'); // Highest frequency first
    expect(results[1].word).toBe('application');
  });

  test('should handle empty trie', () => {
    expect(trie.search('anything')).toBe(false);
    expect(trie.startsWith('any')).toBe(false);
    expect(trie.autocomplete('test')).toEqual([]);
  });

  test('should track frequency', () => {
    trie.insert('test', 5);
    trie.insert('test', 3);
    expect(trie.getFrequency('test')).toBe(8);
  });

  test('should delete words', () => {
    trie.insert('hello');
    trie.insert('help');
    trie.insert('he');

    expect(trie.delete('hello')).toBe(true);
    expect(trie.search('hello')).toBe(false);
    expect(trie.search('help')).toBe(true);
    expect(trie.search('he')).toBe(true);
  });

  test('should count words', () => {
    trie.insert('a');
    trie.insert('b');
    trie.insert('c');
    expect(trie.wordCount()).toBe(3);
  });

  test('should handle case-insensitivity', () => {
    trie.insert('Hello');
    trie.insert('WORLD');
    expect(trie.search('hello')).toBe(true);
    expect(trie.search('world')).toBe(true);
  });

  test('Aho-Corasick multi-pattern search', () => {
    trie.insert('he');
    trie.insert('she');
    trie.insert('his');
    trie.insert('hers');
    trie.buildAhoCorasick();

    const text = 'hershe';
    const matches = trie.acSearch(text);
    expect(matches.length).toBeGreaterThan(0);
  });

  test('should serialize and deserialize', () => {
    trie.insert('test', 5);
    trie.insert('testing', 3);
    
    const json = trie.toJSON();
    expect(json).toBeDefined();
  });
});
