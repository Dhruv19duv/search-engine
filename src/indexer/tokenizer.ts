/**
 * Tokenizer & Stemmer
 * 
 * Full text processing pipeline:
 * 1. Text normalization (lowercase, unicode normalization)
 * 2. Tokenization (word boundary detection)
 * 3. Stop word removal
 * 4. Stemming (Porter stemmer)
 * 5. N-gram generation
 * 6. Position tracking for phrase queries
 */

// Porter stemmer rules
const STEP_1A: [RegExp, string][] = [
  [/sses$/g, 'ss'],
  [/ies$/g, 'i'],
  [/ss$/g, 'ss'],
  [/s$/g, '']
];

const STEP_1B: [RegExp, string][] = [
  [/(eed|eedly)$/g, 'ee'],
  [/(ed|edly|ing|ingly)$/g, '']
];

const STEP_1C: [RegExp, string][] = [
  [/([^aeiouy])y$/g, '$1i']
];

const STEP_2: [RegExp, string][] = [
  [/ization$/g, 'ize'],
  [/fulness$/g, 'ful'],
  [/ousness$/g, 'ous'],
  [/iveness$/g, 'ive'],
  [/ational$/g, 'ate'],
  [/biliti$/g, 'ble'],
  [/tional$/g, 'tion'],
  [/lessli$/g, 'less'],
  [/ousli$/g, 'ous'],
  [/entli$/g, 'ent'],
  [/ation$/g, 'ate'],
  [/alism$/g, 'al'],
  [/aliti$/g, 'al'],
  [/iviti$/g, 'ive'],
  [/fulli$/g, 'ful'],
  [/enci$/g, 'ence'],
  [/anci$/g, 'ance'],
  [/abli$/g, 'able'],
  [/izer$/g, 'ize'],
  [/ator$/g, 'ate'],
  [/alli$/g, 'al'],
  [/bli$/g, 'ble'],
  [/ogi$/g, 'og'],
  [/li$/g, '']
];

const STEP_3: [RegExp, string][] = [
  [/icate$/g, 'ic'],
  [/ative$/g, ''],
  [/alize$/g, 'al'],
  [/iciti$/g, 'ic'],
  [/ical$/g, 'ic'],
  [/ness$/g, ''],
  [/ful$/g, '']
];

const STEP_4: [RegExp, string][] = [
  [/ement$/g, ''],
  [/ment$/g, ''],
  [/ance$/g, ''],
  [/ence$/g, ''],
  [/able$/g, ''],
  [/ible$/g, ''],
  [/ant$/g, ''],
  [/ent$/g, ''],
  [/ion$/g, ''],
  [/ism$/g, ''],
  [/ate$/g, ''],
  [/iti$/g, ''],
  [/ous$/g, ''],
  [/ive$/g, ''],
  [/ize$/g, '']
];

const STEP_5A: [RegExp, string][] = [
  [/(e)$/g, ''],
  [/([^aeiou])e$/g, '$1']
];

const STEP_5B: [RegExp, string][] = [
  [/ll$/g, 'l']
];

export class Tokenizer {
  private stopWords: Set<string>;
  private stemmerCache: Map<string, string>;

