"use strict";
/**
 * SimHash
 * Locality-sensitive hashing for near-duplicate document detection.
 * O(1) per document comparison using 64-bit fingerprints.
 * Documents with Hamming distance < threshold are considered near-duplicates.
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
     * 1. Tokenize document into features (shingles)
     * 2. Hash each feature to a fingerprint-sized bit vector
     * 3. Weight each bit by term frequency
     * 4. Sum weighted bits, then threshold to produce final fingerprint
     */
    compute(content) {
        const tokens = this.tokenize(content);
        const shingles = this.shingle(tokens, 3); // 3-gram word shingles
        const weights = this.computeWeights(tokens);
        // V: array of accumulated weighted bits
        const V = new Array(this.fingerprintSize).fill(0);
        for (const shingle of shingles) {
            const hash = this.hashShingle(shingle);
            const weight = weights.get(shingle) || 1;
            for (let i = 0; i < this.fingerprintSize; i++) {
                if ((hash >> BigInt(i)) & BigInt(1)) {
                    V[i] += weight;
                }
                else {
                    V[i] -= weight;
                }
            }
        }
        // Generate final fingerprint: 1 if V[i] > 0, 0 otherwise
        let fingerprint = BigInt(0);
        for (let i = 0; i < this.fingerprintSize; i++) {
            if (V[i] > 0) {
                fingerprint |= (BigInt(1) << BigInt(i));
            }
        }
        return fingerprint;
    }
    /** Compute shingle hash using MD5 */
    hashShingle(shingle) {
        const hash = (0, crypto_1.createHash)('md5').update(shingle).digest();
        // Convert first 8 bytes to BigInt
        let result = BigInt(0);
        for (let i = 0; i < 8; i++) {
            result |= BigInt(hash[i]) << BigInt(i * 8);
        }
        return result;
    }
    /** Tokenize content into words */
    tokenize(content) {
        return content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);
    }
    /** Generate n-gram word shingles */
    shingle(tokens, n) {
        const shingles = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            shingles.push(tokens.slice(i, i + n).join(' '));
        }
        return shingles;
    }
    /** Compute term frequency weights */
    computeWeights(tokens) {
        const freq = new Map();
        for (const token of tokens) {
            freq.set(token, (freq.get(token) || 0) + 1);
        }
        return freq;
    }
    /**
     * Compute Hamming distance between two fingerprints.
     * Number of bit positions where they differ.
     */
    hammingDistance(a, b) {
        let xor = a ^ b;
        let distance = 0;
        while (xor > BigInt(0)) {
            distance += Number(xor & BigInt(1));
            xor >>= BigInt(1);
        }
        return distance;
    }
    /** Check if two documents are near-duplicates */
    isNearDuplicate(fp1, fp2) {
        return this.hammingDistance(fp1, fp2) <= this.threshold;
    }
    /**
     * LSH: Group similar fingerprints into buckets.
     * Divides fingerprint into bands; documents matching in any band are candidates.
     */
    lshBuckets(fingerprint, bands = 4) {
        const rowsPerBand = Math.ceil(this.fingerprintSize / bands);
        const buckets = [];
        for (let b = 0; b < bands; b++) {
            let bandValue = BigInt(0);
            for (let r = 0; r < rowsPerBand; r++) {
                const bitIndex = b * rowsPerBand + r;
                if (bitIndex < this.fingerprintSize) {
                    if ((fingerprint >> BigInt(bitIndex)) & BigInt(1)) {
                        bandValue |= (BigInt(1) << BigInt(r));
                    }
                }
            }
            buckets.push(`band_${b}_${bandValue.toString(36)}`);
        }
        return buckets;
    }
    /**
     * Find near-duplicate candidates among a set of fingerprints.
     * Uses LSH to bucket documents, then checks Hamming distance within buckets.
     */
    findNearDuplicates(fingerprints) {
        const bands = 4;
        // Band -> hash value -> list of doc IDs
        const buckets = new Map();
        for (let b = 0; b < bands; b++) {
            buckets.set(`band_${b}`, new Map());
        }
        for (const [docId, fp] of fingerprints) {
            const docBuckets = this.lshBuckets(fp, bands);
            for (let b = 0; b < docBuckets.length; b++) {
                const band = buckets.get(`band_${b}`);
                if (!band.has(docBuckets[b])) {
                    band.set(docBuckets[b], []);
                }
                band.get(docBuckets[b]).push(docId);
            }
        }
        // Find near-duplicates within each bucket
        const duplicates = new Map();
        for (let b = 0; b < bands; b++) {
            const band = buckets.get(`band_${b}`);
            for (const [, docIds] of band) {
                if (docIds.length < 2)
                    continue;
                for (let i = 0; i < docIds.length; i++) {
                    for (let j = i + 1; j < docIds.length; j++) {
                        const a = docIds[i];
                        const b_ = docIds[j];
                        const fpA = fingerprints.get(a);
                        const fpB = fingerprints.get(b_);
                        if (this.isNearDuplicate(fpA, fpB)) {
                            if (!duplicates.has(a))
                                duplicates.set(a, []);
                            if (!duplicates.has(b_))
                                duplicates.set(b_, []);
                            duplicates.get(a).push(b_);
                            duplicates.get(b_).push(a);
                        }
                    }
                }
            }
        }
        return duplicates;
    }
}
exports.SimHash = SimHash;
//# sourceMappingURL=simhash.js.map