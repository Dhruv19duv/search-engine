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
import { ParsedQuery, SearchIntent } from '../types';
export declare class QueryProcessor {
    private tokenizer;
    private trie;
    private suggestionTrie;
    constructor();
    /** Seed common search patterns */
    private seedCommonQueries;
    /** Parse and process a raw query string */
    processQuery(rawQuery: string): ParsedQuery;
    /** Detect the type of query */
    private detectQueryType;
    /** Parse boolean query (e.g., "apple AND fruit OR banana NOT tech") */
    private parseBooleanQuery;
    /** Parse phrase query (e.g., "exact match" search) */
    private parsePhraseQuery;
    /** Parse fuzzy query (e.g., "apple~2") */
    private parseFuzzyQuery;
    /** Parse natural language query */
    private parseNaturalQuery;
    /** Classify search intent */
    classifyIntent(query: string): SearchIntent;
    /** Spell correction using Levenshtein distance */
    correctSpelling(terms: string[]): {
        original: string;
        corrected: string;
        distance: number;
    }[];
    /** Levenshtein edit distance */
    levenshteinDistance(a: string, b: string): number;
    /** Get spell check dictionary */
    private getDictionary;
    /** Get autocomplete suggestions for a prefix */
    getAutocomplete(prefix: string, maxResults?: number): string[];
    /** Get query suggestions */
    getSuggestions(query: string, maxResults?: number): string[];
    /** Build prefix-ngram trie for autocomplete */
    addToAutocomplete(query: string, frequency?: number): void;
}
//# sourceMappingURL=query-processor.d.ts.map