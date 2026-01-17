/**
 * Search Index Manager
 * @module @omega/search/index-manager
 * @description Index management, persistence, and optimization
 */

import type { IndexedDocument, SearchDocument, IndexStats } from './types';

/**
 * Index segment
 */
export interface IndexSegment {
  id: string;
  documentIds: string[];
  createdAt: number;
  size: number;
  sealed: boolean;
}

/**
 * Index metadata
 */
export interface IndexMetadata {
  name: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  documentCount: number;
  segmentCount: number;
  totalSize: number;
}

/**
 * Index snapshot for persistence
 */
export interface IndexSnapshot {
  metadata: IndexMetadata;
  documents: IndexedDocument[];
  segments: IndexSegment[];
}

/**
 * Index manager configuration
 */
export interface IndexManagerConfig {
  /** Index name */
  name: string;
  /** Maximum documents per segment */
  maxDocsPerSegment: number;
  /** Auto-merge threshold */
  mergeThreshold: number;
  /** Enable auto-optimization */
  autoOptimize: boolean;
  /** Optimization interval in ms */
  optimizeInterval: number;
}

/**
 * Default index manager configuration
 */
export const DEFAULT_INDEX_MANAGER_CONFIG: IndexManagerConfig = {
  name: 'default',
  maxDocsPerSegment: 1000,
  mergeThreshold: 10,
  autoOptimize: true,
  optimizeInterval: 300000, // 5 minutes
};

/**
 * Index operation type
 */
export type IndexOperation = 'add' | 'update' | 'delete' | 'merge' | 'optimize';

/**
 * Index operation log entry
 */
export interface IndexOperationLog {
  operation: IndexOperation;
  documentId?: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Index health status
 */
export interface IndexHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  segmentCount: number;
  fragmentationPercent: number;
  issues: string[];
  lastOptimized: number | null;
}

/**
 * Index Manager
 * Manages search index lifecycle, segments, and optimization
 */
