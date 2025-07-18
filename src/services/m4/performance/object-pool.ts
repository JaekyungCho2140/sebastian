import { EventEmitter } from 'events';

/**
 * Object pool statistics
 */
export interface PoolStats {
  /** Total number of objects created */
  created: number;
  /** Total number of acquisitions */
  acquired: number;
  /** Total number of releases */
  released: number;
  /** Current pool size */
  currentSize: number;
  /** Peak pool size */
  peakSize: number;
  /** Number of pool expansions */
  expansions: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
}

/**
 * Object factory function type
 */
export type ObjectFactory<T> = () => T;

/**
 * Object reset function type
 */
export type ObjectReset<T> = (obj: T) => void;

/**
 * Object pool options
 */
export interface ObjectPoolOptions<T> {
  /** Initial pool size */
  initialSize?: number;
  /** Maximum pool size */
  maxSize?: number;
  /** Whether to auto-expand when pool is empty */
  autoExpand?: boolean;
  /** Expansion size when auto-expanding */
  expansionSize?: number;
  /** Factory function to create new objects */
  factory: ObjectFactory<T>;
  /** Reset function to clean objects before reuse */
  reset: ObjectReset<T>;
  /** Whether to emit statistics events */
  trackStats?: boolean;
}

/**
 * Generic object pool implementation
 * Reduces garbage collection pressure by reusing objects
 */
export class ObjectPool<T> extends EventEmitter {
  private pool: T[] = [];
  private factory: ObjectFactory<T>;
  private reset: ObjectReset<T>;
  private options: Required<ObjectPoolOptions<T>>;
  private stats: PoolStats = {
    created: 0,
    acquired: 0,
    released: 0,
    currentSize: 0,
    peakSize: 0,
    expansions: 0,
    hitRate: 0
  };

  constructor(options: ObjectPoolOptions<T>) {
    super();
    
    this.factory = options.factory;
    this.reset = options.reset;
    
    this.options = {
      initialSize: options.initialSize || 10,
      maxSize: options.maxSize || 1000,
      autoExpand: options.autoExpand !== false,
      expansionSize: options.expansionSize || 10,
      factory: options.factory,
      reset: options.reset,
      trackStats: options.trackStats !== false
    };

    // Pre-populate pool
    this.expandPool(this.options.initialSize);
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    if (this.pool.length === 0) {
      if (this.options.autoExpand && this.stats.created < this.options.maxSize) {
        const expandSize = Math.min(
          this.options.expansionSize,
          this.options.maxSize - this.stats.created
        );
        this.expandPool(expandSize);
      } else {
        // Pool exhausted, create new object
        return this.createObject();
      }
    }

    const obj = this.pool.pop()!;
    this.stats.currentSize = this.pool.length;
    this.stats.acquired++;
    
    this.updateHitRate();
    
    if (this.options.trackStats) {
      this.emit('acquire', { poolSize: this.pool.length });
    }

    return obj;
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (this.pool.length >= this.options.maxSize) {
      // Pool is full, let GC handle the object
      if (this.options.trackStats) {
        this.emit('overflow', { poolSize: this.pool.length });
      }
      return;
    }

    // Reset object state
    this.reset(obj);
    
    // Return to pool
    this.pool.push(obj);
    this.stats.currentSize = this.pool.length;
    this.stats.released++;
    
    if (this.stats.currentSize > this.stats.peakSize) {
      this.stats.peakSize = this.stats.currentSize;
    }

    if (this.options.trackStats) {
      this.emit('release', { poolSize: this.pool.length });
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    const previousSize = this.pool.length;
    this.pool = [];
    this.stats.currentSize = 0;
    
    if (this.options.trackStats) {
      this.emit('clear', { cleared: previousSize });
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): Readonly<PoolStats> {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      created: this.stats.created,
      acquired: 0,
      released: 0,
      currentSize: this.pool.length,
      peakSize: this.pool.length,
      expansions: 0,
      hitRate: 0
    };
  }

  /**
   * Expand the pool
   */
  private expandPool(size: number): void {
    for (let i = 0; i < size; i++) {
      this.pool.push(this.createObject());
    }
    
    this.stats.currentSize = this.pool.length;
    this.stats.expansions++;
    
    if (this.stats.currentSize > this.stats.peakSize) {
      this.stats.peakSize = this.stats.currentSize;
    }

    if (this.options.trackStats) {
      this.emit('expand', { 
        newSize: this.pool.length,
        expansion: size 
      });
    }
  }

  /**
   * Create a new object
   */
  private createObject(): T {
    this.stats.created++;
    return this.factory();
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const totalRequests = this.stats.acquired;
    const hits = Math.min(this.stats.acquired, this.stats.released);
    this.stats.hitRate = totalRequests > 0 ? hits / totalRequests : 0;
  }

  /**
   * Resize the pool
   */
  resize(newMaxSize: number): void {
    this.options.maxSize = newMaxSize;
    
    // Trim pool if necessary
    if (this.pool.length > newMaxSize) {
      const removed = this.pool.length - newMaxSize;
      this.pool = this.pool.slice(0, newMaxSize);
      this.stats.currentSize = this.pool.length;
      
      if (this.options.trackStats) {
        this.emit('resize', { 
          newMaxSize,
          removed 
        });
      }
    }
  }

  /**
   * Pre-warm the pool to a specific size
   */
  prewarm(size: number): void {
    const targetSize = Math.min(size, this.options.maxSize);
    const currentSize = this.pool.length;
    
    if (targetSize > currentSize) {
      this.expandPool(targetSize - currentSize);
    }
  }
}

/**
 * Row object pool for Excel row data
 */
export class RowObjectPool extends ObjectPool<any> {
  constructor(options?: Partial<ObjectPoolOptions<any>>) {
    super({
      initialSize: 100,
      maxSize: 5000,
      expansionSize: 100,
      factory: () => ({
        values: [],
        rowNumber: 0,
        sheetId: ''
      }),
      reset: (obj) => {
        obj.values = [];
        obj.rowNumber = 0;
        obj.sheetId = '';
      },
      ...options
    });
  }

