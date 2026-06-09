"use strict";
/**
 * Skip List
 *
 * Used for merging posting lists during AND/OR queries.
 * O(log n) skip pointers outperform sorted array merge at scale.
 * Provides efficient nextGEQ (next greater-or-equal) queries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipListPostingList = void 0;
class SkipListNode {
    posting;
    forward; // array of forward pointers at each level
    constructor(posting, level) {
        this.posting = posting;
        this.forward = new Array(level + 1).fill(null);
    }
}
class SkipListPostingList {
    maxLevel;
    probability;
    header;
    currentLevel;
    _size;
    constructor(maxLevel = 16, probability = 0.5) {
        this.maxLevel = maxLevel;
        this.probability = probability;
        this.header = new SkipListNode({ docId: -1, termFrequency: 0, positions: [] }, maxLevel);
        this.currentLevel = 0;
        this._size = 0;
    }
    /** Generate random level for new node */
    randomLevel() {
        let level = 0;
        while (Math.random() < this.probability && level < this.maxLevel) {
            level++;
        }
        return level;
    }
    /** Insert a posting into the skip list */
    insert(posting) {
        const update = new Array(this.maxLevel + 1).fill(null);
        let current = this.header;
        // Find position to insert at each level
        for (let i = this.currentLevel; i >= 0; i--) {
            while (current.forward[i] !== null && current.forward[i].posting.docId < posting.docId) {
                current = current.forward[i];
            }
            update[i] = current;
        }
        current = current.forward[0];
        // Insert if docId doesn't already exist
        if (current === null || current.posting.docId !== posting.docId) {
            const newLevel = this.randomLevel();
            if (newLevel > this.currentLevel) {
                for (let i = this.currentLevel + 1; i <= newLevel; i++) {
                    update[i] = this.header;
                }
                this.currentLevel = newLevel;
            }
            const newNode = new SkipListNode(posting, newLevel);
            for (let i = 0; i <= newLevel; i++) {
                newNode.forward[i] = update[i].forward[i];
                update[i].forward[i] = newNode;
            }
            this._size++;
        }
        else {
            // Update existing entry's term frequency
            current.posting.termFrequency = posting.termFrequency;
            if (posting.positions.length > 0) {
                current.posting.positions = posting.positions;
            }
        }
    }
    /** Find first posting with docId >= target */
    nextGEQ(target) {
        let current = this.header;
        for (let i = this.currentLevel; i >= 0; i--) {
            while (current.forward[i] !== null && current.forward[i].posting.docId < target) {
                current = current.forward[i];
            }
        }
        current = current.forward[0];
        return current ? current.posting : null;
    }
    /** Get a posting by docId */
    get(docId) {
        const result = this.nextGEQ(docId);
        if (result && result.docId === docId)
            return result;
        return null;
    }
    /** AND merge two posting lists (intersection) */
    static andMerge(a, b) {
        const result = new SkipListPostingList();
        let docA = a.nextGEQ(0);
        let docB = b.nextGEQ(0);
        while (docA !== null && docB !== null) {
            if (docA.docId === docB.docId) {
                result.insert({
                    docId: docA.docId,
                    termFrequency: docA.termFrequency + docB.termFrequency,
                    positions: [...docA.positions, ...docB.positions]
                });
                docA = a.nextGEQ(docA.docId + 1);
                docB = b.nextGEQ(docB.docId + 1);
            }
            else if (docA.docId < docB.docId) {
                docA = a.nextGEQ(docB.docId);
            }
            else {
                docB = b.nextGEQ(docA.docId);
            }
        }
        return result;
    }
    /** OR merge two posting lists (union) */
    static orMerge(a, b) {
        const result = new SkipListPostingList();
        let docA = a.nextGEQ(0);
        let docB = b.nextGEQ(0);
        while (docA !== null || docB !== null) {
            if (docA === null && docB !== null) {
                result.insert(docB);
                docB = b.nextGEQ(docB.docId + 1);
            }
            else if (docB === null && docA !== null) {
                result.insert(docA);
                docA = a.nextGEQ(docA.docId + 1);
            }
            else if (docA !== null && docB !== null) {
                if (docA.docId === docB.docId) {
                    result.insert({
                        docId: docA.docId,
                        termFrequency: docA.termFrequency + docB.termFrequency,
                        positions: [...docA.positions, ...docB.positions]
                    });
                    docA = a.nextGEQ(docA.docId + 1);
                    docB = b.nextGEQ(docB.docId + 1);
                }
                else if (docA.docId < docB.docId) {
                    result.insert(docA);
                    docA = a.nextGEQ(docA.docId + 1);
                }
                else {
                    result.insert(docB);
                    docB = b.nextGEQ(docB.docId + 1);
                }
            }
            else {
                break;
            }
        }
        return result;
    }
    /** AND-NOT merge (docs in A but not in B) */
    static andNotMerge(a, b) {
        const result = new SkipListPostingList();
        let docA = a.nextGEQ(0);
        let docB = b.nextGEQ(0);
        while (docA !== null) {
            if (docB === null) {
                result.insert(docA);
                docA = a.nextGEQ(docA.docId + 1);
            }
            else if (docA.docId < docB.docId) {
                result.insert(docA);
                docA = a.nextGEQ(docA.docId + 1);
            }
            else if (docA.docId === docB.docId) {
                docA = a.nextGEQ(docA.docId + 1);
                docB = b.nextGEQ(docB.docId + 1);
            }
            else {
                docB = b.nextGEQ(docA.docId);
            }
        }
        return result;
    }
    /** Convert to sorted array */
    toArray() {
        const result = [];
        let current = this.header.forward[0];
        while (current !== null) {
            result.push(current.posting);
            current = current.forward[0];
        }
        return result;
    }
    /** Get size */
    get size() {
        return this._size;
    }
    /** Clear the list */
    clear() {
        this.header = new SkipListNode({ docId: -1, termFrequency: 0, positions: [] }, this.maxLevel);
        this.currentLevel = 0;
        this._size = 0;
    }
}
exports.SkipListPostingList = SkipListPostingList;
//# sourceMappingURL=skip-list.js.map