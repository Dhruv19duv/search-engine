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
export declare class Tokenizer {
    private stopWords;
    private stemmerCache;
    constructor();
    /** Main tokenization pipeline */
    tokenize(text: string): string[];
    /** Full tokenization with positions for phrase queries */
    tokenizeWithPositions(text: string): Map<string, number[]>;
    /** Normalize text: lowercase, unicode normalize, remove punctuation */
    normalize(text: string): string;
    /** Check if a word is a stop word */
    isStopWord(word: string): boolean;
    /** Porter stemmer implementation */
    stem(word: string): string;
    private _stem;
    /** Apply a set of replacement rules */
    private applyRules;
    /** Apply replacement rules only in R1 region */
    private applyRulesInR1;
    /** Get R1 region (after first non-vowel following a vowel) */
    private getR1;
    /** Calculate the measure m (number of VC sequences) */
    private measure;
    /** Check if w ends with a consonant sequence (CVC) */
    private isConsonantSequence;
    /** Generate n-grams from tokens */
    generateNGrams(tokens: string[], n?: number): string[];
    /** Compute term frequency for a document */
    computeTermFrequency(tokens: string[]): Map<string, number>;
    /** Clear stemmer cache */
    clearCache(): void;
    /** Batch stem multiple words */
    stemBatch(words: string[]): string[];
}
//# sourceMappingURL=tokenizer.d.ts.map