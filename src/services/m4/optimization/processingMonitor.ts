import { EventEmitter } from 'events';
import { MemoryMonitor, MemoryStats, MemoryAlert, MemoryAlertLevel } from './memoryMonitor';
import { M4ProcessorResult, M4ProgressInfo } from '../../../types/m4Processing';

/**
 * Processing performance metrics
 */
export interface ProcessingMetrics {
  /** Start time of processing */
  startTime: Date;
  /** End time of processing */
  endTime?: Date;
  /** Total rows processed */
  rowsProcessed: number;
  /** Processing rate (rows per second) */
  processingRate: number;
  /** Memory usage at start */
  startMemory: NodeJS.MemoryUsage;
  /** Memory usage at end */
  endMemory?: NodeJS.MemoryUsage;
  /** Peak memory usage during processing */
  peakMemory?: number;
  /** Number of GC cycles during processing */
  gcCycles: number;
  /** Processing phases with timing */
  phases: ProcessingPhase[];
}

/**
 * Processing phase information
 */
export interface ProcessingPhase {
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  rowsProcessed?: number;
  memoryDelta?: number;
}

/**
 * Monitor configuration
 */
export interface ProcessingMonitorConfig {
  /** Enable memory monitoring */
  enableMemoryMonitoring?: boolean;
  /** Enable performance profiling */
  enableProfiling?: boolean;
  /** Memory alert callback */
  onMemoryAlert?: (alert: MemoryAlert) => void;
  /** Progress callback */
  onProgress?: (progress: M4ProgressInfo) => void;
  /** Log function */
  log?: (message: string, level: string) => void;
}

/**
 * Integrated monitor for M4 processing with memory and performance tracking
 */
export class ProcessingMonitor extends EventEmitter {
  private memoryMonitor: MemoryMonitor;
  private config: ProcessingMonitorConfig;
  private metrics: ProcessingMetrics | null = null;
  private currentPhase: ProcessingPhase | null = null;
  private isMonitoring = false;
  private performanceMarks: Map<string, number> = new Map();

  constructor(config: ProcessingMonitorConfig = {}) {
    super();
    
    this.config = {
      enableMemoryMonitoring: config.enableMemoryMonitoring !== false,
      enableProfiling: config.enableProfiling !== false,
      onMemoryAlert: config.onMemoryAlert,
      onProgress: config.onProgress,
      log: config.log || console.log
    };
    
    // Initialize memory monitor
    this.memoryMonitor = new MemoryMonitor({
      interval: 2000, // More frequent checks during processing
      autoGC: true,
      gcThreshold: 70, // More aggressive GC during processing
      thresholds: {
        heapWarning: 400,
        heapCritical: 700,
        systemWarning: 75,
        systemCritical: 85
      }
    });
    
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Memory monitor events
    this.memoryMonitor.on('alert', (alert: MemoryAlert) => {
      this.handleMemoryAlert(alert);
    });
    
    this.memoryMonitor.on('gc', (gcInfo) => {
      if (this.metrics) {
        this.metrics.gcCycles++;
      }
      this.emit('gc', gcInfo);
      this.log(`GC triggered: freed ${(gcInfo.freed / 1024 / 1024).toFixed(2)} MB`, 'info');
    });
    
    this.memoryMonitor.on('update', (stats: MemoryStats) => {
      this.updatePeakMemory(stats);
    });
  }

  /**
   * Start monitoring
   */
  startMonitoring(taskName: string = 'M4 Processing'): void {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    this.metrics = {
      startTime: new Date(),
      rowsProcessed: 0,
      processingRate: 0,
      startMemory: process.memoryUsage(),
      gcCycles: 0,
      phases: []
    };
    
    if (this.config.enableMemoryMonitoring) {
      this.memoryMonitor.start();
    }
    
    if (this.config.enableProfiling) {
      this.performanceMarks.clear();
      this.mark('start');
    }
    
    this.log(`Started monitoring for: ${taskName}`, 'info');
    this.emit('start', taskName);
  }

  /**
   * Stop monitoring and get final report
   */
  stopMonitoring(): ProcessingMetrics | null {
    if (!this.isMonitoring || !this.metrics) {
      return null;
    }
    
    this.isMonitoring = false;
    this.metrics.endTime = new Date();
    this.metrics.endMemory = process.memoryUsage();
    
    // Calculate final metrics
    const duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
    this.metrics.processingRate = duration > 0 
      ? (this.metrics.rowsProcessed / duration) * 1000 
      : 0;
    
    // End current phase if any
    if (this.currentPhase) {
      this.endPhase();
    }
    
    if (this.config.enableMemoryMonitoring) {
      this.memoryMonitor.stop();
    }
    
    const report = { ...this.metrics };
    this.emit('stop', report);
    
    // Log summary
    this.logSummary(report);
    
    return report;
  }

  /**
   * Start a new processing phase
   */
  startPhase(phaseName: string): void {
    if (!this.isMonitoring || !this.metrics) {
      return;
    }
    
    // End current phase if any
    if (this.currentPhase) {
      this.endPhase();
    }
    
    this.currentPhase = {
      name: phaseName,
      startTime: new Date()
    };
    
    if (this.config.enableProfiling) {
      this.mark(`phase_${phaseName}_start`);
    }
    
    this.emit('phaseStart', phaseName);
  }

  /**
   * End current processing phase
   */
  endPhase(): void {
    if (!this.currentPhase || !this.metrics) {
      return;
    }
    
    this.currentPhase.endTime = new Date();
    this.currentPhase.duration = 
      this.currentPhase.endTime.getTime() - this.currentPhase.startTime.getTime();
    
    if (this.config.enableProfiling) {
      this.mark(`phase_${this.currentPhase.name}_end`);
    }
    
    this.metrics.phases.push({ ...this.currentPhase });
    this.emit('phaseEnd', this.currentPhase);
    
    this.currentPhase = null;
  }

