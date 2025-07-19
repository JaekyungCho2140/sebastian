#!/usr/bin/env node
import * as path from 'path';
import { program } from 'commander';
import { createBenchmarkSuite, BenchmarkScenario, TestFileConfig } from '../services/m4/performance/benchmark-suite';

/**
 * CLI for running performance benchmarks
 */
program
  .name('run-benchmark')
  .description('Run performance benchmarks for M4 processors')
  .version('1.0.0');

program
  .option('-o, --output <dir>', 'Output directory for reports', './benchmark-reports')
  .option('-t, --temp <dir>', 'Temporary directory for test files', undefined)
  .option('--no-html', 'Skip HTML report generation')
  .option('-b, --baseline', 'Compare with baseline')
  .option('--baseline-path <path>', 'Path to baseline file')
  .option('--no-cleanup', 'Do not cleanup temporary files after run')
  .option('-v, --verbose', 'Verbose output')
  .option('-s, --sizes <sizes>', 'Comma-separated list of file sizes (e.g., "1MB,10MB,50MB")', '1MB,10MB,50MB,100MB')
  .option('-i, --iterations <n>', 'Number of iterations per test', '3')
  .option('--scenario <type>', 'Run specific scenario: dialogue, string, or all', 'all')
  .option('--parallel', 'Include parallel processing tests')
  .option('--quick', 'Quick benchmark with smaller files and fewer iterations')
  .action(async (options) => {
    console.log('🚀 Starting M4 Performance Benchmark Suite');
    console.log('=========================================\n');
    
    try {
      // Parse file sizes
      const sizes = options.sizes.split(',').map((s: string) => s.trim());
      const iterations = parseInt(options.iterations);
      
      // Create file configs based on sizes
      const fileConfigs: TestFileConfig[] = sizes.map((size: string) => {
        const sizeMap: { [key: string]: { bytes: number, rows: number, sheets: number } } = {
          '1MB': { bytes: 1024 * 1024, rows: 5000, sheets: 2 },
          '10MB': { bytes: 10 * 1024 * 1024, rows: 50000, sheets: 3 },
          '50MB': { bytes: 50 * 1024 * 1024, rows: 250000, sheets: 4 },
          '100MB': { bytes: 100 * 1024 * 1024, rows: 500000, sheets: 5 },
          '500MB': { bytes: 500 * 1024 * 1024, rows: 2500000, sheets: 6 }
        };
        
        const config = sizeMap[size] || { bytes: 1024 * 1024, rows: 5000, sheets: 2 };
        
        return {
          size,
          sizeBytes: config.bytes,
          rowCount: config.rows,
          sheetCount: config.sheets,
          format: 'xlsx' as const
        };
      });
      
      // Create scenarios based on options
      const scenarios: BenchmarkScenario[] = [];
      
      if (options.scenario === 'all' || options.scenario === 'dialogue') {
        scenarios.push({
          name: 'M4 Dialogue Sequential Processing',
          description: 'Process M4 Dialogue files sequentially',
          processorType: 'dialogue',
          fileConfigs: options.quick ? fileConfigs.slice(0, 2) : fileConfigs,
          iterations: options.quick ? 1 : iterations,
          parallel: false,
          warmupRuns: options.quick ? 0 : 1
        });
      }
      
      if (options.scenario === 'all' || options.scenario === 'string') {
        scenarios.push({
          name: 'M4 String Sequential Processing',
          description: 'Process M4 String files sequentially',
          processorType: 'string',
          fileConfigs: options.quick ? fileConfigs.slice(0, 2) : fileConfigs,
          iterations: options.quick ? 1 : iterations,
          parallel: false,
          warmupRuns: options.quick ? 0 : 1
        });
      }
      
      if (options.parallel && !options.quick) {
        scenarios.push({
          name: 'M4 Dialogue Parallel Processing',
          description: 'Process multiple M4 Dialogue files in parallel',
          processorType: 'dialogue',
          fileConfigs: fileConfigs.slice(0, 3), // Only smaller files for parallel
          iterations,
          parallel: true,
          warmupRuns: 1
        });
        
        scenarios.push({
          name: 'M4 String Parallel Processing',
          description: 'Process multiple M4 String files in parallel',
          processorType: 'string',
          fileConfigs: fileConfigs.slice(0, 3),
          iterations,
          parallel: true,
          warmupRuns: 1
        });
      }
      
      // Create benchmark suite
      const suite = createBenchmarkSuite({
        outputDir: options.output,
        tempDir: options.temp,
        generateHtmlReport: options.html !== false,
        compareWithBaseline: options.baseline,
        baselinePath: options.baselinePath,
        cleanupAfterRun: options.cleanup !== false,
        verbose: options.verbose
      });
      
      // Handle events
      suite.on('phase', ({ phase }) => {
        console.log(`\n📋 ${phase}`);
      });
      
      suite.on('scenario', ({ scenario }) => {
        console.log(`\n🔄 Running scenario: ${scenario}`);
      });
      
      suite.on('fileConfig', ({ scenario, fileConfig }) => {
        console.log(`  📁 Testing ${fileConfig.size} file (${fileConfig.rowCount.toLocaleString()} rows)`);
      });
      
      suite.on('progress', ({ scenario, fileConfig, progress }) => {
        if (options.verbose) {
          process.stdout.write(`\r    Progress: ${progress.percentage}% - ${progress.currentStep}`);
        }
      });
      
      suite.on('batchProgress', ({ sheet, current, total }) => {
        if (options.verbose) {
          process.stdout.write(`\r    Processing ${sheet}: ${current}/${total} batches`);
        }
      });
      
      suite.on('memoryStats', (stats) => {
        if (options.verbose) {
          const heapMB = (stats.heapUsed / (1024 * 1024)).toFixed(2);
          process.stdout.write(`\r    Memory: ${heapMB}MB (${stats.usagePercentage.toFixed(1)}%)`);
        }
      });
      
      suite.on('log', ({ message }) => {
        if (options.verbose) {
          console.log(`  ℹ️  ${message}`);
        }
      });
      
      suite.on('reportsSaved', ({ jsonPath, htmlPath }) => {
        console.log('\n📊 Reports saved:');
        console.log(`  - JSON: ${jsonPath}`);
        if (htmlPath) {
          console.log(`  - HTML: ${htmlPath}`);
        }
      });
      
      // Run benchmarks
      console.log('Configuration:');
      console.log(`  - Output directory: ${options.output}`);
      console.log(`  - File sizes: ${sizes.join(', ')}`);
      console.log(`  - Iterations: ${iterations}`);
      console.log(`  - Scenarios: ${options.scenario}`);
      console.log(`  - Parallel tests: ${options.parallel ? 'Yes' : 'No'}`);
      console.log(`  - Compare with baseline: ${options.baseline ? 'Yes' : 'No'}`);
      console.log(`  - Generate HTML report: ${options.html !== false ? 'Yes' : 'No'}`);
      
      const report = await suite.runBenchmarks(scenarios);
      
      // Print summary
      console.log('\n\n📈 Benchmark Summary');
      console.log('===================\n');
      
      console.log('Time Complexity Analysis:');
      console.log(`  - Dialogue Processor: ${report.timeComplexityAnalysis.dialogue}`);
      console.log(`  - String Processor: ${report.timeComplexityAnalysis.string}`);
      
      if (report.performanceRegressions.length > 0) {
        console.log('\n⚠️  Performance Regressions Detected:');
        for (const regression of report.performanceRegressions) {
          console.log(`  - ${regression.scenario} (${regression.fileSize}): ${regression.metric} ${regression.change}`);
        }
      } else {
        console.log('\n✅ No performance regressions detected');
      }
      
      console.log('\n📊 Top Performance Metrics:');
      const sortedMetrics = report.metrics.sort((a, b) => b.avgThroughput - a.avgThroughput);
      for (const metric of sortedMetrics.slice(0, 5)) {
        console.log(`  - ${metric.scenario} (${metric.fileSize}): ${metric.avgThroughput.toFixed(0)} rows/s`);
      }
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        for (const recommendation of report.recommendations) {
          console.log(`  - ${recommendation}`);
        }
      }
      
      console.log('\n✨ Benchmark completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Benchmark failed:', error);
      process.exit(1);
    }
  });

