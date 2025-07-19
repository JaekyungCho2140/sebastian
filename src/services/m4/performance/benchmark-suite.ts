import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as ExcelJS from 'exceljs';
import { M4DialogueProcessorStreaming } from '../processors/m4DialogueProcessorStreaming';
import { M4StringProcessorStreaming } from '../processors/m4StringProcessorStreaming';
import { PerformanceProfiler, PerformanceReport } from './profiler';
import { MemoryMonitor, MemoryStats } from './memory-monitor';
import { M4ProcessorResult, M4ProgressInfo } from '../../../types/m4Processing';

/**
 * Test file configuration
 */
export interface TestFileConfig {
  size: string;           // e.g., '1MB', '10MB', '50MB'
  sizeBytes: number;      // Actual size in bytes
  rowCount: number;       // Number of rows to generate
  sheetCount: number;     // Number of sheets
  format: 'xlsx' | 'xlsm';
}

/**
 * Benchmark scenario configuration
 */
export interface BenchmarkScenario {
  name: string;
  description: string;
  processorType: 'dialogue' | 'string';
  fileConfigs: TestFileConfig[];
  iterations: number;     // Number of times to run each test
  parallel: boolean;      // Run tests in parallel vs sequential
  warmupRuns?: number;    // Number of warmup runs before actual measurement
}

/**
 * Benchmark result for a single run
 */
export interface BenchmarkRunResult {
  scenario: string;
  fileSize: string;
  fileSizeBytes: number;
  rowCount: number;
  iteration: number;
  processingTime: number;
  throughput: number;     // rows per second
  memoryUsed: number;
  peakMemory: number;
  averageMemory: number;
  gcCount: number;
  cpuUsage: number;
  timestamp: Date;
}

/**
 * Aggregated benchmark metrics
 */
export interface BenchmarkMetrics {
  scenario: string;
  fileSize: string;
  fileSizeBytes: number;
  rowCount: number;
  runs: number;
  avgProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  stdDevProcessingTime: number;
  avgThroughput: number;
  avgMemoryUsed: number;
  peakMemoryOverall: number;
  timeComplexity: string;  // O(n), O(n log n), etc.
  regressionDetected: boolean;
  regressionDetails?: string;
}

/**
 * Complete benchmark report
 */
export interface BenchmarkReport {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  environment: {
    platform: string;
    cpus: string;
    cpuCount: number;
    totalMemory: string;
    nodeVersion: string;
  };
  scenarios: BenchmarkScenario[];
  results: BenchmarkRunResult[];
  metrics: BenchmarkMetrics[];
  timeComplexityAnalysis: {
    dialogue: string;
    string: string;
    analysis: string;
  };
  performanceRegressions: Array<{
    scenario: string;
    fileSize: string;
    metric: string;
    baseline: number;
    current: number;
    change: string;
  }>;
  recommendations: string[];
  htmlReport?: string;
  jsonReport?: string;
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  outputDir?: string;
  tempDir?: string;
  generateHtmlReport?: boolean;
  compareWithBaseline?: boolean;
  baselinePath?: string;
  memoryProfiling?: boolean;
  cpuProfiling?: boolean;
  cleanupAfterRun?: boolean;
  verbose?: boolean;
}

/**
 * Comprehensive benchmarking suite for M4 processors
 */
export class BenchmarkSuite extends EventEmitter {
  private config: Required<BenchmarkConfig>;
  private profiler: PerformanceProfiler;
  private memoryMonitor: MemoryMonitor;
  private tempFiles: string[] = [];
  private baselineMetrics: Map<string, BenchmarkMetrics> = new Map();