  constructor() {
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
      'his', 'her', 'she', 'which', 'or', 'we', 'their', 'been', 'have',
      'had', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
      'does', 'did', 'doing', 'do', 'about', 'into', 'over', 'after',
      'before', 'between', 'under', 'above', 'below', 'out', 'off',
      'up', 'down', 'than', 'then', 'also', 'very', 'just', 'because',
      'these', 'those', 'each', 'every', 'all', 'any', 'both', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'too', 'what', 'when', 'where',
      'who', 'whom', 'why', 'how', 'i', 'me', 'my', 'myself', 'you',
      'your', 'yours', 'yourself', 'he', 'him', 'himself', 'she',
      'her', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our',
      'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves'
    ]);

    this.stemmerCache = new Map();
  }

  /** Main tokenization pipeline */
  tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
    const filtered = tokens.filter(t => !this.isStopWord(t) && t.length >= 2);
    return filtered.map(t => this.stem(t));
  }

  /** Full tokenization with positions for phrase queries */
  tokenizeWithPositions(text: string): Map<string, number[]> {
    const normalized = this.normalize(text);
    const rawTokens = normalized.split(/\s+/).filter(t => t.length > 0);
    const result = new Map<string, number[]>();

    for (let pos = 0; pos < rawTokens.length; pos++) {
      const token = rawTokens[pos].toLowerCase();
      if (this.isStopWord(token) || token.length < 2) continue;
      
      const stemmed = this.stem(token);
      if (!result.has(stemmed)) {
        result.set(stemmed, []);
      }
      result.get(stemmed)!.push(pos);
    }

    return result;
  }

  /** Normalize text: lowercase, unicode normalize, remove punctuation */
  normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^\w\s'-]/g, ' ') // replace punctuation with spaces
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim();
  }

  /** Check if a word is a stop word */
  isStopWord(word: string): boolean {
    return this.stopWords.has(word.toLowerCase());
  }

  /** Porter stemmer implementation */
  stem(word: string): string {
    if (word.length <= 2) return word;

    const cached = this.stemmerCache.get(word);
    if (cached) return cached;

    let stemmed = this._stem(word);
    this.stemmerCache.set(word, stemmed);
    return stemmed;
  }

  private _stem(word: string): string {
    let w = word.toLowerCase();

    // Handle special cases
    if (w.length <= 2) return w;

    // Apply stemming steps
    w = this.applyRules(w, STEP_1A);
    
    // Step 1B
    const match1B = w.match(/(eed|eedly)$/);
    if (match1B) {
      const beforeR1 = this.getR1(w.substring(0, w.length - match1B[0].length));
      if (beforeR1.length > 0) {
        w = w.substring(0, w.length - match1B[0].length) + 'ee';
      }
    } else {
      const afterReplace = w.replace(/(ed|edly|ing|ingly)$/, '');
      if (afterReplace !== w) {
        const suffix = w.match(/(ed|edly|ing|ingly)$/)![0];
        const stem = w.substring(0, w.length - suffix.length);
        if (this.measure(stem) > 0) {
          w = stem;
          if (w.match(/(at|bl|iz)$/)) {
            w += 'e';
          } else if (w.match(/([^aeiouylsz])\1$/)) {
            w = w.substring(0, w.length - 1);
          } else if (this.measure(w) === 1 && this.isConsonantSequence(w)) {
            w += 'e';
          }
        }
      }
    }

    w = this.applyRules(w, STEP_1C);

    const m = this.measure(w);
    if (m > 0) {
      w = this.applyRulesInR1(w, STEP_2);
    }
    if (m > 0) {
      w = this.applyRulesInR1(w, STEP_3);
    }
    if (m > 1) {
      w = this.applyRulesInR1(w, STEP_4);
    }

    // Step 5
    if (this.measure(w) > 1) {
      w = w.replace(/e$/, '');
    } else if (this.measure(w) === 1 && !this.isConsonantSequence(w)) {
      w = w.replace(/e$/, '');
    }

    if (this.measure(w) > 1 && w.match(/ll$/)) {
      w = w.substring(0, w.length - 1);
    }

    return w;
  }

  /** Apply a set of replacement rules */
  private applyRules(w: string, rules: [RegExp, string][]): string {
    for (const [pattern, replacement] of rules) {
      if (w.match(pattern)) {
        return w.replace(pattern, replacement);
      }
    }
    return w;
  }

  /** Apply replacement rules only in R1 region */
  private applyRulesInR1(w: string, rules: [RegExp, string][]): string {
    const r1 = this.getR1(w);
    if (r1.length === 0) return w;

    for (const [pattern, replacement] of rules) {
      const match = w.match(pattern);
      if (match && r1.includes(match[0])) {
        const newEnd = w.substring(0, w.length - match[0].length) + replacement;
        return newEnd;
      }
    }
    return w;
  }

  /** Get R1 region (after first non-vowel following a vowel) */
  private getR1(w: string): string {
    const match = w.match(/[aeiouy][^aeiouy](.+)/);
    return match ? match[1] : '';
  }

  /** Calculate the measure m (number of VC sequences) */
  private measure(w: string): number {
    const sequence = w.replace(/[aeiouy]+/g, 'v').replace(/[^v]+/g, 'c');
    const matches = sequence.match(/vc/g);
    return matches ? matches.length : 0;
  }

  /** Check if w ends with a consonant sequence (CVC) */
  private isConsonantSequence(w: string): boolean {
    const match = w.match(/[^aeiouy][aeiouy][^aeiouywxY]$/);
    return match !== null;
  }

  /** Generate n-grams from tokens */
  generateNGrams(tokens: string[], n: number = 2): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join('_'));
    }
    return ngrams;
  }

  /** Compute term frequency for a document */
  computeTermFrequency(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
    return freq;
  }

  /** Clear stemmer cache */
  clearCache(): void {
    this.stemmerCache.clear();
  }

  /** Batch stem multiple words */
  stemBatch(words: string[]): string[] {
    return words.map(w => this.stem(w));
  }
}