program
  .command('compare <report1> <report2>')
  .description('Compare two benchmark reports')
  .action(async (report1Path, report2Path) => {
    try {
      const fs = require('fs').promises;
      const report1 = JSON.parse(await fs.readFile(report1Path, 'utf-8'));
      const report2 = JSON.parse(await fs.readFile(report2Path, 'utf-8'));
      
      console.log('📊 Benchmark Comparison');
      console.log('======================\n');
      
      console.log(`Report 1: ${report1.startTime}`);
      console.log(`Report 2: ${report2.startTime}\n`);
      
      // Compare metrics
      const metricsMap1 = new Map(report1.metrics.map((m: any) => [`${m.scenario}-${m.fileSize}`, m]));
      const metricsMap2 = new Map(report2.metrics.map((m: any) => [`${m.scenario}-${m.fileSize}`, m]));
      
      console.log('Performance Changes:');
      console.log('-------------------');
      
      for (const [key, metric1] of metricsMap1) {
        const metric2 = metricsMap2.get(key);
        if (!metric2) continue;
        
        const timeChange = (((metric2 as any).avgProcessingTime - (metric1 as any).avgProcessingTime) / (metric1 as any).avgProcessingTime) * 100;
        const throughputChange = (((metric2 as any).avgThroughput - (metric1 as any).avgThroughput) / (metric1 as any).avgThroughput) * 100;
        const memoryChange = (((metric2 as any).avgMemoryUsed - (metric1 as any).avgMemoryUsed) / (metric1 as any).avgMemoryUsed) * 100;
        
        console.log(`\n${key}:`);
        console.log(`  Processing Time: ${timeChange > 0 ? '+' : ''}${timeChange.toFixed(1)}%`);
        console.log(`  Throughput: ${throughputChange > 0 ? '+' : ''}${throughputChange.toFixed(1)}%`);
        console.log(`  Memory Usage: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}%`);
        
        if (Math.abs(timeChange) > 10) {
          console.log(`  ⚠️  Significant ${timeChange > 0 ? 'degradation' : 'improvement'} in processing time`);
        }
      }
      
    } catch (error) {
      console.error('❌ Comparison failed:', error);
      process.exit(1);
    }
  });

program
  .command('baseline <reportPath>')
  .description('Set a report as the new baseline')
  .option('-o, --output <dir>', 'Output directory for baseline', './benchmark-reports')
  .action(async (reportPath, options) => {
    try {
      const fs = require('fs').promises;
      const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      
      const baselinePath = path.join(options.output, 'baseline.json');
      const baseline = {
        timestamp: new Date().toISOString(),
        metrics: report.metrics
      };
      
      await fs.mkdir(options.output, { recursive: true });
      await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2));
      
      console.log(`✅ Baseline updated: ${baselinePath}`);
      console.log(`   Contains ${report.metrics.length} metrics from ${report.startTime}`);
      
    } catch (error) {
      console.error('❌ Failed to set baseline:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}