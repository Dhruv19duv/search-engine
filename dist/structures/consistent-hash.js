"use strict";
/**
 * Consistent Hashing
 *
 * Distributes index shards across nodes.
 * Adding/removing servers rebalances only ~1/N keys, not the whole ring.
 * Essential for horizontal scalability of the index.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsistentHash = void 0;
const crypto_1 = require("crypto");
class ConsistentHash {
    ring; // hash -> nodeId
    sortedHashes;
    virtualNodes; // virtual nodes per physical node
    nodeMap; // nodeId -> count of virtual nodes
    constructor(virtualNodes = 150) {
        this.ring = new Map();
        this.sortedHashes = [];
        this.virtualNodes = virtualNodes;
        this.nodeMap = new Map();
    }
    /** Hash a key to a number on the ring */
    hash(key) {
        const hash = (0, crypto_1.createHash)('md5').update(key).digest();
        // Use first 4 bytes as a 32-bit integer
        let result = 0;
        for (let i = 0; i < 4; i++) {
            result = (result << 8) | hash[i];
        }
        return result >>> 0; // ensure unsigned
    }
    /** Add a node to the ring */
    addNode(nodeId) {
        if (this.nodeMap.has(nodeId))
            return;
        let count = 0;
        for (let i = 0; i < this.virtualNodes; i++) {
            const vnodeKey = `${nodeId}:vnode:${i}`;
            const h = this.hash(vnodeKey);
            if (!this.ring.has(h)) {
                this.ring.set(h, nodeId);
                count++;
            }
        }
        this.nodeMap.set(nodeId, count);
        this._rebuildSortedHashes();
    }
    /** Remove a node from the ring */
    removeNode(nodeId) {
        if (!this.nodeMap.has(nodeId))
            return;
        const count = this.nodeMap.get(nodeId);
        for (let i = 0; i < this.virtualNodes; i++) {
            const vnodeKey = `${nodeId}:vnode:${i}`;
            const h = this.hash(vnodeKey);
            this.ring.delete(h);
        }
        this.nodeMap.delete(nodeId);
        this._rebuildSortedHashes();
    }
    /** Get the node responsible for a key */
    getNode(key) {
        if (this.ring.size === 0)
            return null;
        const h = this.hash(key);
        // Find the first node with hash >= key's hash (clockwise)
        let idx = this._binarySearch(h);
        if (idx === this.sortedHashes.length) {
            idx = 0; // wrap around
        }
        return this.ring.get(this.sortedHashes[idx]) || null;
    }
    /** Get all nodes responsible for a key (for replication) */
    getNodes(key, replicationFactor = 3) {
        const nodes = [];
        const seen = new Set();
        let h = this.hash(key);
        let idx = this._binarySearch(h);
        // Walk clockwise collecting unique nodes
        let attempts = 0;
        while (nodes.length < replicationFactor && attempts < this.ring.size) {
            if (idx >= this.sortedHashes.length)
                idx = 0;
            const node = this.ring.get(this.sortedHashes[idx]);
            if (node && !seen.has(node)) {
                seen.add(node);
                nodes.push(node);
            }
            idx++;
            attempts++;
        }
        return nodes;
    }
    /** Binary search for the first hash >= target */
    _binarySearch(target) {
        let left = 0;
        let right = this.sortedHashes.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (this.sortedHashes[mid] < target) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        return left;
    }
    /** Rebuild sorted hash list */
    _rebuildSortedHashes() {
        this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
    }
    /** Get the number of nodes */
    getNodeCount() {
        return this.nodeMap.size;
    }
    /** Get all node IDs */
    getNodesList() {
        return Array.from(this.nodeMap.keys());
    }
    /** Get the load distribution across nodes */
    getLoadDistribution(keyCount = 10000) {
        const distribution = new Map();
        for (let i = 0; i < keyCount; i++) {
            const key = `test-key-${i}`;
            const node = this.getNode(key);
            if (node) {
                distribution.set(node, (distribution.get(node) || 0) + 1);
            }
        }
        return distribution;
    }
    /** Calculate load balance score (lower = better, 1.0 = perfect) */
    getBalanceScore() {
        const nodes = this.getNodesList();
        if (nodes.length === 0)
            return 1.0;
        const distribution = this.getLoadDistribution(10000);
        const loads = nodes.map(n => distribution.get(n) || 0);
        const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
        const variance = loads.reduce((a, b) => a + (b - mean) ** 2, 0) / loads.length;
        return 1.0 - Math.sqrt(variance) / mean;
    }
}
exports.ConsistentHash = ConsistentHash;
//# sourceMappingURL=consistent-hash.js.map