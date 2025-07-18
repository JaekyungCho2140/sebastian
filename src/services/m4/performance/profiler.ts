import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

/**
 * Performance measurement entry
 */
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  children: PerformanceMeasurement[];
  parent?: PerformanceMeasurement;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  name: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  slowestOccurrences: Array<{
    time: number;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  startTime: string;
  endTime: string;
  totalDuration: number;
  measurements: PerformanceMeasurement[];
  statistics: Record<string, PerformanceStats>;
  slowOperations: Array<{
    name: string;
    duration: number;
    path: string[];
    metadata?: Record<string, any>;
  }>;
  timeline: Array<{
    timestamp: number;
    event: string;
    duration?: number;
  }>;
  recommendations: string[];
}

/**
 * Profiler configuration
 */
export interface ProfilerConfig {
  /** Enable profiling (can be disabled in production) */
  enabled?: boolean;
  /** Slow operation threshold in milliseconds */
  slowThreshold?: number;
  /** Maximum number of measurements to keep in memory */
  maxMeasurements?: number;
  /** Track memory usage alongside timing */
  trackMemory?: boolean;
  /** Auto-generate report on stop */
  autoReport?: boolean;
  /** Report output directory */
  reportDir?: string;
  /** Include stack traces for slow operations */
  includeStackTraces?: boolean;
  /** Minimum duration to include in report (ms) */
  minDuration?: number;
}

/**
 * Performance profiler for detailed performance analysis
 */
export class PerformanceProfiler extends EventEmitter {
  private config: Required<ProfilerConfig>;
  private measurements: Map<string, PerformanceMeasurement[]> = new Map();
  private activeMeasurements: Map<string, PerformanceMeasurement> = new Map();
  private rootMeasurement: PerformanceMeasurement | null = null;
  private currentMeasurement: PerformanceMeasurement | null = null;
  private startTime: number = 0;
  private timeline: Array<{ timestamp: number; event: string; duration?: number }> = [];
  private memorySnapshots: Map<string, NodeJS.MemoryUsage> = new Map();

  constructor(config: ProfilerConfig = {}) {
    super();
    
    this.config = {
      enabled: config.enabled !== false,
      slowThreshold: config.slowThreshold || 100,
      maxMeasurements: config.maxMeasurements || 10000,
      trackMemory: config.trackMemory || false,
      autoReport: config.autoReport !== false,
      reportDir: config.reportDir || './',
      includeStackTraces: config.includeStackTraces || false,
      minDuration: config.minDuration || 0.1
    };
  }

  /**
   * Start profiling session
   */
  start(name: string = 'Main'): void {
    if (!this.config.enabled) return;

    this.startTime = performance.now();
    this.rootMeasurement = {
      name,
      startTime: this.startTime,
      children: [],
      metadata: {
        startDate: new Date().toISOString()
      }
    };
    
    this.currentMeasurement = this.rootMeasurement;
    this.activeMeasurements.set(name, this.rootMeasurement);
    
    this.addTimelineEvent('Profiling started', name);
    this.emit('start', name);
  }

  /**
   * Stop profiling session
   */
  async stop(): Promise<PerformanceReport | null> {
    if (!this.config.enabled || !this.rootMeasurement) return null;

    // End root measurement
    this.end(this.rootMeasurement.name);
    
    const report = this.generateReport();
    
    if (this.config.autoReport) {
      await this.saveReport(report);
    }
    
    this.emit('stop', report);
    this.reset();
    
    return report;
  }

  /**
   * Begin a measurement
   */
  begin(name: string, metadata?: Record<string, any>): string {
    if (!this.config.enabled) return '';

    const id = `${name}_${Date.now()}_${Math.random()}`;
    const measurement: PerformanceMeasurement = {
      name,
      startTime: performance.now(),
      children: [],
      metadata: metadata || {},
      parent: this.currentMeasurement || undefined
    };

    // Track memory if enabled
    if (this.config.trackMemory) {
      this.memorySnapshots.set(id, process.memoryUsage());
    }

    // Add to parent's children
    if (this.currentMeasurement) {
      this.currentMeasurement.children.push(measurement);
    }

    // Set as current for nested measurements
    this.currentMeasurement = measurement;
    this.activeMeasurements.set(id, measurement);
    
    this.addTimelineEvent('Started', name);
    
    return id;
  }

