"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimHash = void 0;
const crypto_1 = require("crypto");
class SimHash {
    fingerprintSize;
    threshold;
    constructor(fingerprintSize = 64, threshold = 3) {
        this.fingerprintSize = fingerprintSize;
        this.threshold = threshold;
    }
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
    compute(content) {
        const tokens = this.tokenize(content);
        if (tokens.length < 3)
            return BigInt(0);
        const shingles = this.shingleWords(tokens, 3);
        const shingleFreq = this.computeShingleWeights(shingles);
        const V = new Int32Array(this.fingerprintSize);
        for (const shingle of shingles) {
            const hash = this.hashString(shingle);
            const weight = shingleFreq.get(shingle) || 1;
            // For each bit: +weight if set, -weight if unset
            let h = hash;
            for (let i = 0; i < this.fingerprintSize; i++) {
                V[i] += (h & BigInt(1)) ? weight : -weight;
                h >>= BigInt(1);
            }
        }
        // Generate final fingerprint: 1 if V[i] >= 0, 0 otherwise
        let fingerprint = BigInt(0);
        for (let i = 0; i < this.fingerprintSize; i++) {
            if (V[i] >= 0) {
                fingerprint |= (BigInt(1) << BigInt(i));
            }
        }
        return fingerprint;
    }
    /**
     * Hash a string to a fingerprint-sized unsigned integer.
     * Uses MD5 (fast, deterministic, well-distributed for SimHash).
     */
    hashString(data) {
        const digest = (0, crypto_1.createHash)('md5').update(data).digest();
        const bytesNeeded = Math.ceil(this.fingerprintSize / 8);
        let result = BigInt(0);
        for (let i = 0; i < bytesNeeded && i < digest.length; i++) {
            result |= BigInt(digest[i]) << BigInt(i * 8);
        }
        if (this.fingerprintSize < 64) {
            const mask = (BigInt(1) << BigInt(this.fingerprintSize)) - BigInt(1);
            result &= mask;
        }
        return result;
    }
    /**
     * Tokenize content into words.
     * Preserves all words (≥1 char) so short connecting words
     * like "by", "of", "in", "to", "at" are not lost.
     * Without them, 3-gram shingles lose positional context
     * and fingerprints become unstable for similar content.
     */
    tokenize(content) {
        const cleaned = content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .trim();
        if (!cleaned)
            return [];
        const words = cleaned.split(/\s+/);
        // Keep all non-empty words (including 1-2 char connecting words)
        return words.filter(w => w.length >= 1);
    }
    /** Generate n-gram word shingles from tokens */
    shingleWords(tokens, n) {
        if (tokens.length < n)
            return [];
        const shingles = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            shingles.push(tokens.slice(i, i + n).join(' '));
        }
        return shingles;
    }
    /**
     * Compute shingle-level term frequency weights.
     * Fix: keys are full shingle strings, so lookup in accumulation loop works.
     */
    computeShingleWeights(shingles) {
        const freq = new Map();
        for (const shingle of shingles) {
            freq.set(shingle, (freq.get(shingle) || 0) + 1);
        }
        return freq;
    }
    /**
     * Hamming distance using Brian Kernighan's popcount algorithm.
     * O(popcount) instead of O(bit-length) — ~2x faster on average.
     */
    hammingDistance(a, b) {
        let xor = a ^ b;
        let distance = 0;
        while (xor !== BigInt(0)) {
            xor &= (xor - BigInt(1)); // Clear the lowest set bit
            distance++;
        }
        return distance;
    }
    /** Check if two fingerprints are near-duplicates (Hamming distance <= threshold) */
    isNearDuplicate(fp1, fp2) {
        return this.hammingDistance(fp1, fp2) <= this.threshold;
    }
    /**
     * LSH: Split fingerprint into bands and return bucket keys.
     * Documents matching in any band are candidate near-duplicates.
     */
    lshBuckets(fingerprint, bands = 4) {
        const rowsPerBand = Math.ceil(this.fingerprintSize / bands);
        const buckets = new Array(bands);
        for (let b = 0; b < bands; b++) {
            let bandValue = BigInt(0);
            for (let r = 0; r < rowsPerBand; r++) {
                const bitIndex = b * rowsPerBand + r;
                if (bitIndex < this.fingerprintSize) {
                    const bit = (fingerprint >> BigInt(bitIndex)) & BigInt(1);
                    bandValue |= (bit << BigInt(r));
                }
            }
            buckets[b] = `b${b}_${bandValue.toString(36)}`;
        }
        return buckets;
    }
    /**
     * Find near-duplicate pairs in a set of fingerprints.
     *
     * Strategy:
     * 1. LSH bucket all fingerprints
     * 2. For co-located pairs, verify with exact Hamming distance
     * 3. Deduplicate (each pair checked once regardless of band overlap)
     */
    findNearDuplicates(fingerprints, bands = 16) {
        if (fingerprints.size < 2)
            return new Map();
        // bucketKey → Set<docId>
        const bucketMap = new Map();
        for (const [docId, fp] of fingerprints) {
            for (const key of this.lshBuckets(fp, bands)) {
                if (!bucketMap.has(key)) {
                    bucketMap.set(key, new Set());
                }
                bucketMap.get(key).add(docId);
            }
        }
        // Deduplicated pair checking
        const checkedPairs = new Set();
        const duplicates = new Map();
        for (const docIds of bucketMap.values()) {
            if (docIds.size < 2)
                continue;
            const ids = Array.from(docIds);
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    const a = ids[i];
                    const b = ids[j];
                    const pairKey = a < b ? `${a}_${b}` : `${b}_${a}`;
                    if (checkedPairs.has(pairKey))
                        continue;
                    checkedPairs.add(pairKey);
                    const fpA = fingerprints.get(a);
                    const fpB = fingerprints.get(b);
                    if (this.hammingDistance(fpA, fpB) <= this.threshold) {
                        if (!duplicates.has(a))
                            duplicates.set(a, new Set());
                        if (!duplicates.has(b))
                            duplicates.set(b, new Set());
                        duplicates.get(a).add(b);
                        duplicates.get(b).add(a);
                    }
                }
            }
        }
        // Convert to sorted arrays for deterministic output
        const result = new Map();
        for (const [docId, neighbors] of duplicates) {
            result.set(docId, Array.from(neighbors).sort((a, b) => a - b));
        }
        return result;
    }
}
exports.SimHash = SimHash;
//# sourceMappingURL=simhash.js.map