import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { ObjectPool, ArrayPool } from './object-pool';
import { PerformanceProfiler, globalProfiler } from './profiler';

/**
 * Batch processing configuration
 */
export interface BatchProcessorConfig {
  /** Initial batch size */
  initialBatchSize?: number;
  /** Maximum batch size */
  maxBatchSize?: number;
  /** Minimum batch size */
  minBatchSize?: number;
  /** Memory threshold for triggering GC (in MB) */
  memoryThreshold?: number;
  /** Automatically adjust batch size based on performance */
  autoAdjust?: boolean;
  /** Pause between batches (ms) */
  pauseBetweenBatches?: number;
  /** Enable profiling */
  enableProfiling?: boolean;
  /** Garbage collection frequency (batches) */
  gcFrequency?: number;
  /** Max concurrent batches (for parallel processing) */
  maxConcurrentBatches?: number;
}

/**
 * Batch processing statistics
 */
export interface BatchStats {
  /** Total number of batches processed */
  batchesProcessed: number;
  /** Total items processed */
  itemsProcessed: number;
  /** Average batch processing time (ms) */
  averageProcessingTime: number;
  /** Current batch size */
  currentBatchSize: number;
  /** Peak memory usage (bytes) */
  peakMemoryUsage: number;
  /** Total processing time (ms) */
  totalProcessingTime: number;
  /** Number of batch size adjustments */
  adjustmentCount: number;
  /** Number of GC runs */
  gcCount: number;
}

/**
 * Batch processing state
 */
export enum BatchProcessorState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Batch progress information
 */
export interface BatchProgress {
  /** Current batch number */
  currentBatch: number;
  /** Total batches */
  totalBatches: number;
  /** Items in current batch */
  batchSize: number;
  /** Total items processed */
  itemsProcessed: number;
  /** Total items */
  totalItems: number;
  /** Progress percentage */
  percentage: number;
  /** Current state */
  state: BatchProcessorState;
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
}

/**
 * Batch processor for efficient memory management during large data processing
 */
export class BatchProcessor<T> extends EventEmitter {
  private config: Required<BatchProcessorConfig>;
  private state: BatchProcessorState = BatchProcessorState.IDLE;
  private stats: BatchStats;
  private profiler?: PerformanceProfiler;
  private arrayPool: ArrayPool<T>;
  private currentBatchSize: number;
  private memoryBaseline: number = 0;
  private processingStartTime: number = 0;
  private batchTimes: number[] = [];
  private isPaused: boolean = false;
  private pausePromise?: Promise<void>;
  private pauseResolve?: () => void;

  constructor(config: BatchProcessorConfig = {}) {
    super();
    
    this.config = {
      initialBatchSize: config.initialBatchSize || 1000,
      maxBatchSize: config.maxBatchSize || 5000,
      minBatchSize: config.minBatchSize || 100,
      memoryThreshold: config.memoryThreshold || 100, // 100MB
      autoAdjust: config.autoAdjust !== false,
      pauseBetweenBatches: config.pauseBetweenBatches || 0,
      enableProfiling: config.enableProfiling !== false,
      gcFrequency: config.gcFrequency || 10,
      maxConcurrentBatches: config.maxConcurrentBatches || 1
    };

    this.currentBatchSize = this.config.initialBatchSize;
    
    this.stats = {
      batchesProcessed: 0,
      itemsProcessed: 0,
      averageProcessingTime: 0,
      currentBatchSize: this.currentBatchSize,
      peakMemoryUsage: 0,
      totalProcessingTime: 0,
      adjustmentCount: 0,
      gcCount: 0
    };

    // Initialize array pool for batches
    this.arrayPool = new ArrayPool<T>({
      initialSize: 10,
      maxSize: 100,
      expansionSize: 10
    });

    if (this.config.enableProfiling) {
      this.profiler = globalProfiler;
    }
  }

