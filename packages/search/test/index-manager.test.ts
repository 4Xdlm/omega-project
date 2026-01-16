/**
 * Index Manager Tests
 * @module @omega/search/test/index-manager
 * @description Unit tests for Phase 149 - Index Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  IndexManager,
  createIndexManager,
  DEFAULT_INDEX_MANAGER_CONFIG,
  type IndexSnapshot,
} from '../src/index-manager';
import type { SearchDocument } from '../src/types';

describe('OMEGA Search - Phase 149: Index Manager', () => {
  let manager: IndexManager;

  const sampleDocs: SearchDocument[] = [
    { id: 'doc1', content: 'The quick brown fox', title: 'Fox Story' },
    { id: 'doc2', content: 'A lazy cat sleeps', title: 'Cat Tale' },
    { id: 'doc3', content: 'The brown bear', title: 'Bear Adventure' },
  ];

  beforeEach(() => {
    manager = createIndexManager({ autoOptimize: false });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_INDEX_MANAGER_CONFIG.name).toBe('default');
      expect(DEFAULT_INDEX_MANAGER_CONFIG.maxDocsPerSegment).toBe(1000);
      expect(DEFAULT_INDEX_MANAGER_CONFIG.autoOptimize).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createIndexManager({ name: 'custom', maxDocsPerSegment: 500 });
      expect(custom.getMetadata().name).toBe('custom');
      custom.dispose();
    });
  });

  describe('Document Operations', () => {
    it('should add document', () => {
      const doc = manager.addDocument(sampleDocs[0]);
      expect(doc.id).toBe('doc1');
      expect(manager.hasDocument('doc1')).toBe(true);
    });

    it('should add document with tokens', () => {
      const doc = manager.addDocument(sampleDocs[0]);
      expect(doc.tokens.length).toBeGreaterThan(0);
      expect(doc.tokenCount).toBe(doc.tokens.length);
    });

    it('should update document', () => {
      manager.addDocument(sampleDocs[0]);
      const updated = manager.updateDocument({
        id: 'doc1',
        content: 'Updated content here',
      });
      expect(updated.content).toBe('Updated content here');
    });

    it('should throw when updating non-existent document', () => {
      expect(() => manager.updateDocument({ id: 'nonexistent', content: 'test' })).toThrow();
    });

    it('should delete document', () => {
      manager.addDocument(sampleDocs[0]);
      expect(manager.deleteDocument('doc1')).toBe(true);
      expect(manager.hasDocument('doc1')).toBe(false);
    });

    it('should return false when deleting non-existent document', () => {
      expect(manager.deleteDocument('nonexistent')).toBe(false);
    });

    it('should get document by ID', () => {
      manager.addDocument(sampleDocs[0]);
      const doc = manager.getDocument('doc1');
      expect(doc).not.toBeNull();
      expect(doc!.id).toBe('doc1');
    });

    it('should return null for non-existent document', () => {
      expect(manager.getDocument('nonexistent')).toBeNull();
    });

    it('should get all documents', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const docs = manager.getAllDocuments();
      expect(docs.length).toBe(3);
    });

    it('should get document count', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      expect(manager.getDocumentCount()).toBe(3);
    });
  });

  describe('Metadata', () => {
    it('should return metadata', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const metadata = manager.getMetadata();

      expect(metadata.documentCount).toBe(3);
      expect(metadata.createdAt).toBeGreaterThan(0);
      expect(metadata.updatedAt).toBeGreaterThan(0);
    });

    it('should update timestamp on modifications', async () => {
      manager.addDocument(sampleDocs[0]);
      const firstUpdate = manager.getMetadata().updatedAt;

      await new Promise((r) => setTimeout(r, 10));
      manager.addDocument(sampleDocs[1]);
      const secondUpdate = manager.getMetadata().updatedAt;

      expect(secondUpdate).toBeGreaterThan(firstUpdate);
    });

    it('should track segment count', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const metadata = manager.getMetadata();
      expect(metadata.segmentCount).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return statistics', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const stats = manager.getStats();

      expect(stats.documentCount).toBe(3);
      expect(stats.tokenCount).toBeGreaterThan(0);
      expect(stats.uniqueTokens).toBeGreaterThan(0);
    });

    it('should calculate average document length', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const stats = manager.getStats();
      expect(stats.avgDocumentLength).toBeGreaterThan(0);
    });

    it('should track index size', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const stats = manager.getStats();
      expect(stats.indexSize).toBeGreaterThan(0);
    });
  });

  describe('Health', () => {
    it('should return health status', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const health = manager.getHealth();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.segmentCount).toBeGreaterThan(0);
    });

    it('should track fragmentation', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const health = manager.getHealth();
      expect(health.fragmentationPercent).toBeGreaterThanOrEqual(0);
    });

    it('should track last optimized', () => {
      const health = manager.getHealth();
      expect(health.lastOptimized).toBeNull();

      manager.optimize();
      const healthAfter = manager.getHealth();
      expect(healthAfter.lastOptimized).toBeGreaterThan(0);
    });
  });

  describe('Optimization', () => {
    it('should optimize index', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const result = manager.optimize();

      expect(result).toHaveProperty('segmentsMerged');
      expect(result).toHaveProperty('emptySegmentsRemoved');
    });

    it('should merge small segments', () => {
      // Create many small segments
      const smallManager = createIndexManager({
        autoOptimize: false,
        maxDocsPerSegment: 2,
      });

      for (let i = 0; i < 10; i++) {
        smallManager.addDocument({ id: `doc${i}`, content: `Content ${i}` });
      }

      const beforeMerge = smallManager.getMetadata().segmentCount;
      smallManager.merge();
      const afterMerge = smallManager.getMetadata().segmentCount;

      // Merge should not increase segment count
      expect(afterMerge).toBeLessThanOrEqual(beforeMerge);
      smallManager.dispose();
    });

    it('should remove empty segments', () => {
      manager.addDocument(sampleDocs[0]);
      manager.deleteDocument('doc1');
      manager.optimize();

      const health = manager.getHealth();
      // After optimization, no empty segments should exist
      expect(health.segmentCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Snapshot', () => {
    it('should create snapshot', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const snapshot = manager.createSnapshot();

      expect(snapshot.metadata.documentCount).toBe(3);
      expect(snapshot.documents.length).toBe(3);
      expect(snapshot.segments.length).toBeGreaterThan(0);
    });

    it('should restore from snapshot', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const snapshot = manager.createSnapshot();

      const newManager = createIndexManager({ autoOptimize: false });
      newManager.restoreFromSnapshot(snapshot);

      expect(newManager.getDocumentCount()).toBe(3);
      expect(newManager.hasDocument('doc1')).toBe(true);
      newManager.dispose();
    });

    it('should preserve document data in snapshot', () => {
      manager.addDocument(sampleDocs[0]);
      const snapshot = manager.createSnapshot();

      expect(snapshot.documents[0].id).toBe('doc1');
      expect(snapshot.documents[0].content).toBe(sampleDocs[0].content);
    });
  });

  describe('Operation Log', () => {
    it('should log operations', () => {
      manager.addDocument(sampleDocs[0]);
      const log = manager.getOperationLog();

      expect(log.length).toBe(1);
      expect(log[0].operation).toBe('add');
    });

    it('should log operation duration', () => {
      manager.addDocument(sampleDocs[0]);
      const log = manager.getOperationLog();

      expect(log[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should log operation success', () => {
      manager.addDocument(sampleDocs[0]);
      const log = manager.getOperationLog();

      expect(log[0].success).toBe(true);
    });

    it('should limit log entries', () => {
      manager.getOperationLog(5);
      // Just checking it doesn't throw
    });

    it('should clear operation log', () => {
      manager.addDocument(sampleDocs[0]);
      manager.clearOperationLog();
      const log = manager.getOperationLog();

      expect(log.length).toBe(0);
    });

    it('should log multiple operation types', () => {
      manager.addDocument(sampleDocs[0]);
      manager.updateDocument({ id: 'doc1', content: 'Updated' });
      manager.deleteDocument('doc1');

      const log = manager.getOperationLog();
      const operations = log.map((l) => l.operation);

      expect(operations).toContain('add');
      expect(operations).toContain('update');
      expect(operations).toContain('delete');
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      manager.clear();

      expect(manager.getDocumentCount()).toBe(0);
      expect(manager.getOperationLog().length).toBe(0);
    });
  });

  describe('Invariants', () => {
    it('INV-INDEX-001: Document count must match stored documents', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      expect(manager.getDocumentCount()).toBe(manager.getAllDocuments().length);
    });

    it('INV-INDEX-002: All document IDs must be unique', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const ids = manager.getAllDocuments().map((d) => d.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('INV-INDEX-003: Deleted document must not exist', () => {
      manager.addDocument(sampleDocs[0]);
      manager.deleteDocument('doc1');
      expect(manager.hasDocument('doc1')).toBe(false);
      expect(manager.getDocument('doc1')).toBeNull();
    });

    it('INV-INDEX-004: Snapshot must be restorable', () => {
      sampleDocs.forEach((doc) => manager.addDocument(doc));
      const snapshot = manager.createSnapshot();
      const beforeCount = manager.getDocumentCount();

      manager.clear();
      manager.restoreFromSnapshot(snapshot);

      expect(manager.getDocumentCount()).toBe(beforeCount);
    });

    it('INV-INDEX-005: Token count must be non-negative', () => {
      manager.addDocument(sampleDocs[0]);
      const doc = manager.getDocument('doc1');
      expect(doc!.tokenCount).toBeGreaterThanOrEqual(0);
    });

    it('INV-INDEX-006: Health status must be valid', () => {
      const health = manager.getHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});
