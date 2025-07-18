import { EventEmitter } from 'events';
import * as os from 'os';

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Total system memory (bytes) */
  totalMemory: number;
  /** Free system memory (bytes) */
  freeMemory: number;
  /** Process heap used (bytes) */
  heapUsed: number;
  /** Process heap total (bytes) */
  heapTotal: number;
  /** Process RSS (bytes) */
  rss: number;
  /** External memory (bytes) */
  external: number;
  /** Array buffers (bytes) */
  arrayBuffers: number;
  /** Memory usage percentage */
  usagePercentage: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Memory alert levels
 */
export enum MemoryAlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * Memory alert
 */
export interface MemoryAlert {
  level: MemoryAlertLevel;
  message: string;
  stats: MemoryStats;
  threshold: number;
}

/**
 * Memory monitor configuration
 */
export interface MemoryMonitorConfig {
  /** Monitoring interval (ms) */
  interval?: number;
  /** Warning threshold (percentage) */
  warningThreshold?: number;
  /** Critical threshold (percentage) */
  criticalThreshold?: number;
  /** Heap usage warning threshold (MB) */
  heapWarningThreshold?: number;
  /** Heap usage critical threshold (MB) */
  heapCriticalThreshold?: number;
  /** Enable automatic GC on critical */
  autoGC?: boolean;
  /** Emit detailed stats */
  emitStats?: boolean;
}

/**
 * Memory usage trend
 */
export interface MemoryTrend {
  /** Average memory usage over time */
  averageUsage: number;
  /** Peak memory usage */
  peakUsage: number;
  /** Minimum memory usage */
  minUsage: number;
  /** Memory growth rate (bytes/second) */
  growthRate: number;
  /** Number of GC runs */
  gcCount: number;
  /** Time period (ms) */
  period: number;
}

/**
 * Memory monitor for tracking and alerting on memory usage
 */
export class MemoryMonitor extends EventEmitter {
  private config: Required<MemoryMonitorConfig>;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;
  private history: MemoryStats[] = [];
  private maxHistorySize: number = 100;
  private gcCount: number = 0;
  private lastGCTime: number = 0;
  private startMemory?: MemoryStats;

  constructor(config: MemoryMonitorConfig = {}) {
    super();
    
    this.config = {
      interval: config.interval || 5000, // 5 seconds
      warningThreshold: config.warningThreshold || 80, // 80%
      criticalThreshold: config.criticalThreshold || 90, // 90%
      heapWarningThreshold: config.heapWarningThreshold || 500, // 500MB
      heapCriticalThreshold: config.heapCriticalThreshold || 800, // 800MB
      autoGC: config.autoGC !== false,
      emitStats: config.emitStats !== false
    };
  }

