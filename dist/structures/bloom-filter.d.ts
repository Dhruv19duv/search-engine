/**
 * Bloom Filter
 * Space-efficient probabilistic data structure for membership testing.
 * Used for O(1) visited-URL checking, avoids re-crawling.
 * Supports 1B+ URLs with < 1% false positive rate.
 */
export declare class BloomFilter {
    private bits;
    private size;
    private hashCount;
    private elementCount;
    private seed;
    /**
     * @param expectedElements - Number of elements expected to store
     * @param falsePositiveRate - Desired false positive rate (default 0.01 = 1%)
     */
    constructor(expectedElements: number, falsePositiveRate?: number);
    /** Calculate optimal bit array size: m = -n * ln(p) / (ln(2)^2) */
    private optimalSize;
    /** Calculate optimal hash count: k = (m/n) * ln(2) */
    private optimalHashCount;
    /** Compute the i-th hash for a given value using double hashing */
    private hash;
    /** FNV-1a hash */
    private fnv1a;
    /** Simple MurmurHash-style hash */
    private murmurHash;
    /** Add a value to the filter */
    add(value: string): void;
    /** Check if a value might be in the filter */
    mightContain(value: string): boolean;
    /** Check if a value is definitely NOT in the filter */
    definitelyNot(value: string): boolean;
    /** Current false positive rate estimate */
    estimatedFalsePositiveRate(): number;
    /** Number of elements added */
    count(): number;
    /** Clear the filter */
    clear(): void;
    /** Serialize to JSON */
    toJSON(): object;
    /** Deserialize from JSON */
    static fromJSON(json: any): BloomFilter;
    /** Merge another bloom filter into this one (union) */
    merge(other: BloomFilter): void;
}
//# sourceMappingURL=bloom-filter.d.ts.map