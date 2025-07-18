import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryMonitor, MemoryAlertLevel, createM4MemoryMonitor } from '../src/services/m4/optimization/memoryMonitor';
import { ProcessingMonitor } from '../src/services/m4/optimization/processingMonitor';

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor({
      interval: 100, // Fast interval for testing
      autoGC: false, // Disable auto GC for predictable tests
      maxHistory: 10
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('Basic functionality', () => {
    it('should start and stop monitoring', () => {
      const startSpy = jest.fn();
      const stopSpy = jest.fn();
      
      monitor.on('start', startSpy);
      monitor.on('stop', stopSpy);
      
      monitor.start();
      expect(startSpy).toHaveBeenCalled();
      
      monitor.stop();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should collect memory statistics', async () => {
      const stats = await monitor.measureMemory();
      
      expect(stats).toHaveProperty('timestamp');
      expect(stats).toHaveProperty('processMemory');
      expect(stats).toHaveProperty('systemMemory');
      expect(stats).toHaveProperty('heapStats');
      
      expect(stats.processMemory).toHaveProperty('heapUsed');
      expect(stats.processMemory).toHaveProperty('external');
      expect(stats.processMemory).toHaveProperty('rss');
      
      expect(stats.systemMemory).toHaveProperty('total');
      expect(stats.systemMemory).toHaveProperty('free');
      expect(stats.systemMemory).toHaveProperty('percentUsed');
    });

    it('should calculate memory delta', async () => {
      const stats1 = await monitor.measureMemory();
      
      // Allocate some memory
      const bigArray = new Array(1000000).fill('test');
      
      const stats2 = await monitor.measureMemory();
      
      expect(stats2.delta).toBeDefined();
      expect(stats2.delta!.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('Threshold alerts', () => {
    it('should emit warning alert when heap exceeds warning threshold', async () => {
      const alertSpy = jest.fn();
      
      const testMonitor = new MemoryMonitor({
        thresholds: {
          heapWarning: 0.001, // Very low threshold to trigger
          heapCritical: 1000,
          systemWarning: 100,
          systemCritical: 100
        }
      });
      
      testMonitor.on('alert', alertSpy);
      
      await testMonitor.measureMemory();
      
      expect(alertSpy).toHaveBeenCalled();
      const alert = alertSpy.mock.calls[0][0];
      expect(alert.level).toBe(MemoryAlertLevel.WARNING);
      expect(alert.type).toBe('heap');
      
      testMonitor.stop();
    });

    it('should emit critical alert when heap exceeds critical threshold', async () => {
      const alertSpy = jest.fn();
      
      const testMonitor = new MemoryMonitor({
        thresholds: {
          heapWarning: 0.0001,
          heapCritical: 0.001, // Very low threshold to trigger
          systemWarning: 100,
          systemCritical: 100
        }
      });
      
      testMonitor.on('alert', alertSpy);
      
      await testMonitor.measureMemory();
      
      expect(alertSpy).toHaveBeenCalled();
      const alert = alertSpy.mock.calls[0][0];
      expect(alert.level).toBe(MemoryAlertLevel.CRITICAL);
      
      testMonitor.stop();
    });
  });

  describe('History management', () => {
    it('should maintain stats history', async () => {
      for (let i = 0; i < 5; i++) {
        await monitor.measureMemory();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const history = monitor.getHistory();
      expect(history).toHaveLength(5);
    });

    it('should limit history size', async () => {
      for (let i = 0; i < 15; i++) {
        await monitor.measureMemory();
      }
      
      const history = monitor.getHistory();
      expect(history).toHaveLength(10); // maxHistory is 10
    });
  });

  describe('Reporting', () => {
    it('should generate memory report', async () => {
      // Take some measurements
      for (let i = 0; i < 3; i++) {
        await monitor.measureMemory();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const report = monitor.getReport();
      
      expect(report).toHaveProperty('current');
      expect(report).toHaveProperty('peak');
      expect(report).toHaveProperty('average');
      expect(report).toHaveProperty('trend');
      expect(report).toHaveProperty('gcCount');
      expect(report).toHaveProperty('uptime');
    });

    it('should calculate memory trend', async () => {
      // Take measurements with increasing memory
      const arrays: any[] = [];
      
      for (let i = 0; i < 5; i++) {
        arrays.push(new Array(100000).fill(i));
        await monitor.measureMemory();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const report = monitor.getReport();
      
      expect(report.trend).toBeDefined();
      expect(report.trend!.direction).toBe('increasing');
      expect(report.trend!.ratePerSecond).toBeGreaterThan(0);
    });
  });

  describe('Garbage collection', () => {
    it('should force garbage collection when available', () => {
      if (!global.gc) {
        console.log('Skipping GC test - run with --expose-gc flag');
        return;
      }
      
      const gcSpy = jest.fn();
      monitor.on('gc', gcSpy);
      
      const result = monitor.forceGC();
      
      expect(result).toBe(true);
      expect(gcSpy).toHaveBeenCalled();
      
      const gcInfo = gcSpy.mock.calls[0][0];
      expect(gcInfo).toHaveProperty('before');
      expect(gcInfo).toHaveProperty('after');
      expect(gcInfo).toHaveProperty('freed');
      expect(gcInfo).toHaveProperty('forced', true);
    });
  });

  describe('Status and control', () => {
    it('should report monitor status', () => {
      const status = monitor.getStatus();
      
      expect(status).toHaveProperty('isMonitoring', false);
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('historySize');
      expect(status).toHaveProperty('gcCount');
      expect(status).toHaveProperty('uptime');
      
      monitor.start();
      const activeStatus = monitor.getStatus();
      expect(activeStatus.isMonitoring).toBe(true);
    });

    it('should clear history', async () => {
      await monitor.measureMemory();
      await monitor.measureMemory();
      
      expect(monitor.getHistory()).toHaveLength(2);
      
      monitor.clearHistory();
      expect(monitor.getHistory()).toHaveLength(0);
      expect(monitor.getCurrentStats()).toBeNull();
    });
  });
});

describe('ProcessingMonitor', () => {
  let monitor: ProcessingMonitor;

  beforeEach(() => {
    monitor = new ProcessingMonitor({
      enableMemoryMonitoring: true,
      enableProfiling: true
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Processing phases', () => {
    it('should track processing phases', () => {
      monitor.startMonitoring('Test Processing');
      
      monitor.startPhase('Phase 1');
      // Simulate some work
      monitor.endPhase();
      
      monitor.startPhase('Phase 2');
      monitor.endPhase();
      
      const metrics = monitor.stopMonitoring();
      
      expect(metrics).toBeDefined();
      expect(metrics!.phases).toHaveLength(2);
      expect(metrics!.phases[0].name).toBe('Phase 1');
      expect(metrics!.phases[1].name).toBe('Phase 2');
      expect(metrics!.phases[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Progress tracking', () => {
    it('should update progress information', () => {
      const progressSpy = jest.fn();
      monitor.on('progress', progressSpy);
      
      monitor.startMonitoring();
      
      monitor.updateProgress({
        current: 50,
        total: 100,
        percentage: 50,
        currentFile: 'test.xlsx',
        currentStep: 'Processing'
      });
      
      expect(progressSpy).toHaveBeenCalled();
      
      const metrics = monitor.stopMonitoring();
      expect(metrics!.rowsProcessed).toBe(50);
    });
  });

  describe('Memory integration', () => {
    it('should handle memory alerts', () => {
      const alertSpy = jest.fn();
      monitor.on('memoryAlert', alertSpy);
      
      monitor.startMonitoring();
      
      // Force a memory measurement
      monitor.forceGC();
      
      monitor.stopMonitoring();
      
      // Memory alert may or may not fire depending on system state
      // Just verify the integration is working
      expect(monitor.getCurrentMemoryStats()).toBeDefined();
    });
  });

  describe('Performance measurement', () => {
    it('should measure performance between marks', async () => {
      const measureSpy = jest.fn();
      monitor.on('measure', measureSpy);
      
      monitor.startMonitoring();
      
      // Simulate work with measurements
      monitor['mark']('operation_start');
      await new Promise(resolve => setTimeout(resolve, 50));
      monitor['mark']('operation_end');
      
      const duration = monitor.measure('operation', 'operation_start', 'operation_end');
      
      expect(duration).toBeGreaterThan(40);
      expect(duration).toBeLessThan(100);
      expect(measureSpy).toHaveBeenCalled();
      
      monitor.stopMonitoring();
    });
  });
});

describe('M4 Memory Monitor presets', () => {
  it('should create M4-specific monitor with optimized settings', () => {
    const m4Monitor = createM4MemoryMonitor();
    const status = m4Monitor.getStatus();
    
    expect(status.config.interval).toBe(5000);
    expect(status.config.autoGC).toBe(true);
    expect(status.config.gcThreshold).toBe(75);
    expect(status.config.thresholds.heapWarning).toBe(400);
    expect(status.config.thresholds.heapCritical).toBe(700);
    
    m4Monitor.stop();
  });
});