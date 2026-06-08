"use strict";
/**
 * Query Processor
 *
 * Parses and processes search queries supporting:
 * - Boolean queries (AND, OR, NOT)
 * - Phrase queries ("exact match")
 * - Fuzzy queries (~edit distance)
 * - Natural language queries
 * - Query correction and suggestion
 * - Intent classification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryProcessor = void 0;
const types_1 = require("../types");
const trie_1 = require("../structures/trie");
const tokenizer_1 = require("../indexer/tokenizer");
class QueryProcessor {
    tokenizer;
    trie;
    suggestionTrie;
    constructor() {
        this.tokenizer = new tokenizer_1.Tokenizer();
        this.trie = new trie_1.Trie();
        this.suggestionTrie = new trie_1.Trie();
        // Seed common queries for autocomplete
        this.seedCommonQueries();
    }
    /** Seed common search patterns */
    seedCommonQueries() {
        const commonQueries = [
            { text: 'apple', freq: 1000 },
            { text: 'apple fruit', freq: 500 },
            { text: 'apple tech', freq: 800 },
            { text: 'artificial intelligence', freq: 2000 },
            { text: 'machine learning', freq: 1800 },
            { text: 'search engine', freq: 1500 },
            { text: 'web crawler', freq: 600 },
            { text: 'data structure', freq: 700 },
            { text: 'programming', freq: 1200 },
            { text: 'database', freq: 900 },
            { text: 'algorithm', freq: 850 },
            { text: 'javascript', freq: 1100 },
            { text: 'typescript', freq: 950 },
            { text: 'node.js', freq: 880 },
            { text: 'python', freq: 1300 },
            { text: 'react', freq: 1000 },
            { text: 'tensorflow', freq: 750 },
            { text: 'blockchain', freq: 650 },
            { text: 'cybersecurity', freq: 700 },
            { text: 'cloud computing', freq: 900 }
        ];
        for (const q of commonQueries) {
            this.trie.insert(q.text, q.freq);
            this.suggestionTrie.insert(q.text, q.freq);
        }
    }
    /** Parse and process a raw query string */
    processQuery(rawQuery) {
        const trimmed = rawQuery.trim();
        // Detect query type
        const queryType = this.detectQueryType(trimmed);
        let parsed;
        switch (queryType) {
            case types_1.QueryType.BOOLEAN:
                parsed = this.parseBooleanQuery(trimmed);
                break;
            case types_1.QueryType.PHRASE:
                parsed = this.parsePhraseQuery(trimmed);
                break;
            case types_1.QueryType.FUZZY:
                parsed = this.parseFuzzyQuery(trimmed);
                break;
            default:
                parsed = this.parseNaturalQuery(trimmed);
        }
        // Classify intent
        parsed.intent = this.classifyIntent(trimmed);
        // Spell correction
        parsed.correctedTerms = this.correctSpelling(parsed.terms);
        return parsed;
    }
    /** Detect the type of query */
    detectQueryType(query) {
        // Boolean query detection
        if (/\b(AND|OR|NOT)\b/i.test(query)) {
            return types_1.QueryType.BOOLEAN;
        }
        // Phrase query detection
        if (/"[^"]*"/.test(query)) {
            return types_1.QueryType.PHRASE;
        }
        // Fuzzy query detection
        if (/~\d+/.test(query)) {
            return types_1.QueryType.FUZZY;
        }
        return types_1.QueryType.NATURAL;
    }
    /** Parse boolean query (e.g., "apple AND fruit OR banana NOT tech") */
    parseBooleanQuery(query) {
        const terms = query.split(/\s+/);
        const operators = [];
        const cleanTerms = [];
        let currentOperator = 'AND';
        for (const term of terms) {
            if (term === 'AND' || term === 'OR' || term === 'NOT') {
                currentOperator = term;
            }
            else {
                const normalized = this.tokenizer.normalize(term);
                if (normalized) {
                    cleanTerms.push(normalized);
                    operators.push({ term: normalized, operator: currentOperator });
                    currentOperator = 'AND';
                }
            }
        }
        return {
            original: query,
            terms: cleanTerms,
            type: types_1.QueryType.BOOLEAN,
            intent: types_1.SearchIntent.INFORMATIONAL,
            booleanOperators: operators
        };
    }
    /** Parse phrase query (e.g., "exact match" search) */
    parsePhraseQuery(query) {
        const phraseMatch = query.match(/"([^"]+)"/);
        const phrase = phraseMatch ? phraseMatch[1] : query;
        // Remove phrase for remaining terms
        const remaining = query.replace(/"([^"]+)"/, '').trim();
        const otherTerms = remaining ? this.tokenizer.normalize(remaining).split(/\s+/) : [];
        return {
            original: query,
            terms: [...this.tokenizer.tokenize(phrase), ...otherTerms],
            type: types_1.QueryType.PHRASE,
            intent: types_1.SearchIntent.INFORMATIONAL,
            phraseTerms: phrase.split(/\s+/)
        };
    }
    /** Parse fuzzy query (e.g., "apple~2") */
    parseFuzzyQuery(query) {
        const fuzzyTerms = [];
        const cleanTerms = [];
        const terms = query.split(/\s+/);
        for (const term of terms) {
            const fuzzyMatch = term.match(/^(\w+)~(\d+)$/);
            if (fuzzyMatch) {
                const base = fuzzyMatch[1].toLowerCase();
                const dist = parseInt(fuzzyMatch[2], 10);
                fuzzyTerms.push({ term: base, maxDistance: Math.min(dist, 5) });
                cleanTerms.push(base);
            }
            else {
                const normalized = this.tokenizer.normalize(term);
                if (normalized) {
                    cleanTerms.push(normalized);
                }
            }
        }
        return {
            original: query,
            terms: cleanTerms,
            type: types_1.QueryType.FUZZY,
            intent: types_1.SearchIntent.INFORMATIONAL,
            fuzzyTerms
        };
    }
    /** Parse natural language query */
    parseNaturalQuery(query) {
        const normalized = this.tokenizer.normalize(query);
        const terms = this.tokenizer.tokenize(query);
        return {
            original: query,
            terms,
            type: types_1.QueryType.NATURAL,
            intent: types_1.SearchIntent.INFORMATIONAL
        };
    }
    /** Classify search intent */
    classifyIntent(query) {
        const lower = query.toLowerCase();
        // Navigational indicators (looking for a specific site/page)
        const navigationalPatterns = [
            /^(login|signin|signup|register)\b/,
            /\b(website|official|site|homepage|home page)\b/,
            /\.(com|org|net|io|gov)\b/,
            /\b(facebook|twitter|youtube|instagram|linkedin|github)\b/
        ];
        for (const pattern of navigationalPatterns) {
            if (pattern.test(lower))
                return types_1.SearchIntent.NAVIGATIONAL;
        }
        // Transactional indicators (looking to do something)
        const transactionalPatterns = [
            /\b(buy|purchase|order|shop|price|cost|discount|deal)\b/,
            /\b(download|install|get|subscribe)\b/,
            /\b(hotel|flight|booking|reservation|ticket)\b/,
            /\b(how\s+to|tutorial|guide|course|learn)\b/,
            /\b(near\s+me|best|top|cheap|affordable)\b/
        ];
        for (const pattern of transactionalPatterns) {
            if (pattern.test(lower))
                return types_1.SearchIntent.TRANSACTIONAL;
        }
        // Default to informational
        return types_1.SearchIntent.INFORMATIONAL;
    }
    /** Spell correction using Levenshtein distance */
    correctSpelling(terms) {
        const corrections = [];
        const dictionary = this.getDictionary();
        for (const term of terms) {
            if (dictionary.has(term))
                continue;
            let bestMatch = term;
            let bestDist = Infinity;
            for (const dictWord of dictionary) {
                const dist = this.levenshteinDistance(term, dictWord);
                if (dist < bestDist && dist <= 2) {
                    bestDist = dist;
                    bestMatch = dictWord;
                }
            }
            if (bestMatch !== term && bestDist <= 2) {
                corrections.push({ original: term, corrected: bestMatch, distance: bestDist });
            }
        }
        return corrections;
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
                dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + cost // substitution
                );
            }
        }
        return dp[m][n];
    }
    /** Get spell check dictionary */
    getDictionary() {
        // In production, this would be loaded from a word list
        const words = [
            'apple', 'banana', 'orange', 'grape', 'fruit', 'computer', 'science',
            'search', 'engine', 'web', 'crawler', 'index', 'algorithm', 'data',
            'structure', 'machine', 'learning', 'artificial', 'intelligence',
            'programming', 'javascript', 'typescript', 'python', 'java', 'rust',
            'database', 'network', 'security', 'cloud', 'api', 'frontend', 'backend',
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
            'information', 'technology', 'system', 'design', 'development', 'software',
            'hardware', 'memory', 'storage', 'performance', 'scalability'
        ];
        return new Set(words);
    }
    /** Get autocomplete suggestions for a prefix */
    getAutocomplete(prefix, maxResults = 8) {
        const results = this.trie.autocomplete(prefix.toLowerCase(), maxResults);
        return results.map(r => r.word);
    }
    /** Get query suggestions */
    getSuggestions(query, maxResults = 5) {
        const terms = query.toLowerCase().split(/\s+/);
        const lastTerm = terms[terms.length - 1];
        if (terms.length === 1) {
            return this.trie.autocomplete(lastTerm, maxResults).map(r => r.word);
        }
        // For multi-word queries, suggest completions of the last word
        const prefix = terms.slice(0, -1).join(' ') + ' ';
        const completions = this.trie.autocomplete(lastTerm, maxResults);
        return completions.map(c => prefix + c.word);
    }
    /** Build prefix-ngram trie for autocomplete */
    addToAutocomplete(query, frequency = 1) {
        this.trie.insert(query.toLowerCase(), frequency);
    }
}
exports.QueryProcessor = QueryProcessor;
//# sourceMappingURL=query-processor.js.map