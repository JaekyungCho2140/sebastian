const v8 = require('v8');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

/**
 * 메모리 누수 감지를 위한 힙 덤프 분석기
 */
class MemoryLeakDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      snapshotInterval: options.snapshotInterval || 30000, // 30초
      maxSnapshots: options.maxSnapshots || 10,
      outputDir: options.outputDir || path.join(__dirname, 'heap-snapshots'),
      retainedSizeThreshold: options.retainedSizeThreshold || 10 * 1024 * 1024, // 10MB
      growthRateThreshold: options.growthRateThreshold || 0.1, // 10% 성장률
      ...options
    };

    this.snapshots = [];
    this.isMonitoring = false;
    this.snapshotTimer = null;
    this.leakCandidates = new Map();
  }

  /**
   * 모니터링 시작
   */
  async start() {
    if (this.isMonitoring) {
      throw new Error('Already monitoring');
    }

    this.isMonitoring = true;
    await this.ensureOutputDir();

    // 초기 스냅샷
    await this.takeSnapshot('initial');

    // 주기적 스냅샷
    this.snapshotTimer = setInterval(async () => {
      if (this.snapshots.length >= this.options.maxSnapshots) {
        await this.analyzeSnapshots();
        this.cleanup();
      } else {
        await this.takeSnapshot(`periodic-${this.snapshots.length}`);
      }
    }, this.options.snapshotInterval);

    this.emit('started');
  }

  /**
   * 모니터링 중지
   */
  async stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    // 최종 스냅샷
    await this.takeSnapshot('final');
    
    // 분석 실행
    const report = await this.analyzeSnapshots();
    
    this.emit('stopped', report);
    return report;
  }

  /**
   * 힙 스냅샷 생성
   */
  async takeSnapshot(label) {
    const timestamp = Date.now();
    const filename = `heap-${label}-${timestamp}.heapsnapshot`;
    const filepath = path.join(this.options.outputDir, filename);

    // 스냅샷 생성
    const snapshot = v8.writeHeapSnapshot(filepath);

    const snapshotInfo = {
      label,
      timestamp,
      filename,
      filepath,
      memoryUsage: process.memoryUsage(),
      size: 0
    };

    // 파일 크기 확인
    try {
      const stats = await fs.stat(filepath);
      snapshotInfo.size = stats.size;
    } catch (error) {
      console.error(`Failed to get snapshot size: ${error.message}`);
    }

    this.snapshots.push(snapshotInfo);
    this.emit('snapshot', snapshotInfo);

    return snapshotInfo;
  }

  /**
   * 스냅샷 분석
   */
  async analyzeSnapshots() {
    if (this.snapshots.length < 2) {
      return null;
    }

    const analysis = {
      timestamp: Date.now(),
      duration: this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp,
      snapshotCount: this.snapshots.length,
      memoryGrowth: this.calculateMemoryGrowth(),
      leakCandidates: [],
      recommendations: []
    };

    // 메모리 성장 패턴 분석
    const growthPattern = this.analyzeGrowthPattern();
    analysis.growthPattern = growthPattern;

    // 누수 후보 식별
    if (growthPattern.isLinear && growthPattern.growthRate > this.options.growthRateThreshold) {
      analysis.leakCandidates.push({
        type: 'linear-growth',
        severity: 'high',
        growthRate: growthPattern.growthRate,
        estimatedLeakSize: growthPattern.estimatedLeakPerInterval
      });
    }

    // 스냅샷 비교 분석
    const comparison = await this.compareSnapshots();
    if (comparison) {
      analysis.snapshotComparison = comparison;
      
      // 큰 객체나 증가하는 객체 찾기
      if (comparison.retainedSizeIncrease > this.options.retainedSizeThreshold) {
        analysis.leakCandidates.push({
          type: 'retained-size-increase',
          severity: 'medium',
          sizeIncrease: comparison.retainedSizeIncrease,
          objectTypes: comparison.growingObjectTypes
        });
      }
    }

    // 권장사항 생성
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 메모리 성장 계산
   */
  calculateMemoryGrowth() {
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    return {
      heapUsed: {
        initial: first.memoryUsage.heapUsed,
        final: last.memoryUsage.heapUsed,
        delta: last.memoryUsage.heapUsed - first.memoryUsage.heapUsed,
        percentage: ((last.memoryUsage.heapUsed - first.memoryUsage.heapUsed) / first.memoryUsage.heapUsed) * 100
      },
      heapTotal: {
        initial: first.memoryUsage.heapTotal,
        final: last.memoryUsage.heapTotal,
        delta: last.memoryUsage.heapTotal - first.memoryUsage.heapTotal,
        percentage: ((last.memoryUsage.heapTotal - first.memoryUsage.heapTotal) / first.memoryUsage.heapTotal) * 100
      },
      rss: {
        initial: first.memoryUsage.rss,
        final: last.memoryUsage.rss,
        delta: last.memoryUsage.rss - first.memoryUsage.rss,
        percentage: ((last.memoryUsage.rss - first.memoryUsage.rss) / first.memoryUsage.rss) * 100
      },
      external: {
        initial: first.memoryUsage.external,
        final: last.memoryUsage.external,
        delta: last.memoryUsage.external - first.memoryUsage.external,
        percentage: ((last.memoryUsage.external - first.memoryUsage.external) / first.memoryUsage.external) * 100
      }
    };
  }

  /**
   * 성장 패턴 분석
   */
  analyzeGrowthPattern() {
    const heapValues = this.snapshots.map(s => s.memoryUsage.heapUsed);
    const timestamps = this.snapshots.map(s => s.timestamp);

    // 선형 회귀 분석
    const n = heapValues.length;
    const sumX = timestamps.reduce((a, b) => a + b, 0);
    const sumY = heapValues.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * heapValues[i], 0);
    const sumX2 = timestamps.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R² 계산 (결정계수)
    const yMean = sumY / n;
    const ssTotal = heapValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = heapValues.reduce((sum, y, i) => {
      const yPredicted = slope * timestamps[i] + intercept;
      return sum + Math.pow(y - yPredicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    return {
      isLinear: rSquared > 0.8, // R² > 0.8이면 선형으로 간주
      slope: slope,
      intercept: intercept,
      rSquared: rSquared,
      growthRate: slope / (heapValues[0] || 1), // 초당 성장률
      estimatedLeakPerInterval: slope * this.options.snapshotInterval
    };
  }

  /**
   * 스냅샷 비교
   */
  async compareSnapshots() {
    if (this.snapshots.length < 2) {
      return null;
    }

    // 실제 힙 스냅샷 분석은 복잡하므로 여기서는 메타데이터만 비교
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    return {
      timeDelta: last.timestamp - first.timestamp,
      heapSizeDelta: last.memoryUsage.heapUsed - first.memoryUsage.heapUsed,
      retainedSizeIncrease: last.memoryUsage.heapUsed - first.memoryUsage.heapUsed,
      growingObjectTypes: ['Array', 'Object', 'String'], // 실제로는 스냅샷 분석 필요
      recommendations: []
    };
  }

  /**
   * 권장사항 생성
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.memoryGrowth.heapUsed.percentage > 50) {
      recommendations.push({
        severity: 'high',
        message: 'Significant heap memory growth detected (>50%)',
        action: 'Review object allocation patterns and ensure proper cleanup'
      });
    }

    if (analysis.growthPattern && analysis.growthPattern.isLinear) {
      recommendations.push({
        severity: 'high',
        message: 'Linear memory growth pattern detected',
        action: 'Check for accumulating objects or unclosed resources'
      });
    }

    if (analysis.memoryGrowth.external.delta > 100 * 1024 * 1024) {
      recommendations.push({
        severity: 'medium',
        message: 'Large external memory increase detected',
        action: 'Review Buffer usage and native module memory management'
      });
    }

    if (analysis.leakCandidates.length > 0) {
      recommendations.push({
        severity: 'high',
        message: `${analysis.leakCandidates.length} potential memory leak(s) detected`,
        action: 'Use heap profiler to identify specific objects causing leaks'
      });
    }

    return recommendations;
  }

  /**
   * 출력 디렉토리 확인
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create output directory: ${error.message}`);
    }
  }

  /**
   * 오래된 스냅샷 정리
   */
  async cleanup() {
    if (this.snapshots.length <= this.options.maxSnapshots) {
      return;
    }

    // 가장 오래된 스냅샷 제거
    const toRemove = this.snapshots.splice(0, this.snapshots.length - this.options.maxSnapshots);
    
    for (const snapshot of toRemove) {
      try {
        await fs.unlink(snapshot.filepath);
      } catch (error) {
        console.error(`Failed to remove snapshot: ${error.message}`);
      }
    }
  }

  /**
   * 리포트 생성
   */
  async generateReport(outputPath) {
    const analysis = await this.analyzeSnapshots();
    if (!analysis) {
      return null;
    }

    const report = {
      title: 'Memory Leak Detection Report',
      generated: new Date().toISOString(),
      summary: {
        duration: `${(analysis.duration / 1000 / 60).toFixed(2)} minutes`,
        snapshotCount: analysis.snapshotCount,
        memoryGrowth: `${analysis.memoryGrowth.heapUsed.percentage.toFixed(2)}%`,
        leaksDetected: analysis.leakCandidates.length
      },
      analysis: analysis,
      snapshots: this.snapshots.map(s => ({
        label: s.label,
        timestamp: new Date(s.timestamp).toISOString(),
        heapUsed: `${(s.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(s.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(s.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
      }))
    };

    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    }

    return report;
  }
}

/**
 * 간단한 메모리 누수 시뮬레이터
 */
class MemoryLeakSimulator {
  constructor() {
    this.leakyArray = [];
    this.leakyMap = new Map();
    this.leakyEventEmitters = [];
  }

  /**
   * 배열 누수 시뮬레이션
   */
  simulateArrayLeak(size = 1000) {
    for (let i = 0; i < size; i++) {
      this.leakyArray.push({
        id: i,
        data: new Array(1000).fill(Math.random()),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Map 누수 시뮬레이션
   */
  simulateMapLeak(size = 1000) {
    for (let i = 0; i < size; i++) {
      this.leakyMap.set(`key-${Date.now()}-${i}`, {
        value: new Array(1000).fill(Math.random()),
        buffer: Buffer.alloc(1024)
      });
    }
  }

  /**
   * EventEmitter 누수 시뮬레이션
   */
  simulateEventEmitterLeak(count = 10) {
    for (let i = 0; i < count; i++) {
      const emitter = new EventEmitter();
      
      // 리스너를 제거하지 않음
      emitter.on('data', () => {
        console.log('Data event');
      });
      
      this.leakyEventEmitters.push(emitter);
    }
  }

  /**
   * 클로저 누수 시뮬레이션
   */
  simulateClosureLeak() {
    const largeData = new Array(10000).fill(Math.random());
    
    return () => {
      // largeData를 참조하는 클로저
      return largeData.reduce((a, b) => a + b, 0);
    };
  }

  /**
   * 순환 참조 누수 시뮬레이션
   */
  simulateCircularReferenceLeak() {
    const obj1 = { data: new Array(1000).fill(Math.random()) };
    const obj2 = { data: new Array(1000).fill(Math.random()) };
    
    obj1.ref = obj2;
    obj2.ref = obj1;
    
    return { obj1, obj2 };
  }

  /**
   * 모든 누수 정리
   */
  cleanup() {
    this.leakyArray = [];
    this.leakyMap.clear();
    this.leakyEventEmitters.forEach(emitter => emitter.removeAllListeners());
    this.leakyEventEmitters = [];
  }
}

module.exports = { MemoryLeakDetector, MemoryLeakSimulator };