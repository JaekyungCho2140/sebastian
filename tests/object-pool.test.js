const { 
  ObjectPool, 
  RowObjectPool, 
  CellValuePool, 
  StringBuilderPool,
  ArrayPool,
  MapPool,
  SetPool,
  poolManager 
} = require('../src/services/m4/performance/object-pool');

describe('Object Pool System', () => {
  describe('Generic ObjectPool', () => {
    let pool;

    beforeEach(() => {
      pool = new ObjectPool({
        initialSize: 5,
        maxSize: 10,
        factory: () => ({ data: null }),
        reset: (obj) => { obj.data = null; }
      });
    });

    test('should create initial pool with specified size', () => {
      const stats = pool.getStats();
      expect(stats.created).toBe(5);
      expect(stats.currentSize).toBe(5);
    });

    test('should acquire and release objects', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      
      expect(obj1).toBeDefined();
      expect(obj2).toBeDefined();
      expect(obj1).not.toBe(obj2);
      
      const stats1 = pool.getStats();
      expect(stats1.currentSize).toBe(3);
      expect(stats1.acquired).toBe(2);
      
      pool.release(obj1);
      pool.release(obj2);
      
      const stats2 = pool.getStats();
      expect(stats2.currentSize).toBe(5);
      expect(stats2.released).toBe(2);
    });

    test('should auto-expand when pool is empty', () => {
      // Acquire all initial objects
      const objects = [];
      for (let i = 0; i < 5; i++) {
        objects.push(pool.acquire());
      }
      
      // This should trigger expansion
      const obj6 = pool.acquire();
      expect(obj6).toBeDefined();
      
      const stats = pool.getStats();
      expect(stats.created).toBeGreaterThan(5);
      expect(stats.expansions).toBe(1);
    });

    test('should respect max size limit', () => {
      // Fill pool to max
      const objects = [];
      for (let i = 0; i < 10; i++) {
        objects.push(pool.acquire());
      }
      
      // Release all
      objects.forEach(obj => pool.release(obj));
      
      // Try to release one more - should be rejected
      const extraObj = { data: 'extra' };
      pool.release(extraObj);
      
      const stats = pool.getStats();
      expect(stats.currentSize).toBe(10); // Max size
    });

    test('should calculate hit rate correctly', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      pool.release(obj1);
      const obj3 = pool.acquire(); // This should be a hit
      
      const stats = pool.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test('should reset objects on release', () => {
      const obj = pool.acquire();
      obj.data = 'modified';
      
      pool.release(obj);
      const reacquired = pool.acquire();
      
      expect(reacquired.data).toBeNull();
    });
  });

  describe('RowObjectPool', () => {
    let pool;

    beforeEach(() => {
      pool = new RowObjectPool();
    });

    test('should create row objects with correct structure', () => {
      const row = pool.acquire();
      expect(row).toHaveProperty('values');
      expect(row).toHaveProperty('rowNumber');
      expect(row).toHaveProperty('sheetId');
      expect(Array.isArray(row.values)).toBe(true);
    });

    test('should acquire row with values', () => {
      const values = [1, 2, 3, 'test'];
      const row = pool.acquireWithValues(values, 10, 'Sheet1');
      
      expect(row.values).toEqual(values);
      expect(row.rowNumber).toBe(10);
      expect(row.sheetId).toBe('Sheet1');
    });
  });

  describe('CellValuePool', () => {
    let pool;

    beforeEach(() => {
      pool = new CellValuePool();
    });

    test('should create cell value objects', () => {
      const cell = pool.acquire();
      expect(cell).toHaveProperty('value');
      expect(cell).toHaveProperty('type');
      expect(cell).toHaveProperty('formatted');
    });

    test('should acquire cell with value', () => {
      const cell = pool.acquireWithValue('Hello', 'string');
      expect(cell.value).toBe('Hello');
      expect(cell.type).toBe('string');
    });
  });

  describe('StringBuilderPool', () => {
    let pool;

    beforeEach(() => {
      pool = new StringBuilderPool();
    });

    test('should build strings efficiently', () => {
      const result = pool.buildString(['Hello', ' ', 'World', '!']);
      expect(result).toBe('Hello World!');
    });

    test('should handle separator', () => {
      const result = pool.buildString(['A', 'B', 'C'], '-');
      expect(result).toBe('A-B-C');
    });
  });

  describe('ArrayPool', () => {
    let pool;

    beforeEach(() => {
      pool = new ArrayPool();
    });

    test('should create empty arrays', () => {
      const arr = pool.acquire();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(0);
    });

    test('should clear arrays on release', () => {
      const arr = pool.acquire();
      arr.push(1, 2, 3);
      
      pool.release(arr);
      const reacquired = pool.acquire();
      expect(reacquired.length).toBe(0);
    });

    test('should acquire array with capacity', () => {
      const arr = pool.acquireWithCapacity(10);
      expect(arr.length).toBe(10);
    });
  });

  describe('MapPool', () => {
    let pool;

    beforeEach(() => {
      pool = new MapPool();
    });

    test('should create empty maps', () => {
      const map = pool.acquire();
      expect(map instanceof Map).toBe(true);
      expect(map.size).toBe(0);
    });

    test('should clear maps on release', () => {
      const map = pool.acquire();
      map.set('key', 'value');
      
      pool.release(map);
      const reacquired = pool.acquire();
      expect(reacquired.size).toBe(0);
    });
  });

  describe('SetPool', () => {
    let pool;

    beforeEach(() => {
      pool = new SetPool();
    });

    test('should create empty sets', () => {
      const set = pool.acquire();
      expect(set instanceof Set).toBe(true);
      expect(set.size).toBe(0);
    });

    test('should clear sets on release', () => {
      const set = pool.acquire();
      set.add('value');
      
      pool.release(set);
      const reacquired = pool.acquire();
      expect(reacquired.size).toBe(0);
    });
  });

  describe('ObjectPoolManager', () => {
    beforeEach(() => {
      // Clear any existing pools
      poolManager.clearAll();
    });

    test('should register and retrieve pools', () => {
      const testPool = new ArrayPool();
      poolManager.registerPool('test.array', testPool);
      
      const retrieved = poolManager.getPool('test.array');
      expect(retrieved).toBe(testPool);
    });

    test('should get all pool statistics', () => {
      const pool1 = new ArrayPool();
      const pool2 = new MapPool();
      
      poolManager.registerPool('test.array', pool1);
      poolManager.registerPool('test.map', pool2);
      
      // Use pools
      pool1.acquire();
      pool2.acquire();
      
      const allStats = poolManager.getAllStats();
      expect(allStats).toHaveProperty('test.array');
      expect(allStats).toHaveProperty('test.map');
      expect(allStats['test.array'].acquired).toBe(1);
      expect(allStats['test.map'].acquired).toBe(1);
    });

    test('should clear all pools', () => {
      const pool1 = new ArrayPool();
      const pool2 = new MapPool();
      
      poolManager.registerPool('test.array', pool1);
      poolManager.registerPool('test.map', pool2);
      
      pool1.acquire();
      pool2.acquire();
      
      poolManager.clearAll();
      
      expect(pool1.getStats().currentSize).toBe(0);
      expect(pool2.getStats().currentSize).toBe(0);
    });
  });

  describe('Pool Events', () => {
    test('should emit acquire event', (done) => {
      const pool = new ObjectPool({
        factory: () => ({}),
        reset: () => {},
        trackStats: true
      });
      
      pool.on('acquire', (data) => {
        expect(data).toHaveProperty('poolSize');
        done();
      });
      
      pool.acquire();
    });

    test('should emit release event', (done) => {
      const pool = new ObjectPool({
        factory: () => ({}),
        reset: () => {},
        trackStats: true
      });
      
      pool.on('release', (data) => {
        expect(data).toHaveProperty('poolSize');
        done();
      });
      
      const obj = pool.acquire();
      pool.release(obj);
    });

    test('should emit expand event', (done) => {
      const pool = new ObjectPool({
        initialSize: 2,
        expansionSize: 3,
        factory: () => ({}),
        reset: () => {},
        trackStats: true
      });
      
      pool.on('expand', (data) => {
        expect(data.expansion).toBe(3);
        done();
      });
      
      // Acquire all initial objects
      pool.acquire();
      pool.acquire();
      // This should trigger expansion
      pool.acquire();
    });
  });

  describe('Memory Efficiency', () => {
    test('should reuse objects efficiently', () => {
      const pool = new ObjectPool({
        initialSize: 10,
        factory: () => ({ id: Math.random() }),
        reset: (obj) => { obj.data = null; }
      });
      
      const objects = [];
      
      // Acquire and release multiple times
      for (let i = 0; i < 100; i++) {
        const obj = pool.acquire();
        obj.data = i;
        objects.push(obj.id);
        pool.release(obj);
      }
      
      // Count unique object IDs
      const uniqueIds = new Set(objects);
      
      // Should have reused objects, so unique count should be much less than 100
      expect(uniqueIds.size).toBeLessThanOrEqual(20);
      
      const stats = pool.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.8); // High hit rate
    });

    test('should handle concurrent acquire/release', async () => {
      const pool = new ArrayPool();
      const promises = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const arr = pool.acquire();
              arr.push(i);
              setTimeout(() => {
                pool.release(arr);
                resolve();
              }, Math.random() * 10);
            }, Math.random() * 10);
          })
        );
      }
      
      await Promise.all(promises);
      
      const stats = pool.getStats();
      expect(stats.acquired).toBe(50);
      expect(stats.released).toBe(50);
    });
  });
});