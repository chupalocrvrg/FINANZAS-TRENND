/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentData, Query, QuerySnapshot, getDocs } from 'firebase/firestore';

/**
 * Intelligent Client-Side Cache Layer
 * Reduces unnecessary Firestore reads, limits database query costs, 
 * and drastically speeds up repeatedly executed queries and heavy calculations.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class MemoryCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes standard cache TTL
  
  // Custom query listeners cache
  private queryCache = new Map<string, CacheEntry<any>>();

  /**
   * Set a cached item in memory
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  /**
   * Get a cached item from memory. Returns null if expired or missing.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete a cached item by key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.queryCache.clear();
    console.log('[Cache] Central memory cache purged successfully.');
  }

  /**
   * Generates a stable key for Firestore queries based on collection path and filters
   */
  getQueryCacheKey(q: Query<DocumentData, DocumentData>): string {
    // Generate cache key using Firestore's internal query serialization or string representation
    // Fallback safely to compiled string
    try {
      const qSerialized = (q as any)._query || q;
      return JSON.stringify({
        path: qSerialized.path?.segments?.join('/') || 'root',
        filters: qSerialized.filters?.map((f: any) => ({
          field: f.field?.fieldPath || f.op,
          op: f.op || '',
          value: f.value ? String(f.value) : ''
        })) || []
      });
    } catch {
      return 'query_' + Math.random().toString(36).substring(7);
    }
  }

  /**
   * Execute with cache: wraps the Firestore getDocs call with cache validation.
   * If a cached snapshot is valid, returns the parsed array of mapping docs.
   */
  async getDocsCached(
    queryKey: string,
    q: Query<DocumentData, DocumentData>,
    ttlMs = 45000 // 45 seconds cache TTL for high-frequency lists
  ): Promise<any[]> {
    const entry = this.queryCache.get(queryKey);
    const now = Date.now();

    if (entry && now < entry.timestamp) {
      console.log(`[Cache Sync] Returning cached documents for: ${queryKey}`);
      return entry.data;
    }

    console.log(`[Cache Miss] Fetching documents from Firestore for: ${queryKey}`);
    const snapshot = await getDocs(q);
    const mapped = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    this.queryCache.set(queryKey, {
      data: mapped,
      timestamp: now + ttlMs
    });

    return mapped;
  }

  /**
   * Explicitly invalidate cached queries for a given collection matching segment patterns
   */
  invalidateCollection(collectionName: string): void {
    console.log(`[Cache Invalidation] Purging query cache for collection matching: ${collectionName}`);
    for (const key of this.queryCache.keys()) {
      if (key.includes(collectionName)) {
        this.queryCache.delete(key);
      }
    }
  }
}

export const cacheManager = new MemoryCacheManager();