export class IndexManager {
  private config: IndexManagerConfig;
  private documents: Map<string, IndexedDocument>;
  private segments: Map<string, IndexSegment>;
  private operationLog: IndexOperationLog[];
  private createdAt: number;
  private updatedAt: number;
  private lastOptimized: number | null = null;
  private optimizeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<IndexManagerConfig> = {}) {
    this.config = { ...DEFAULT_INDEX_MANAGER_CONFIG, ...config };
    this.documents = new Map();
    this.segments = new Map();
    this.operationLog = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    if (this.config.autoOptimize) {
      this.startOptimizeTimer();
    }
  }

  /**
   * Start auto-optimization timer
   */
  private startOptimizeTimer(): void {
    if (this.optimizeTimer) {
      clearInterval(this.optimizeTimer);
    }
    this.optimizeTimer = setInterval(() => {
      this.optimize();
    }, this.config.optimizeInterval);
  }

  /**
   * Stop optimization timer
   */
  stopOptimizeTimer(): void {
    if (this.optimizeTimer) {
      clearInterval(this.optimizeTimer);
      this.optimizeTimer = null;
    }
  }

  /**
   * Add document to index
   */
  addDocument(doc: SearchDocument): IndexedDocument {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const tokens = this.tokenize(doc.content);
      const indexed: IndexedDocument = {
        id: doc.id,
        content: doc.content,
        title: doc.title || '',
        tokens,
        tokenCount: tokens.length,
        metadata: doc.metadata || {},
        timestamp: doc.timestamp || Date.now(),
        indexedAt: Date.now(),
      };

      this.documents.set(doc.id, indexed);
      this.assignToSegment(doc.id);
      this.updatedAt = Date.now();
      success = true;

      return indexed;
    } catch (error) {
      error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.logOperation('add', doc.id, startTime, success, error);
    }
  }

  /**
   * Update document in index
   */
  updateDocument(doc: SearchDocument): IndexedDocument {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      if (!this.documents.has(doc.id)) {
        throw new Error(`Document not found: ${doc.id}`);
      }

      this.removeFromSegment(doc.id);
      const indexed = this.addDocument(doc);
      success = true;
      return indexed;
    } catch (error) {
      error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      this.logOperation('update', doc.id, startTime, success, error);
    }
  }

  /**
   * Delete document from index
   */
  deleteDocument(docId: string): boolean {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      if (!this.documents.has(docId)) {
        return false;
      }

      this.removeFromSegment(docId);
      this.documents.delete(docId);
      this.updatedAt = Date.now();
      success = true;
      return true;
    } catch (error) {
      error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    } finally {
      this.logOperation('delete', docId, startTime, success, error);
    }
  }

  /**
   * Get document by ID
   */
  getDocument(docId: string): IndexedDocument | null {
    return this.documents.get(docId) || null;
  }

  /**
   * Check if document exists
   */
  hasDocument(docId: string): boolean {
    return this.documents.has(docId);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): IndexedDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Assign document to segment
   */
  private assignToSegment(docId: string): void {
    // Find open segment or create new one
    let targetSegment: IndexSegment | null = null;

    for (const segment of this.segments.values()) {
      if (!segment.sealed && segment.documentIds.length < this.config.maxDocsPerSegment) {
        targetSegment = segment;
        break;
      }
    }

    if (!targetSegment) {
      targetSegment = this.createSegment();
    }

    targetSegment.documentIds.push(docId);
    targetSegment.size = this.calculateSegmentSize(targetSegment);

    // Seal segment if full
    if (targetSegment.documentIds.length >= this.config.maxDocsPerSegment) {
      targetSegment.sealed = true;
    }
  }

  /**
   * Remove document from segment
   */
  private removeFromSegment(docId: string): void {
    for (const segment of this.segments.values()) {
      const index = segment.documentIds.indexOf(docId);
      if (index !== -1) {
        segment.documentIds.splice(index, 1);
        segment.size = this.calculateSegmentSize(segment);
        break;
      }
    }
  }

  /**
   * Create new segment
   */
  private createSegment(): IndexSegment {
    const segment: IndexSegment = {
      id: `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      documentIds: [],
      createdAt: Date.now(),
      size: 0,
      sealed: false,
    };
    this.segments.set(segment.id, segment);
    return segment;
  }

  /**
   * Calculate segment size
   */
  private calculateSegmentSize(segment: IndexSegment): number {
    let size = 0;
    for (const docId of segment.documentIds) {
      const doc = this.documents.get(docId);
      if (doc) {
        size += doc.content.length * 2; // UTF-16
      }
    }
    return size;
  }

  /**
   * Merge segments
   */
  merge(): number {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let mergedCount = 0;

    try {
      // Find small sealed segments to merge
      const smallSegments = Array.from(this.segments.values())
        .filter((s) => s.sealed && s.documentIds.length < this.config.maxDocsPerSegment / 2)
        .sort((a, b) => a.documentIds.length - b.documentIds.length);

      if (smallSegments.length < 2) {
        success = true;
        return 0;
      }

      // Merge pairs of small segments
      for (let i = 0; i < smallSegments.length - 1; i += 2) {
        const seg1 = smallSegments[i];
        const seg2 = smallSegments[i + 1];

        if (seg1.documentIds.length + seg2.documentIds.length <= this.config.maxDocsPerSegment) {
          // Merge seg2 into seg1
          seg1.documentIds.push(...seg2.documentIds);
          seg1.size = this.calculateSegmentSize(seg1);
          seg1.sealed = seg1.documentIds.length >= this.config.maxDocsPerSegment;

          // Remove seg2
          this.segments.delete(seg2.id);
          mergedCount++;
        }
      }

      this.updatedAt = Date.now();
      success = true;
      return mergedCount;
    } catch (error) {
      error = error instanceof Error ? error.message : 'Unknown error';
      return mergedCount;
    } finally {
      this.logOperation('merge', undefined, startTime, success, error);
    }
  }

  /**
   * Optimize index
   */
  optimize(): { segmentsMerged: number; emptySegmentsRemoved: number } {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Remove empty segments
      let emptySegmentsRemoved = 0;
      for (const [id, segment] of this.segments) {
        if (segment.documentIds.length === 0) {
          this.segments.delete(id);
          emptySegmentsRemoved++;
        }
      }

      // Merge small segments
      const segmentsMerged = this.merge();

      this.lastOptimized = Date.now();
      this.updatedAt = Date.now();
      success = true;

      return { segmentsMerged, emptySegmentsRemoved };
    } catch (error) {
      error = error instanceof Error ? error.message : 'Unknown error';
      return { segmentsMerged: 0, emptySegmentsRemoved: 0 };
    } finally {
      this.logOperation('optimize', undefined, startTime, success, error);
    }
  }

  /**
   * Get index metadata
   */
  getMetadata(): IndexMetadata {
    let totalSize = 0;
    for (const segment of this.segments.values()) {
      totalSize += segment.size;
    }

    return {
      name: this.config.name,
      version: '1.0.0',
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      documentCount: this.documents.size,
      segmentCount: this.segments.size,
      totalSize,
    };
  }

  /**
   * Get index health
   */
  getHealth(): IndexHealth {
    const issues: string[] = [];
    const sealedSegments = Array.from(this.segments.values()).filter((s) => s.sealed);
    const totalCapacity = this.segments.size * this.config.maxDocsPerSegment;
    const usedCapacity = this.documents.size;
    const fragmentationPercent =
      totalCapacity > 0 ? ((totalCapacity - usedCapacity) / totalCapacity) * 100 : 0;

    if (this.segments.size > this.config.mergeThreshold) {
      issues.push(`Too many segments (${this.segments.size} > ${this.config.mergeThreshold})`);
    }

    if (fragmentationPercent > 50) {
      issues.push(`High fragmentation (${fragmentationPercent.toFixed(1)}%)`);
    }

    const timeSinceOptimize = this.lastOptimized
      ? Date.now() - this.lastOptimized
      : Infinity;
    if (timeSinceOptimize > this.config.optimizeInterval * 2) {
      issues.push('Index has not been optimized recently');
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 2) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      segmentCount: this.segments.size,
      fragmentationPercent,
      issues,
      lastOptimized: this.lastOptimized,
    };
  }

  /**
   * Get statistics
   */
  getStats(): IndexStats {
    let totalTokens = 0;
    const uniqueTokens = new Set<string>();

    for (const doc of this.documents.values()) {
      totalTokens += doc.tokenCount;
      doc.tokens.forEach((t) => uniqueTokens.add(t));
    }

    const avgDocLength = this.documents.size > 0 ? totalTokens / this.documents.size : 0;
    const metadata = this.getMetadata();

    return {
      documentCount: this.documents.size,
      tokenCount: totalTokens,
      uniqueTokens: uniqueTokens.size,
      avgDocumentLength: avgDocLength,
      indexSize: metadata.totalSize,
      lastUpdated: this.updatedAt,
    };
  }

  /**
   * Create snapshot for persistence
   */
  createSnapshot(): IndexSnapshot {
    return {
      metadata: this.getMetadata(),
      documents: this.getAllDocuments(),
      segments: Array.from(this.segments.values()),
    };
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot: IndexSnapshot): void {
    this.documents.clear();
    this.segments.clear();

    for (const doc of snapshot.documents) {
      this.documents.set(doc.id, doc);
    }

    for (const segment of snapshot.segments) {
      this.segments.set(segment.id, {
        ...segment,
        documentIds: [...segment.documentIds],
      });
    }

    this.updatedAt = Date.now();
  }

  /**
   * Get operation log
   */
  getOperationLog(limit?: number): IndexOperationLog[] {
    const log = [...this.operationLog].reverse();
    return limit ? log.slice(0, limit) : log;
  }

  /**
   * Clear operation log
   */
  clearOperationLog(): void {
    this.operationLog = [];
  }

  /**
   * Log operation
   */
  private logOperation(
    operation: IndexOperation,
    documentId: string | undefined,
    startTime: number,
    success: boolean,
    error?: string
  ): void {
    this.operationLog.push({
      operation,
      documentId,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      success,
      error,
    });

    // Keep only last 1000 operations
    if (this.operationLog.length > 1000) {
      this.operationLog.shift();
    }
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length >= 2);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.documents.clear();
    this.segments.clear();
    this.operationLog = [];
    this.updatedAt = Date.now();
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.stopOptimizeTimer();
    this.clear();
  }
}

/**
 * Create index manager instance
 */
export function createIndexManager(config?: Partial<IndexManagerConfig>): IndexManager {
  return new IndexManager(config);
}
