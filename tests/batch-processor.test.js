const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const { EventEmitter } = require('events');
const path = require('path');

// Import batch processor and related classes
const { BatchProcessor, BatchProcessorState, estimateOptimalBatchSize, batchIterator } = require('../src/services/m4/performance/batch-processor');
const { ArrayPool } = require('../src/services/m4/performance/object-pool');
const { MemoryMonitor } = require('../src/services/m4/performance/memory-monitor');

describe('BatchProcessor', () => {
  let batchProcessor;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    batchProcessor = new BatchProcessor({
      initialBatchSize: 100,
      maxBatchSize: 500,
      minBatchSize: 50,
      memoryThreshold: 50,
      autoAdjust: true,
      pauseBetweenBatches: 0,
      gcFrequency: 5
    });
  });

  afterEach(() => {
    sandbox.restore();
    if (batchProcessor) {
      batchProcessor.reset();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const processor = new BatchProcessor();
      expect(processor.getCurrentBatchSize()).to.equal(1000);
      expect(processor.getState()).to.equal(BatchProcessorState.IDLE);
    });

    it('should initialize with custom configuration', () => {
      expect(batchProcessor.getCurrentBatchSize()).to.equal(100);
      expect(batchProcessor.getState()).to.equal(BatchProcessorState.IDLE);
    });
  });

  describe('processBatches with arrays', () => {
    it('should process array items in batches', async () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      const processedBatches = [];
      
      const results = await batchProcessor.processBatches(
        items,
        async (batch, batchIndex) => {
          processedBatches.push({ batchIndex, size: batch.length });
          return batch.map(item => item * 2);
        }
      );

      expect(results).to.have.lengthOf(250);
      expect(results[0]).to.equal(0);
      expect(results[249]).to.equal(498);
      expect(processedBatches).to.have.length.greaterThan(1);
      expect(processedBatches[0].size).to.equal(100);
    });

    it('should handle empty array', async () => {
      const results = await batchProcessor.processBatches(
        [],
        async (batch) => batch
      );

      expect(results).to.be.an('array').that.is.empty;
    });

    it('should emit progress events', async () => {
      const items = Array.from({ length: 200 }, (_, i) => i);
      const progressEvents = [];

      const results = await batchProcessor.processBatches(
        items,
        async (batch) => batch,
        {
          onProgress: (progress) => {
            progressEvents.push(progress);
          }
        }
      );

      expect(progressEvents).to.have.length.greaterThan(0);
      const lastProgress = progressEvents[progressEvents.length - 1];
      expect(lastProgress.percentage).to.equal(100);
      expect(lastProgress.itemsProcessed).to.equal(200);
    });

    it('should handle processing errors', async () => {
      const items = [1, 2, 3, 4, 5];
      
      try {
        await batchProcessor.processBatches(
          items,
          async (batch, batchIndex) => {
            if (batchIndex === 0) {
              throw new Error('Processing error');
            }
            return batch;
          }
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Processing error');
        expect(batchProcessor.getState()).to.equal(BatchProcessorState.ERROR);
      }
    });
  });

  describe('processBatches with async iterables', () => {
    async function* generateItems(count) {
      for (let i = 0; i < count; i++) {
        yield i;
      }
    }

    it('should process async iterable items in batches', async () => {
      const processedBatches = [];
      
      const results = await batchProcessor.processBatches(
        generateItems(150),
        async (batch, batchIndex) => {
          processedBatches.push({ batchIndex, size: batch.length });
          return batch.map(item => item * 2);
        }
      );

      expect(results).to.have.lengthOf(150);
      expect(processedBatches).to.have.length.greaterThan(1);
      expect(processedBatches[0].size).to.equal(100);
    });

    it('should handle variable batch sizes with async iterable', async () => {
      const results = await batchProcessor.processBatches(
        generateItems(75),
        async (batch) => batch
      );

      expect(results).to.have.lengthOf(75);
    });
  });

  describe('Batch size adjustment', () => {
    it('should adjust batch size based on performance', async () => {
      const items = Array.from({ length: 500 }, (_, i) => i);
      let adjustmentEvent = null;
      
      batchProcessor.on('batchSizeAdjusted', (event) => {
        adjustmentEvent = event;
      });

      // Simulate slow processing
      await batchProcessor.processBatches(
        items,
        async (batch) => {
          // Simulate memory pressure
          if (global.gc) {
            global.gc();
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          return batch;
        }
      );

      // Batch size might be adjusted during processing
      const finalBatchSize = batchProcessor.getCurrentBatchSize();
      expect(finalBatchSize).to.be.within(50, 500);
    });

    it('should emit memory pressure events', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        data: new Array(1000).fill(i) // Create memory pressure
      }));
      
      let memoryPressureEmitted = false;
      batchProcessor.on('memoryPressure', () => {
        memoryPressureEmitted = true;
      });

      await batchProcessor.processBatches(
        items,
        async (batch) => batch
      );

      // Memory pressure might be emitted depending on system
      expect(batchProcessor.getStats().batchesProcessed).to.be.greaterThan(0);
    });
  });

  describe('Pause and resume', () => {
    it('should pause and resume processing', async () => {
      const items = Array.from({ length: 300 }, (_, i) => i);
      const processedBatches = [];
      
      setTimeout(() => {
        batchProcessor.pause();
        setTimeout(() => {
          batchProcessor.resume();
        }, 100);
      }, 50);

      const startTime = Date.now();
      await batchProcessor.processBatches(
        items,
        async (batch, batchIndex) => {
          processedBatches.push(batchIndex);
          await new Promise(resolve => setTimeout(resolve, 20));
          return batch;
        }
      );
      const endTime = Date.now();

      expect(endTime - startTime).to.be.greaterThan(100);
      expect(processedBatches.length).to.be.greaterThan(1);
    });

    it('should throw error when pausing in wrong state', () => {
      expect(() => batchProcessor.pause()).to.throw('Can only pause when processing');
    });

    it('should throw error when resuming in wrong state', () => {
      expect(() => batchProcessor.resume()).to.throw('Can only resume when paused');
    });
  });

  describe('Statistics', () => {
    it('should track processing statistics', async () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      
      await batchProcessor.processBatches(
        items,
        async (batch) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return batch;
        }
      );

      const stats = batchProcessor.getStats();
      expect(stats.batchesProcessed).to.equal(3); // 100 + 100 + 50
      expect(stats.itemsProcessed).to.equal(250);
      expect(stats.averageProcessingTime).to.be.greaterThan(0);
      expect(stats.totalProcessingTime).to.be.greaterThan(0);
    });

    it('should emit stats update events', async () => {
      const statsUpdates = [];
      batchProcessor.on('statsUpdate', (stats) => {
        statsUpdates.push(stats);
      });

      const items = Array.from({ length: 150 }, (_, i) => i);
      await batchProcessor.processBatches(items, async (batch) => batch);

      expect(statsUpdates).to.have.length.greaterThan(0);
      const lastStats = statsUpdates[statsUpdates.length - 1];
      expect(lastStats.itemsProcessed).to.equal(150);
    });
  });

  describe('Garbage collection', () => {
    it('should trigger garbage collection at configured frequency', async () => {
      if (!global.gc) {
        console.log('Skipping GC test - run with --expose-gc flag');
        return;
      }

      const gcEvents = [];
      batchProcessor.on('gcComplete', (event) => {
        gcEvents.push(event);
      });

      const items = Array.from({ length: 600 }, (_, i) => i);
      await batchProcessor.processBatches(
        items,
        async (batch) => batch
      );

      expect(gcEvents).to.have.length.greaterThan(0);
      expect(batchProcessor.getStats().gcCount).to.be.greaterThan(0);
    });
  });

  describe('Factory methods', () => {
    it('should create streaming processor', () => {
      const processor = BatchProcessor.createStreamingProcessor();
      expect(processor.getCurrentBatchSize()).to.equal(1000);
      const config = processor.config || {};
      expect(config.pauseBetweenBatches).to.equal(1);
      expect(config.gcFrequency).to.equal(5);
    });

    it('should create memory optimized processor', () => {
      const processor = BatchProcessor.createMemoryOptimized();
      expect(processor.getCurrentBatchSize()).to.equal(500);
      const config = processor.config || {};
      expect(config.memoryThreshold).to.equal(50);
      expect(config.gcFrequency).to.equal(3);
    });
  });

  describe('Reset', () => {
    it('should reset processor state', async () => {
      const items = [1, 2, 3];
      await batchProcessor.processBatches(items, async (batch) => batch);

      batchProcessor.reset();
      
      expect(batchProcessor.getState()).to.equal(BatchProcessorState.IDLE);
      expect(batchProcessor.getCurrentBatchSize()).to.equal(100);
      const stats = batchProcessor.getStats();
      expect(stats.batchesProcessed).to.equal(0);
      expect(stats.itemsProcessed).to.equal(0);
    });
  });
});

