const { PerformanceProfiler } = require('../src/services/m4/performance/profiler');

describe('Performance Profiler', () => {
  let profiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  afterEach(() => {
    profiler.clear();
  });

  test('should measure simple operations', () => {
    const id = profiler.begin('testOperation');
    
    // Simulate some work
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }
    
    profiler.end(id);
    
    const stats = profiler.getStats();
    expect(stats).toHaveProperty('testOperation');
    expect(stats.testOperation.count).toBe(1);
    expect(stats.testOperation.totalTime).toBeGreaterThan(0);
  });

  test('should support hierarchical measurements', () => {
    const parentId = profiler.begin('parentOperation');
    
    const childId1 = profiler.begin('childOperation1');
    // Simulate work
    for (let i = 0; i < 500000; i++) {
      Math.sqrt(i);
    }
    profiler.end(childId1);
    
    const childId2 = profiler.begin('childOperation2');
    // Simulate work
    for (let i = 0; i < 500000; i++) {
      Math.sqrt(i);
    }
    profiler.end(childId2);
    
    profiler.end(parentId);
    
    const report = profiler.generateReport();
    expect(report.measurements).toHaveLength(3);
    
    const parentMeasurement = report.measurements.find(m => m.name === 'parentOperation');
    expect(parentMeasurement.children).toHaveLength(2);
  });

  test('should track memory usage', () => {
    profiler.trackMemory(true);
    
    const id = profiler.begin('memoryOperation');
    
    // Allocate some memory
    const bigArray = new Array(1000000).fill('x');
    
    profiler.end(id);
    
    const report = profiler.generateReport();
    const measurement = report.measurements.find(m => m.name === 'memoryOperation');
    
    expect(measurement.memoryDelta).toBeDefined();
    expect(measurement.memoryDelta.heapUsed).toBeGreaterThan(0);
  });

  test('should identify slow operations', () => {
    const fastId = profiler.begin('fastOperation');
    profiler.end(fastId);
    
    const slowId = profiler.begin('slowOperation');
    // Simulate slow work
    const start = Date.now();
    while (Date.now() - start < 150) {
      Math.sqrt(Math.random());
    }
    profiler.end(slowId);
    
    const report = profiler.generateReport();
    expect(report.slowOperations).toHaveLength(1);
    expect(report.slowOperations[0].name).toBe('slowOperation');
  });

  test('should generate recommendations', () => {
    // Create multiple measurements of the same operation
    for (let i = 0; i < 10; i++) {
      const id = profiler.begin('repeatedOperation');
      // Vary the execution time
      const iterations = i > 5 ? 1000000 : 100000;
      for (let j = 0; j < iterations; j++) {
        Math.sqrt(j);
      }
      profiler.end(id);
    }
    
    const report = profiler.generateReport();
    expect(report.recommendations.length).toBeGreaterThan(0);
    
    // Should detect high standard deviation
    const hasVarianceRecommendation = report.recommendations.some(
      rec => rec.includes('high variance')
    );
    expect(hasVarianceRecommendation).toBe(true);
  });

  test('should use measure helper correctly', async () => {
    const result = await profiler.measureAsync('asyncOperation', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'test result';
    });
    
    expect(result).toBe('test result');
    
    const stats = profiler.getStats();
    expect(stats.asyncOperation).toBeDefined();
    expect(stats.asyncOperation.totalTime).toBeGreaterThanOrEqual(50);
  });

  test('should emit events', (done) => {
    let measurementStarted = false;
    let measurementEnded = false;
    
    profiler.on('measurementStart', (data) => {
      expect(data.name).toBe('eventTest');
      measurementStarted = true;
    });
    
    profiler.on('measurementEnd', (data) => {
      expect(data.name).toBe('eventTest');
      expect(data.duration).toBeGreaterThan(0);
      measurementEnded = true;
      
      expect(measurementStarted).toBe(true);
      expect(measurementEnded).toBe(true);
      done();
    });
    
    const id = profiler.begin('eventTest');
    setTimeout(() => {
      profiler.end(id);
    }, 10);
  });

  test('should handle errors gracefully', () => {
    // Try to end a non-existent measurement
    expect(() => {
      profiler.end('non-existent-id');
    }).not.toThrow();
    
    // Try to end the same measurement twice
    const id = profiler.begin('test');
    profiler.end(id);
    expect(() => {
      profiler.end(id);
    }).not.toThrow();
  });

  test('should support profiling decorators', () => {
    class TestClass {
      @profiler.profile()
      syncMethod() {
        for (let i = 0; i < 100000; i++) {
          Math.sqrt(i);
        }
        return 'sync result';
      }
      
      @profiler.profile()
      async asyncMethod() {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      }
    }
    
    const instance = new TestClass();
    const syncResult = instance.syncMethod();
    expect(syncResult).toBe('sync result');
    
    const stats = profiler.getStats();
    expect(stats['TestClass.syncMethod']).toBeDefined();
  });

  test('should respect enabled/disabled state', () => {
    profiler.setEnabled(false);
    
    const id = profiler.begin('disabledOperation');
    profiler.end(id);
    
    const stats = profiler.getStats();
    expect(Object.keys(stats)).toHaveLength(0);
    
    profiler.setEnabled(true);
    
    const id2 = profiler.begin('enabledOperation');
    profiler.end(id2);
    
    const stats2 = profiler.getStats();
    expect(stats2.enabledOperation).toBeDefined();
  });
});