import { EventEmitter } from 'events';
import * as os from 'os';
import * as v8 from 'v8';
import { poolManager, PoolStats } from '../performance/object-pool';

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Timestamp of measurement */
  timestamp: Date;
  /** Process memory usage */
  processMemory: NodeJS.MemoryUsage;
  /** System memory info */
  systemMemory: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
  /** V8 heap statistics */
  heapStats: v8.HeapInfo;
  /** Memory delta since last measurement */
  delta?: {
    heapUsed: number;
    external: number;
    rss: number;
  };
  /** Custom metrics */
  custom?: Record<string, any>;
  /** Object pool statistics */
  poolStats?: Record<string, PoolStats>;
}

/**
 * Memory threshold configuration
 */
export interface MemoryThresholds {
  /** Warning threshold for heap usage (MB) */
  heapWarning: number;
  /** Critical threshold for heap usage (MB) */
  heapCritical: number;
  /** Warning threshold for system memory usage (percentage) */
  systemWarning: number;
  /** Critical threshold for system memory usage (percentage) */
  systemCritical: number;
}

/**
 * Memory monitor configuration
 */
export interface MemoryMonitorConfig {
  /** Interval for memory checks (milliseconds) */
  interval?: number;
  /** Enable automatic garbage collection */
  autoGC?: boolean;
  /** GC trigger threshold (heap usage percentage) */
  gcThreshold?: number;
  /** Memory thresholds */
  thresholds?: Partial<MemoryThresholds>;
  /** Enable detailed heap snapshots */
  enableSnapshots?: boolean;
  /** Maximum number of stats to keep in history */
  maxHistory?: number;
}

/**
 * Memory alert levels
 */
export enum MemoryAlertLevel {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * Memory alert event
 */
export interface MemoryAlert {
  level: MemoryAlertLevel;
  type: 'heap' | 'system';
  message: string;
  stats: MemoryStats;
  threshold: number;
  actual: number;
}

/**
 * Memory monitor for tracking and managing memory usage
 */
export class MemoryMonitor extends EventEmitter {
  private config: Required<MemoryMonitorConfig>;
  private timer: NodeJS.Timeout | null = null;
  private lastStats: MemoryStats | null = null;
  private statsHistory: MemoryStats[] = [];
  private isMonitoring = false;
  private gcCount = 0;
  private peakHeapUsed = 0;
  private startTime: number;

  constructor(config: MemoryMonitorConfig = {}) {
    super();
    
    this.config = {
      interval: config.interval || 5000,
      autoGC: config.autoGC !== false,
      gcThreshold: config.gcThreshold || 80,
      thresholds: {
        heapWarning: config.thresholds?.heapWarning || 500,
        heapCritical: config.thresholds?.heapCritical || 800,
        systemWarning: config.thresholds?.systemWarning || 80,
        systemCritical: config.thresholds?.systemCritical || 90
      },
      enableSnapshots: config.enableSnapshots || false,
      maxHistory: config.maxHistory || 100
    };
    
    this.startTime = Date.now();
  }

  /**
   * Start monitoring memory
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    this.emit('start');
    
    // Initial measurement
    this.measureMemory();
    
    // Set up interval
    this.timer = setInterval(() => {
      this.measureMemory();
    }, this.config.interval);
  }

  /**
   * Stop monitoring memory
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.emit('stop', this.getReport());
  }

  /**
   * Take a single memory measurement
   */
  async measureMemory(): Promise<MemoryStats> {
    const stats = this.collectStats();
    
    // Calculate delta
    if (this.lastStats) {
      stats.delta = {
        heapUsed: stats.processMemory.heapUsed - this.lastStats.processMemory.heapUsed,
        external: stats.processMemory.external - this.lastStats.processMemory.external,
        rss: stats.processMemory.rss - this.lastStats.processMemory.rss
      };
    }
    
    // Update peak heap usage
    if (stats.processMemory.heapUsed > this.peakHeapUsed) {
      this.peakHeapUsed = stats.processMemory.heapUsed;
    }
    
    // Check thresholds
    this.checkThresholds(stats);
    
    // Auto GC if enabled
    if (this.config.autoGC) {
      this.checkAutoGC(stats);
    }
    
    // Update history
    this.updateHistory(stats);
    this.lastStats = stats;
    
    // Emit update event
    this.emit('update', stats);
    
    return stats;
  }

