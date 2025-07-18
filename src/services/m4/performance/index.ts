/**
 * Performance monitoring and optimization exports
 */

// Core performance monitoring
export * from './profiler';
export * from './memory-monitor';

// Object pooling
export * from './object-pool';

// Batch processing
export * from './batch-processor';

// Benchmarking
export * from './benchmark-suite';

// Re-export commonly used items
export { 
  globalProfiler, 
  createProfiler, 
  profile 
} from './profiler';

export { 
  globalMemoryMonitor, 
  createMemoryMonitor, 
  monitorMemory 
} from './memory-monitor';

export { 
  poolManager,
  ObjectPool,
  RowObjectPool,
  ArrayPool,
  MapPool,
  StringBuilderPool 
} from './object-pool';

export {
  BatchProcessor,
  BatchProcessorState,
  createBatchProcessor
} from './batch-processor';

export {
  BenchmarkSuite,
  createBenchmarkSuite,
  runDefaultBenchmarks
} from './benchmark-suite';