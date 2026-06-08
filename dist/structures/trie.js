"use strict";
/**
 * Trie + Aho-Corasick Automaton
 *
 * Trie provides O(prefix length) autocomplete lookups.
 * Aho-Corasick enables multi-pattern matching for phrase queries and spam detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trie = exports.TrieNode = void 0;
class TrieNode {
    children;
    isEndOfWord;
    frequency;
    /** Aho-Corasick failure link */
    failure;
    /** Aho-Corasick output (patterns that end at this node) */
    output;
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.frequency = 0;
        this.failure = null;
        this.output = [];
    }
}
exports.TrieNode = TrieNode;
class Trie {
    root;
    constructor() {
        this.root = new TrieNode();
    }
    /** Insert a word into the trie */
    insert(word, frequency = 1) {
        let node = this.root;
        const lower = word.toLowerCase();
        for (const char of lower) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }
        if (!node.isEndOfWord) {
            node.isEndOfWord = true;
            node.output.push(lower); // Store pattern for Aho-Corasick
        }
        node.frequency += frequency;
    }
    /** Search for an exact word */
    search(word) {
        const node = this._traverse(word.toLowerCase());
        return node !== null && node.isEndOfWord;
    }
    /** Get frequency of a word */
    getFrequency(word) {
        const node = this._traverse(word.toLowerCase());
        return node?.frequency ?? 0;
    }
    /** Check if a prefix exists */
    startsWith(prefix) {
        return this._traverse(prefix.toLowerCase()) !== null;
    }
    /** Traverse to the node at the end of a string */
    _traverse(s) {
        let node = this.root;
        for (const char of s) {
            if (!node.children.has(char))
                return null;
            node = node.children.get(char);
        }
        return node;
    }
    /** Get autocomplete suggestions for a prefix */
    autocomplete(prefix, maxResults = 10) {
        const node = this._traverse(prefix.toLowerCase());
        if (!node)
            return [];
        const results = [];
        this._dfs(node, prefix.toLowerCase(), results, maxResults);
        // Sort by frequency descending
        return results.sort((a, b) => b.frequency - a.frequency).slice(0, maxResults);
    }
    /** DFS to collect all words under a node */
    _dfs(node, prefix, results, maxResults) {
        if (results.length >= maxResults * 2)
            return; // collect extra then sort
        if (node.isEndOfWord) {
            results.push({ word: prefix, frequency: node.frequency });
        }
        for (const [char, child] of node.children) {
            this._dfs(child, prefix + char, results, maxResults);
        }
    }
    /** Build Aho-Corasick failure links */
    buildAhoCorasick() {
        const queue = [];
        // Initialize failure links for depth-1 nodes
        for (const [, child] of this.root.children) {
            child.failure = this.root;
            queue.push(child);
        }
        while (queue.length > 0) {
            const node = queue.shift();
            for (const [char, child] of node.children) {
                queue.push(child);
                // Find failure link
                let failure = node.failure;
                while (failure !== null && !failure.children.has(char)) {
                    failure = failure.failure;
                }
                child.failure = failure?.children.get(char) ?? this.root;
                // Merge output from failure node
                if (child.failure) {
                    child.output = [...child.output, ...child.failure.output];
                }
            }
        }
    }
    /** Aho-Corasick multi-pattern search */
    acSearch(text) {
        const matches = [];
        const seen = new Set();
        let node = this.root;
        const lower = text.toLowerCase();
        for (let i = 0; i < lower.length; i++) {
            const char = lower[i];
            // Follow failure links until we find a match or reach root
            while (node !== this.root && !node.children.has(char)) {
                node = node.failure;
            }
            node = node.children.get(char) ?? this.root;
            // Traverse failure links to collect all patterns ending here
            let temp = node;
            while (temp !== null) {
                for (const pattern of temp.output) {
                    if (!seen.has(pattern)) {
                        seen.add(pattern);
                        matches.push({ pattern, position: i - pattern.length + 1 });
                    }
                }
                temp = temp.failure;
            }
        }
        return matches;
    }
    /** Delete a word from the trie */
    delete(word) {
        const lower = word.toLowerCase();
        const stack = [];
        let node = this.root;
        for (const char of lower) {
            if (!node.children.has(char))
                return false;
            stack.push({ node, char });
            node = node.children.get(char);
        }
        if (!node.isEndOfWord)
            return false;
        node.isEndOfWord = false;
        node.frequency = 0;
        // Clean up unnecessary nodes from the bottom up
        for (let i = stack.length - 1; i >= 0; i--) {
            const { node: parent, char } = stack[i];
            const child = parent.children.get(char);
            if (child.children.size === 0 && !child.isEndOfWord) {
                parent.children.delete(char);
            }
            else {
                break;
            }
        }
        return true;
    }
    /** Get total number of words in the trie */
    wordCount() {
        let count = 0;
        const stack = [this.root];
        while (stack.length > 0) {
            const node = stack.pop();
            if (node.isEndOfWord)
                count++;
            for (const [, child] of node.children) {
                stack.push(child);
            }
        }
        return count;
    }
    /** Serialize to JSON-safe structure */
    toJSON() {
        return this._nodeToJSON(this.root);
    }
    _nodeToJSON(node) {
        const obj = {
            e: node.isEndOfWord,
            f: node.frequency
        };
        if (node.children.size > 0) {
            obj.c = {};
            for (const [char, child] of node.children) {
                obj.c[char] = this._nodeToJSON(child);
            }
        }
        return obj;
    }
}
exports.Trie = Trie;
//# sourceMappingURL=trie.js.map