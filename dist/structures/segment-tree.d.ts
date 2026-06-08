/**
 * Segment Tree (Temporal)
 *
 * Range queries on document timestamps.
 * Powers the "semantic drift" re-ranking by detecting temporal windows
 * where term meaning has shifted.
 *
 * Operations: O(log n) range query, O(log n) update.
 */
export interface TemporalData {
    timestamp: number;
    termFrequency: number;
    docCount: number;
    avgEmbedding?: number[];
}
export declare class SegmentTree {
    private n;
    private tree;
    private leafTimestamps;
    constructor(timestamps: number[]);
    /** Update a leaf node with new temporal data */
    update(position: number, data: TemporalData): void;
    private _update;
    /** Query range [left, right] and return aggregated temporal data */
    query(left: number, right: number): TemporalData;
    private _query;
    /** Query by timestamp range instead of index range */
    queryByTime(startTime: number, endTime: number): TemporalData;
    /** Binary search to find the index closest to a given timestamp */
    findIndex(timestamp: number): number;
    /** Split time range into windows for drift analysis */
    getTimeWindows(windowSizeMs: number): {
        start: number;
        end: number;
    }[];
    /** Merge two temporal data points */
    private _merge;
    /** Merge embeddings by weighted average */
    private mergeEmbeddings;
    /** Get the total aggregated data across all time */
    total(): TemporalData;
}
//# sourceMappingURL=segment-tree.d.ts.map