  /**
   * End a measurement
   */
  end(idOrName: string): void {
    if (!this.config.enabled) return;

    // Find measurement by ID or name
    let measurement: PerformanceMeasurement | undefined;
    let id = idOrName;
    
    measurement = this.activeMeasurements.get(id);
    
    if (!measurement) {
      // Try to find by name in reverse order (LIFO)
      for (const [key, m] of Array.from(this.activeMeasurements.entries()).reverse()) {
        if (m.name === idOrName) {
          measurement = m;
          id = key;
          break;
        }
      }
    }

    if (!measurement) {
      console.warn(`No active measurement found for: ${idOrName}`);
      return;
    }

    measurement.endTime = performance.now();
    measurement.duration = measurement.endTime - measurement.startTime;

    // Track memory delta if enabled
    if (this.config.trackMemory) {
      const startMemory = this.memorySnapshots.get(id);
      if (startMemory) {
        const endMemory = process.memoryUsage();
        measurement.metadata = {
          ...measurement.metadata,
          memoryDelta: {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external,
            rss: endMemory.rss - startMemory.rss
          }
        };
        this.memorySnapshots.delete(id);
      }
    }

    // Store measurement
    const measurements = this.measurements.get(measurement.name) || [];
    measurements.push(measurement);
    this.measurements.set(measurement.name, measurements);

    // Check if slow
    if (measurement.duration > this.config.slowThreshold) {
      this.handleSlowOperation(measurement);
    }

    // Update current measurement to parent
    if (measurement.parent) {
      this.currentMeasurement = measurement.parent;
    }

    this.activeMeasurements.delete(id);
    this.addTimelineEvent('Ended', measurement.name, measurement.duration);
    
    // Emit measurement event
    this.emit('measurement', measurement);

    // Clean up old measurements if needed
    this.cleanupMeasurements();
  }

  /**
   * Measure a synchronous function
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.config.enabled) return fn();

    const id = this.begin(name, metadata);
    try {
      return fn();
    } finally {
      this.end(id);
    }
  }

  /**
   * Measure an asynchronous function
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.config.enabled) return fn();

    const id = this.begin(name, metadata);
    try {
      return await fn();
    } finally {
      this.end(id);
    }
  }

  /**
   * Mark a point in time
   */
  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const timestamp = performance.now();
    this.addTimelineEvent('Mark', name);
    
