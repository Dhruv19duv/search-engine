"use strict";
/**
 * Spell Corrector
 *
 * Context-aware spell correction using:
 * - Levenshtein edit distance for candidate generation
 * - N-gram language model for context scoring
 * - Dictionary-based verification
 * - Phonetic similarity (Soundex) for phonetic corrections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellCorrector = void 0;
class SpellCorrector {
    dictionary;
    nGramModel;
    unigramCounts;
    totalWords;
    soundexCache;
    constructor() {
        this.dictionary = new Set();
        this.nGramModel = new Map();
        this.unigramCounts = new Map();
        this.totalWords = 0;
        this.soundexCache = new Map();
        this.initializeDictionary();
    }
    /** Initialize with common English words */
    initializeDictionary() {
        const words = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
            'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some',
            'them', 'than', 'what', 'when', 'where', 'which', 'while', 'who', 'will',
            'with', 'would', 'about', 'across', 'after', 'again', 'almost', 'also',
            'another', 'apple', 'application', 'around', 'because', 'before', 'between',
            'computer', 'database', 'different', 'engine', 'enough', 'every', 'example',
            'following', 'form', 'found', 'government', 'great', 'group', 'however',
            'important', 'index', 'information', 'internet', 'known', 'language',
            'large', 'learning', 'level', 'little', 'machine', 'major', 'matter',
            'means', 'might', 'model', 'months', 'natural', 'necessary', 'network',
            'never', 'number', 'often', 'order', 'paper', 'particular', 'people',
            'period', 'place', 'point', 'possible', 'power', 'present', 'problem',
            'process', 'program', 'programming', 'public', 'purpose', 'question',
            'range', 'rather', 'reason', 'report', 'represent', 'research', 'result',
            'same', 'school', 'science', 'search', 'section', 'security', 'service',
            'several', 'should', 'similar', 'simple', 'since', 'small', 'social',
            'society', 'software', 'standard', 'state', 'still', 'study', 'subject',
            'system', 'technical', 'technology', 'though', 'thousand', 'three',
            'today', 'together', 'turned', 'understanding', 'university', 'upon',
            'value', 'various', 'version', 'wanted', 'water', 'within', 'without',
            'world', 'years', 'algorithm', 'crawler', 'tokenizer', 'stemmer',
            'ranking', 'query', 'indexing', 'retrieval', 'semantic', 'drift'
        ];
        for (const word of words) {
            this.addToDictionary(word, 100);
        }
    }
    /** Add word to dictionary with frequency */
    addToDictionary(word, frequency = 1) {
        this.dictionary.add(word.toLowerCase());
        this.unigramCounts.set(word.toLowerCase(), (this.unigramCounts.get(word.toLowerCase()) || 0) + frequency);
        this.totalWords += frequency;
        // Build bigram model for context
        const chars = '^' + word.toLowerCase() + '$';
        for (let i = 0; i < chars.length - 1; i++) {
            const bigram = chars.substring(i, i + 2);
            if (!this.nGramModel.has(bigram)) {
                this.nGramModel.set(bigram, new Map());
            }
            const charCounts = this.nGramModel.get(bigram);
            charCounts.set(chars[i + 2] || '$', (charCounts.get(chars[i + 2] || '$') || 0) + 1);
        }
    }
    /** Correct a misspelled word with context */
    correct(word, context = []) {
        const lower = word.toLowerCase();
        // Exact match
        if (this.dictionary.has(lower))
            return lower;
        // Generate candidates
        const candidates = this.generateCandidates(lower);
        if (candidates.length === 0)
            return lower;
        // Score candidates by context and frequency
        const scored = candidates.map(candidate => ({
            word: candidate,
            score: this.scoreCandidate(candidate, lower, context)
        }));
        // Return best match
        scored.sort((a, b) => b.score - a.score);
        return scored[0].word;
    }
    /** Generate candidate corrections using edit distance and phonetic similarity */
    generateCandidates(word) {
        const candidates = new Set();
        // Known edits distance 1
        for (const dictWord of this.dictionary) {
            if (Math.abs(dictWord.length - word.length) > 2)
                continue;
            if (this.levenshteinDistance(word, dictWord) <= 1) {
                candidates.add(dictWord);
            }
        }
        // If no edit distance 1 candidates, try edit distance 2
        if (candidates.size === 0) {
            for (const dictWord of this.dictionary) {
                if (Math.abs(dictWord.length - word.length) > 3)
                    continue;
                if (this.levenshteinDistance(word, dictWord) <= 2) {
                    candidates.add(dictWord);
                }
            }
        }
        // Add phonetic matches (Soundex)
        const wordSoundex = this.getSoundex(word);
        for (const dictWord of this.dictionary) {
            if (this.getSoundex(dictWord) === wordSoundex) {
                candidates.add(dictWord);
            }
        }
        // Add common misspellings corrections
        this.addCommonCorrections(word, candidates);
        return Array.from(candidates).slice(0, 20);
    }
    /** Score a candidate based on frequency and context */
    scoreCandidate(candidate, original, context) {
        let score = 0;
        // Unigram frequency score
        const freq = this.unigramCounts.get(candidate) || 0;
        score += Math.log(freq + 1) * 10;
        // Edit distance penalty
        const editDist = this.levenshteinDistance(original, candidate);
        score -= editDist * 5;
        // Character n-gram similarity
        score += this.characterNGramSimilarity(original, candidate) * 3;
        // Context-based scoring (bigram with surrounding words)
        if (context.length > 0) {
            score += this.contextScore(candidate, context);
        }
        // Length similarity bonus
        if (Math.abs(candidate.length - original.length) <= 1) {
            score += 2;
        }
        // Same first character bonus
        if (candidate[0] === original[0]) {
            score += 3;
        }
        return score;
    }
    /** Context-based scoring using word bigrams */
    contextScore(word, context) {
        let score = 0;
        for (const contextWord of context) {
            const bigram = contextWord.toLowerCase() + ' ' + word;
            // In production, this would check a bigram frequency table
            // For demo, check if the pair makes semantic sense
            if (this.isCommonBigram(contextWord.toLowerCase(), word)) {
                score += 5;
            }
        }
        return score;
    }
    /** Check if a bigram is common (simplified) */
    isCommonBigram(w1, w2) {
        const commonPairs = [
            ['search', 'engine'], ['web', 'crawler'], ['machine', 'learning'],
            ['artificial', 'intelligence'], ['data', 'structure'], ['computer', 'science'],
            ['information', 'retrieval'], ['natural', 'language'], ['deep', 'learning'],
            ['neural', 'network'], ['big', 'data'], ['cloud', 'computing'],
            ['social', 'media'], ['user', 'experience'], ['real', 'time']
        ];
        return commonPairs.some(([a, b]) => (a === w1 && b === w2) || (a === w2 && b === w1));
    }
    /** Compute character n-gram similarity */
    characterNGramSimilarity(a, b, n = 2) {
        const gramsA = this.getCharacterNGrams(a, n);
        const gramsB = this.getCharacterNGrams(b, n);
        let intersection = 0;
        for (const gram of gramsA) {
            if (gramsB.has(gram))
                intersection++;
        }
        const union = new Set([...gramsA, ...gramsB]);
        return union.size > 0 ? intersection / union.size : 0;
    }
    /** Get character n-grams */
    getCharacterNGrams(word, n) {
        const grams = new Set();
        const padded = '^'.repeat(n - 1) + word.toLowerCase() + '$'.repeat(n - 1);
        for (let i = 0; i <= padded.length - n; i++) {
            grams.add(padded.substring(i, i + n));
        }
        return grams;
    }
    /** Soundex phonetic encoding */
    getSoundex(word) {
        if (this.soundexCache.has(word)) {
            return this.soundexCache.get(word);
        }
        const upper = word.toUpperCase();
        if (upper.length === 0)
            return '';
        const first = upper[0];
        let encoded = first;
        let prevCode = this.soundexCode(first);
        for (let i = 1; i < upper.length && encoded.length < 4; i++) {
            const code = this.soundexCode(upper[i]);
            if (code !== '0' && code !== prevCode) {
                encoded += code;
                prevCode = code;
            }
        }
        // Pad with zeros
        while (encoded.length < 4)
            encoded += '0';
        this.soundexCache.set(word, encoded);
        return encoded;
    }
    /** Soundex character code */
    soundexCode(char) {
        const codes = {
            'B': '1', 'F': '1', 'P': '1', 'V': '1',
            'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
            'D': '3', 'T': '3',
            'L': '4',
            'M': '5', 'N': '5',
            'R': '6'
        };
        return codes[char] || '0';
    }
    /** Levenshtein edit distance */
    levenshteinDistance(a, b) {
        const m = a.length;
        const n = b.length;
        const dp = [];
        for (let i = 0; i <= m; i++) {
            dp[i] = [i];
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }
    /** Add common misspellings corrections */
    addCommonCorrections(word, candidates) {
        const corrections = {
            'recieve': ['receive'],
            'seperate': ['separate'],
            'occured': ['occurred'],
            'occurence': ['occurrence'],
            'acheive': ['achieve'],
            'acheivement': ['achievement'],
            'beleive': ['believe'],
            'beleif': ['belief'],
            'calender': ['calendar'],
            'cemetary': ['cemetery'],
            'definately': ['definitely'],
            'existance': ['existence'],
            'freind': ['friend'],
            'goverment': ['government'],
            'harrass': ['harass'],
            'independant': ['independent'],
            'liason': ['liaison'],
            'millenium': ['millennium'],
            'neccessary': ['necessary'],
            'occassion': ['occasion'],
            'paralel': ['parallel'],
            'priviledge': ['privilege'],
            'publically': ['publicly'],
            'recamend': ['recommend'],
            'thier': ['their'],
            'tommorow': ['tomorrow'],
            'untill': ['until'],
            'wierd': ['weird']
        };
        if (corrections[word]) {
            for (const c of corrections[word]) {
                candidates.add(c);
            }
        }
    }
    /** Correct a full text string */
    correctText(text) {
        const words = text.split(/\s+/);
        const corrections = [];
        const correctedWords = [];
        for (let i = 0; i < words.length; i++) {
            const word = words[i].replace(/[^\w]/g, '');
            const punctuation = words[i].replace(/\w/g, '');
            if (word.length > 0) {
                const context = [
                    ...(i > 0 ? [words[i - 1].replace(/[^\w]/g, '')] : []),
                    ...(i < words.length - 1 ? [words[i + 1].replace(/[^\w]/g, '')] : [])
                ];
                const corrected = this.correct(word, context);
                if (corrected !== word) {
                    corrections.push({ original: word, corrected });
                }
                correctedWords.push(corrected + punctuation);
            }
            else {
                correctedWords.push(words[i]);
            }
        }
        return {
            corrected: correctedWords.join(' '),
            corrections
        };
    }
    /** Check if a word is spelled correctly */
    isCorrect(word) {
        return this.dictionary.has(word.toLowerCase());
    }
    /** Get dictionary size */
    getDictionarySize() {
        return this.dictionary.size;
    }
}
exports.SpellCorrector = SpellCorrector;
//# sourceMappingURL=spell-corrector.js.map