"use strict";
/**
 * Bloom Filter
 * Space-efficient probabilistic data structure for membership testing.
 * Used for O(1) visited-URL checking, avoids re-crawling.
 * Supports 1B+ URLs with < 1% false positive rate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BloomFilter = void 0;
class BloomFilter {
    bits;
    size;
    hashCount;
    elementCount;
    seed;
    /**
     * @param expectedElements - Number of elements expected to store
     * @param falsePositiveRate - Desired false positive rate (default 0.01 = 1%)
     */
    constructor(expectedElements, falsePositiveRate = 0.01) {
        this.size = this.optimalSize(expectedElements, falsePositiveRate);
        this.hashCount = this.optimalHashCount(this.size, expectedElements);
        this.bits = Buffer.alloc(Math.ceil(this.size / 8), 0);
        this.elementCount = 0;
        this.seed = 42;
    }
    /** Calculate optimal bit array size: m = -n * ln(p) / (ln(2)^2) */
    optimalSize(n, p) {
        return Math.ceil(-n * Math.log(p) / (Math.LN2 * Math.LN2));
    }
    /** Calculate optimal hash count: k = (m/n) * ln(2) */
    optimalHashCount(m, n) {
        return Math.max(1, Math.ceil((m / n) * Math.LN2));
    }
    /** Compute the i-th hash for a given value using double hashing */
    hash(value, i) {
        const h1 = this.fnv1a(value + ':' + this.seed);
        const h2 = this.murmurHash(value + ':' + (this.seed + 1));
        return Math.abs((h1 + i * h2) % this.size);
    }
    /** FNV-1a hash */
    fnv1a(value) {
        let hash = 0x811c9dc5;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
        return hash >>> 0;
    }
    /** Simple MurmurHash-style hash */
    murmurHash(value) {
        let hash = 0x9747b28c ^ value.length;
        for (let i = 0; i < value.length; i++) {
            hash = Math.imul(hash ^ value.charCodeAt(i), 0x5bd1e995);
            hash ^= hash >>> 15;
        }
        return hash >>> 0;
    }
    /** Add a value to the filter */
    add(value) {
        for (let i = 0; i < this.hashCount; i++) {
            const idx = this.hash(value, i);
            this.bits[Math.floor(idx / 8)] |= (1 << (idx % 8));
        }
        this.elementCount++;
    }
    /** Check if a value might be in the filter */
    mightContain(value) {
        for (let i = 0; i < this.hashCount; i++) {
            const idx = this.hash(value, i);
            if (!(this.bits[Math.floor(idx / 8)] & (1 << (idx % 8)))) {
                return false;
            }
        }
        return true;
    }
    /** Check if a value is definitely NOT in the filter */
    definitelyNot(value) {
        return !this.mightContain(value);
    }
    /** Current false positive rate estimate */
    estimatedFalsePositiveRate() {
        return Math.pow(1 - Math.exp(-this.hashCount * this.elementCount / this.size), this.hashCount);
    }
    /** Number of elements added */
    count() {
        return this.elementCount;
    }
    /** Clear the filter */
    clear() {
        this.bits.fill(0);
        this.elementCount = 0;
    }
    /** Serialize to JSON */
    toJSON() {
        return {
            size: this.size,
            hashCount: this.hashCount,
            bits: this.bits.toString('base64'),
            elementCount: this.elementCount,
            seed: this.seed
        };
    }
    /** Deserialize from JSON */
    static fromJSON(json) {
        const filter = new BloomFilter(1);
        filter.size = json.size;
        filter.hashCount = json.hashCount;
        filter.bits = Buffer.from(json.bits, 'base64');
        filter.elementCount = json.elementCount;
        filter.seed = json.seed || 42;
        return filter;
    }
    /** Merge another bloom filter into this one (union) */
    merge(other) {
        if (this.size !== other.size || this.hashCount !== other.hashCount) {
            throw new Error('Cannot merge filters with different parameters');
        }
        for (let i = 0; i < this.bits.length; i++) {
            this.bits[i] |= other.bits[i];
        }
        this.elementCount = Math.max(this.elementCount, other.elementCount);
    }
}
exports.BloomFilter = BloomFilter;
//# sourceMappingURL=bloom-filter.js.map