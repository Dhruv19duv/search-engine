/**
 * Skip List
 *
 * Used for merging posting lists during AND/OR queries.
 * O(log n) skip pointers outperform sorted array merge at scale.
 * Provides efficient nextGEQ (next greater-or-equal) queries.
 */
import { Posting } from '../types';
export declare class SkipListPostingList {
    private maxLevel;
    private probability;
    private header;
    private currentLevel;
    private _size;
    constructor(maxLevel?: number, probability?: number);
    /** Generate random level for new node */
    private randomLevel;
    /** Insert a posting into the skip list */
    insert(posting: Posting): void;
    /** Find first posting with docId >= target */
    nextGEQ(target: number): Posting | null;
    /** Get a posting by docId */
    get(docId: number): Posting | null;
    /** AND merge two posting lists (intersection) */
    static andMerge(a: SkipListPostingList, b: SkipListPostingList): SkipListPostingList;
    /** OR merge two posting lists (union) */
    static orMerge(a: SkipListPostingList, b: SkipListPostingList): SkipListPostingList;
    /** AND-NOT merge (docs in A but not in B) */
    static andNotMerge(a: SkipListPostingList, b: SkipListPostingList): SkipListPostingList;
    /** Convert to sorted array */
    toArray(): Posting[];
    /** Get size */
    get size(): number;
    /** Clear the list */
    clear(): void;
}
//# sourceMappingURL=skip-list.d.ts.map