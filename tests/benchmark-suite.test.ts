import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { 
  createBenchmarkSuite, 
  BenchmarkSuite,
  BenchmarkScenario,
  TestFileConfig 
} from '../src/services/m4/performance/benchmark-suite';

describe('BenchmarkSuite', () => {
  let tempDir: string;
  let outputDir: string;
  
  beforeAll(async () => {
    // Create temporary directories for testing
    tempDir = path.join(os.tmpdir(), 'sebastian-benchmark-test-' + Date.now());
    outputDir = path.join(tempDir, 'reports');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });
  
  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  });
  
  describe('Basic functionality', () => {
    it('should create benchmark suite instance', () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir
      });
      
      expect(suite).toBeInstanceOf(BenchmarkSuite);
    });
    
    it('should run quick benchmark with small files', async () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false,
        cleanupAfterRun: false,
        verbose: false
      });
      
      // Define minimal test scenario
      const scenarios: BenchmarkScenario[] = [{
        name: 'Quick Test',
        description: 'Quick test scenario',
        processorType: 'dialogue',
        fileConfigs: [{
          size: 'test',
          sizeBytes: 1024 * 100, // 100KB
          rowCount: 100,
          sheetCount: 2,
          format: 'xlsx'
        }],
        iterations: 1,
        parallel: false,
        warmupRuns: 0
      }];
      
      const report = await suite.runBenchmarks(scenarios);
      
      expect(report).toBeDefined();
      expect(report.scenarios).toHaveLength(1);
      expect(report.results).toHaveLength(1);
      expect(report.metrics).toHaveLength(1);
      expect(report.timeComplexityAnalysis).toBeDefined();
    }, 60000); // 60 second timeout for benchmark
    
    it('should detect linear time complexity', async () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false,
        cleanupAfterRun: false
      });
      
      // Create scenarios with different sizes to test complexity
      const fileConfigs: TestFileConfig[] = [
        { size: 'small', sizeBytes: 1024 * 100, rowCount: 100, sheetCount: 2, format: 'xlsx' },
        { size: 'medium', sizeBytes: 1024 * 500, rowCount: 500, sheetCount: 2, format: 'xlsx' },
        { size: 'large', sizeBytes: 1024 * 1000, rowCount: 1000, sheetCount: 2, format: 'xlsx' }
      ];
      
      const scenarios: BenchmarkScenario[] = [{
        name: 'Complexity Test',
        description: 'Test time complexity analysis',
        processorType: 'dialogue',
        fileConfigs,
        iterations: 2,
        parallel: false,
        warmupRuns: 0
      }];
      
      const report = await suite.runBenchmarks(scenarios);
      
      expect(report.timeComplexityAnalysis.dialogue).toBe('O(n)');
      expect(report.timeComplexityAnalysis.analysis).toContain('linear');
    }, 120000); // 2 minute timeout
  });
  
  describe('Report generation', () => {
    it('should generate JSON report', async () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false
      });
      
      const scenarios: BenchmarkScenario[] = [{
        name: 'Report Test',
        description: 'Test report generation',
        processorType: 'string',
        fileConfigs: [{
          size: 'tiny',
          sizeBytes: 1024 * 50,
          rowCount: 50,
          sheetCount: 1,
          format: 'xlsx'
        }],
        iterations: 1,
        parallel: false
      }];
      
      const report = await suite.runBenchmarks(scenarios);
      
      expect(report.jsonReport).toBeDefined();
      
      // Check if JSON file exists
      const jsonExists = await fs.access(report.jsonReport!)
        .then(() => true)
        .catch(() => false);
      
      expect(jsonExists).toBe(true);
      
      // Read and validate JSON
      const jsonContent = await fs.readFile(report.jsonReport!, 'utf-8');
      const parsedReport = JSON.parse(jsonContent);
      
      expect(parsedReport.scenarios).toEqual(report.scenarios);
      expect(parsedReport.metrics).toEqual(report.metrics);
    }, 60000);
    
    it('should generate HTML report when enabled', async () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: true
      });
      
      const scenarios: BenchmarkScenario[] = [{
        name: 'HTML Report Test',
        description: 'Test HTML report generation',
        processorType: 'dialogue',
        fileConfigs: [{
          size: 'mini',
          sizeBytes: 1024 * 30,
          rowCount: 30,
          sheetCount: 1,
          format: 'xlsx'
        }],
        iterations: 1,
        parallel: false
      }];
      
      const report = await suite.runBenchmarks(scenarios);
      
      expect(report.htmlReport).toBeDefined();
      
      // Check if HTML file exists
      const htmlExists = await fs.access(report.htmlReport!)
        .then(() => true)
        .catch(() => false);
      
      expect(htmlExists).toBe(true);
      
      // Read and validate HTML content
      const htmlContent = await fs.readFile(report.htmlReport!, 'utf-8');
      
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Benchmark Report');
      expect(htmlContent).toContain('Chart.js');
      expect(htmlContent).toContain(report.scenarios[0].name);
    }, 60000);
  });
  
  describe('Baseline comparison', () => {
    it('should save and load baseline', async () => {
      const baselinePath = path.join(outputDir, 'test-baseline.json');
      
      // First run - create baseline
      const suite1 = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false,
        baselinePath
      });
      
      const scenarios: BenchmarkScenario[] = [{
        name: 'Baseline Test',
        description: 'Create baseline',
        processorType: 'dialogue',
        fileConfigs: [{
          size: 'baseline',
          sizeBytes: 1024 * 40,
          rowCount: 40,
          sheetCount: 1,
          format: 'xlsx'
        }],
        iterations: 1,
        parallel: false
      }];
      
      await suite1.runBenchmarks(scenarios);
      
      // Check baseline exists
      const baselineExists = await fs.access(baselinePath)
        .then(() => true)
        .catch(() => false);
      
      expect(baselineExists).toBe(true);
      
      // Second run - compare with baseline
      const suite2 = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false,
        compareWithBaseline: true,
        baselinePath
      });
      
      const report = await suite2.runBenchmarks(scenarios);
      
      // Should have no regressions since it's the same test
      expect(report.performanceRegressions).toHaveLength(0);
    }, 120000);
  });
  
  describe('Event handling', () => {
    it('should emit progress events', async () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false,
        verbose: true
      });
      
      const events: string[] = [];
      
      suite.on('start', () => events.push('start'));
      suite.on('phase', ({ phase }) => events.push(`phase:${phase}`));
      suite.on('scenario', ({ scenario }) => events.push(`scenario:${scenario}`));
      suite.on('complete', () => events.push('complete'));
      
      const scenarios: BenchmarkScenario[] = [{
        name: 'Event Test',
        description: 'Test event emission',
        processorType: 'string',
        fileConfigs: [{
          size: 'events',
          sizeBytes: 1024 * 20,
          rowCount: 20,
          sheetCount: 1,
          format: 'xlsx'
        }],
        iterations: 1,
        parallel: false
      }];
      
      await suite.runBenchmarks(scenarios);
      
      expect(events).toContain('start');
      expect(events).toContain('phase:Generating test files');
      expect(events).toContain('scenario:Event Test');
      expect(events).toContain('complete');
    }, 60000);
  });
  
  describe('Recommendations', () => {
    it('should generate recommendations for performance issues', async () => {
      const suite = createBenchmarkSuite({
        outputDir,
        tempDir,
        generateHtmlReport: false
      });
      
      // Create a scenario that might trigger recommendations
      const scenarios: BenchmarkScenario[] = [{
        name: 'High Memory Test',
        description: 'Test that uses more memory',
        processorType: 'dialogue',
        fileConfigs: [{
          size: 'memory-test',
          sizeBytes: 1024 * 1024, // 1MB
          rowCount: 5000,
          sheetCount: 3,
          format: 'xlsx'
        }],
        iterations: 3,
        parallel: false
      }];
      
      const report = await suite.runBenchmarks(scenarios);
      
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      
      // Should have at least one recommendation about variance if iterations > 1
      if (report.metrics.some(m => m.stdDevProcessingTime / m.avgProcessingTime > 0.2)) {
        const hasVarianceRecommendation = report.recommendations.some(r => 
          r.includes('variance') || r.includes('inconsistent')
        );
        expect(hasVarianceRecommendation).toBe(true);
      }
    }, 120000);
  });
});