  constructor(config: BenchmarkConfig = {}) {
    super();
    
    this.config = {
      outputDir: config.outputDir || './benchmark-reports',
      tempDir: config.tempDir || path.join(os.tmpdir(), 'sebastian-benchmark'),
      generateHtmlReport: config.generateHtmlReport !== false,
      compareWithBaseline: config.compareWithBaseline || false,
      baselinePath: config.baselinePath || path.join(config.outputDir || './benchmark-reports', 'baseline.json'),
      memoryProfiling: config.memoryProfiling !== false,
      cpuProfiling: config.cpuProfiling !== false,
      cleanupAfterRun: config.cleanupAfterRun !== false,
      verbose: config.verbose || false
    };

    // Initialize profiler and memory monitor
    this.profiler = new PerformanceProfiler({
      enabled: true,
      trackMemory: this.config.memoryProfiling,
      reportDir: this.config.outputDir
    });

    this.memoryMonitor = new MemoryMonitor({
      interval: 1000,
      emitStats: true
    });

    // Handle memory stats
    this.memoryMonitor.on('stats', (stats) => {
      if (this.config.verbose) {
        this.emit('memoryStats', stats);
      }
    });
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarks(scenarios?: BenchmarkScenario[]): Promise<BenchmarkReport> {
    const startTime = new Date();
    this.emit('start', { startTime });

    try {
      // Create directories
      await this.createDirectories();

      // Load baseline if needed
      if (this.config.compareWithBaseline) {
        await this.loadBaseline();
      }

      // Default scenarios if not provided
      if (!scenarios) {
        scenarios = this.getDefaultScenarios();
      }

      // Start profiling
      this.profiler.start('Benchmark Suite');
      this.memoryMonitor.start();

      const results: BenchmarkRunResult[] = [];

      // Generate test files
      this.emit('phase', { phase: 'Generating test files' });
      await this.generateTestFiles(scenarios);

      // Run each scenario
      for (const scenario of scenarios) {
        this.emit('scenario', { scenario: scenario.name });
        const scenarioResults = await this.runScenario(scenario);
        results.push(...scenarioResults);
      }

      // Stop profiling
      const performanceReport = await this.profiler.stop();
      this.memoryMonitor.stop();

      // Calculate metrics
      const metrics = this.calculateMetrics(results);

      // Analyze time complexity
      const complexityAnalysis = this.analyzeTimeComplexity(metrics);

      // Detect regressions
      const regressions = this.detectRegressions(metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, complexityAnalysis, regressions);

      // Create report
      const report: BenchmarkReport = {
        startTime,
        endTime: new Date(),
        totalDuration: Date.now() - startTime.getTime(),
        environment: this.getEnvironmentInfo(),
        scenarios,
        results,
        metrics,
        timeComplexityAnalysis: complexityAnalysis,
        performanceRegressions: regressions,
        recommendations
      };

      // Save reports
      await this.saveReports(report);

      this.emit('complete', report);
      return report;

    } finally {
      // Cleanup
      if (this.config.cleanupAfterRun) {
        await this.cleanup();
      }
    }
  }

  /**
   * Get default benchmark scenarios
   */
  private getDefaultScenarios(): BenchmarkScenario[] {
    const fileSizes: TestFileConfig[] = [
      { size: '1MB', sizeBytes: 1024 * 1024, rowCount: 5000, sheetCount: 2, format: 'xlsx' },
      { size: '10MB', sizeBytes: 10 * 1024 * 1024, rowCount: 50000, sheetCount: 3, format: 'xlsx' },
      { size: '50MB', sizeBytes: 50 * 1024 * 1024, rowCount: 250000, sheetCount: 4, format: 'xlsx' },
      { size: '100MB', sizeBytes: 100 * 1024 * 1024, rowCount: 500000, sheetCount: 5, format: 'xlsx' },
      { size: '500MB', sizeBytes: 500 * 1024 * 1024, rowCount: 2500000, sheetCount: 6, format: 'xlsx' }
    ];

    return [
      {
        name: 'M4 Dialogue Sequential Processing',
        description: 'Process M4 Dialogue files sequentially',
        processorType: 'dialogue',
        fileConfigs: fileSizes,
        iterations: 3,
        parallel: false,
        warmupRuns: 1
      },
      {
        name: 'M4 String Sequential Processing',
        description: 'Process M4 String files sequentially',
        processorType: 'string',
        fileConfigs: fileSizes,
        iterations: 3,
        parallel: false,
        warmupRuns: 1
      },
      {
        name: 'M4 Dialogue Parallel Processing',
        description: 'Process multiple M4 Dialogue files in parallel',
        processorType: 'dialogue',
        fileConfigs: fileSizes.slice(0, 3), // Only smaller files for parallel
        iterations: 3,
        parallel: true,
        warmupRuns: 1
      }
    ];
  }

  /**
   * Run a single benchmark scenario
   */
  private async runScenario(scenario: BenchmarkScenario): Promise<BenchmarkRunResult[]> {
    const results: BenchmarkRunResult[] = [];

    for (const fileConfig of scenario.fileConfigs) {
      this.emit('fileConfig', { scenario: scenario.name, fileConfig });

      // Warmup runs
      if (scenario.warmupRuns) {
        for (let i = 0; i < scenario.warmupRuns; i++) {
          await this.runSingleBenchmark(scenario, fileConfig, -1); // -1 indicates warmup
        }
      }

      // Actual benchmark runs
      if (scenario.parallel) {
        // Run iterations in parallel
        const promises = [];
        for (let i = 0; i < scenario.iterations; i++) {
          promises.push(this.runSingleBenchmark(scenario, fileConfig, i));
        }
        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else {
        // Run iterations sequentially
        for (let i = 0; i < scenario.iterations; i++) {
          const result = await this.runSingleBenchmark(scenario, fileConfig, i);
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Run a single benchmark test
   */
  private async runSingleBenchmark(
    scenario: BenchmarkScenario,
    fileConfig: TestFileConfig,
    iteration: number
  ): Promise<BenchmarkRunResult> {
    const testFile = this.getTestFilePath(scenario.processorType, fileConfig);
    const outputFile = path.join(this.config.tempDir, `output-${Date.now()}.xlsx`);

    // Start monitoring
    const memorySnapshots: MemoryStats[] = [];
    const cpuStart = process.cpuUsage();
    const gcBefore = (global as any).gc ? this.getGCCount() : 0;

    // Memory monitoring handler
    const memoryHandler = (stats: MemoryStats) => {
      memorySnapshots.push(stats);
    };
    this.memoryMonitor.on('stats', memoryHandler);

    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      // Process file based on type
      let result: M4ProcessorResult;
      
      if (scenario.processorType === 'dialogue') {
        result = await M4DialogueProcessorStreaming.process(
          testFile,
          outputFile,
          (progress) => {
            if (this.config.verbose) {
              this.emit('progress', { scenario: scenario.name, fileConfig, progress });
            }
          }
        );
      } else {
        result = await M4StringProcessorStreaming.process(
          testFile,
          outputFile,
          (progress) => {
            if (this.config.verbose) {
              this.emit('progress', { scenario: scenario.name, fileConfig, progress });
            }
          }
        );
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const cpuEnd = process.cpuUsage(cpuStart);
      const gcAfter = (global as any).gc ? this.getGCCount() : 0;

      // Calculate metrics
      const processingTime = endTime - startTime;
      const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
      const peakMemory = Math.max(...memorySnapshots.map(s => s.heapUsed));
      const averageMemory = memorySnapshots.length > 0
        ? memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / memorySnapshots.length
        : endMemory.heapUsed;
      const cpuUsage = (cpuEnd.user + cpuEnd.system) / 1000; // Convert to milliseconds

      // Only record non-warmup runs
      if (iteration >= 0) {
        return {
          scenario: scenario.name,
          fileSize: fileConfig.size,
          fileSizeBytes: fileConfig.sizeBytes,
          rowCount: result.rowsProcessed ?? 0,
          iteration,
          processingTime,
          throughput: (result.rowsProcessed ?? 0) / (processingTime / 1000), // rows per second
          memoryUsed,
          peakMemory,
          averageMemory,
          gcCount: gcAfter - gcBefore,
          cpuUsage,
          timestamp: new Date()
        };
      }

      // Return dummy result for warmup runs
      return {} as BenchmarkRunResult;

    } finally {
      // Cleanup
      this.memoryMonitor.off('stats', memoryHandler);
      this.tempFiles.push(outputFile);
    }
  }

  /**
   * Generate test files for benchmarking
   */
  private async generateTestFiles(scenarios: BenchmarkScenario[]): Promise<void> {
    // Collect unique file configs
    const fileConfigMap = new Map<string, TestFileConfig>();
    
    for (const scenario of scenarios) {
      for (const config of scenario.fileConfigs) {
        const key = `${scenario.processorType}-${config.size}`;
        fileConfigMap.set(key, config);
      }
    }

    // Generate files
    for (const [key, config] of fileConfigMap) {
      const [type] = key.split('-');
      const filePath = this.getTestFilePath(type as 'dialogue' | 'string', config);
      
      // Check if file already exists
      try {
        await fs.access(filePath);
        this.emit('log', { message: `Test file already exists: ${filePath}` });
        continue;
      } catch {
        // File doesn't exist, generate it
      }

      this.emit('log', { message: `Generating test file: ${config.size} (${config.rowCount} rows)` });
      
      if (type === 'dialogue') {
        await this.generateDialogueTestFile(filePath, config);
      } else {
        await this.generateStringTestFile(filePath, config);
      }
      
      this.tempFiles.push(filePath);
    }
  }

  /**
   * Generate dialogue test file
   */
  private async generateDialogueTestFile(filePath: string, config: TestFileConfig): Promise<void> {
    const workbook = new (require('exceljs')).Workbook();
    
    // NPC_Name sheet
    const npcSheet = workbook.addWorksheet('NPC_Name');
    npcSheet.columns = [
      { header: 'NPC Name', key: 'npcName' },
      { header: 'NPC Local Key', key: 'npcLocalKey' }
    ];
    
    // Add sample NPC mappings
    for (let i = 1; i <= 100; i++) {
      npcSheet.addRow({
        npcName: `NPC_${i}`,
        npcLocalKey: `LOC_NPC_${i}`
      });
    }

    // CINEMATIC_DIALOGUE sheet
    const cinematicSheet = workbook.addWorksheet('CINEMATIC_DIALOGUE');
    cinematicSheet.addRow([]); // Empty row
    cinematicSheet.addRow(['Comment', 'Asset ID', 'Dlg ID', 'String ID', 'Speaker ID', 'Line', 'Emotion', 'Text EN']);
    
    const cinematicRows = Math.floor(config.rowCount * 0.6);
    for (let i = 1; i <= cinematicRows; i++) {
      cinematicSheet.addRow([
        `Comment ${i}`,
        `ASSET_${i}`,
        `DLG_${Math.floor(i / 10)}`,
        `STR_${i}`,
        `NPC_${(i % 100) + 1}`,
        i,
        'neutral',
        `This is dialogue line ${i} with some sample text to make it realistic. `.repeat(3)
      ]);
    }

    // SMALLTALK_DIALOGUE sheet
    const smalltalkSheet = workbook.addWorksheet('SMALLTALK_DIALOGUE');
    smalltalkSheet.addRow([]); // Empty row
    smalltalkSheet.addRow(['Comment', 'Asset ID', 'Dlg ID', 'String ID', 'Speaker ID', 'Line', 'Emotion', 'Text EN']);
    
    const smalltalkRows = config.rowCount - cinematicRows;
    for (let i = 1; i <= smalltalkRows; i++) {
      smalltalkSheet.addRow([
        `ST Comment ${i}`,
        `ST_ASSET_${i}`,
        `ST_DLG_${Math.floor(i / 5)}`,
        `ST_STR_${i}`,
        `NPC_${(i % 100) + 1}`,
        i,
        'happy',
        `Small talk dialogue ${i} with conversational text. `.repeat(2)
      ]);
    }

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Generate string test file
   */
  private async generateStringTestFile(filePath: string, config: TestFileConfig): Promise<void> {
    const workbook = new (require('exceljs')).Workbook();
    
    // Source Languages sheet
    const sourceSheet = workbook.addWorksheet('Source Languages');
    sourceSheet.columns = [
      { header: 'Language', key: 'language' },
      { header: 'Code', key: 'code' }
    ];
    sourceSheet.addRow({ language: 'English', code: 'en' });

    // Main String Data sheet
    const dataSheet = workbook.addWorksheet('String Data');
    dataSheet.addRow(['Category', 'Sub Category', 'String ID', 'Speaker', 'EN', 'KO', 'JA', 'ZH-CN', 'ZH-TW']);
    
    const categories = ['UI', 'DIALOGUE', 'ITEM', 'QUEST', 'SYSTEM'];
    const subCategories = ['MAIN', 'SUB', 'MISC', 'SPECIAL'];
    
    for (let i = 1; i <= config.rowCount; i++) {
      const category = categories[i % categories.length];
      const subCategory = subCategories[Math.floor(i / 100) % subCategories.length];
      
      dataSheet.addRow([
        category,
        subCategory,
        `${category}_${subCategory}_${i}`,
        i % 10 === 0 ? `Speaker_${i}` : '',
        `This is string ${i} in English. `.repeat(2),
        `이것은 한국어 문자열 ${i}입니다. `.repeat(2),
        `これは日本語の文字列 ${i} です。`.repeat(2),
        `这是中文字符串 ${i}。`.repeat(2),
        `這是中文字符串 ${i}。`.repeat(2)
      ]);
    }

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Calculate aggregated metrics from results
   */
  private calculateMetrics(results: BenchmarkRunResult[]): BenchmarkMetrics[] {
    const metricsMap = new Map<string, BenchmarkRunResult[]>();
    
    // Group results by scenario and file size
    for (const result of results) {
      const key = `${result.scenario}-${result.fileSize}`;
      if (!metricsMap.has(key)) {
        metricsMap.set(key, []);
      }
      metricsMap.get(key)!.push(result);
    }

    // Calculate metrics for each group
    const metrics: BenchmarkMetrics[] = [];
    
    for (const [key, runs] of metricsMap) {
      if (runs.length === 0) continue;
      
      const processingTimes = runs.map(r => r.processingTime);
      const throughputs = runs.map(r => r.throughput);
      const memoryUsages = runs.map(r => r.memoryUsed);
      const peakMemories = runs.map(r => r.peakMemory);
      
      const avgProcessingTime = this.average(processingTimes);
      const minProcessingTime = Math.min(...processingTimes);
      const maxProcessingTime = Math.max(...processingTimes);
      const stdDevProcessingTime = this.standardDeviation(processingTimes);
      
      // Detect regression
      let regressionDetected = false;
      let regressionDetails: string | undefined;
      
      if (this.config.compareWithBaseline) {
        const baseline = this.baselineMetrics.get(key);
        if (baseline) {
          const changePercent = ((avgProcessingTime - baseline.avgProcessingTime) / baseline.avgProcessingTime) * 100;
          if (changePercent > 10) { // 10% threshold
            regressionDetected = true;
            regressionDetails = `Performance regression: ${changePercent.toFixed(1)}% slower than baseline`;
          }
        }
      }
      
      metrics.push({
        scenario: runs[0].scenario,
        fileSize: runs[0].fileSize,
        fileSizeBytes: runs[0].fileSizeBytes,
        rowCount: runs[0].rowCount,
        runs: runs.length,
        avgProcessingTime,
        minProcessingTime,
        maxProcessingTime,
        stdDevProcessingTime,
        avgThroughput: this.average(throughputs),
        avgMemoryUsed: this.average(memoryUsages),
        peakMemoryOverall: Math.max(...peakMemories),
        timeComplexity: 'O(n)', // Will be analyzed later
        regressionDetected,
        regressionDetails
      });
    }
    
    return metrics;
  }

  /**
   * Analyze time complexity based on metrics
   */
  private analyzeTimeComplexity(metrics: BenchmarkMetrics[]): {
    dialogue: string;
    string: string;
    analysis: string;
  } {
    // Group metrics by processor type
    const dialogueMetrics = metrics.filter(m => m.scenario.includes('Dialogue'));
    const stringMetrics = metrics.filter(m => m.scenario.includes('String'));
    
    // Analyze dialogue processor
    const dialogueComplexity = this.calculateComplexity(dialogueMetrics);
    const stringComplexity = this.calculateComplexity(stringMetrics);
    
    const analysis = `
Time Complexity Analysis:
- Dialogue Processor: ${dialogueComplexity.complexity} (R² = ${dialogueComplexity.rSquared.toFixed(3)})
- String Processor: ${stringComplexity.complexity} (R² = ${stringComplexity.rSquared.toFixed(3)})

${dialogueComplexity.complexity === 'O(n)' && stringComplexity.complexity === 'O(n)' 
  ? 'Both processors demonstrate linear time complexity, which is optimal for streaming processing.'
  : 'Non-linear complexity detected. Consider optimization for large files.'}

Detailed Analysis:
- Dialogue processing shows ${dialogueComplexity.growthRate.toFixed(2)}ms per 1000 rows
- String processing shows ${stringComplexity.growthRate.toFixed(2)}ms per 1000 rows
- Memory usage scales ${this.analyzeMemoryScaling(metrics)}
    `.trim();
    
    return {
      dialogue: dialogueComplexity.complexity,
      string: stringComplexity.complexity,
      analysis
    };
  }

  /**
   * Calculate time complexity from metrics
   */
  private calculateComplexity(metrics: BenchmarkMetrics[]): {
    complexity: string;
    rSquared: number;
    growthRate: number;
  } {
    if (metrics.length < 3) {
      return { complexity: 'Insufficient data', rSquared: 0, growthRate: 0 };
    }
    
    // Sort by row count
    const sorted = [...metrics].sort((a, b) => a.rowCount - b.rowCount);
    
    // Extract data points
    const x = sorted.map(m => m.rowCount);
    const y = sorted.map(m => m.avgProcessingTime);
    
    // Calculate linear regression
    const linearFit = this.linearRegression(x, y);
    
    // Calculate logarithmic regression
    const logX = x.map(v => Math.log(v));
    const logFit = this.linearRegression(logX, y);
    
    // Calculate quadratic regression (simplified)
    const x2 = x.map(v => v * v);
    const quadFit = this.linearRegression(x2, y);
    
    // Choose best fit based on R²
    let complexity = 'O(n)';
    let rSquared = linearFit.rSquared;
    let growthRate = linearFit.slope * 1000; // ms per 1000 rows
    
    if (logFit.rSquared > rSquared + 0.05) {
      complexity = 'O(log n)';
      rSquared = logFit.rSquared;
      growthRate = logFit.slope;
    }
    
    if (quadFit.rSquared > rSquared + 0.05) {
      complexity = 'O(n²)';
      rSquared = quadFit.rSquared;
      growthRate = quadFit.slope * 1000000; // Adjust for quadratic
    }
    
    return { complexity, rSquared, growthRate };
  }

  /**
   * Linear regression calculation
   */
  private linearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const yPred = slope * x[i] + intercept;
      return sum + Math.pow(yi - yPred, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared };
  }

  /**
   * Analyze memory scaling
   */
  private analyzeMemoryScaling(metrics: BenchmarkMetrics[]): string {
    const sorted = [...metrics].sort((a, b) => a.rowCount - b.rowCount);
    
    if (sorted.length < 2) return 'insufficient data';
    
    // Calculate memory per row for each size
    const memPerRow = sorted.map(m => m.avgMemoryUsed / m.rowCount);
    
    // Check if memory per row is consistent
    const avgMemPerRow = this.average(memPerRow);
    const stdDevMemPerRow = this.standardDeviation(memPerRow);
    const coefficientOfVariation = stdDevMemPerRow / avgMemPerRow;
    
    if (coefficientOfVariation < 0.1) {
      return `linearly (${(avgMemPerRow / 1024).toFixed(2)} KB per row)`;
    } else if (coefficientOfVariation < 0.3) {
      return `approximately linearly with some variation`;
    } else {
      return `non-linearly (may indicate memory leaks or inefficiencies)`;
    }
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(metrics: BenchmarkMetrics[]): Array<{
    scenario: string;
    fileSize: string;
    metric: string;
    baseline: number;
    current: number;
    change: string;
  }> {
    if (!this.config.compareWithBaseline) {
      return [];
    }
    
    const regressions: Array<{
      scenario: string;
      fileSize: string;
      metric: string;
      baseline: number;
      current: number;
      change: string;
    }> = [];
    
    for (const metric of metrics) {
      const key = `${metric.scenario}-${metric.fileSize}`;
      const baseline = this.baselineMetrics.get(key);
      
      if (!baseline) continue;
      
      // Check processing time
      const timeChange = ((metric.avgProcessingTime - baseline.avgProcessingTime) / baseline.avgProcessingTime) * 100;
      if (timeChange > 10) {
        regressions.push({
          scenario: metric.scenario,
          fileSize: metric.fileSize,
          metric: 'Processing Time',
          baseline: baseline.avgProcessingTime,
          current: metric.avgProcessingTime,
          change: `+${timeChange.toFixed(1)}%`
        });
      }
      
      // Check memory usage
      const memChange = ((metric.avgMemoryUsed - baseline.avgMemoryUsed) / baseline.avgMemoryUsed) * 100;
      if (memChange > 20) {
        regressions.push({
          scenario: metric.scenario,
          fileSize: metric.fileSize,
          metric: 'Memory Usage',
          baseline: baseline.avgMemoryUsed,
          current: metric.avgMemoryUsed,
          change: `+${memChange.toFixed(1)}%`
        });
      }
    }
    
    return regressions;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: BenchmarkMetrics[],
    complexityAnalysis: any,
    regressions: any[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for performance regressions
    if (regressions.length > 0) {
      recommendations.push(
        `Performance regressions detected in ${regressions.length} scenarios. ` +
        `Consider reviewing recent code changes.`
      );
    }
    
    // Check time complexity
    if (complexityAnalysis.dialogue !== 'O(n)' || complexityAnalysis.string !== 'O(n)') {
      recommendations.push(
        `Non-linear time complexity detected. ` +
        `Review algorithms for potential optimization opportunities.`
      );
    }
    
    // Check memory usage patterns
    const highMemoryScenarios = metrics.filter(m => 
      m.avgMemoryUsed / m.rowCount > 1024 // More than 1KB per row
    );
    
    if (highMemoryScenarios.length > 0) {
      recommendations.push(
        `High memory usage detected in ${highMemoryScenarios.length} scenarios. ` +
        `Consider implementing more aggressive streaming or chunking strategies.`
      );
    }
    
    // Check for high variance in processing times
    const highVarianceScenarios = metrics.filter(m => 
      m.stdDevProcessingTime / m.avgProcessingTime > 0.2 // CV > 20%
    );
    
    if (highVarianceScenarios.length > 0) {
      recommendations.push(
        `High variance in processing times detected in ${highVarianceScenarios.length} scenarios. ` +
        `This may indicate unstable performance or resource contention.`
      );
    }
    
    // Check parallel vs sequential performance
    const parallelMetrics = metrics.filter(m => m.scenario.includes('Parallel'));
    const sequentialMetrics = metrics.filter(m => m.scenario.includes('Sequential'));
    
    if (parallelMetrics.length > 0 && sequentialMetrics.length > 0) {
      const parallelAvg = this.average(parallelMetrics.map(m => m.avgThroughput));
      const sequentialAvg = this.average(sequentialMetrics.map(m => m.avgThroughput));
      
      if (parallelAvg < sequentialAvg * 1.5) {
        recommendations.push(
          `Parallel processing shows limited improvement over sequential. ` +
          `Consider tuning parallel execution parameters or batch sizes.`
        );
      }
    }
    
    // General recommendations based on file sizes
    const largeFileMetrics = metrics.filter(m => m.fileSizeBytes > 100 * 1024 * 1024);
    if (largeFileMetrics.some(m => m.avgProcessingTime > 60000)) { // > 1 minute
      recommendations.push(
        `Large files (>100MB) take over 1 minute to process. ` +
        `Consider implementing progress persistence for recovery from interruptions.`
      );
    }
    
    return recommendations;
  }

  /**
   * Save benchmark reports
   */
  private async saveReports(report: BenchmarkReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonPath = path.join(this.config.outputDir, `benchmark-report-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    report.jsonReport = jsonPath;
    
    // Save HTML report if enabled
    if (this.config.generateHtmlReport) {
      const htmlPath = path.join(this.config.outputDir, `benchmark-report-${timestamp}.html`);
      const htmlContent = this.generateHtmlReport(report);
      await fs.writeFile(htmlPath, htmlContent);
      report.htmlReport = htmlPath;
    }
    
    // Update baseline if this is a good run
    if (!report.performanceRegressions.length) {
      await this.updateBaseline(report.metrics);
    }
    
    this.emit('reportsSaved', { jsonPath, htmlPath: report.htmlReport });
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: BenchmarkReport): string {
    const chartData = this.prepareChartData(report.metrics);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Benchmark Report - ${report.startTime.toLocaleString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #333;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #007bff;
        }
        .chart-container {
            position: relative;
            height: 400px;
            margin: 30px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #007bff;
            color: white;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .regression {
            background-color: #ffe6e6;
        }
        .recommendation {
            background-color: #fff3cd;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #ffc107;
        }
        .complexity-good {
            color: #28a745;
        }
        .complexity-bad {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Benchmark Report</h1>
        <p>Generated: ${report.endTime.toLocaleString()}</p>
        <p>Duration: ${(report.totalDuration / 1000).toFixed(2)} seconds</p>
        
        <h2>Environment</h2>
        <div class="summary">
            <div class="summary-card">
                <h4>Platform</h4>
                <p>${report.environment.platform}</p>
            </div>
            <div class="summary-card">
                <h4>CPUs</h4>
                <p>${report.environment.cpuCount}x ${report.environment.cpus}</p>
            </div>
            <div class="summary-card">
                <h4>Memory</h4>
                <p>${report.environment.totalMemory}</p>
            </div>
            <div class="summary-card">
                <h4>Node Version</h4>
                <p>${report.environment.nodeVersion}</p>
            </div>
        </div>
        
        <h2>Time Complexity Analysis</h2>
        <div class="summary">
            <div class="summary-card">
                <h4>Dialogue Processor</h4>
                <p class="${report.timeComplexityAnalysis.dialogue === 'O(n)' ? 'complexity-good' : 'complexity-bad'}">
                    ${report.timeComplexityAnalysis.dialogue}
                </p>
            </div>
            <div class="summary-card">
                <h4>String Processor</h4>
                <p class="${report.timeComplexityAnalysis.string === 'O(n)' ? 'complexity-good' : 'complexity-bad'}">
                    ${report.timeComplexityAnalysis.string}
                </p>
            </div>
        </div>
        <pre>${report.timeComplexityAnalysis.analysis}</pre>
        
        <h2>Performance Charts</h2>
        <div class="chart-container">
            <canvas id="throughputChart"></canvas>
        </div>
        <div class="chart-container">
            <canvas id="memoryChart"></canvas>
        </div>
        <div class="chart-container">
            <canvas id="scalingChart"></canvas>
        </div>
        
        <h2>Detailed Metrics</h2>
        <table>
            <thead>
                <tr>
                    <th>Scenario</th>
                    <th>File Size</th>
                    <th>Rows</th>
                    <th>Avg Time (ms)</th>
                    <th>Throughput (rows/s)</th>
                    <th>Memory (MB)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${report.metrics.map(m => `
                    <tr class="${m.regressionDetected ? 'regression' : ''}">
                        <td>${m.scenario}</td>
                        <td>${m.fileSize}</td>
                        <td>${m.rowCount.toLocaleString()}</td>
                        <td>${m.avgProcessingTime.toFixed(2)}</td>
                        <td>${m.avgThroughput.toFixed(0)}</td>
                        <td>${(m.avgMemoryUsed / (1024 * 1024)).toFixed(2)}</td>
                        <td>${m.regressionDetected ? '⚠️ Regression' : '✅ OK'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${report.performanceRegressions.length > 0 ? `
            <h2>Performance Regressions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Scenario</th>
                        <th>File Size</th>
                        <th>Metric</th>
                        <th>Baseline</th>
                        <th>Current</th>
                        <th>Change</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.performanceRegressions.map(r => `
                        <tr class="regression">
                            <td>${r.scenario}</td>
                            <td>${r.fileSize}</td>
                            <td>${r.metric}</td>
                            <td>${r.baseline.toFixed(2)}</td>
                            <td>${r.current.toFixed(2)}</td>
                            <td>${r.change}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
        
        <h2>Recommendations</h2>
        ${report.recommendations.map(r => `
            <div class="recommendation">${r}</div>
        `).join('')}
    </div>
    
    <script>
        ${this.generateChartScript(chartData)}
    </script>
</body>
</html>
    `;
  }

  /**
   * Prepare chart data from metrics
   */
  private prepareChartData(metrics: BenchmarkMetrics[]): any {
    // Group by scenario
    const scenarios = [...new Set(metrics.map(m => m.scenario))];
    const fileSizes = [...new Set(metrics.map(m => m.fileSize))];
    
    return {
      scenarios,
      fileSizes,
      throughput: scenarios.map(scenario => ({
        label: scenario,
        data: fileSizes.map(size => {
          const metric = metrics.find(m => m.scenario === scenario && m.fileSize === size);
          return metric ? metric.avgThroughput : 0;
        })
      })),
      memory: scenarios.map(scenario => ({
        label: scenario,
        data: fileSizes.map(size => {
          const metric = metrics.find(m => m.scenario === scenario && m.fileSize === size);
          return metric ? metric.avgMemoryUsed / (1024 * 1024) : 0;
        })
      })),
      scaling: scenarios.map(scenario => ({
        label: scenario,
        data: metrics
          .filter(m => m.scenario === scenario)
          .sort((a, b) => a.rowCount - b.rowCount)
          .map(m => ({
            x: m.rowCount,
            y: m.avgProcessingTime
          }))
      }))
    };
  }

  /**
   * Generate chart JavaScript
   */
  private generateChartScript(data: any): string {
    return `
        // Throughput Chart
        new Chart(document.getElementById('throughputChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.fileSizes)},
                datasets: ${JSON.stringify(data.throughput)}
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Processing Throughput (rows/second)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Memory Chart
        new Chart(document.getElementById('memoryChart'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(data.fileSizes)},
                datasets: ${JSON.stringify(data.memory)}
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Memory Usage (MB)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Scaling Chart
        new Chart(document.getElementById('scalingChart'), {
            type: 'scatter',
            data: {
                datasets: ${JSON.stringify(data.scaling)}
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Processing Time vs Row Count (Scaling Analysis)'
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Row Count'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Processing Time (ms)'
                        }
                    }
                }
            }
        });
    `;
  }

  /**
   * Load baseline metrics
   */
  private async loadBaseline(): Promise<void> {
    try {
      const baselineData = await fs.readFile(this.config.baselinePath, 'utf-8');
      const baseline = JSON.parse(baselineData);
      
      for (const metric of baseline.metrics || []) {
        const key = `${metric.scenario}-${metric.fileSize}`;
        this.baselineMetrics.set(key, metric);
      }
      
      this.emit('log', { message: `Loaded baseline with ${this.baselineMetrics.size} metrics` });
    } catch (error) {
      this.emit('log', { message: 'No baseline found, will create new baseline' });
    }
  }

  /**
   * Update baseline with current metrics
   */
  private async updateBaseline(metrics: BenchmarkMetrics[]): Promise<void> {
    const baseline = {
      timestamp: new Date().toISOString(),
      metrics
    };
    
    await fs.writeFile(this.config.baselinePath, JSON.stringify(baseline, null, 2));
    this.emit('log', { message: 'Baseline updated with current metrics' });
  }

  /**
   * Create necessary directories
   */
  private async createDirectories(): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });
    await fs.mkdir(this.config.tempDir, { recursive: true });
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(): Promise<void> {
    for (const file of this.tempFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Try to remove temp directory if empty
    try {
      await fs.rmdir(this.config.tempDir);
    } catch {
      // Ignore if not empty
    }
    
    this.tempFiles = [];
  }

  /**
   * Get test file path
   */
  private getTestFilePath(type: 'dialogue' | 'string', config: TestFileConfig): string {
    return path.join(
      this.config.tempDir,
      `test-${type}-${config.size}.${config.format}`
    );
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo(): any {
    const cpus = os.cpus();
    return {
      platform: `${os.platform()} ${os.arch()}`,
      cpus: cpus[0]?.model || 'Unknown',
      cpuCount: cpus.length,
      totalMemory: `${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      nodeVersion: process.version
    };
  }

  /**
   * Get GC count (if available)
   */
  private getGCCount(): number {
    // This is a simplified version - in production, you'd use v8 module
    return 0;
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.average(values);
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squaredDiffs));
  }
}

/**
 * Export factory function
 */
export function createBenchmarkSuite(config?: BenchmarkConfig): BenchmarkSuite {
  return new BenchmarkSuite(config);
}

/**
 * Run default benchmarks
 */
export async function runDefaultBenchmarks(config?: BenchmarkConfig): Promise<BenchmarkReport> {
  const suite = new BenchmarkSuite(config);
  return suite.runBenchmarks();
}