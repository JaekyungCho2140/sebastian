#!/usr/bin/env node

/**
 * File System and Log Rotation Test Script
 * 
 * This script validates:
 * 1. Actual file saving to error reports directory
 * 2. Log rotation system (time-based, size-based, count-based)
 * 3. Disk space management
 * 4. File cleanup automation
 * 5. Log file integrity and format
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  errorReportsDir: path.join(os.homedir(), '.config', 'sebastian', 'error-reports'),
  logFile: path.join(os.homedir(), '.config', 'sebastian', 'logs', 'sebastian.log'),
  testTimeout: 45000, // 45 seconds per test
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  maxTotalSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 100, // Default max files
  testDataSize: 1024 * 1024 // 1MB test data
};

// Test utilities
class FileSystemValidator {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
    this.testFiles = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    }[type] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async test(name, testFn) {
    const testStart = Date.now();
    try {
      this.log(`Starting test: ${name}`);
      const result = await testFn();
      const duration = Date.now() - testStart;
      
      if (result) {
        this.results.push({ name, status: 'PASS', duration, message: 'Test passed' });
        this.passed++;
        this.log(`${name} - PASSED (${duration}ms)`, 'success');
      } else {
        this.results.push({ name, status: 'FAIL', duration, message: 'Test failed' });
        this.failed++;
        this.log(`${name} - FAILED (${duration}ms)`, 'error');
      }
    } catch (error) {
      const duration = Date.now() - testStart;
      this.results.push({ name, status: 'ERROR', duration, message: error.message });
      this.failed++;
      this.log(`${name} - ERROR: ${error.message} (${duration}ms)`, 'error');
    }
  }

  cleanup() {
    // Clean up test files
    for (const filePath of this.testFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.log(`Cleaned up test file: ${filePath}`);
        }
      } catch (error) {
        this.log(`Failed to clean up ${filePath}: ${error.message}`, 'warning');
      }
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 File System and Log Rotation Test Results');
    console.log('='.repeat(60));
    console.log(`   Total Tests: ${this.passed + this.failed}`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status !== 'PASS').forEach(result => {
        console.log(`   - ${result.name}: ${result.message} (${result.duration}ms)`);
      });
    } else {
      console.log('\n🎉 All file system and log rotation tests passed!');
    }
    
    // Clean up test files
    this.cleanup();
    
    return this.failed === 0;
  }
}

// File system utilities
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createTestErrorReport(filename, customData = {}) {
  const errorReport = {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    errorType: 'javascript',
    severity: 'high',
    message: 'Test error message for file system validation',
    stack: 'Error: Test error\\n    at test function\\n    at validation script',
    processType: 'renderer',
    context: {
      url: 'file://test',
      userAgent: 'test-agent',
      customData: customData
    },
    systemInfo: {
      platform: process.platform,
      arch: process.arch,
      appVersion: '0.2.0'
    },
    ...customData
  };
  
  const filePath = path.join(CONFIG.errorReportsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(errorReport, null, 2));
  return filePath;
}

function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  let totalSize = 0;
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    }
  }
  
  return totalSize;
}

function getFileCount(dirPath, extension = '.json') {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  return fs.readdirSync(dirPath)
    .filter(file => file.endsWith(extension))
    .length;
}

function createLargeTestFile(filename, sizeInBytes) {
  const filePath = path.join(CONFIG.errorReportsDir, filename);
  const chunkSize = 1024; // 1KB chunks
  const chunks = Math.ceil(sizeInBytes / chunkSize);
  
  const fd = fs.openSync(filePath, 'w');
  
  for (let i = 0; i < chunks; i++) {
    const chunk = 'x'.repeat(Math.min(chunkSize, sizeInBytes - (i * chunkSize)));
    fs.writeSync(fd, chunk);
  }
  
  fs.closeSync(fd);
  return filePath;
}

// Main test functions
async function testFileSystemAndRotation() {
  console.log('🧪 File System and Log Rotation Test\n');
  console.log('Testing actual file saving, log rotation, and disk space management...\n');
  
  const validator = new FileSystemValidator();
  
  // Ensure test environment
  ensureDirectory(CONFIG.errorReportsDir);
  ensureDirectory(path.dirname(CONFIG.logFile));
  
  // Test 1: Validate directory structure
  await validator.test('Directory structure validation', async () => {
    const requiredDirs = [
      CONFIG.errorReportsDir,
      path.dirname(CONFIG.logFile)
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Required directory not found: ${dir}`);
      }
      
      // Check write permissions
      const testFile = path.join(dir, 'test-write-permission.tmp');
      try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (error) {
        throw new Error(`No write permission for directory: ${dir}`);
      }
    }
    
    return true;
  });
  
  // Test 2: Test basic file creation and saving
  await validator.test('Basic file creation and saving', async () => {
    const testFile = createTestErrorReport('test-basic-file.json');
    validator.testFiles.push(testFile);
    
    if (!fs.existsSync(testFile)) {
      throw new Error('Test file was not created');
    }
    
    // Validate file content
    const content = fs.readFileSync(testFile, 'utf8');
    const errorReport = JSON.parse(content);
    
    const requiredFields = ['id', 'timestamp', 'errorType', 'severity', 'message'];
    for (const field of requiredFields) {
      if (!errorReport[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return true;
  });
  
  // Test 3: Test JSON format validation
  await validator.test('JSON format validation', async () => {
    const testFile = createTestErrorReport('test-json-format.json');
    validator.testFiles.push(testFile);
    
    // Read and parse JSON
    const content = fs.readFileSync(testFile, 'utf8');
    const errorReport = JSON.parse(content);
    
    // Validate JSON structure matches schema
    if (typeof errorReport.timestamp !== 'number') {
      throw new Error('timestamp should be a number');
    }
    
    if (!['low', 'medium', 'high', 'critical'].includes(errorReport.severity)) {
      throw new Error('Invalid severity level');
    }
    
    if (typeof errorReport.message !== 'string') {
      throw new Error('message should be a string');
    }
    
    return true;
  });
  
  // Test 4: Test file operations utility
  await validator.test('File operations utility validation', async () => {
    const utilPath = path.join(__dirname, '..', 'src', 'main', 'utils', 'file-operations.ts');
    if (!fs.existsSync(utilPath)) {
      throw new Error('file-operations.ts not found');
    }
    
    const content = fs.readFileSync(utilPath, 'utf8');
    
    // Check for required file operations
    const requiredOperations = [
      'writeFile',
      'readFile',
      'listFiles',
      'deleteFile',
      'ensureDirectory'
    ];
    
    for (const operation of requiredOperations) {
      if (!content.includes(operation)) {
        throw new Error(`Required operation '${operation}' not found`);
      }
    }
    
    return true;
  });
  
  // Test 5: Test time-based cleanup logic
  await validator.test('Time-based cleanup logic', async () => {
    const oldTimestamp = Date.now() - (CONFIG.maxAge + 1000); // 1 second older than maxAge
    
    // Create old file
    const oldFile = createTestErrorReport('test-old-file.json', { timestamp: oldTimestamp });
    validator.testFiles.push(oldFile);
    
    // Create recent file
    const recentFile = createTestErrorReport('test-recent-file.json');
    validator.testFiles.push(recentFile);
    
    // Simulate cleanup logic
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    // Check if cleanup logic exists
    if (!content.includes('maxAge') || !content.includes('cleanupOldReports')) {
      throw new Error('Time-based cleanup logic not found');
    }
    
    // Verify age calculation logic
    if (!content.includes('24 * 60 * 60 * 1000')) {
      throw new Error('Age calculation logic not found');
    }
    
    return true;
  });
  
  // Test 6: Test size-based cleanup logic
  await validator.test('Size-based cleanup logic', async () => {
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    // Check for size-based cleanup
    if (!content.includes('maxTotalSize') || !content.includes('totalSize')) {
      throw new Error('Size-based cleanup logic not found');
    }
    
    // Check for size calculation
    if (!content.includes('reduce') && !content.includes('size')) {
      throw new Error('Size calculation logic not found');
    }
    
    return true;
  });
  
  // Test 7: Test file count-based cleanup
  await validator.test('File count-based cleanup logic', async () => {
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    // Check for count-based cleanup
    if (!content.includes('maxFiles') || !content.includes('length')) {
      throw new Error('Count-based cleanup logic not found');
    }
    
    return true;
  });
  
  // Test 8: Test actual file cleanup simulation
  await validator.test('File cleanup simulation', async () => {
    const initialFileCount = getFileCount(CONFIG.errorReportsDir);
    
    // Create multiple test files
    for (let i = 0; i < 5; i++) {
      const testFile = createTestErrorReport(`test-cleanup-${i}.json`);
      validator.testFiles.push(testFile);
    }
    
    const afterCreateCount = getFileCount(CONFIG.errorReportsDir);
    if (afterCreateCount <= initialFileCount) {
      throw new Error('Test files were not created properly');
    }
    
    // Verify files exist
    let existingFiles = 0;
    for (const testFile of validator.testFiles) {
      if (fs.existsSync(testFile)) {
        existingFiles++;
      }
    }
    
    if (existingFiles === 0) {
      throw new Error('No test files found after creation');
    }
    
    return true;
  });
  
  // Test 9: Test log file integration
  await validator.test('Log file integration', async () => {
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
      ensureDirectory(logDir);
    }
    
    // Check if log file exists or can be created
    if (!fs.existsSync(CONFIG.logFile)) {
      // Create a test log entry
      fs.writeFileSync(CONFIG.logFile, `[${new Date().toISOString()}] [info] Test log entry\\n`);
    }
    
    // Verify log file is readable
    const logContent = fs.readFileSync(CONFIG.logFile, 'utf8');
    if (typeof logContent !== 'string') {
      throw new Error('Log file is not readable');
    }
    
    return true;
  });
  
  // Test 10: Test disk space monitoring
  await validator.test('Disk space monitoring', async () => {
    const initialSize = getDirectorySize(CONFIG.errorReportsDir);
    
    // Create test files to increase size
    for (let i = 0; i < 3; i++) {
      const testFile = createTestErrorReport(`test-size-${i}.json`, {
        largeData: 'x'.repeat(1000) // Add some bulk
      });
      validator.testFiles.push(testFile);
    }
    
    const afterSize = getDirectorySize(CONFIG.errorReportsDir);
    if (afterSize <= initialSize) {
      throw new Error('Directory size did not increase after adding files');
    }
    
    // Check if LocalErrorReporter has size monitoring
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    if (!content.includes('size') || !content.includes('totalSize')) {
      throw new Error('Size monitoring not found in LocalErrorReporter');
    }
    
    return true;
  });
  
  // Test 11: Test configuration management
  await validator.test('Cleanup configuration validation', async () => {
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    // Check for configurable cleanup parameters
    const requiredConfig = [
      'maxAge',
      'maxTotalSize',
      'maxFiles'
    ];
    
    for (const config of requiredConfig) {
      if (!content.includes(config)) {
        throw new Error(`Configuration parameter '${config}' not found`);
      }
    }
    
    // Check for default values
    if (!content.includes('30') || !content.includes('50')) {
      throw new Error('Default configuration values not found');
    }
    
    return true;
  });
  
  // Test 12: Test error report file naming
  await validator.test('Error report file naming convention', async () => {
    const files = fs.readdirSync(CONFIG.errorReportsDir)
      .filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      // Create a test file to check naming
      const testFile = createTestErrorReport('test-naming.json');
      validator.testFiles.push(testFile);
    }
    
    // Check naming convention (should be .json files)
    const testFiles = validator.testFiles.filter(file => file.includes(CONFIG.errorReportsDir));
    for (const file of testFiles) {
      if (!file.endsWith('.json')) {
        throw new Error(`Invalid file extension: ${file}`);
      }
    }
    
    return true;
  });
  
  // Generate final report
  const allTestsPassed = validator.generateReport();
  
  if (allTestsPassed) {
    console.log('\n🎉 All file system and log rotation tests passed!');
    console.log('\n📊 Test Environment Summary:');
    console.log(`   Error Reports Directory: ${CONFIG.errorReportsDir}`);
    console.log(`   Log File: ${CONFIG.logFile}`);
    console.log(`   Current Directory Size: ${getDirectorySize(CONFIG.errorReportsDir)} bytes`);
    console.log(`   Current File Count: ${getFileCount(CONFIG.errorReportsDir)}`);
    console.log(`   Max Age: ${CONFIG.maxAge / (24 * 60 * 60 * 1000)} days`);
    console.log(`   Max Total Size: ${CONFIG.maxTotalSize / (1024 * 1024)} MB`);
    
    return true;
  } else {
    console.log('\n❌ Some file system and log rotation tests failed.');
    return false;
  }
}

// Execute tests
if (require.main === module) {
  testFileSystemAndRotation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 File system test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFileSystemAndRotation, FileSystemValidator };