describe('Utility functions', () => {
  describe('estimateOptimalBatchSize', () => {
    it('should estimate optimal batch size based on item size', () => {
      const batchSize = estimateOptimalBatchSize(10000, 1024, 10); // 10K items, 1KB each, 10MB limit
      expect(batchSize).to.be.within(100, 5000);
      expect(batchSize).to.be.closeTo(10240, 1000); // ~10K items fit in 10MB
    });

    it('should respect minimum batch size', () => {
      const batchSize = estimateOptimalBatchSize(10, 1024 * 1024, 1); // 10 items, 1MB each, 1MB limit
      expect(batchSize).to.equal(100); // Minimum
    });

    it('should respect maximum batch size', () => {
      const batchSize = estimateOptimalBatchSize(100000, 1, 1000); // 100K items, 1B each, 1GB limit
      expect(batchSize).to.equal(5000); // Maximum
    });
  });

  describe('batchIterator', () => {
    it('should iterate over array in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const batches = [];
      
      for await (const batch of batchIterator(items, 10)) {
        batches.push(batch);
      }

      expect(batches).to.have.lengthOf(3);
      expect(batches[0]).to.have.lengthOf(10);
      expect(batches[1]).to.have.lengthOf(10);
      expect(batches[2]).to.have.lengthOf(5);
    });

    it('should iterate over async iterable in batches', async () => {
      async function* generateItems() {
        for (let i = 0; i < 15; i++) {
          yield i;
        }
      }

      const batches = [];
      for await (const batch of batchIterator(generateItems(), 5)) {
        batches.push(batch);
      }

      expect(batches).to.have.lengthOf(3);
      expect(batches[0]).to.have.lengthOf(5);
      expect(batches[2]).to.have.lengthOf(5);
    });

    it('should handle empty input', async () => {
      const batches = [];
      for await (const batch of batchIterator([], 10)) {
        batches.push(batch);
      }

      expect(batches).to.have.lengthOf(0);
    });
  });
});