  /**
   * Collect current memory statistics
   */
  private collectStats(): MemoryStats {
    const processMemory = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const stats: MemoryStats = {
      timestamp: new Date(),
      processMemory,
      systemMemory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percentUsed: (usedMem / totalMem) * 100
      },
      heapStats: v8.getHeapStatistics()
    };
    
    // Include object pool statistics
    try {
      stats.poolStats = poolManager.getAllStats();
    } catch (error) {
      // Ignore errors in pool stats collection
    }
    
    return stats;
  }

  /**
   * Check memory thresholds and emit alerts
   */
  private checkThresholds(stats: MemoryStats): void {
    const heapUsedMB = stats.processMemory.heapUsed / (1024 * 1024);
    const thresholds = this.config.thresholds;
    
    // Check heap thresholds
    if (heapUsedMB >= thresholds.heapCritical) {
      this.emitAlert(MemoryAlertLevel.CRITICAL, 'heap', stats, thresholds.heapCritical, heapUsedMB);
    } else if (heapUsedMB >= thresholds.heapWarning) {
      this.emitAlert(MemoryAlertLevel.WARNING, 'heap', stats, thresholds.heapWarning, heapUsedMB);
    }
    
    // Check system memory thresholds
    if (stats.systemMemory.percentUsed >= thresholds.systemCritical) {
      this.emitAlert(MemoryAlertLevel.CRITICAL, 'system', stats, thresholds.systemCritical, stats.systemMemory.percentUsed);
    } else if (stats.systemMemory.percentUsed >= thresholds.systemWarning) {
      this.emitAlert(MemoryAlertLevel.WARNING, 'system', stats, thresholds.systemWarning, stats.systemMemory.percentUsed);
    }
  }

  /**
   * Emit memory alert
   */
  private emitAlert(
    level: MemoryAlertLevel,
    type: 'heap' | 'system',
    stats: MemoryStats,
    threshold: number,
    actual: number
  ): void {
    const alert: MemoryAlert = {
      level,
      type,
      message: `${type === 'heap' ? 'Heap' : 'System'} memory ${level}: ${actual.toFixed(2)}${type === 'heap' ? 'MB' : '%'} (threshold: ${threshold}${type === 'heap' ? 'MB' : '%'})`,
      stats,
      threshold,
      actual
    };
    
    this.emit('alert', alert);
  }

  /**
   * Check if automatic garbage collection should be triggered
   */
  private checkAutoGC(stats: MemoryStats): void {
    if (!global.gc) {
      return;
    }
    
    const heapUsedPercent = (stats.processMemory.heapUsed / stats.heapStats.heap_size_limit) * 100;
    
    if (heapUsedPercent >= this.config.gcThreshold) {
      const before = stats.processMemory.heapUsed;
      global.gc();
      this.gcCount++;
      
      // Measure after GC
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      
      this.emit('gc', {
        before,
        after,
        freed,
        count: this.gcCount,
        timestamp: new Date()
      });
    }
  }

  /**
   * Update stats history
   */
  private updateHistory(stats: MemoryStats): void {
    this.statsHistory.push(stats);
    
    // Maintain max history size
    if (this.statsHistory.length > this.config.maxHistory) {
      this.statsHistory.shift();
    }
  }

  /**
   * Get current memory stats
   */
  getCurrentStats(): MemoryStats | null {
    return this.lastStats;
  }

  /**
   * Get stats history
   */
  getHistory(): MemoryStats[] {
    return [...this.statsHistory];
  }