  /**
   * Start monitoring memory
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.startMemory = this.getCurrentStats();
    this.history = [this.startMemory];
    
    this.emit('start', this.startMemory);
    
    this.monitoringInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.interval);
    
    // Initial check
    this.checkMemory();
  }

  /**
   * Stop monitoring memory
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    const finalStats = this.getCurrentStats();
    this.emit('stop', {
      startMemory: this.startMemory,
      finalMemory: finalStats,
      trend: this.getTrend()
    });
  }

  /**
   * Get current memory statistics
   */
  getCurrentStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      totalMemory: totalMem,
      freeMemory: freeMem,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      usagePercentage: (usedMem / totalMem) * 100,
      timestamp: new Date()
    };
  }

  /**
   * Check memory and emit alerts
   */
  private checkMemory(): void {
    const stats = this.getCurrentStats();
    
    // Add to history
    this.history.push(stats);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // Emit stats if enabled
    if (this.config.emitStats) {
      this.emit('stats', stats);
    }
    
    // Check thresholds
    this.checkThresholds(stats);
  }

  /**
   * Check memory thresholds and emit alerts
   */
  private checkThresholds(stats: MemoryStats): void {
    const heapUsedMB = stats.heapUsed / (1024 * 1024);
    
    // Check system memory percentage
    if (stats.usagePercentage >= this.config.criticalThreshold) {
      this.emitAlert(MemoryAlertLevel.CRITICAL, 
        `System memory usage critical: ${stats.usagePercentage.toFixed(1)}%`,
        stats, this.config.criticalThreshold);
      
      if (this.config.autoGC) {
        this.triggerGC();
      }
    } else if (stats.usagePercentage >= this.config.warningThreshold) {
      this.emitAlert(MemoryAlertLevel.WARNING,
        `System memory usage high: ${stats.usagePercentage.toFixed(1)}%`,
        stats, this.config.warningThreshold);
    }
    
    // Check heap usage
    if (heapUsedMB >= this.config.heapCriticalThreshold) {
      this.emitAlert(MemoryAlertLevel.CRITICAL,
        `Heap memory usage critical: ${heapUsedMB.toFixed(1)}MB`,
        stats, this.config.heapCriticalThreshold);
      
      if (this.config.autoGC) {
        this.triggerGC();
      }
    } else if (heapUsedMB >= this.config.heapWarningThreshold) {
      this.emitAlert(MemoryAlertLevel.WARNING,
        `Heap memory usage high: ${heapUsedMB.toFixed(1)}MB`,
        stats, this.config.heapWarningThreshold);
    }
    
    // Check for rapid growth
    const trend = this.getTrend();
    if (trend.growthRate > 10 * 1024 * 1024) { // 10MB/s
      this.emitAlert(MemoryAlertLevel.WARNING,
        `Rapid memory growth detected: ${(trend.growthRate / (1024 * 1024)).toFixed(1)}MB/s`,
        stats, 0);
    }
  }

  /**
   * Emit memory alert
   */
  private emitAlert(
    level: MemoryAlertLevel,
    message: string,
    stats: MemoryStats,
    threshold: number
  ): void {
    const alert: MemoryAlert = {
      level,
      message,
      stats,
      threshold
    };
    
    this.emit('alert', alert);
    this.emit(level, alert);
  }

  /**
   * Trigger garbage collection
   */
  private triggerGC(): void {
    if (!global.gc) {
      this.emit('warning', 'Garbage collection not available. Run with --expose-gc flag.');
      return;
    }
    
    const now = Date.now();
    if (now - this.lastGCTime < 10000) { // Prevent GC spam (10s cooldown)
      return;
    }
    
    const beforeStats = this.getCurrentStats();
    global.gc();
    const afterStats = this.getCurrentStats();
    
    this.gcCount++;
    this.lastGCTime = now;
    
    const freedMemory = beforeStats.heapUsed - afterStats.heapUsed;
    const freedMB = freedMemory / (1024 * 1024);
    
    this.emit('gc', {
      beforeMemory: beforeStats.heapUsed,
      afterMemory: afterStats.heapUsed,
      freed: freedMemory,
      freedMB: freedMB,
      gcCount: this.gcCount
    });
  }

  /**
   * Get memory usage trend
   */
  getTrend(): MemoryTrend {
    if (this.history.length < 2) {
      return {
        averageUsage: this.history[0]?.heapUsed || 0,
        peakUsage: this.history[0]?.heapUsed || 0,
        minUsage: this.history[0]?.heapUsed || 0,
        growthRate: 0,
        gcCount: this.gcCount,
        period: 0
      };
    }
    
    const heapUsages = this.history.map(s => s.heapUsed);
    const firstStat = this.history[0];
    const lastStat = this.history[this.history.length - 1];
    const timeDiff = lastStat.timestamp.getTime() - firstStat.timestamp.getTime();
    
    const averageUsage = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;
    const peakUsage = Math.max(...heapUsages);
    const minUsage = Math.min(...heapUsages);
    const growthRate = timeDiff > 0 
      ? (lastStat.heapUsed - firstStat.heapUsed) / (timeDiff / 1000)
      : 0;
    
    return {
      averageUsage,
      peakUsage,
      minUsage,
      growthRate,
      gcCount: this.gcCount,
      period: timeDiff
    };
  }

  /**
   * Get memory snapshot
   */
  getSnapshot(): {
    current: MemoryStats;
    trend: MemoryTrend;
    history: MemoryStats[];
  } {
    return {
      current: this.getCurrentStats(),
      trend: this.getTrend(),
      history: [...this.history]
    };
  }

  /**
   * Format memory size
   */
  static formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Create a summary report
   */
  getSummary(): string {
    const stats = this.getCurrentStats();
    const trend = this.getTrend();
    const startMem = this.startMemory?.heapUsed || 0;
    
    return `Memory Monitor Summary:
    Current Heap: ${MemoryMonitor.formatBytes(stats.heapUsed)}
    Peak Heap: ${MemoryMonitor.formatBytes(trend.peakUsage)}
    Average Heap: ${MemoryMonitor.formatBytes(trend.averageUsage)}
    Growth Rate: ${MemoryMonitor.formatBytes(Math.abs(trend.growthRate))}/s
    System Usage: ${stats.usagePercentage.toFixed(1)}%
    GC Runs: ${this.gcCount}
    Total Growth: ${MemoryMonitor.formatBytes(stats.heapUsed - startMem)}`;
  }

  /**
   * Is memory usage healthy
   */
  isHealthy(): boolean {
    const stats = this.getCurrentStats();
    const heapUsedMB = stats.heapUsed / (1024 * 1024);
    
    return stats.usagePercentage < this.config.warningThreshold &&
           heapUsedMB < this.config.heapWarningThreshold;
  }
}

/**
 * Global memory monitor instance
 */
export const globalMemoryMonitor = new MemoryMonitor({
  interval: 10000, // 10 seconds
  emitStats: false // Don't emit stats by default
});

/**
 * Memory monitoring decorator
 */
export function monitorMemory(config?: MemoryMonitorConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitor = new MemoryMonitor(config);

    descriptor.value = async function (...args: any[]) {
      monitor.start();
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        monitor.stop();
        const summary = monitor.getSummary();
        console.log(`Memory usage for ${propertyKey}:\n${summary}`);
      }
    };

    return descriptor;
  };
}

/**
 * Create a scoped memory monitor
 */
export function createMemoryMonitor(name: string, config?: MemoryMonitorConfig): MemoryMonitor {
  const monitor = new MemoryMonitor(config);
  
  monitor.on('alert', (alert) => {
    console.warn(`[${name}] Memory Alert:`, alert.message);
  });
  
  return monitor;
}