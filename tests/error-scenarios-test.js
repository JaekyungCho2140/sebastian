#!/usr/bin/env node

/**
 * Error Scenarios Validation Test Script
 * 
 * This script validates all 6 error scenarios implemented in TestErrorButton:
 * 1. JavaScript Runtime Error
 * 2. Promise Rejection Error  
 * 3. React Component Error
 * 4. High Severity Error
 * 5. Critical Error
 * 6. Main Process Error
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
  appTimeout: 10000, // 10 seconds to start app
  errorScenarios: [
    {
      id: 'javascript-error',
      name: 'JavaScript Runtime Error',
      expectedErrorType: 'javascript',
      expectedSeverity: 'high',
      expectedMessage: 'Test JavaScript Error'
    },
    {
      id: 'promise-rejection',
      name: 'Promise Rejection Error',
      expectedErrorType: 'javascript',
      expectedSeverity: 'high',
      expectedMessage: 'Test Promise Rejection'
    },
    {
      id: 'react-component-error',
      name: 'React Component Error',
      expectedErrorType: 'react',
      expectedSeverity: 'high',
      expectedMessage: 'Test React Component Error'
    },
    {
      id: 'high-severity-error',
      name: 'High Severity Error',
      expectedErrorType: 'javascript',
      expectedSeverity: 'high',
      expectedMessage: 'Test High Severity Error'
    },
    {
      id: 'critical-error',
      name: 'Critical Error',
      expectedErrorType: 'javascript',
      expectedSeverity: 'critical',
      expectedMessage: 'Test Critical Error'
    },
    {
      id: 'main-process-error',
      name: 'Main Process Error',
      expectedErrorType: 'main-process',
      expectedSeverity: 'high',
      expectedMessage: 'Test Main Process Error'
    }
  ]
};

// Test utilities
class ErrorScenarioValidator {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
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

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Error Scenarios Test Results Summary');
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
      console.log('\n🎉 All error scenario tests passed!');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${status} ${result.name} - ${result.status} (${result.duration}ms)`);
    });
    
    return this.failed === 0;
  }
}

// File system utilities
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getErrorReportsAfterTime(afterTime) {
  if (!fs.existsSync(CONFIG.errorReportsDir)) {
    return [];
  }
  
  return fs.readdirSync(CONFIG.errorReportsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(CONFIG.errorReportsDir, file);
      const stat = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        created: stat.birthtime.getTime(),
        modified: stat.mtime.getTime()
      };
    })
    .filter(file => file.created > afterTime || file.modified > afterTime)
    .sort((a, b) => b.modified - a.modified);
}

function validateErrorReport(reportPath, expectedScenario) {
  const content = fs.readFileSync(reportPath, 'utf8');
  const report = JSON.parse(content);
  
  // Check required fields
  const requiredFields = ['id', 'timestamp', 'errorType', 'severity', 'message'];
  for (const field of requiredFields) {
    if (!report[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Check expected values
  if (report.errorType !== expectedScenario.expectedErrorType) {
    throw new Error(`Expected errorType '${expectedScenario.expectedErrorType}', got '${report.errorType}'`);
  }
  
  if (report.severity !== expectedScenario.expectedSeverity) {
    throw new Error(`Expected severity '${expectedScenario.expectedSeverity}', got '${report.severity}'`);
  }
  
  if (!report.message.includes(expectedScenario.expectedMessage)) {
    throw new Error(`Expected message to contain '${expectedScenario.expectedMessage}', got '${report.message}'`);
  }
  
  return true;
}

// Test execution utilities
function executeNodeScript(scriptContent) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const child = spawn('node', ['-e', scriptContent], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
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
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
      }
    });
    
    setTimeout(() => {
      child.kill();
      reject(new Error('Script execution timeout'));
    }, 5000);
  });
}

// Main test scenarios
async function testErrorScenarios() {
  console.log('🧪 Error Scenarios Validation Test\n');
  console.log('Testing all 6 error scenarios from TestErrorButton...\n');
  
  const validator = new ErrorScenarioValidator();
  
  // Ensure test environment
  ensureDirectory(CONFIG.errorReportsDir);
  
  // Test 1: Validate TestErrorButton structure
  await validator.test('TestErrorButton component structure', async () => {
    const componentPath = path.join(__dirname, '..', 'src', 'renderer', 'components', 'TestErrorButton.tsx');
    if (!fs.existsSync(componentPath)) {
      throw new Error('TestErrorButton.tsx not found');
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check all 6 scenarios are defined
    for (const scenario of CONFIG.errorScenarios) {
      if (!content.includes(scenario.id)) {
        throw new Error(`Scenario '${scenario.id}' not found in TestErrorButton`);
      }
    }
    
    return true;
  });
  
  // Test 2: Validate error creation utilities
  await validator.test('Error creation utilities', async () => {
    const utilsPath = path.join(__dirname, '..', 'src', 'renderer', 'hooks', 'useErrorDialog.ts');
    if (!fs.existsSync(utilsPath)) {
      throw new Error('useErrorDialog.ts not found');
    }
    
    const content = fs.readFileSync(utilsPath, 'utf8');
    
    if (!content.includes('createErrorDialogData')) {
      throw new Error('createErrorDialogData function not found');
    }
    
    if (!content.includes('createCustomErrorData')) {
      throw new Error('createCustomErrorData function not found');
    }
    
    return true;
  });
  
  // Test 3: Validate error reporting infrastructure
  await validator.test('Error reporting infrastructure', async () => {
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    if (!fs.existsSync(reporterPath)) {
      throw new Error('local-error-reporter.ts not found');
    }
    
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    if (!content.includes('captureError')) {
      throw new Error('captureError method not found');
    }
    
    if (!content.includes('showErrorDialog')) {
      throw new Error('showErrorDialog method not found');
    }
    
    return true;
  });
  
  // Test 4: Test JavaScript Error scenario simulation
  await validator.test('JavaScript Error scenario simulation', async () => {
    const testStart = Date.now();
    
    // Simulate JavaScript error
    const scriptContent = `
      const { createErrorDialogData } = require('./tests/test-utils');
      try {
        throw new Error('Test JavaScript Error: Verifying error dialog system');
      } catch (error) {
        const errorData = createErrorDialogData(error, 'JavaScript Error Test', 'Simulated error', 'high');
        console.log('JavaScript error simulated successfully');
        console.log('Error data:', JSON.stringify(errorData, null, 2));
      }
    `;
    
    try {
      await executeNodeScript(scriptContent);
      return true;
    } catch (error) {
      // JavaScript errors are expected to be caught
      return error.message.includes('JavaScript error simulated');
    }
  });
  
  // Test 5: Test Promise Rejection scenario simulation
  await validator.test('Promise Rejection scenario simulation', async () => {
    const scriptContent = `
      const { createErrorDialogData } = require('./tests/test-utils');
      
      function testPromiseRejection() {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Test Promise Rejection: Async error handling verification'));
          }, 100);
        });
      }
      
      testPromiseRejection().catch(error => {
        const errorData = createErrorDialogData(error, 'Promise Rejection Test', 'Simulated promise rejection', 'high');
        console.log('Promise rejection simulated successfully');
        console.log('Error data:', JSON.stringify(errorData, null, 2));
      });
      
      setTimeout(() => {
        console.log('Promise rejection test completed');
      }, 200);
    `;
    
    try {
      await executeNodeScript(scriptContent);
      return true;
    } catch (error) {
      // Promise rejections are expected to be caught
      return error.message.includes('Promise rejection simulated');
    }
  });
  
  // Test 6: Test Error Dialog Data Structure
  await validator.test('Error dialog data structure validation', async () => {
    for (const scenario of CONFIG.errorScenarios) {
      const scriptContent = `
        const { createErrorDialogData } = require('./tests/test-utils');
        const error = new Error('${scenario.expectedMessage}');
        const errorData = createErrorDialogData(error, '${scenario.name}', 'Test message', '${scenario.expectedSeverity}');
        
        // Validate structure
        const requiredFields = ['title', 'message', 'error', 'timestamp', 'severity'];
        for (const field of requiredFields) {
          if (!errorData.hasOwnProperty(field)) {
            throw new Error('Missing field: ' + field);
          }
        }
        
        console.log('Error data structure valid for ${scenario.name}');
      `;
      
      try {
        await executeNodeScript(scriptContent);
      } catch (error) {
        throw new Error(`${scenario.name} data structure validation failed: ${error.message}`);
      }
    }
    
    return true;
  });
  
  // Test 7: Test Error Severity Levels
  await validator.test('Error severity levels validation', async () => {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    
    for (const severity of severityLevels) {
      const scriptContent = `
        const { createErrorDialogData } = require('./tests/test-utils');
        const error = new Error('Test error for severity ${severity}');
        const errorData = createErrorDialogData(error, 'Test', 'Test message', '${severity}');
        
        if (errorData.severity !== '${severity}') {
          throw new Error('Severity mismatch: expected ${severity}, got ' + errorData.severity);
        }
        
        console.log('Severity ${severity} validation passed');
      `;
      
      try {
        await executeNodeScript(scriptContent);
      } catch (error) {
        throw new Error(`Severity ${severity} validation failed: ${error.message}`);
      }
    }
    
    return true;
  });
  
  // Test 8: Test Error Type Classification
  await validator.test('Error type classification', async () => {
    const errorTypes = [
      { type: 'javascript', description: 'JavaScript runtime error' },
      { type: 'react', description: 'React component error' },
      { type: 'main-process', description: 'Main process error' }
    ];
    
    for (const errorType of errorTypes) {
      // This is a structural test - we can't easily simulate different error types
      // but we can verify the error reporting system supports them
      const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
      const content = fs.readFileSync(reporterPath, 'utf8');
      
      if (!content.includes(errorType.type)) {
        throw new Error(`Error type '${errorType.type}' not supported in LocalErrorReporter`);
      }
    }
    
    return true;
  });
  
  // Test 9: Test Error Context Information
  await validator.test('Error context information', async () => {
    const scriptContent = `
      const { createErrorDialogData } = require('./tests/test-utils');
      const error = new Error('Test error with context');
      const errorData = createErrorDialogData(error, 'Context Test', 'Test message', 'medium');
      
      // Check timestamp
      if (!errorData.timestamp || typeof errorData.timestamp !== 'number') {
        throw new Error('Invalid timestamp');
      }
      
      // Check that timestamp is recent (within last 5 seconds)
      const now = Date.now();
      if (Math.abs(now - errorData.timestamp) > 5000) {
        throw new Error('Timestamp too old or in future');
      }
      
      console.log('Error context validation passed');
    `;
    
    await executeNodeScript(scriptContent);
    return true;
  });
  
  // Test 10: Test Error Stack Trace Handling
  await validator.test('Error stack trace handling', async () => {
    const scriptContent = `
      const { createErrorDialogData } = require('./tests/test-utils');
      
      function deepFunction() {
        function nestedFunction() {
          throw new Error('Deep error with stack trace');
        }
        return nestedFunction();
      }
      
      try {
        deepFunction();
      } catch (error) {
        const errorData = createErrorDialogData(error, 'Stack Trace Test', 'Test message', 'high');
        
        if (!errorData.stack || typeof errorData.stack !== 'string') {
          throw new Error('Stack trace not captured');
        }
        
        if (!errorData.stack.includes('deepFunction') || !errorData.stack.includes('nestedFunction')) {
          throw new Error('Stack trace incomplete');
        }
        
        console.log('Stack trace validation passed');
      }
    `;
    
    await executeNodeScript(scriptContent);
    return true;
  });
  
  // Generate final report
  const allTestsPassed = validator.generateReport();
  
  if (allTestsPassed) {
    console.log('\n🎉 All error scenario tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Run the application to test actual error scenarios');
    console.log('   2. Use TestErrorButton to trigger each scenario');
    console.log('   3. Verify error reports are saved correctly');
    console.log('   4. Check error dialog displays and interactions');
    
    return true;
  } else {
    console.log('\n❌ Some error scenario tests failed.');
    return false;
  }
}

// Execute tests
if (require.main === module) {
  testErrorScenarios()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testErrorScenarios, ErrorScenarioValidator };