  /**
   * Get memory usage report
   */
  getReport(): MemoryReport {
    const current = this.lastStats;
    const history = this.statsHistory;
    
    if (!current || history.length === 0) {
      return {
        current: null,
        peak: null,
        average: null,
        trend: null,
        gcCount: this.gcCount,
        uptime: Date.now() - this.startTime,
        poolStats: poolManager.getAllStats()
      };
    }
    
    // Calculate average
    const avgHeapUsed = history.reduce((sum, stat) => sum + stat.processMemory.heapUsed, 0) / history.length;
    const avgExternal = history.reduce((sum, stat) => sum + stat.processMemory.external, 0) / history.length;
    
    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(history);
    
    return {
      current: {
        heapUsed: current.processMemory.heapUsed,
        external: current.processMemory.external,
        rss: current.processMemory.rss,
        systemPercent: current.systemMemory.percentUsed
      },
      peak: {
        heapUsed: this.peakHeapUsed,
        timestamp: new Date() // TODO: Track actual peak timestamp
      },
      average: {
        heapUsed: avgHeapUsed,
        external: avgExternal
      },
      trend: trend,
      gcCount: this.gcCount,
      uptime: Date.now() - this.startTime,
      poolStats: current.poolStats || poolManager.getAllStats()
    };
  }

  /**
   * Calculate memory usage trend
   */
  private calculateTrend(history: MemoryStats[]): MemoryTrend | null {
    if (history.length < 2) {
      return null;
    }
    
    // Simple trend calculation based on first and last measurements
    const first = history[0];
    const last = history[history.length - 1];
    const duration = last.timestamp.getTime() - first.timestamp.getTime();
    
    if (duration === 0) {
      return null;
    }
    
    const heapChange = last.processMemory.heapUsed - first.processMemory.heapUsed;
    const heapChangePerSecond = (heapChange / duration) * 1000;
    
    return {
      direction: heapChange > 0 ? 'increasing' : heapChange < 0 ? 'decreasing' : 'stable',
      ratePerSecond: heapChangePerSecond,
      predictedIn5Min: last.processMemory.heapUsed + (heapChangePerSecond * 300)
    };
  }

  /**
   * Force garbage collection
   */
  forceGC(): boolean {
    if (!global.gc) {
      return false;
    }
    
    const before = process.memoryUsage().heapUsed;
    global.gc();
    const after = process.memoryUsage().heapUsed;
    
    this.emit('gc', {
      before,
      after,
      freed: before - after,
      count: ++this.gcCount,
      timestamp: new Date(),
      forced: true
    });
    
    return true;
  }

  /**
   * Take heap snapshot (if enabled)
   */
  async takeSnapshot(): Promise<string | null> {
    if (!this.config.enableSnapshots) {
      return null;
    }
    
    try {
      const snapshot = v8.writeHeapSnapshot();
      this.emit('snapshot', snapshot);
      return snapshot;
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Clear stats history
   */
  clearHistory(): void {
    this.statsHistory = [];
    this.lastStats = null;
  }

  /**
   * Get memory monitor status
   */
  getStatus(): MemoryMonitorStatus {
    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      historySize: this.statsHistory.length,
      gcCount: this.gcCount,
      uptime: Date.now() - this.startTime
    };
  }
}

/**
 * Memory report structure
 */
export interface MemoryReport {
  current: {
    heapUsed: number;
    external: number;
    rss: number;
    systemPercent: number;
  } | null;
  peak: {
    heapUsed: number;
    timestamp: Date;
  } | null;
  average: {
    heapUsed: number;
    external: number;
  } | null;
  trend: MemoryTrend | null;
  gcCount: number;
  uptime: number;
  poolStats?: Record<string, PoolStats>;
}

/**
 * Memory trend information
 */
export interface MemoryTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  ratePerSecond: number;
  predictedIn5Min: number;
}

/**
 * Memory monitor status
 */
export interface MemoryMonitorStatus {
  isMonitoring: boolean;
  config: Required<MemoryMonitorConfig>;
  historySize: number;
  gcCount: number;
  uptime: number;
}

/**
 * Create a pre-configured memory monitor for M4 processing
 */
export function createM4MemoryMonitor(): MemoryMonitor {
  return new MemoryMonitor({
    interval: 5000,
    autoGC: true,
    gcThreshold: 75,
    thresholds: {
      heapWarning: 400,
      heapCritical: 700,
      systemWarning: 75,
      systemCritical: 85
    },
    maxHistory: 60 // 5 minutes of history at 5s intervals
  });
}