  /**
   * Process items in batches
   */
  async processBatches<R>(
    items: T[] | AsyncIterable<T>,
    processor: (batch: T[], batchIndex: number) => Promise<R[]>,
    options?: {
      /** Custom batch size for this operation */
      batchSize?: number;
      /** Progress callback */
      onProgress?: (progress: BatchProgress) => void;
      /** Batch complete callback */
      onBatchComplete?: (batchIndex: number, results: R[]) => void;
    }
  ): Promise<R[]> {
    if (this.state !== BatchProcessorState.IDLE) {
      throw new Error(`BatchProcessor is already ${this.state}`);
    }

    const profileId = this.profiler?.begin('BatchProcessor.processBatches', {
      itemCount: Array.isArray(items) ? items.length : 'stream',
      batchSize: options?.batchSize || this.currentBatchSize
    });

    this.state = BatchProcessorState.PROCESSING;
    this.processingStartTime = performance.now();
    this.memoryBaseline = process.memoryUsage().heapUsed;
    
    const results: R[] = [];
    const batchSize = options?.batchSize || this.currentBatchSize;

    try {
      if (Array.isArray(items)) {
        // Process array in batches
        const totalBatches = Math.ceil(items.length / batchSize);
        
        for (let i = 0; i < items.length; i += batchSize) {
          await this.checkPause();
          
          const batchIndex = Math.floor(i / batchSize);
          const batch = items.slice(i, i + batchSize);
          
          const batchResults = await this.processBatch(
            batch, 
            batchIndex, 
            processor,
            {
              totalBatches,
              totalItems: items.length,
              onProgress: options?.onProgress,
              onBatchComplete: options?.onBatchComplete
            }
          );
          
          results.push(...batchResults);
        }
      } else {
        // Process async iterable in batches
        let batchIndex = 0;
        let batch = this.arrayPool.acquire();
        let totalItems = 0;
        
        for await (const item of items) {
          batch.push(item);
          totalItems++;
          
          if (batch.length >= batchSize) {
            await this.checkPause();
            
            const batchResults = await this.processBatch(
              batch,
              batchIndex++,
              processor,
              {
                totalItems,
                onProgress: options?.onProgress,
                onBatchComplete: options?.onBatchComplete
              }
            );
            
            results.push(...batchResults);
            batch = this.arrayPool.acquire();
          }
        }
        
        // Process remaining items
        if (batch.length > 0) {
          const batchResults = await this.processBatch(
            batch,
            batchIndex,
            processor,
            {
              totalItems,
              onProgress: options?.onProgress,
              onBatchComplete: options?.onBatchComplete
            }
          );
          
          results.push(...batchResults);
        }
        
        this.arrayPool.release(batch);
      }

      this.state = BatchProcessorState.COMPLETED;
      this.emit('complete', this.getStats());
      
      return results;

    } catch (error) {
      this.state = BatchProcessorState.ERROR;
      this.emit('error', error);
      throw error;
    } finally {
      if (profileId) this.profiler?.end(profileId);
    }
  }

