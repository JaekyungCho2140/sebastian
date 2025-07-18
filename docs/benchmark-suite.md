# Benchmarking Suite Documentation

## Overview

The Benchmarking Suite is a comprehensive performance testing tool for M4 processors in Sebastian. It measures performance across various file sizes, validates linear time complexity, and detects performance regressions.

## Features

- **Automated Test File Generation**: Creates test files from 1MB to 500MB
- **Time Complexity Analysis**: Validates O(n) performance characteristics
- **Memory Profiling**: Tracks heap usage, peak memory, and growth rates
- **Performance Regression Detection**: Compares against baseline metrics
- **Multiple Output Formats**: JSON data and interactive HTML reports
- **Parallel vs Sequential Comparison**: Measures concurrency benefits

## Installation

```bash
npm install
```

## Usage

### Quick Benchmark

Run a quick benchmark with small files:

```bash
npm run benchmark:quick
```

### Standard Benchmark

Run standard benchmark with default settings:

```bash
npm run benchmark
```

### Full Benchmark

Run comprehensive benchmark with all file sizes:

```bash
npm run benchmark:full
```

### Custom Benchmark

```bash
npm run benchmark -- --sizes "1MB,10MB,50MB" --iterations 5 --output ./my-reports
```

### Options

- `--output <dir>`: Output directory for reports (default: `./benchmark-reports`)
- `--temp <dir>`: Temporary directory for test files
- `--no-html`: Skip HTML report generation
- `--baseline`: Compare with baseline
- `--baseline-path <path>`: Custom baseline file path
- `--no-cleanup`: Keep temporary files after run
- `--verbose`: Show detailed progress
- `--sizes <sizes>`: Comma-separated file sizes (e.g., "1MB,10MB,50MB")
- `--iterations <n>`: Number of iterations per test
- `--scenario <type>`: Run specific scenario: dialogue, string, or all
- `--parallel`: Include parallel processing tests
- `--quick`: Quick mode with minimal tests

## Scenarios

### 1. M4 Dialogue Sequential Processing
- Processes dialogue Excel files with NPC mappings
- Tests streaming performance with various file sizes
- Validates memory efficiency

### 2. M4 String Sequential Processing
- Processes multi-language string Excel files
- Tests category and subcategory handling
- Measures localization processing overhead

### 3. Parallel Processing (Optional)
- Runs multiple files concurrently
- Measures scalability and resource utilization
- Compares throughput vs sequential processing

## Metrics

### Performance Metrics
- **Processing Time**: Total time to process file
- **Throughput**: Rows processed per second
- **Memory Usage**: Heap memory consumed
- **Peak Memory**: Maximum memory during processing
- **GC Count**: Number of garbage collections

### Statistical Analysis
- Average, min, max processing times
- Standard deviation for stability analysis
- Time complexity curve fitting (O(n), O(log n), O(n²))
- R² values for complexity validation

## Reports

### JSON Report
Contains raw data including:
- Environment information
- Detailed run results
- Aggregated metrics
- Time complexity analysis
- Performance recommendations

### HTML Report
Interactive report with:
- Performance charts (Chart.js)
- Throughput comparisons
- Memory usage visualization
- Scaling analysis graphs
- Regression highlights

## Baseline Management

### Create Baseline
After a good benchmark run:
```bash
npm run benchmark:baseline ./benchmark-reports/benchmark-report-2025-01-01.json
```

### Compare with Baseline
```bash
npm run benchmark -- --baseline
```

### Compare Two Reports
```bash
npm run benchmark:compare report1.json report2.json
```

## Performance Recommendations

The suite automatically generates recommendations based on:
- Time complexity deviations from O(n)
- High memory usage patterns
- Performance variance between runs
- Regression detection
- Parallel vs sequential efficiency

## Example Output

```
🚀 Starting M4 Performance Benchmark Suite
=========================================

Configuration:
  - Output directory: ./benchmark-reports
  - File sizes: 1MB, 10MB, 50MB, 100MB
  - Iterations: 3
  - Scenarios: all

📋 Generating test files

🔄 Running scenario: M4 Dialogue Sequential Processing
  📁 Testing 1MB file (5,000 rows)
  📁 Testing 10MB file (50,000 rows)
  ...

📈 Benchmark Summary
===================

Time Complexity Analysis:
  - Dialogue Processor: O(n) (R² = 0.998)
  - String Processor: O(n) (R² = 0.997)

✅ No performance regressions detected

📊 Top Performance Metrics:
  - M4 Dialogue Sequential (10MB): 25,000 rows/s
  - M4 String Sequential (10MB): 22,000 rows/s

💡 Recommendations:
  - Both processors demonstrate linear time complexity
  - Memory usage scales linearly (0.21 KB per row)

✨ Benchmark completed successfully!
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run Performance Benchmark
  run: npm run benchmark -- --baseline --output ./benchmark-reports
  
- name: Upload Benchmark Reports
  uses: actions/upload-artifact@v3
  with:
    name: benchmark-reports
    path: ./benchmark-reports/
```

## Troubleshooting

### Out of Memory Errors
- Reduce file sizes with `--sizes "1MB,10MB"`
- Lower iteration count with `--iterations 1`
- Enable garbage collection with `node --expose-gc`

### Slow Performance
- Use `--quick` mode for faster results
- Reduce parallel tests
- Check system resource availability

### Missing Dependencies
```bash
npm install commander exceljs
npm install -D @jest/globals ts-node ts-jest
```

## Advanced Usage

### Custom Scenarios

Create custom benchmark scenarios:

```typescript
const customScenario: BenchmarkScenario = {
  name: 'My Custom Test',
  description: 'Custom performance test',
  processorType: 'dialogue',
  fileConfigs: [
    {
      size: 'custom',
      sizeBytes: 1024 * 1024 * 25, // 25MB
      rowCount: 125000,
      sheetCount: 3,
      format: 'xlsx'
    }
  ],
  iterations: 5,
  parallel: false,
  warmupRuns: 2
};

const suite = createBenchmarkSuite();
await suite.runBenchmarks([customScenario]);
```

### Event Handling

Monitor benchmark progress:

```typescript
suite.on('progress', ({ percentage, currentStep }) => {
  console.log(`Progress: ${percentage}% - ${currentStep}`);
});

suite.on('memoryAlert', (alert) => {
  console.warn('Memory alert:', alert);
});
```

## Contributing

When adding new processors or optimizations:
1. Run benchmarks before and after changes
2. Compare results to detect regressions
3. Update baseline if performance improves
4. Document any significant changes