  /**
   * Acquire a row object with initial values
   */
  acquireWithValues(values: any[], rowNumber: number, sheetId: string): any {
    const obj = this.acquire();
    obj.values = values;
    obj.rowNumber = rowNumber;
    obj.sheetId = sheetId;
    return obj;
  }
}

/**
 * Cell value pool for cell containers
 */
export class CellValuePool extends ObjectPool<any> {
  constructor(options?: Partial<ObjectPoolOptions<any>>) {
    super({
      initialSize: 200,
      maxSize: 10000,
      expansionSize: 200,
      factory: () => ({
        value: null,
        type: 'string',
        formatted: null
      }),
      reset: (obj) => {
        obj.value = null;
        obj.type = 'string';
        obj.formatted = null;
      },
      ...options
    });
  }

  /**
   * Acquire a cell value object with initial data
   */
  acquireWithValue(value: any, type: string = 'string'): any {
    const obj = this.acquire();
    obj.value = value;
    obj.type = type;
    return obj;
  }
}

/**
 * String builder pool for efficient string concatenation
 */
export class StringBuilderPool extends ObjectPool<string[]> {
  constructor(options?: Partial<ObjectPoolOptions<string[]>>) {
    super({
      initialSize: 50,
      maxSize: 500,
      expansionSize: 50,
      factory: () => [],
      reset: (arr) => {
        arr.length = 0;
      },
      ...options
    });
  }

  /**
   * Acquire a string builder and join strings
   */
  buildString(parts: string[], separator: string = ''): string {
    const builder = this.acquire();
    builder.push(...parts);
    const result = builder.join(separator);
    this.release(builder);
    return result;
  }
}

/**
 * Array pool for temporary arrays
 */
export class ArrayPool<T> extends ObjectPool<T[]> {
  constructor(options?: Partial<ObjectPoolOptions<T[]>>) {
    super({
      initialSize: 50,
      maxSize: 1000,
      expansionSize: 50,
      factory: () => [],
      reset: (arr) => {
        arr.length = 0;
      },
      ...options
    });
  }

  /**
   * Acquire an array with initial capacity
   */
  acquireWithCapacity(capacity: number): T[] {
    const arr = this.acquire();
    if (arr.length < capacity) {
      arr.length = capacity;
      arr.fill(undefined as any);
    }
    return arr;
  }
}

/**
 * Map pool for temporary maps
 */
export class MapPool<K, V> extends ObjectPool<Map<K, V>> {
  constructor(options?: Partial<ObjectPoolOptions<Map<K, V>>>) {
    super({
      initialSize: 20,
      maxSize: 200,
      expansionSize: 20,
      factory: () => new Map<K, V>(),
      reset: (map) => {
        map.clear();
      },
      ...options
    });
  }
}

/**
 * Set pool for temporary sets
 */
export class SetPool<T> extends ObjectPool<Set<T>> {
  constructor(options?: Partial<ObjectPoolOptions<Set<T>>>) {
    super({
      initialSize: 20,
      maxSize: 200,
      expansionSize: 20,
      factory: () => new Set<T>(),
      reset: (set) => {
        set.clear();
      },
      ...options
    });
  }
}

/**
 * Global object pool manager
 */
export class ObjectPoolManager {
  private static instance: ObjectPoolManager;
  private pools: Map<string, ObjectPool<any>> = new Map();

  private constructor() {}

  static getInstance(): ObjectPoolManager {
    if (!ObjectPoolManager.instance) {
      ObjectPoolManager.instance = new ObjectPoolManager();
    }
    return ObjectPoolManager.instance;
  }

  /**
   * Register a pool
   */
  registerPool<T>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
  }

  /**
   * Get a registered pool
   */
  getPool<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name);
  }

  /**
   * Get all pool statistics
   */
  getAllStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats();
    }
    
    return stats;
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
  }

  /**
   * Reset all statistics
   */
  resetAllStats(): void {
    for (const pool of this.pools.values()) {
      pool.resetStats();
    }
  }
}

// Export singleton instance
export const poolManager = ObjectPoolManager.getInstance();