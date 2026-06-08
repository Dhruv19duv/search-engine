/**
 * SimHash
 * Locality-sensitive hashing for near-duplicate document detection.
 * O(1) per document comparison using 64-bit fingerprints.
 * Documents with Hamming distance < threshold are considered near-duplicates.
 */
export declare class SimHash {
    private fingerprintSize;
    private threshold;
    constructor(fingerprintSize?: number, threshold?: number);
    /**
     * Compute SimHash fingerprint for a document.
     * 1. Tokenize document into features (shingles)
     * 2. Hash each feature to a fingerprint-sized bit vector
     * 3. Weight each bit by term frequency
     * 4. Sum weighted bits, then threshold to produce final fingerprint
     */
    compute(content: string): bigint;
    /** Compute shingle hash using MD5 */
    private hashShingle;
    /** Tokenize content into words */
    private tokenize;
    /** Generate n-gram word shingles */
    private shingle;
    /** Compute term frequency weights */
    private computeWeights;
    /**
     * Compute Hamming distance between two fingerprints.
     * Number of bit positions where they differ.
     */
    hammingDistance(a: bigint, b: bigint): number;
    /** Check if two documents are near-duplicates */
    isNearDuplicate(fp1: bigint, fp2: bigint): boolean;
    /**
     * LSH: Group similar fingerprints into buckets.
     * Divides fingerprint into bands; documents matching in any band are candidates.
     */
    lshBuckets(fingerprint: bigint, bands?: number): string[];
    /**
     * Find near-duplicate candidates among a set of fingerprints.
     * Uses LSH to bucket documents, then checks Hamming distance within buckets.
     */
    findNearDuplicates(fingerprints: Map<number, bigint>): Map<number, number[]>;
}
//# sourceMappingURL=simhash.d.ts.map