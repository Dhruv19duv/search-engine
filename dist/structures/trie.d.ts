/**
 * Trie + Aho-Corasick Automaton
 *
 * Trie provides O(prefix length) autocomplete lookups.
 * Aho-Corasick enables multi-pattern matching for phrase queries and spam detection.
 */
export declare class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;
    frequency: number;
    /** Aho-Corasick failure link */
    failure: TrieNode | null;
    /** Aho-Corasick output (patterns that end at this node) */
    output: string[];
    constructor();
}
export declare class Trie {
    root: TrieNode;
    constructor();
    /** Insert a word into the trie */
    insert(word: string, frequency?: number): void;
    /** Search for an exact word */
    search(word: string): boolean;
    /** Get frequency of a word */
    getFrequency(word: string): number;
    /** Check if a prefix exists */
    startsWith(prefix: string): boolean;
    /** Traverse to the node at the end of a string */
    private _traverse;
    /** Get autocomplete suggestions for a prefix */
    autocomplete(prefix: string, maxResults?: number): {
        word: string;
        frequency: number;
    }[];
    /** DFS to collect all words under a node */
    private _dfs;
    /** Build Aho-Corasick failure links */
    buildAhoCorasick(): void;
    /** Aho-Corasick multi-pattern search */
    acSearch(text: string): {
        pattern: string;
        position: number;
    }[];
    /** Delete a word from the trie */
    delete(word: string): boolean;
    /** Get total number of words in the trie */
    wordCount(): number;
    /** Serialize to JSON-safe structure */
    toJSON(): object;
    private _nodeToJSON;
}
//# sourceMappingURL=trie.d.ts.map