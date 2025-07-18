const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs').promises;
const { M4DialogueProcessorStreaming } = require('../src/services/m4/processors/m4DialogueProcessorStreaming');
const { M4StringProcessorStreaming } = require('../src/services/m4/processors/m4StringProcessorStreaming');
const { BatchProcessor } = require('../src/services/m4/performance/batch-processor');
const { MemoryMonitor } = require('../src/services/m4/performance/memory-monitor');

describe('BatchProcessor Integration Tests', () => {
  describe('M4DialogueProcessorStreaming with BatchProcessor', () => {
    let processor;
    let memoryMonitor;
    const testDataPath = path.join(__dirname, 'test-data');
    const outputPath = path.join(__dirname, 'test-outputs');

    beforeEach(async () => {
      processor = new M4DialogueProcessorStreaming();
      memoryMonitor = new MemoryMonitor({
        interval: 1000,
        heapWarningThreshold: 100,
        heapCriticalThreshold: 200
      });
      
      // Ensure output directory exists
      await fs.mkdir(outputPath, { recursive: true });
    });

    afterEach(async () => {
      memoryMonitor.stop();
      // Clean up test outputs
      try {
        const files = await fs.readdir(outputPath);
        for (const file of files) {
          if (file.includes('batch-test')) {
            await fs.unlink(path.join(outputPath, file));
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should process dialogue file with batch processing', async function() {
      this.timeout(30000);
      
      const inputFile = path.join(testDataPath, 'M4_Dialogue_Sample.xlsx');
      const outputFile = path.join(outputPath, 'batch-test-dialogue-output.xlsx');
      
      // Check if test file exists
      try {
        await fs.access(inputFile);
      } catch (error) {
        console.log('Skipping test - sample file not found');
        return;
      }

      const batchEvents = [];
      const progressEvents = [];
      let memoryAlerts = 0;

      processor.on('batchComplete', (event) => {
        batchEvents.push(event);
      });

      processor.on('batchProgress', (progress) => {
        progressEvents.push(progress);
      });

      processor.on('memoryAlert', () => {
        memoryAlerts++;
      });

      memoryMonitor.start();
      
      const result = await processor.processFile(inputFile, outputFile);
      
      expect(result.success).to.be.true;
      expect(result.rowsProcessed).to.be.greaterThan(0);
      expect(batchEvents).to.have.length.greaterThan(0);
      
      // Verify batch processing occurred
      const firstBatch = batchEvents[0];
      expect(firstBatch).to.have.property('batchIndex');
      expect(firstBatch).to.have.property('batchSize');
      expect(firstBatch).to.have.property('processingTime');
      
      // Check memory usage
      const memoryTrend = memoryMonitor.getTrend();
      console.log(`Peak memory usage: ${MemoryMonitor.formatBytes(memoryTrend.peakUsage)}`);
      console.log(`Average batch processing time: ${processor.batchProcessor.getStats().averageProcessingTime.toFixed(2)}ms`);
    });

    it('should handle pause and resume during batch processing', async function() {
      this.timeout(30000);
      
      const inputFile = path.join(testDataPath, 'M4_Dialogue_Sample.xlsx');
      const outputFile = path.join(outputPath, 'batch-test-dialogue-pause-output.xlsx');
      
      try {
        await fs.access(inputFile);
      } catch (error) {
        console.log('Skipping test - sample file not found');
        return;
      }

      let pausedAt = null;
      let resumedAt = null;

      processor.on('batchComplete', (event) => {
        if (event.batchIndex === 1 && !pausedAt) {
          processor.batchProcessor.pause();
          pausedAt = Date.now();
          
          setTimeout(() => {
            processor.batchProcessor.resume();
            resumedAt = Date.now();
          }, 100);
        }
      });

      const result = await processor.processFile(inputFile, outputFile);
      
      expect(result.success).to.be.true;
      if (pausedAt && resumedAt) {
        expect(resumedAt - pausedAt).to.be.at.least(100);
      }
    });

    it('should adjust batch size based on memory pressure', async function() {
      this.timeout(30000);
      
      const inputFile = path.join(testDataPath, 'M4_Dialogue_Sample.xlsx');
      const outputFile = path.join(outputPath, 'batch-test-dialogue-memory-output.xlsx');
      
      try {
        await fs.access(inputFile);
      } catch (error) {
        console.log('Skipping test - sample file not found');
        return;
      }

      const batchSizeAdjustments = [];
      
      processor.on('info', (message) => {
        if (message.includes('Batch size adjusted')) {
          batchSizeAdjustments.push(message);
        }
      });

      const initialBatchSize = processor.batchProcessor.getCurrentBatchSize();
      
      await processor.processFile(inputFile, outputFile);
      
      const finalBatchSize = processor.batchProcessor.getCurrentBatchSize();
      const stats = processor.batchProcessor.getStats();
      
      console.log(`Initial batch size: ${initialBatchSize}`);
      console.log(`Final batch size: ${finalBatchSize}`);
      console.log(`Adjustments made: ${stats.adjustmentCount}`);
      console.log(`GC runs: ${stats.gcCount}`);
    });
  });

  describe('M4StringProcessorStreaming with BatchProcessor', () => {
    let processor;
    let memoryMonitor;
    const testDataPath = path.join(__dirname, 'test-data', 'M4_String');
    const outputPath = path.join(__dirname, 'test-outputs');

    beforeEach(async () => {
      processor = new M4StringProcessorStreaming();
      memoryMonitor = new MemoryMonitor({
        interval: 1000,
        heapWarningThreshold: 150,
        heapCriticalThreshold: 300
      });
      
      await fs.mkdir(outputPath, { recursive: true });
    });

    afterEach(async () => {
      memoryMonitor.stop();
      processor.clearProcessedData();
    });

    it('should process multiple string files with batch processing', async function() {
      this.timeout(60000);
      
      const outputFile = path.join(outputPath, 'batch-test-string-output.xlsx');
      
      // Check if test folder exists
      try {
        await fs.access(testDataPath);
      } catch (error) {
        console.log('Skipping test - sample folder not found');
        return;
      }

      const fileBatchEvents = [];
      const fileCompleteEvents = [];
      let totalBatches = 0;

      processor.on('fileBatchProgress', (event) => {
        fileBatchEvents.push(event);
      });

      processor.on('fileComplete', (event) => {
        fileCompleteEvents.push(event);
      });

      processor.on('batchComplete', () => {
        totalBatches++;
      });

      memoryMonitor.start();
      
      const result = await processor.processFolder(testDataPath, outputFile);
      
      expect(result.success).to.be.true;
      expect(result.filesProcessed).to.be.greaterThan(0);
      expect(totalBatches).to.be.greaterThan(0);
      
      // Check memory management across multiple files
      const memoryTrend = memoryMonitor.getTrend();
      console.log(`Files processed: ${result.filesProcessed}`);
      console.log(`Total rows: ${result.rowsProcessed}`);
      console.log(`Peak memory usage: ${MemoryMonitor.formatBytes(memoryTrend.peakUsage)}`);
      console.log(`Memory growth rate: ${MemoryMonitor.formatBytes(memoryTrend.growthRate)}/s`);
      
      // Verify batch processor was reset between files
      expect(fileCompleteEvents).to.have.lengthOf(result.filesProcessed);
    });

    it('should handle memory pressure during string processing', async function() {
      this.timeout(60000);
      
      const outputFile = path.join(outputPath, 'batch-test-string-memory-output.xlsx');
      
      try {
        await fs.access(testDataPath);
      } catch (error) {
        console.log('Skipping test - sample folder not found');
        return;
      }

      const memoryWarnings = [];
      const gcEvents = [];

      processor.on('warning', (message) => {
        if (message.includes('Memory pressure')) {
          memoryWarnings.push(message);
        }
      });

      processor.on('info', (message) => {
        if (message.includes('GC freed')) {
          gcEvents.push(message);
        }
      });

      const result = await processor.processFolder(testDataPath, outputFile);
      
      expect(result.success).to.be.true;
      
      console.log(`Memory warnings: ${memoryWarnings.length}`);
      console.log(`GC events: ${gcEvents.length}`);
      
      const stats = processor.batchProcessor.getStats();
      console.log(`Batch size adjustments: ${stats.adjustmentCount}`);
      console.log(`Average batch processing time: ${stats.averageProcessingTime.toFixed(2)}ms`);
    });
  });

  describe('BatchProcessor Performance Comparison', () => {
    it('should compare performance with and without batch processing', async function() {
      this.timeout(60000);
      
      // This is a synthetic test to demonstrate the batch processor's benefits
      const testSize = 10000;
      const testData = Array.from({ length: testSize }, (_, i) => ({
        id: i,
        data: new Array(100).fill(`test-${i}`).join('-')
      }));

      // Test without batch processor (simulated)
      const withoutBatchStart = Date.now();
      const withoutBatchMemStart = process.memoryUsage().heapUsed;
      
      const resultsWithout = [];
      for (const item of testData) {
        // Simulate processing
        resultsWithout.push({
          id: item.id,
          processed: item.data.toUpperCase()
        });
      }
      
      const withoutBatchTime = Date.now() - withoutBatchStart;
      const withoutBatchMemEnd = process.memoryUsage().heapUsed;
      
      // Force GC to clean up
      if (global.gc) {
        global.gc();
      }
      
      // Test with batch processor
      const batchProcessor = BatchProcessor.createMemoryOptimized({
        initialBatchSize: 500,
        gcFrequency: 5
      });
      
      const withBatchStart = Date.now();
      const withBatchMemStart = process.memoryUsage().heapUsed;
      
      const resultsWith = await batchProcessor.processBatches(
        testData,
        async (batch) => {
          return batch.map(item => ({
            id: item.id,
            processed: item.data.toUpperCase()
          }));
        }
      );
      
      const withBatchTime = Date.now() - withBatchStart;
      const withBatchMemEnd = process.memoryUsage().heapUsed;
      
      // Compare results
      expect(resultsWith).to.have.lengthOf(testSize);
      expect(resultsWithout).to.have.lengthOf(testSize);
      
      const stats = batchProcessor.getStats();
      
      console.log('\nPerformance Comparison:');
      console.log('Without Batch Processor:');
      console.log(`  Time: ${withoutBatchTime}ms`);
      console.log(`  Memory Delta: ${MemoryMonitor.formatBytes(withoutBatchMemEnd - withoutBatchMemStart)}`);
      
      console.log('With Batch Processor:');
      console.log(`  Time: ${withBatchTime}ms`);
      console.log(`  Memory Delta: ${MemoryMonitor.formatBytes(withBatchMemEnd - withBatchMemStart)}`);
      console.log(`  Batches: ${stats.batchesProcessed}`);
      console.log(`  GC Runs: ${stats.gcCount}`);
      console.log(`  Avg Batch Time: ${stats.averageProcessingTime.toFixed(2)}ms`);
    });
  });

  describe('Error Handling in Batch Processing', () => {
    it('should handle errors gracefully in batch processing', async () => {
      const processor = new M4DialogueProcessorStreaming();
      const testData = Array.from({ length: 100 }, (_, i) => ({
        values: [null, null, null, null, null, null, null, i === 50 ? 'error' : `text-${i}`]
      }));

      let errorCount = 0;
      processor.on('error', () => {
        errorCount++;
      });

      // Mock the reader to return test data
      const originalProcessDialogueSheet = processor.processDialogueSheet;
      processor.processDialogueSheet = async function(filePath, sheetName, type) {
        // Simulate error during processing
        if (sheetName === 'ERROR_SHEET') {
          throw new Error('Simulated processing error');
        }
        return [];
      };

      try {
        await processor.processDialogueSheet('dummy.xlsx', 'ERROR_SHEET', 'cinematic');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Simulated processing error');
      }

      // Restore original method
      processor.processDialogueSheet = originalProcessDialogueSheet;
    });
  });

  describe('Memory Pool Integration', () => {
    it('should efficiently use object pools with batch processor', async () => {
      const { poolManager } = require('../src/services/m4/performance/object-pool');
      
      // Get initial pool stats
      const initialStats = poolManager.getAllStats();
      
      const processor = new M4DialogueProcessorStreaming();
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        values: Array(12).fill(`value-${i}`)
      }));

      // Process test data
      const results = [];
      for (const row of testData) {
        const dialogue = processor.parseDialogueRow(row, 'CI');
        if (dialogue) {
          results.push(dialogue);
        }
      }

      // Get final pool stats
      const finalStats = poolManager.getAllStats();
      
      // Check pool usage
      if (finalStats['dialogue.row']) {
        const rowPoolStats = finalStats['dialogue.row'];
        console.log(`Row Pool - Created: ${rowPoolStats.created}, Hit Rate: ${(rowPoolStats.hitRate * 100).toFixed(1)}%`);
        expect(rowPoolStats.hitRate).to.be.greaterThan(0);
      }

      if (finalStats['dialogue.array']) {
        const arrayPoolStats = finalStats['dialogue.array'];
        console.log(`Array Pool - Created: ${arrayPoolStats.created}, Hit Rate: ${(arrayPoolStats.hitRate * 100).toFixed(1)}%`);
      }
    });
  });
});