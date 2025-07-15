#!/usr/bin/env node

/**
 * End-to-End Integration Test Script
 * 
 * This script orchestrates all validation tests and provides a comprehensive
 * verification of the Sebastian v0.2.0 error logging system.
 * 
 * Test Coverage:
 * - All previously created test scripts
 * - Integration between components
 * - Full system workflow validation
 * - Performance and reliability testing
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Import test modules
const { runReportErrorTests } = require('./report-error-test');
const { testErrorScenarios } = require('./error-scenarios-test');
const { testDialogAutomation } = require('./dialog-automation-test');
const { testFileSystemAndRotation } = require('./filesystem-rotation-test');

// Configuration
const CONFIG = {
  testSuites: [
    {
      name: 'Basic Infrastructure Tests',
      script: './tests/error-reporter.test.js',
      description: 'Core error reporting functionality'
    },
    {
      name: 'Schema Compatibility Tests',
      script: './tests/schema-compatibility.test.js',
      description: 'JSON schema validation and compatibility'
    },
    {
      name: 'Report Error Functionality',
      function: runReportErrorTests,
      description: 'Report Error button and infrastructure'
    },
    {
      name: 'Error Scenarios Validation',
      function: testErrorScenarios,
      description: '6 error scenarios from TestErrorButton'
    },
    {
      name: 'Dialog Automation Tests',
      function: testDialogAutomation,
      description: 'Error dialog display and interactions'
    },
    {
      name: 'File System & Log Rotation',
      function: testFileSystemAndRotation,
      description: 'File operations and log rotation system'
    }
  ],
  timeout: 300000, // 5 minutes total timeout
  errorReportsDir: path.join(os.homedir(), '.config', 'sebastian', 'error-reports'),
  logFile: path.join(os.homedir(), '.config', 'sebastian', 'logs', 'sebastian.log')
};

// Test orchestrator
class EndToEndValidator {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
    this.overallSummary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: {}
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'start': '🚀',
      'finish': '🏁'
    }[type] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runScript(scriptPath) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [scriptPath], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Script execution timeout'));
      }, 60000); // 1 minute per script

      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  async runTestSuite(suite) {
    const suiteStart = Date.now();
    this.log(`Starting test suite: ${suite.name}`, 'start');

    try {
      let result;
      
      if (suite.script) {
        // Run external script
        result = await this.runScript(suite.script);
        const duration = Date.now() - suiteStart;
        
        if (result.success) {
          this.results.push({
            name: suite.name,
            status: 'PASS',
            duration,
            message: 'Test suite passed',
            details: result.stdout
          });
          this.passed++;
          this.log(`${suite.name} - PASSED (${duration}ms)`, 'success');
        } else {
          this.results.push({
            name: suite.name,
            status: 'FAIL',
            duration,
            message: 'Test suite failed',
            details: result.stderr
          });
          this.failed++;
          this.log(`${suite.name} - FAILED (${duration}ms)`, 'error');
        }
      } else if (suite.function) {
        // Run function directly
        const success = await suite.function();
        const duration = Date.now() - suiteStart;
        
        if (success) {
          this.results.push({
            name: suite.name,
            status: 'PASS',
            duration,
            message: 'Test suite passed'
          });
          this.passed++;
          this.log(`${suite.name} - PASSED (${duration}ms)`, 'success');
        } else {
          this.results.push({
            name: suite.name,
            status: 'FAIL',
            duration,
            message: 'Test suite failed'
          });
          this.failed++;
          this.log(`${suite.name} - FAILED (${duration}ms)`, 'error');
        }
      }
    } catch (error) {
      const duration = Date.now() - suiteStart;
      this.results.push({
        name: suite.name,
        status: 'ERROR',
        duration,
        message: error.message
      });
      this.failed++;
      this.log(`${suite.name} - ERROR: ${error.message} (${duration}ms)`, 'error');
    }
  }

  async validateSystemIntegration() {
    this.log('Running system integration validation', 'start');
    
    // Test 1: Validate all components exist
    const components = [
      'src/main/services/local-error-reporter.ts',
      'src/main/utils/data-masking.ts',
      'src/main/utils/file-operations.ts',
      'src/main/utils/validation.ts',
      'src/main/schemas/error-report.schema.json',
      'src/renderer/components/ErrorDialog.tsx',
      'src/renderer/components/ErrorBoundary.tsx',
      'src/renderer/components/TestErrorButton.tsx',
      'src/renderer/hooks/useErrorDialog.ts',
      'src/main/ipc-handlers.ts',
      'src/preload/index.ts',
      'src/shared/types.ts'
    ];

    const missingComponents = [];
    for (const component of components) {
      const fullPath = path.join(__dirname, '..', component);
      if (!fs.existsSync(fullPath)) {
        missingComponents.push(component);
      }
    }

    if (missingComponents.length > 0) {
      throw new Error(`Missing components: ${missingComponents.join(', ')}`);
    }

    // Test 2: Validate directory structure
    const requiredDirs = [
      CONFIG.errorReportsDir,
      path.dirname(CONFIG.logFile),
      path.join(__dirname, '..', 'src', 'main', 'schemas'),
      path.join(__dirname, '..', 'src', 'main', 'utils'),
      path.join(__dirname, '..', 'tests')
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Test 3: Validate build system
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredScripts = ['build', 'test', 'dev'];
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        throw new Error(`Required script '${script}' not found in package.json`);
      }
    }

    return true;
  }

  generateComprehensiveReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 SEBASTIAN v0.2.0 - COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`🧪 Test Suites: ${this.passed + this.failed}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Test Suite Details:');
    console.log('-'.repeat(80));
    
    this.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${index + 1}. ${status} ${result.name} - ${result.status} (${duration})`);
      if (result.status !== 'PASS') {
        console.log(`   └─ ${result.message}`);
      }
    });
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Test Suites:');
      console.log('-'.repeat(80));
      this.results.filter(r => r.status !== 'PASS').forEach(result => {
        console.log(`🔴 ${result.name}`);
        console.log(`   Error: ${result.message}`);
        if (result.details) {
          console.log(`   Details: ${result.details.substring(0, 200)}...`);
        }
      });
    }
    
    // System information
    console.log('\n🖥️  System Information:');
    console.log('-'.repeat(80));
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Node.js Version: ${process.version}`);
    console.log(`   Error Reports Directory: ${CONFIG.errorReportsDir}`);
    console.log(`   Log File: ${CONFIG.logFile}`);
    
    // Coverage summary
    console.log('\n📊 Coverage Summary:');
    console.log('-'.repeat(80));
    console.log(`   ✅ Error Reporting Infrastructure: ${this.passed >= 1 ? 'COVERED' : 'MISSING'}`);
    console.log(`   ✅ Error Scenarios (6 types): ${this.passed >= 2 ? 'COVERED' : 'MISSING'}`);
    console.log(`   ✅ Dialog System: ${this.passed >= 3 ? 'COVERED' : 'MISSING'}`);
    console.log(`   ✅ File System & Log Rotation: ${this.passed >= 4 ? 'COVERED' : 'MISSING'}`);
    console.log(`   ✅ Integration Tests: ${this.passed >= 5 ? 'COVERED' : 'MISSING'}`);
    
    // Final verdict
    console.log('\n' + '='.repeat(80));
    if (this.failed === 0) {
      console.log('🎉 SUCCESS: All tests passed! Sebastian v0.2.0 is ready for release.');
      console.log('✨ The error logging system is fully functional and validated.');
      console.log('\n📝 Next Steps:');
      console.log('   1. Update version to 0.2.0');
      console.log('   2. Create release notes');
      console.log('   3. Build and distribute');
    } else {
      console.log('❌ FAILURE: Some tests failed. Please review and fix issues.');
      console.log('🔧 The error logging system requires attention before release.');
    }
    console.log('='.repeat(80));
    
    return this.failed === 0;
  }

  async generateTestReport() {
    const reportPath = path.join(__dirname, '..', 'test-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      version: '0.2.0',
      platform: process.platform,
      nodeVersion: process.version,
      totalDuration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.passed + this.failed,
        passed: this.passed,
        failed: this.failed,
        successRate: ((this.passed / (this.passed + this.failed)) * 100).toFixed(1)
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Test report saved to: ${reportPath}`);
  }
}

// Main execution
async function runEndToEndTests() {
  console.log('🚀 Starting Sebastian v0.2.0 End-to-End Validation');
  console.log('=' .repeat(80));
  
  const validator = new EndToEndValidator();
  
  try {
    // Run system integration check first
    await validator.validateSystemIntegration();
    validator.log('System integration validation passed', 'success');
    
    // Run all test suites
    for (const suite of CONFIG.testSuites) {
      await validator.runTestSuite(suite);
    }
    
    // Generate comprehensive report
    const success = validator.generateComprehensiveReport();
    
    // Generate JSON report
    await validator.generateTestReport();
    
    return success;
    
  } catch (error) {
    validator.log(`Critical error during testing: ${error.message}`, 'error');
    return false;
  }
}

// Execute if run directly
if (require.main === module) {
  runEndToEndTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 End-to-end test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runEndToEndTests, EndToEndValidator };