    this.emit('mark', {
      name,
      timestamp,
      metadata
    });
  }

  /**
   * Handle slow operation
   */
  private handleSlowOperation(measurement: PerformanceMeasurement): void {
    const path = this.getMeasurementPath(measurement);
    
    const slowOp = {
      name: measurement.name,
      duration: measurement.duration!,
      path,
      metadata: measurement.metadata,
      stack: this.config.includeStackTraces ? new Error().stack : undefined
    };

    this.emit('slowOperation', slowOp);
  }

  /**
   * Get measurement path
   */
  private getMeasurementPath(measurement: PerformanceMeasurement): string[] {
    const path: string[] = [];
    let current: PerformanceMeasurement | undefined = measurement;
    
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Add timeline event
   */
  private addTimelineEvent(event: string, name: string, duration?: number): void {
    this.timeline.push({
      timestamp: performance.now() - this.startTime,
      event: `${event}: ${name}`,
      duration
    });
  }

  /**
   * Clean up old measurements
   */
  private cleanupMeasurements(): void {
    let totalMeasurements = 0;
    
    for (const measurements of this.measurements.values()) {
      totalMeasurements += measurements.length;
    }
    
    if (totalMeasurements > this.config.maxMeasurements) {
      // Remove oldest measurements
      for (const [name, measurements] of this.measurements.entries()) {
        if (measurements.length > 100) {
          this.measurements.set(name, measurements.slice(-100));
        }
      }
    }
  }

  /**
   * Generate performance report
   */
  private generateReport(): PerformanceReport {
    const endTime = performance.now();
    const statistics: Record<string, PerformanceStats> = {};
    const slowOperations: PerformanceReport['slowOperations'] = [];

    // Calculate statistics
    for (const [name, measurements] of this.measurements.entries()) {
      const durations = measurements
        .filter(m => m.duration !== undefined && m.duration >= this.config.minDuration)
        .map(m => m.duration!);
      
      if (durations.length === 0) continue;

      const total = durations.reduce((sum, d) => sum + d, 0);
      const avg = total / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      // Calculate standard deviation
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      // Find slowest occurrences
      const slowest = measurements
        .filter(m => m.duration !== undefined)
        .sort((a, b) => b.duration! - a.duration!)
        .slice(0, 5)
        .map(m => ({
          time: m.duration!,
          metadata: m.metadata
        }));

      statistics[name] = {
        name,
        count: durations.length,
        totalTime: total,
        averageTime: avg,
        minTime: min,
        maxTime: max,
        standardDeviation: stdDev,
        slowestOccurrences: slowest
      };

      // Collect slow operations
      measurements
        .filter(m => m.duration && m.duration > this.config.slowThreshold)
        .forEach(m => {
          slowOperations.push({
            name: m.name,
            duration: m.duration!,
            path: this.getMeasurementPath(m),
            metadata: m.metadata
          });
        });
    }

    // Sort slow operations by duration
    slowOperations.sort((a, b) => b.duration - a.duration);

    // Generate recommendations
    const recommendations = this.generateRecommendations(statistics, slowOperations);

    return {
      startTime: new Date(Date.now() - (endTime - this.startTime)).toISOString(),
      endTime: new Date().toISOString(),
      totalDuration: endTime - this.startTime,
      measurements: this.rootMeasurement ? [this.rootMeasurement] : [],
      statistics,
      slowOperations: slowOperations.slice(0, 20), // Top 20 slow operations
      timeline: this.timeline,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    statistics: Record<string, PerformanceStats>,
    slowOperations: PerformanceReport['slowOperations']
  ): string[] {
    const recommendations: string[] = [];

    // Check for operations with high standard deviation
    for (const [name, stats] of Object.entries(statistics)) {
      if (stats.standardDeviation > stats.averageTime * 0.5) {
        recommendations.push(
          `"${name}" has high variance (σ=${stats.standardDeviation.toFixed(2)}ms). ` +
          `Consider investigating inconsistent performance.`
        );
      }
    }

    // Check for frequently slow operations
    const slowOpCounts = new Map<string, number>();
    slowOperations.forEach(op => {
      slowOpCounts.set(op.name, (slowOpCounts.get(op.name) || 0) + 1);
    });

    for (const [name, count] of slowOpCounts.entries()) {
      if (count > 5) {
        recommendations.push(
          `"${name}" is frequently slow (${count} occurrences > ${this.config.slowThreshold}ms). ` +
          `Consider optimization.`
        );
      }
    }

    // Check for deeply nested operations
    const deepOperations = this.findDeepOperations(this.rootMeasurement);
    if (deepOperations.length > 0) {
      recommendations.push(
        `Found ${deepOperations.length} operations with depth > 5. ` +
        `Consider flattening the operation hierarchy.`
      );
    }

    // File operation specific recommendations
    const fileOps = Object.entries(statistics).filter(([name]) => 
      name.toLowerCase().includes('file') || name.toLowerCase().includes('read') || name.toLowerCase().includes('write')
    );
    
    const slowFileOps = fileOps.filter(([_, stats]) => stats.averageTime > 50);
    if (slowFileOps.length > 0) {
      recommendations.push(
        `File operations are slow: ${slowFileOps.map(([name]) => name).join(', ')}. ` +
        `Consider using streaming or batch processing.`
      );
    }

    // Memory related recommendations
    if (this.config.trackMemory) {
      const highMemoryOps = this.findHighMemoryOperations();
      if (highMemoryOps.length > 0) {
        recommendations.push(
          `Found ${highMemoryOps.length} operations with high memory usage (>10MB). ` +
          `Consider memory optimization.`
        );
      }
    }

    return recommendations;
  }

  /**
   * Find deeply nested operations
   */
  private findDeepOperations(
    measurement: PerformanceMeasurement | null, 
    depth: number = 0
  ): PerformanceMeasurement[] {
    if (!measurement) return [];

    const deep: PerformanceMeasurement[] = [];
    
    if (depth > 5) {
      deep.push(measurement);
    }

    for (const child of measurement.children) {
      deep.push(...this.findDeepOperations(child, depth + 1));
    }

    return deep;
  }

  /**
   * Find high memory operations
   */
  private findHighMemoryOperations(): PerformanceMeasurement[] {
    const highMemOps: PerformanceMeasurement[] = [];
    
    for (const measurements of this.measurements.values()) {
      for (const m of measurements) {
        if (m.metadata?.memoryDelta?.heapUsed > 10 * 1024 * 1024) { // 10MB
          highMemOps.push(m);
        }
      }
    }

    return highMemOps;
  }

  /**
   * Save report to file
   */
  private async saveReport(report: PerformanceReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-report-${timestamp}.json`;
    const filepath = path.join(this.config.reportDir, filename);

    try {
      await fs.mkdir(this.config.reportDir, { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      // Also generate a human-readable summary
      const summaryFilename = `performance-summary-${timestamp}.txt`;
      const summaryPath = path.join(this.config.reportDir, summaryFilename);
      await fs.writeFile(summaryPath, this.generateTextSummary(report));
      
      this.emit('reportSaved', { filepath, summaryPath });
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Generate text summary of report
   */
  private generateTextSummary(report: PerformanceReport): string {
    let summary = `Performance Report
==================
Start Time: ${report.startTime.toLocaleString()}
End Time: ${report.endTime.toLocaleString()}
Total Duration: ${report.totalDuration.toFixed(2)}ms

Top Slow Operations (>${this.config.slowThreshold}ms):
`;

    report.slowOperations.slice(0, 10).forEach((op, i) => {
      summary += `${i + 1}. ${op.name}: ${op.duration.toFixed(2)}ms\n`;
      summary += `   Path: ${op.path.join(' > ')}\n`;
    });

    summary += `\nOperation Statistics:\n`;
    Object.values(report.statistics)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10)
      .forEach(stats => {
        summary += `\n${stats.name}:\n`;
        summary += `  Count: ${stats.count}\n`;
        summary += `  Total: ${stats.totalTime.toFixed(2)}ms\n`;
        summary += `  Average: ${stats.averageTime.toFixed(2)}ms\n`;
        summary += `  Min/Max: ${stats.minTime.toFixed(2)}ms / ${stats.maxTime.toFixed(2)}ms\n`;
      });

    if (report.recommendations.length > 0) {
      summary += `\nRecommendations:\n`;
      report.recommendations.forEach((rec, i) => {
        summary += `${i + 1}. ${rec}\n`;
      });
    }

    return summary;
  }

  /**
   * Reset profiler state
   */
  private reset(): void {
    this.measurements.clear();
    this.activeMeasurements.clear();
    this.memorySnapshots.clear();
    this.timeline = [];
    this.rootMeasurement = null;
    this.currentMeasurement = null;
    this.startTime = 0;
  }

  /**
   * Get current statistics
   */
  getStatistics(): Record<string, PerformanceStats> {
    const statistics: Record<string, PerformanceStats> = {};
    
    for (const [name, measurements] of this.measurements.entries()) {
      const durations = measurements
        .filter(m => m.duration !== undefined)
        .map(m => m.duration!);
      
      if (durations.length === 0) continue;

      const total = durations.reduce((sum, d) => sum + d, 0);
      const avg = total / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      statistics[name] = {
        name,
        count: durations.length,
        totalTime: total,
        averageTime: avg,
        minTime: min,
        maxTime: max,
        standardDeviation: 0, // Simplified for live stats
        slowestOccurrences: []
      };
    }

    return statistics;
  }

  /**
   * Check if profiling is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

/**
 * Global profiler instance
 */
export const globalProfiler = new PerformanceProfiler({
  enabled: process.env.NODE_ENV !== 'production',
  slowThreshold: 100,
  trackMemory: true,
  includeStackTraces: process.env.NODE_ENV === 'development'
});

/**
 * Profiler decorator for methods
 */
export function profile(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const measurementName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      if (originalMethod.constructor.name === 'AsyncFunction') {
        return globalProfiler.measureAsync(measurementName, () => originalMethod.apply(this, args));
      } else {
        return globalProfiler.measure(measurementName, () => originalMethod.apply(this, args));
      }
    };

    return descriptor;
  };
}

/**
 * Create a scoped profiler
 */
export function createProfiler(name: string, config?: ProfilerConfig): PerformanceProfiler {
  const profiler = new PerformanceProfiler(config);
  profiler.start(name);
  return profiler;
}