  /**
   * Update progress information
   */
  updateProgress(progress: M4ProgressInfo): void {
    if (!this.isMonitoring || !this.metrics) {
      return;
    }
    
    // Update rows processed
    if (progress.current) {
      this.metrics.rowsProcessed = progress.current;
    }
    
    // Forward to callback if provided
    if (this.config.onProgress) {
      this.config.onProgress(progress);
    }
    
    this.emit('progress', progress);
  }

  /**
   * Handle memory alerts
   */
  private handleMemoryAlert(alert: MemoryAlert): void {
    // Log alert
    const logLevel = alert.level === MemoryAlertLevel.CRITICAL ? 'error' : 'warn';
    this.log(alert.message, logLevel);
    
    // Forward to callback if provided
    if (this.config.onMemoryAlert) {
      this.config.onMemoryAlert(alert);
    }
    
    // Emit alert event
    this.emit('memoryAlert', alert);
    
    // Take action on critical alerts
    if (alert.level === MemoryAlertLevel.CRITICAL) {
      this.handleCriticalMemory(alert);
    }
  }

  /**
   * Handle critical memory situation
   */
  private handleCriticalMemory(alert: MemoryAlert): void {
    this.log('Critical memory alert - attempting to free memory', 'error');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.log('Forced garbage collection', 'info');
    }
    
    // Emit critical event for external handling
    this.emit('criticalMemory', alert);
  }

  /**
   * Update peak memory if needed
   */
  private updatePeakMemory(stats: MemoryStats): void {
    if (!this.metrics) {
      return;
    }
    
    const currentHeap = stats.processMemory.heapUsed;
    if (!this.metrics.peakMemory || currentHeap > this.metrics.peakMemory) {
      this.metrics.peakMemory = currentHeap;
    }
  }

  /**
   * Mark performance timing
   */
  private mark(name: string): void {
    this.performanceMarks.set(name, performance.now());
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark: string): number | null {
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);
    
    if (start === undefined || end === undefined) {
      return null;
    }
    
    const duration = end - start;
    this.emit('measure', { name, duration, startMark, endMark });
    return duration;
  }

  /**
   * Log message with proper formatting
   */
  private log(message: string, level: string): void {
    if (this.config.log) {
      this.config.log(`[ProcessingMonitor] ${message}`, level);
    }
  }

  /**
   * Log processing summary
   */
  private logSummary(metrics: ProcessingMetrics): void {
    const duration = metrics.endTime 
      ? metrics.endTime.getTime() - metrics.startTime.getTime()
      : 0;
    
    const memoryUsed = metrics.endMemory 
      ? (metrics.endMemory.heapUsed - metrics.startMemory.heapUsed) / (1024 * 1024)
      : 0;
    
    const peakMemoryMB = metrics.peakMemory 
      ? metrics.peakMemory / (1024 * 1024)
      : 0;
    
    this.log('=== Processing Summary ===', 'info');
    this.log(`Duration: ${(duration / 1000).toFixed(2)}s`, 'info');
    this.log(`Rows processed: ${metrics.rowsProcessed}`, 'info');
    this.log(`Processing rate: ${metrics.processingRate.toFixed(0)} rows/sec`, 'info');
    this.log(`Memory delta: ${memoryUsed.toFixed(2)} MB`, 'info');
    this.log(`Peak memory: ${peakMemoryMB.toFixed(2)} MB`, 'info');
    this.log(`GC cycles: ${metrics.gcCycles}`, 'info');
    
    // Log phase details
    if (metrics.phases.length > 0) {
      this.log('--- Processing Phases ---', 'info');
      metrics.phases.forEach(phase => {
        if (phase.duration) {
          this.log(`${phase.name}: ${(phase.duration / 1000).toFixed(2)}s`, 'info');
        }
      });
    }
  }

  /**
   * Get current memory stats
   */
  getCurrentMemoryStats(): MemoryStats | null {
    return this.memoryMonitor.getCurrentStats();
  }

  /**
   * Get memory report
   */
  getMemoryReport(): any {
    return this.memoryMonitor.getReport();
  }

  /**
   * Force garbage collection
   */
  forceGC(): boolean {
    return this.memoryMonitor.forceGC();
  }

  /**
   * Create monitor with processor integration
   */
  static createForProcessor(
    onProgress?: (info: M4ProgressInfo) => void,
    log?: (message: string, level: string) => void
  ): ProcessingMonitor {
    return new ProcessingMonitor({
      enableMemoryMonitoring: true,
      enableProfiling: true,
      onProgress,
      log,
      onMemoryAlert: (alert) => {
        // Default alert handling
        if (alert.level === MemoryAlertLevel.CRITICAL) {
          console.error(`CRITICAL MEMORY ALERT: ${alert.message}`);
        }
      }
    });
  }
}

/**
 * Decorator to add monitoring to async functions
 */
export function monitored(phaseName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      const monitor = (this as any).monitor as ProcessingMonitor | undefined;
      
      if (monitor && phaseName) {
        monitor.startPhase(phaseName);
      }
      
      try {
        const result = await originalMethod.apply(this, args);
        
        if (monitor && phaseName) {
          monitor.endPhase();
        }
        
        return result;
      } catch (error) {
        if (monitor && phaseName) {
          monitor.endPhase();
        }
        throw error;
      }
    };
    
    return descriptor;
  };
}