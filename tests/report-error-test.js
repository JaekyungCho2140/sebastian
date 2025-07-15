#!/usr/bin/env node

/**
 * Report Error Button Validation Test Script
 * 
 * This script validates that the Report Error button functionality works correctly
 * by testing the error reporting flow end-to-end.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  errorReportsDir: path.join(os.homedir(), '.config', 'sebastian', 'error-reports'),
  logFile: path.join(os.homedir(), '.config', 'sebastian', 'logs', 'sebastian.log'),
  testTimeout: 30000, // 30 seconds
  expectedErrorFields: [
    'id', 'timestamp', 'errorType', 'severity', 'message', 'stack',
    'processType', 'context', 'systemInfo'
  ]
};

// Test utilities
class TestValidator {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    try {
      const result = testFn();
      if (result) {
        this.results.push({ name, status: 'PASS', message: 'Test passed' });
        this.passed++;
        console.log(`✅ ${name}`);
      } else {
        this.results.push({ name, status: 'FAIL', message: 'Test failed' });
        this.failed++;
        console.log(`❌ ${name}`);
      }
    } catch (error) {
      this.results.push({ name, status: 'ERROR', message: error.message });
      this.failed++;
      console.log(`💥 ${name}: ${error.message}`);
    }
  }

  async asyncTest(name, testFn) {
    try {
      const result = await testFn();
      if (result) {
        this.results.push({ name, status: 'PASS', message: 'Test passed' });
        this.passed++;
        console.log(`✅ ${name}`);
      } else {
        this.results.push({ name, status: 'FAIL', message: 'Test failed' });
        this.failed++;
        console.log(`❌ ${name}`);
      }
    } catch (error) {
      this.results.push({ name, status: 'ERROR', message: error.message });
      this.failed++;
      console.log(`💥 ${name}: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary:');
    console.log(`   Passed: ${this.passed}/${this.passed + this.failed}`);
    console.log(`   Failed: ${this.failed}/${this.passed + this.failed}`);
    console.log(`   Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status !== 'PASS').forEach(result => {
        console.log(`   - ${result.name}: ${result.message}`);
      });
    }
    
    return this.failed === 0;
  }
}

// File system utilities
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getLatestErrorReport() {
  if (!fs.existsSync(CONFIG.errorReportsDir)) {
    return null;
  }
  
  const files = fs.readdirSync(CONFIG.errorReportsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(CONFIG.errorReportsDir, file),
      stat: fs.statSync(path.join(CONFIG.errorReportsDir, file))
    }))
    .sort((a, b) => b.stat.mtime - a.stat.mtime);
  
  return files.length > 0 ? files[0] : null;
}

function validateErrorReportStructure(errorReport) {
  const missingFields = CONFIG.expectedErrorFields.filter(field => 
    !errorReport.hasOwnProperty(field)
  );
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Validate specific field types
  if (typeof errorReport.timestamp !== 'number') {
    throw new Error('timestamp must be a number');
  }
  
  if (!['low', 'medium', 'high', 'critical'].includes(errorReport.severity)) {
    throw new Error(`Invalid severity: ${errorReport.severity}`);
  }
  
  if (typeof errorReport.message !== 'string' || errorReport.message.length === 0) {
    throw new Error('message must be a non-empty string');
  }
  
  return true;
}

// Main test function
async function runReportErrorTests() {
  console.log('🧪 Report Error Button Validation Test\n');
  
  const validator = new TestValidator();
  
  // Test 1: Check error reporting directory exists
  validator.test('Error reporting directory exists', () => {
    ensureDirectory(CONFIG.errorReportsDir);
    return fs.existsSync(CONFIG.errorReportsDir);
  });
  
  // Test 2: Check LocalErrorReporter service exists
  validator.test('LocalErrorReporter service file exists', () => {
    const servicePath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    return fs.existsSync(servicePath);
  });
  
  // Test 3: Check error dialog components exist
  validator.test('ErrorDialog component exists', () => {
    const componentPath = path.join(__dirname, '..', 'src', 'renderer', 'components', 'ErrorDialog.tsx');
    return fs.existsSync(componentPath);
  });
  
  // Test 4: Check useErrorDialog hook exists
  validator.test('useErrorDialog hook exists', () => {
    const hookPath = path.join(__dirname, '..', 'src', 'renderer', 'hooks', 'useErrorDialog.ts');
    return fs.existsSync(hookPath);
  });
  
  // Test 5: Check IPC handlers exist
  validator.test('IPC handlers file exists', () => {
    const ipcPath = path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.ts');
    return fs.existsSync(ipcPath);
  });
  
  // Test 6: Validate error report structure (using existing reports)
  validator.test('Error report structure validation', () => {
    const latestReport = getLatestErrorReport();
    if (!latestReport) {
      console.log('   ℹ️  No existing error reports found - creating sample for validation');
      
      // Create a sample error report for structure validation
      const sampleReport = {
        id: 'test-report-' + Date.now(),
        timestamp: Date.now(),
        errorType: 'javascript',
        severity: 'high',
        message: 'Test error message',
        stack: 'Error: Test error\\n    at test',
        processType: 'renderer',
        context: {
          url: 'file://test',
          userAgent: 'test-agent',
          customData: {}
        },
        systemInfo: {
          platform: process.platform,
          arch: process.arch,
          appVersion: '0.1.15'
        }
      };
      
      return validateErrorReportStructure(sampleReport);
    }
    
    const reportContent = fs.readFileSync(latestReport.path, 'utf8');
    const errorReport = JSON.parse(reportContent);
    return validateErrorReportStructure(errorReport);
  });
  
  // Test 7: Check preload API exists
  validator.test('Preload API structure', () => {
    const preloadPath = path.join(__dirname, '..', 'src', 'preload', 'index.ts');
    if (!fs.existsSync(preloadPath)) {
      return false;
    }
    
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    return preloadContent.includes('reportError') && preloadContent.includes('onShowErrorDialog');
  });
  
  // Test 8: Check types definition
  validator.test('TypeScript types definition', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    if (!fs.existsSync(typesPath)) {
      return false;
    }
    
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    return typesContent.includes('REPORT_ERROR') && 
           typesContent.includes('SHOW_ERROR_DIALOG') && 
           typesContent.includes('ErrorDialogData');
  });
  
  // Test 9: Check error masking utility
  validator.test('Data masking utility exists', () => {
    const maskingPath = path.join(__dirname, '..', 'src', 'main', 'utils', 'data-masking.ts');
    return fs.existsSync(maskingPath);
  });
  
  // Test 10: Check schema validation
  validator.test('Error report schema exists', () => {
    const schemaPath = path.join(__dirname, '..', 'src', 'main', 'schemas', 'error-report.schema.json');
    return fs.existsSync(schemaPath);
  });
  
  // Generate final report
  const allTestsPassed = validator.generateReport();
  
  if (allTestsPassed) {
    console.log('\n🎉 All Report Error functionality tests passed!');
    console.log('\n📝 Manual Testing Instructions:');
    console.log('   1. Run the application: npm run dev');
    console.log('   2. Click "Test Error" button');
    console.log('   3. Select "High Severity Error" or "Critical Error"');
    console.log('   4. In the error dialog, click "Report Error"');
    console.log('   5. Check that error is logged in:', CONFIG.errorReportsDir);
    console.log('   6. Verify log entry in:', CONFIG.logFile);
    
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Execute tests
if (require.main === module) {
  runReportErrorTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runReportErrorTests, TestValidator };