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
  timestamp: number; // unix ms
  termFrequency: number;
  docCount: number;
  avgEmbedding?: number[]; // centroid of term embeddings in window
}

export class SegmentTree {
  private n: number; // number of leaf nodes
  private tree: TemporalData[];
  private leafTimestamps: number[];

  constructor(timestamps: number[]) {
    this.n = timestamps.length;
    this.leafTimestamps = [...timestamps].sort((a, b) => a - b);
    const size = 4 * this.n;
    this.tree = new Array(size).fill(null).map(() => ({
      timestamp: 0,
      termFrequency: 0,
      docCount: 0
    }));
  }

  /** Update a leaf node with new temporal data */
  update(position: number, data: TemporalData): void {
    if (position < 0 || position >= this.n) return;
    this._update(1, 0, this.n - 1, position, data);
  }

  private _update(
    node: number,
    start: number,
    end: number,
    pos: number,
    data: TemporalData
  ): void {
    if (start === end) {
      this.tree[node] = { ...data };
      return;
    }

    const mid = Math.floor((start + end) / 2);
    if (pos <= mid) {
      this._update(node * 2, start, mid, pos, data);
    } else {
      this._update(node * 2 + 1, mid + 1, end, pos, data);
    }

    this.tree[node] = this._merge(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  /** Query range [left, right] and return aggregated temporal data */
  query(left: number, right: number): TemporalData {
    if (left > right || left < 0 || right >= this.n) {
      return { timestamp: 0, termFrequency: 0, docCount: 0 };
    }
    return this._query(1, 0, this.n - 1, left, right);
  }

  private _query(
    node: number,
    start: number,
    end: number,
    left: number,
    right: number
  ): TemporalData {
    if (right < start || left > end) {
      return { timestamp: 0, termFrequency: 0, docCount: 0 };
    }
    if (left <= start && end <= right) {
      return { ...this.tree[node] };
    }

    const mid = Math.floor((start + end) / 2);
    const leftResult = this._query(node * 2, start, mid, left, right);
    const rightResult = this._query(node * 2 + 1, mid + 1, end, left, right);
    return this._merge(leftResult, rightResult);
  }

  /** Query by timestamp range instead of index range */
  queryByTime(startTime: number, endTime: number): TemporalData {
    const left = this.findIndex(startTime);
    const right = this.findIndex(endTime);
    return this.query(left, right);
  }

  /** Binary search to find the index closest to a given timestamp */
  findIndex(timestamp: number): number {
    let left = 0;
    let right = this.n - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.leafTimestamps[mid] === timestamp) return mid;
      if (this.leafTimestamps[mid] < timestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return Math.min(left, this.n - 1);
  }

  /** Split time range into windows for drift analysis */
  getTimeWindows(windowSizeMs: number): { start: number; end: number }[] {
    if (this.n === 0) return [];

    const minTime = this.leafTimestamps[0];
    const maxTime = this.leafTimestamps[this.n - 1];
    const windows: { start: number; end: number }[] = [];

    let windowStart = minTime;
    while (windowStart < maxTime) {
      const windowEnd = Math.min(windowStart + windowSizeMs, maxTime);
      windows.push({ start: windowStart, end: windowEnd });
      windowStart = windowEnd;
    }

    return windows;
  }

  /** Merge two temporal data points */
  private _merge(a: TemporalData, b: TemporalData): TemporalData {
    const totalDocCount = a.docCount + b.docCount;
    return {
      timestamp: Math.max(a.timestamp, b.timestamp),
      termFrequency: a.termFrequency + b.termFrequency,
      docCount: totalDocCount,
      avgEmbedding: this.mergeEmbeddings(a.avgEmbedding, b.avgEmbedding, a.docCount, b.docCount)
    };
  }

  /** Merge embeddings by weighted average */
  private mergeEmbeddings(
    a?: number[],
    b?: number[],
    countA?: number,
    countB?: number
  ): number[] | undefined {
    if (!a && !b) return undefined;
    if (!a) return b;
    if (!b) return a;

    const total = (countA || 0) + (countB || 0);
    if (total === 0) return a;

    return a.map((val, i) => {
      const bVal = b[i] || 0;
      return ((val * (countA || 0)) + (bVal * (countB || 0))) / total;
    });
  }

  /** Get the total aggregated data across all time */
  total(): TemporalData {
    return this.query(0, this.n - 1);
  }
}