  /**
   * Process a single batch
   */
  private async processBatch<R>(
    batch: T[],
    batchIndex: number,
    processor: (batch: T[], batchIndex: number) => Promise<R[]>,
    options: {
      totalBatches?: number;
      totalItems?: number;
      onProgress?: (progress: BatchProgress) => void;
      onBatchComplete?: (batchIndex: number, results: R[]) => void;
    }
  ): Promise<R[]> {
    const batchProfileId = this.profiler?.begin('BatchProcessor.processBatch', {
      batchIndex,
      batchSize: batch.length
    });

    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      // Process the batch
      const results = await processor(batch, batchIndex);
      
      // Update statistics
      const processingTime = performance.now() - startTime;
      this.updateStats(batch.length, processingTime, startMemory);
      
      // Emit progress
      if (options.onProgress) {
        const progress = this.createProgress(
          batchIndex,
          options.totalBatches,
          batch.length,
          options.totalItems
        );
        options.onProgress(progress);
      }
      
      // Emit batch complete
      if (options.onBatchComplete) {
        options.onBatchComplete(batchIndex, results);
      }
      
      this.emit('batchComplete', {
        batchIndex,
        batchSize: batch.length,
        processingTime,
        results: results.length
      });
      
      // Adjust batch size if needed
      if (this.config.autoAdjust) {
        this.adjustBatchSize(processingTime, startMemory);
      }
      
      // Pause between batches if configured
      if (this.config.pauseBetweenBatches > 0) {
        await this.sleep(this.config.pauseBetweenBatches);
      }
      
      // Run garbage collection if needed
      if (this.shouldRunGC(batchIndex)) {
        await this.runGarbageCollection();
      }
      
      return results;
      
    } finally {
      if (batchProfileId) this.profiler?.end(batchProfileId);
    }
  }

  /**
   * Update processing statistics
   */
  private updateStats(
    batchSize: number, 
    processingTime: number,
    startMemory: NodeJS.MemoryUsage
  ): void {
    this.stats.batchesProcessed++;
    this.stats.itemsProcessed += batchSize;
    this.stats.totalProcessingTime += processingTime;
    
    // Update average processing time
    this.batchTimes.push(processingTime);
    if (this.batchTimes.length > 10) {
      this.batchTimes.shift();
    }
    this.stats.averageProcessingTime = 
      this.batchTimes.reduce((a, b) => a + b, 0) / this.batchTimes.length;
    
    // Update peak memory usage
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryDelta = currentMemory - startMemory.heapUsed;
    if (currentMemory > this.stats.peakMemoryUsage) {
      this.stats.peakMemoryUsage = currentMemory;
    }
    
    // Emit statistics update
    this.emit('statsUpdate', this.stats);
  }

  /**
   * Adjust batch size based on performance metrics
   */
  private adjustBatchSize(processingTime: number, startMemory: NodeJS.MemoryUsage): void {
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryDelta = (currentMemory - startMemory.heapUsed) / (1024 * 1024); // MB
    const memoryUsage = (currentMemory - this.memoryBaseline) / (1024 * 1024); // MB
    
    let newBatchSize = this.currentBatchSize;
    
    // Adjust based on memory usage
    if (memoryUsage > this.config.memoryThreshold) {
      // Reduce batch size if memory usage is high
      newBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize * 0.8)
      );
      this.emit('memoryPressure', {
        currentUsage: memoryUsage,
        threshold: this.config.memoryThreshold,
        action: 'reduceBatchSize',
        newBatchSize
      });
    } else if (processingTime < this.stats.averageProcessingTime * 0.8 && 
               memoryDelta < this.config.memoryThreshold * 0.5) {
      // Increase batch size if processing is fast and memory usage is low
      newBatchSize = Math.min(
        this.config.maxBatchSize,
        Math.floor(this.currentBatchSize * 1.2)
      );
    }
    
    if (newBatchSize !== this.currentBatchSize) {
      this.currentBatchSize = newBatchSize;
      this.stats.currentBatchSize = newBatchSize;
      this.stats.adjustmentCount++;
      
      this.emit('batchSizeAdjusted', {
        oldSize: this.currentBatchSize,
        newSize: newBatchSize,
        reason: memoryUsage > this.config.memoryThreshold ? 'memory' : 'performance'
      });
    }
  }

  /**
   * Check if garbage collection should run
   */
  private shouldRunGC(batchIndex: number): boolean {
    return this.config.gcFrequency > 0 && 
           (batchIndex + 1) % this.config.gcFrequency === 0;
  }

  /**
   * Run garbage collection
   */
  private async runGarbageCollection(): Promise<void> {
    const gcProfileId = this.profiler?.begin('BatchProcessor.garbageCollection');
    
    if (global.gc) {
      const beforeMemory = process.memoryUsage().heapUsed;
      global.gc();
      const afterMemory = process.memoryUsage().heapUsed;
      const freed = (beforeMemory - afterMemory) / (1024 * 1024); // MB
      
      this.stats.gcCount++;
      
      this.emit('gcComplete', {
        freedMemory: freed,
        beforeMemory: beforeMemory / (1024 * 1024),
        afterMemory: afterMemory / (1024 * 1024)
      });
    }
    
    // Clear object pools if memory pressure is high
    const memoryUsage = (process.memoryUsage().heapUsed - this.memoryBaseline) / (1024 * 1024);
    if (memoryUsage > this.config.memoryThreshold * 0.8) {
      this.arrayPool.clear();
      this.emit('poolsCleared', { reason: 'memoryPressure' });
    }
    
    if (gcProfileId) this.profiler?.end(gcProfileId);
  }

  /**
   * Create progress information
   */
  private createProgress(
    currentBatch: number,
    totalBatches?: number,
    batchSize?: number,
    totalItems?: number
  ): BatchProgress {
    const percentage = totalBatches 
      ? Math.round((currentBatch / totalBatches) * 100)
      : totalItems 
        ? Math.round((this.stats.itemsProcessed / totalItems) * 100)
        : 0;
    
    let estimatedTimeRemaining: number | undefined;
    if (this.stats.averageProcessingTime > 0 && totalBatches) {
      const remainingBatches = totalBatches - currentBatch;
      estimatedTimeRemaining = remainingBatches * this.stats.averageProcessingTime;
    }
    
    return {
      currentBatch,
      totalBatches: totalBatches || 0,
      batchSize: batchSize || this.currentBatchSize,
      itemsProcessed: this.stats.itemsProcessed,
      totalItems: totalItems || 0,
      percentage,
      state: this.state,
      estimatedTimeRemaining
    };
  }

  /**
   * Pause batch processing
   */
  pause(): void {
    if (this.state !== BatchProcessorState.PROCESSING) {
      throw new Error('Can only pause when processing');
    }
    
    this.isPaused = true;
    this.state = BatchProcessorState.PAUSED;
    this.pausePromise = new Promise(resolve => {
      this.pauseResolve = resolve;
    });
    
    this.emit('paused');
  }

  /**
   * Resume batch processing
   */
  resume(): void {
    if (this.state !== BatchProcessorState.PAUSED) {
      throw new Error('Can only resume when paused');
    }
    
    this.isPaused = false;
    this.state = BatchProcessorState.PROCESSING;
    
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pausePromise = undefined;
      this.pauseResolve = undefined;
    }
    
    this.emit('resumed');
  }

  /**
   * Check if processing is paused and wait if necessary
   */
  private async checkPause(): Promise<void> {
    if (this.isPaused && this.pausePromise) {
      await this.pausePromise;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): Readonly<BatchStats> {
    return { ...this.stats };
  }

  /**
   * Get current state
   */
  getState(): BatchProcessorState {
    return this.state;
  }

  /**
   * Get current batch size
   */
  getCurrentBatchSize(): number {
    return this.currentBatchSize;
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.state = BatchProcessorState.IDLE;
    this.currentBatchSize = this.config.initialBatchSize;
    this.stats = {
      batchesProcessed: 0,
      itemsProcessed: 0,
      averageProcessingTime: 0,
      currentBatchSize: this.currentBatchSize,
      peakMemoryUsage: 0,
      totalProcessingTime: 0,
      adjustmentCount: 0,
      gcCount: 0
    };
    this.batchTimes = [];
    this.isPaused = false;
    this.pausePromise = undefined;
    this.pauseResolve = undefined;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a batch processor with streaming support
   */
  static createStreamingProcessor<T>(
    config?: BatchProcessorConfig
  ): BatchProcessor<T> {
    return new BatchProcessor<T>({
      ...config,
      autoAdjust: true,
      pauseBetweenBatches: 1, // Small pause to maintain responsiveness
      gcFrequency: 5 // More frequent GC for streaming
    });
  }

  /**
   * Create a batch processor for memory-intensive operations
   */
  static createMemoryOptimized<T>(
    config?: BatchProcessorConfig
  ): BatchProcessor<T> {
    return new BatchProcessor<T>({
      ...config,
      initialBatchSize: 500,
      maxBatchSize: 2000,
      minBatchSize: 100,
      memoryThreshold: 50, // Lower threshold for aggressive memory management
      autoAdjust: true,
      gcFrequency: 3
    });
  }
}

/**
 * Utility function to estimate optimal batch size
 */
export function estimateOptimalBatchSize(
  totalItems: number,
  itemSizeBytes: number,
  memoryLimitMB: number = 100
): number {
  const memoryLimitBytes = memoryLimitMB * 1024 * 1024;
  const optimalBatchSize = Math.floor(memoryLimitBytes / itemSizeBytes);
  
  // Apply reasonable limits
  return Math.max(100, Math.min(5000, optimalBatchSize));
}

/**
 * Batch iterator for memory-efficient iteration
 */
export async function* batchIterator<T>(
  items: T[] | AsyncIterable<T>,
  batchSize: number
): AsyncGenerator<T[], void, unknown> {
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i += batchSize) {
      yield items.slice(i, i + batchSize);
    }
  } else {
    let batch: T[] = [];
    for await (const item of items) {
      batch.push(item);
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length > 0) {
      yield batch;
    }
  }
}

/**
 * Factory function to create a batch processor
 */
export function createBatchProcessor<T>(
  config?: BatchProcessorConfig
): BatchProcessor<T> {
  return new BatchProcessor<T>(config);
}