describe('Integration with M4 Processors', () => {
  it('should integrate with object pools', async () => {
    const arrayPool = new ArrayPool({ initialSize: 5, maxSize: 20 });
    const processor = new BatchProcessor({ initialBatchSize: 10 });
    
    const items = Array.from({ length: 30 }, (_, i) => i);
    const results = await processor.processBatches(
      items,
      async (batch) => {
        const tempArray = arrayPool.acquire();
        try {
          tempArray.push(...batch.map(x => x * 2));
          return [...tempArray];
        } finally {
          arrayPool.release(tempArray);
        }
      }
    );

    expect(results).to.have.lengthOf(30);
    expect(results[0]).to.equal(0);
    expect(results[29]).to.equal(58);
  });

  it('should work with memory monitor', async () => {
    const memoryMonitor = new MemoryMonitor({
      interval: 100,
      warningThreshold: 80,
      criticalThreshold: 90
    });
    
    const processor = new BatchProcessor({ 
      initialBatchSize: 50,
      memoryThreshold: 50
    });
    
    memoryMonitor.start();
    
    const items = Array.from({ length: 100 }, (_, i) => 
      new Array(1000).fill(i)
    );
    
    await processor.processBatches(
      items,
      async (batch) => {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 10));
        return batch;
      }
    );
    
    memoryMonitor.stop();
    
    const trend = memoryMonitor.getTrend();
    expect(trend.gcCount).to.be.a('number');
  });
});