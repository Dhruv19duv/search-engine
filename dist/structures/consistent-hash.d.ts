/**
 * Consistent Hashing
 *
 * Distributes index shards across nodes.
 * Adding/removing servers rebalances only ~1/N keys, not the whole ring.
 * Essential for horizontal scalability of the index.
 */
export declare class ConsistentHash {
    private ring;
    private sortedHashes;
    private virtualNodes;
    private nodeMap;
    constructor(virtualNodes?: number);
    /** Hash a key to a number on the ring */
    private hash;
    /** Add a node to the ring */
    addNode(nodeId: string): void;
    /** Remove a node from the ring */
    removeNode(nodeId: string): void;
    /** Get the node responsible for a key */
    getNode(key: string): string | null;
    /** Get all nodes responsible for a key (for replication) */
    getNodes(key: string, replicationFactor?: number): string[];
    /** Binary search for the first hash >= target */
    private _binarySearch;
    /** Rebuild sorted hash list */
    private _rebuildSortedHashes;
    /** Get the number of nodes */
    getNodeCount(): number;
    /** Get all node IDs */
    getNodesList(): string[];
    /** Get the load distribution across nodes */
    getLoadDistribution(keyCount?: number): Map<string, number>;
    /** Calculate load balance score (lower = better, 1.0 = perfect) */
    getBalanceScore(): number;
}
//# sourceMappingURL=consistent-hash.d.ts.map