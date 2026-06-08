/**
 * Spell Corrector
 *
 * Context-aware spell correction using:
 * - Levenshtein edit distance for candidate generation
 * - N-gram language model for context scoring
 * - Dictionary-based verification
 * - Phonetic similarity (Soundex) for phonetic corrections
 */
export declare class SpellCorrector {
    private dictionary;
    private nGramModel;
    private unigramCounts;
    private totalWords;
    private soundexCache;
    constructor();
    /** Initialize with common English words */
    private initializeDictionary;
    /** Add word to dictionary with frequency */
    addToDictionary(word: string, frequency?: number): void;
    /** Correct a misspelled word with context */
    correct(word: string, context?: string[]): string;
    /** Generate candidate corrections using edit distance and phonetic similarity */
    private generateCandidates;
    /** Score a candidate based on frequency and context */
    private scoreCandidate;
    /** Context-based scoring using word bigrams */
    private contextScore;
    /** Check if a bigram is common (simplified) */
    private isCommonBigram;
    /** Compute character n-gram similarity */
    private characterNGramSimilarity;
    /** Get character n-grams */
    private getCharacterNGrams;
    /** Soundex phonetic encoding */
    private getSoundex;
    /** Soundex character code */
    private soundexCode;
    /** Levenshtein edit distance */
    levenshteinDistance(a: string, b: string): number;
    /** Add common misspellings corrections */
    private addCommonCorrections;
    /** Correct a full text string */
    correctText(text: string): {
        corrected: string;
        corrections: Array<{
            original: string;
            corrected: string;
        }>;
    };
    /** Check if a word is spelled correctly */
    isCorrect(word: string): boolean;
    /** Get dictionary size */
    getDictionarySize(): number;
}
//# sourceMappingURL=spell-corrector.d.ts.map