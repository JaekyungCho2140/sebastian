const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const { 
  MemoryMonitor, 
  MemoryAlertLevel,
  globalMemoryMonitor,
  createMemoryMonitor
} = require('../src/services/m4/performance/memory-monitor');

describe('MemoryMonitor', () => {
  let monitor;
  let sandbox;
  let clock;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sinon.useFakeTimers();
    monitor = new MemoryMonitor({
      interval: 1000,
      warningThreshold: 80,
      criticalThreshold: 90,
      heapWarningThreshold: 100,
      heapCriticalThreshold: 200,
      autoGC: false,
      emitStats: true
    });
  });

  afterEach(() => {
    monitor.stop();
    clock.restore();
    sandbox.restore();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultMonitor = new MemoryMonitor();
      expect(defaultMonitor).to.be.instanceOf(MemoryMonitor);
    });

    it('should initialize with custom configuration', () => {
      expect(monitor).to.be.instanceOf(MemoryMonitor);
    });
  });

  describe('Start and Stop', () => {
    it('should start monitoring', () => {
      const startSpy = sandbox.spy();
      monitor.on('start', startSpy);

      monitor.start();
      
      expect(startSpy.calledOnce).to.be.true;
      const stats = startSpy.getCall(0).args[0];
      expect(stats).to.have.property('heapUsed');
      expect(stats).to.have.property('timestamp');
    });

    it('should not start if already monitoring', () => {
      const startSpy = sandbox.spy();
      monitor.on('start', startSpy);

      monitor.start();
      monitor.start(); // Second call should be ignored
      
      expect(startSpy.calledOnce).to.be.true;
    });

    it('should stop monitoring', () => {
      const stopSpy = sandbox.spy();
      monitor.on('stop', stopSpy);

      monitor.start();
      monitor.stop();
      
      expect(stopSpy.calledOnce).to.be.true;
      const stopData = stopSpy.getCall(0).args[0];
      expect(stopData).to.have.property('startMemory');
      expect(stopData).to.have.property('finalMemory');
      expect(stopData).to.have.property('trend');
    });

    it('should not stop if not monitoring', () => {
      const stopSpy = sandbox.spy();
      monitor.on('stop', stopSpy);

      monitor.stop(); // Should be ignored
      
      expect(stopSpy.called).to.be.false;
    });
  });

  describe('Memory Statistics', () => {
    it('should get current memory statistics', () => {
      const stats = monitor.getCurrentStats();
      
      expect(stats).to.have.property('totalMemory').that.is.a('number');
      expect(stats).to.have.property('freeMemory').that.is.a('number');
      expect(stats).to.have.property('heapUsed').that.is.a('number');
      expect(stats).to.have.property('heapTotal').that.is.a('number');
      expect(stats).to.have.property('rss').that.is.a('number');
      expect(stats).to.have.property('external').that.is.a('number');
      expect(stats).to.have.property('arrayBuffers').that.is.a('number');
      expect(stats).to.have.property('usagePercentage').that.is.a('number');
      expect(stats).to.have.property('timestamp').that.is.instanceOf(Date);
    });

    it('should emit stats periodically', () => {
      const statsSpy = sandbox.spy();
      monitor.on('stats', statsSpy);

      monitor.start();
      clock.tick(1000); // Advance time by interval
      
      expect(statsSpy.called).to.be.true;
      const stats = statsSpy.getCall(0).args[0];
      expect(stats).to.have.property('heapUsed');
    });

    it('should maintain history', () => {
      monitor.start();
      
      // Advance time to collect multiple stats
      for (let i = 0; i < 5; i++) {
        clock.tick(1000);
      }

      const snapshot = monitor.getSnapshot();
      expect(snapshot.history).to.have.length.greaterThan(1);
    });
  });

  describe('Memory Alerts', () => {
    it('should emit warning alert when threshold exceeded', () => {
      const alertSpy = sandbox.spy();
      const warningSpy = sandbox.spy();
      monitor.on('alert', alertSpy);
      monitor.on('warning', warningSpy);

      // Mock high memory usage
      sandbox.stub(monitor, 'getCurrentStats').returns({
        totalMemory: 1000,
        freeMemory: 150,
        heapUsed: 150 * 1024 * 1024, // 150MB
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        usagePercentage: 85, // Above warning threshold
        timestamp: new Date()
      });

      monitor.start();
      clock.tick(1000);

      expect(alertSpy.called).to.be.true;
      expect(warningSpy.called).to.be.true;
      
      const alert = alertSpy.getCall(0).args[0];
      expect(alert.level).to.equal(MemoryAlertLevel.WARNING);
      expect(alert.message).to.include('high');
    });

    it('should emit critical alert when critical threshold exceeded', () => {
      const criticalSpy = sandbox.spy();
      monitor.on('critical', criticalSpy);

      // Mock critical memory usage
      sandbox.stub(monitor, 'getCurrentStats').returns({
        totalMemory: 1000,
        freeMemory: 50,
        heapUsed: 250 * 1024 * 1024, // 250MB - above critical
        heapTotal: 300 * 1024 * 1024,
        rss: 400 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        usagePercentage: 95, // Above critical threshold
        timestamp: new Date()
      });

      monitor.start();
      clock.tick(1000);

      expect(criticalSpy.called).to.be.true;
      const alert = criticalSpy.getCall(0).args[0];
      expect(alert.level).to.equal(MemoryAlertLevel.CRITICAL);
    });

    it('should detect rapid memory growth', () => {
      const warningSpy = sandbox.spy();
      monitor.on('warning', warningSpy);

      let heapUsed = 50 * 1024 * 1024; // Start at 50MB
      sandbox.stub(monitor, 'getCurrentStats').callsFake(() => {
        heapUsed += 15 * 1024 * 1024; // Grow by 15MB each check
        return {
          totalMemory: 1000,
          freeMemory: 500,
          heapUsed: heapUsed,
          heapTotal: 300 * 1024 * 1024,
          rss: 400 * 1024 * 1024,
          external: 0,
          arrayBuffers: 0,
          usagePercentage: 50,
          timestamp: new Date()
        };
      });

      monitor.start();
      
      // Advance time to collect growth data
      for (let i = 0; i < 3; i++) {
        clock.tick(1000);
      }

      const warnings = warningSpy.getCalls()
        .map(call => call.args[0])
        .filter(alert => alert.message.includes('growth'));
      
      expect(warnings).to.have.length.greaterThan(0);
    });
  });

  describe('Garbage Collection', () => {
    it('should trigger GC when enabled and threshold exceeded', () => {
      if (!global.gc) {
        console.log('Skipping GC test - run with --expose-gc flag');
        return;
      }

      const gcMonitor = new MemoryMonitor({
        interval: 1000,
        heapCriticalThreshold: 100,
        autoGC: true
      });

      const gcSpy = sandbox.spy();
      gcMonitor.on('gc', gcSpy);

      // Mock critical heap usage
      sandbox.stub(gcMonitor, 'getCurrentStats').returns({
        totalMemory: 1000,
        freeMemory: 500,
        heapUsed: 150 * 1024 * 1024, // Above critical
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        usagePercentage: 50,
        timestamp: new Date()
      });

      gcMonitor.start();
      clock.tick(1000);

      expect(gcSpy.called).to.be.true;
      const gcData = gcSpy.getCall(0).args[0];
      expect(gcData).to.have.property('beforeMemory');
      expect(gcData).to.have.property('afterMemory');
      expect(gcData).to.have.property('freed');
      
      gcMonitor.stop();
    });

    it('should respect GC cooldown period', () => {
      if (!global.gc) {
        return;
      }

      const gcMonitor = new MemoryMonitor({
        interval: 100,
        heapCriticalThreshold: 100,
        autoGC: true
      });

      const gcSpy = sandbox.spy();
      gcMonitor.on('gc', gcSpy);

      // Mock critical heap usage
      sandbox.stub(gcMonitor, 'getCurrentStats').returns({
        totalMemory: 1000,
        freeMemory: 500,
        heapUsed: 150 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        usagePercentage: 50,
        timestamp: new Date()
      });

      gcMonitor.start();
      
      // Trigger multiple checks within cooldown period
      for (let i = 0; i < 5; i++) {
        clock.tick(100);
      }

      // Should only trigger once due to cooldown
      expect(gcSpy.calledOnce).to.be.true;
      
      // Advance past cooldown
      clock.tick(10000);
      clock.tick(100);
      
      // Should trigger again
      expect(gcSpy.calledTwice).to.be.true;
      
      gcMonitor.stop();
    });
  });

  describe('Memory Trend', () => {
    it('should calculate memory trend', () => {
      monitor.start();
      
      // Collect some data points
      for (let i = 0; i < 5; i++) {
        clock.tick(1000);
      }

      const trend = monitor.getTrend();
      expect(trend).to.have.property('averageUsage').that.is.a('number');
      expect(trend).to.have.property('peakUsage').that.is.a('number');
      expect(trend).to.have.property('minUsage').that.is.a('number');
      expect(trend).to.have.property('growthRate').that.is.a('number');
      expect(trend).to.have.property('gcCount').that.is.a('number');
      expect(trend).to.have.property('period').that.is.a('number');
    });

    it('should handle single data point', () => {
      monitor.start();
      
      const trend = monitor.getTrend();
      expect(trend.growthRate).to.equal(0);
      expect(trend.period).to.equal(0);
    });
  });

  describe('Utilities', () => {
    it('should format bytes correctly', () => {
      expect(MemoryMonitor.formatBytes(0)).to.equal('0 B');
      expect(MemoryMonitor.formatBytes(1024)).to.equal('1.00 KB');
      expect(MemoryMonitor.formatBytes(1024 * 1024)).to.equal('1.00 MB');
      expect(MemoryMonitor.formatBytes(1024 * 1024 * 1024)).to.equal('1.00 GB');
      expect(MemoryMonitor.formatBytes(1536)).to.equal('1.50 KB');
    });

    it('should generate summary report', () => {
      monitor.start();
      clock.tick(5000);
      
      const summary = monitor.getSummary();
      expect(summary).to.be.a('string');
      expect(summary).to.include('Memory Monitor Summary');
      expect(summary).to.include('Current Heap');
      expect(summary).to.include('Peak Heap');
      expect(summary).to.include('Growth Rate');
    });

    it('should check health status', () => {
      expect(monitor.isHealthy()).to.be.true;

      // Mock unhealthy state
      sandbox.stub(monitor, 'getCurrentStats').returns({
        totalMemory: 1000,
        freeMemory: 150,
        heapUsed: 150 * 1024 * 1024, // Above warning
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
        usagePercentage: 85, // Above warning
        timestamp: new Date()
      });

      expect(monitor.isHealthy()).to.be.false;
    });

    it('should get memory snapshot', () => {
      monitor.start();
      clock.tick(3000);
      
      const snapshot = monitor.getSnapshot();
      expect(snapshot).to.have.property('current');
      expect(snapshot).to.have.property('trend');
      expect(snapshot).to.have.property('history').that.is.an('array');
    });
  });

  describe('Factory functions', () => {
    it('should create scoped memory monitor', () => {
      const scopedMonitor = createMemoryMonitor('TestScope', {
        interval: 500
      });
      
      expect(scopedMonitor).to.be.instanceOf(MemoryMonitor);
      
      // Test that it logs warnings
      const consoleWarnStub = sandbox.stub(console, 'warn');
      scopedMonitor.emit('alert', {
        level: MemoryAlertLevel.WARNING,
        message: 'Test warning'
      });
      
      expect(consoleWarnStub.calledWith('[TestScope] Memory Alert:', 'Test warning')).to.be.true;
      
      scopedMonitor.stop();
    });
  });

  describe('Global instance', () => {
    it('should have global memory monitor instance', () => {
      expect(globalMemoryMonitor).to.be.instanceOf(MemoryMonitor);
    });
  });
});