/**
 * SimHash - Locality-sensitive hashing for near-duplicate detection
 *
 * Key features:
 * - 64-bit fingerprints with configurable threshold
 * - Proper shingle-level TF weighting
 * - LSH band bucketing for O(1) candidate retrieval
 * - Brian Kernighan popcount for fast Hamming distance
 * - Deduplicated pair checking in findNearDuplicates
 */
export declare class SimHash {
    private fingerprintSize;
    private threshold;
    constructor(fingerprintSize?: number, threshold?: number);
    /**
     * Compute SimHash fingerprint for a document.
     *
     * Algorithm:
     * 1. Tokenize into words (preserves short connecting words for shingle stability)
     * 2. Generate 3-gram word shingles
     * 3. Compute shige-level TF weights
     * 4. For each shingle: MD5 hash → 64-bit vector, accumulate weighted ±1 per bit
     * 5. Threshold: V[i] >= 0 → bit=1, else bit=0
     */
    compute(content: string): bigint;
    /**
     * Hash a string to a fingerprint-sized unsigned integer.
     * Uses MD5 (fast, deterministic, well-distributed for SimHash).
     */
    private hashString;
    /**
     * Tokenize content into words.
     * Preserves all words (≥1 char) so short connecting words
     * like "by", "of", "in", "to", "at" are not lost.
     * Without them, 3-gram shingles lose positional context
     * and fingerprints become unstable for similar content.
     */
    private tokenize;
    /** Generate n-gram word shingles from tokens */
    private shingleWords;
    /**
     * Compute shingle-level term frequency weights.
     * Fix: keys are full shingle strings, so lookup in accumulation loop works.
     */
    private computeShingleWeights;
    /**
     * Hamming distance using Brian Kernighan's popcount algorithm.
     * O(popcount) instead of O(bit-length) — ~2x faster on average.
     */
    hammingDistance(a: bigint, b: bigint): number;
    /** Check if two fingerprints are near-duplicates (Hamming distance <= threshold) */
    isNearDuplicate(fp1: bigint, fp2: bigint): boolean;
    /**
     * LSH: Split fingerprint into bands and return bucket keys.
     * Documents matching in any band are candidate near-duplicates.
     */
    lshBuckets(fingerprint: bigint, bands?: number): string[];
    /**
     * Find near-duplicate pairs in a set of fingerprints.
     *
     * Strategy:
     * 1. LSH bucket all fingerprints
     * 2. For co-located pairs, verify with exact Hamming distance
     * 3. Deduplicate (each pair checked once regardless of band overlap)
     */
    findNearDuplicates(fingerprints: Map<number, bigint>, bands?: number): Map<number, number[]>;
}
//# sourceMappingURL=simhash.d.ts.map