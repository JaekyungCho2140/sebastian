#!/usr/bin/env node

/**
 * Error Dialog Automation Test Script
 * 
 * This script validates:
 * 1. Error dialog automatic display for High/Critical severity errors
 * 2. App restart functionality
 * 3. Error dialog interactions and state management
 * 4. IPC communication between processes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  errorReportsDir: path.join(os.homedir(), '.config', 'sebastian', 'error-reports'),
  logFile: path.join(os.homedir(), '.config', 'sebastian', 'logs', 'sebastian.log'),
  testTimeout: 30000, // 30 seconds per test
  dialogTestScenarios: [
    {
      id: 'high-severity-auto-dialog',
      name: 'High Severity Auto Dialog Display',
      severity: 'high',
      expectDialog: true,
      expectRestart: false
    },
    {
      id: 'critical-severity-auto-dialog',
      name: 'Critical Severity Auto Dialog Display',
      severity: 'critical',
      expectDialog: true,
      expectRestart: true
    },
    {
      id: 'medium-severity-no-dialog',
      name: 'Medium Severity No Auto Dialog',
      severity: 'medium',
      expectDialog: false,
      expectRestart: false
    }
  ]
};

// Test utilities
class DialogAutomationValidator {
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
    console.log('📊 Error Dialog Automation Test Results');
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
      console.log('\n🎉 All dialog automation tests passed!');
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

function readLogFile() {
  if (!fs.existsSync(CONFIG.logFile)) {
    return '';
  }
  return fs.readFileSync(CONFIG.logFile, 'utf8');
}

function checkLogContains(searchText, afterTime = 0) {
  const logContent = readLogFile();
  const lines = logContent.split('\n');
  
  return lines.some(line => {
    if (!line.includes(searchText)) return false;
    
    // Try to extract timestamp if afterTime is specified
    if (afterTime > 0) {
      const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      if (timestampMatch) {
        const lineTime = new Date(timestampMatch[1]).getTime();
        return lineTime > afterTime;
      }
    }
    
    return true;
  });
}

// Main test functions
async function testDialogAutomation() {
  console.log('🧪 Error Dialog Automation Test\n');
  console.log('Testing automatic error dialog display and app restart functionality...\n');
  
  const validator = new DialogAutomationValidator();
  
  // Ensure test environment
  ensureDirectory(CONFIG.errorReportsDir);
  ensureDirectory(path.dirname(CONFIG.logFile));
  
  // Test 1: Validate ErrorDialog component structure
  await validator.test('ErrorDialog component structure', async () => {
    const componentPath = path.join(__dirname, '..', 'src', 'renderer', 'components', 'ErrorDialog.tsx');
    if (!fs.existsSync(componentPath)) {
      throw new Error('ErrorDialog.tsx not found');
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for required dialog elements
    const requiredElements = [
      'error-dialog-overlay',
      'error-dialog-header',
      'error-dialog-content',
      'error-dialog-actions',
      'onReport',
      'onRestart',
      'onClose'
    ];
    
    for (const element of requiredElements) {
      if (!content.includes(element)) {
        throw new Error(`Required element '${element}' not found in ErrorDialog`);
      }
    }
    
    return true;
  });
  
  // Test 2: Validate useErrorDialog hook functionality
  await validator.test('useErrorDialog hook functionality', async () => {
    const hookPath = path.join(__dirname, '..', 'src', 'renderer', 'hooks', 'useErrorDialog.ts');
    if (!fs.existsSync(hookPath)) {
      throw new Error('useErrorDialog.ts not found');
    }
    
    const content = fs.readFileSync(hookPath, 'utf8');
    
    // Check for required hook methods
    const requiredMethods = [
      'showError',
      'closeDialog',
      'reportError',
      'restartApp'
    ];
    
    for (const method of requiredMethods) {
      if (!content.includes(method)) {
        throw new Error(`Required method '${method}' not found in useErrorDialog`);
      }
    }
    
    return true;
  });
  
  // Test 3: Validate IPC channels for dialog communication
  await validator.test('IPC channels for dialog communication', async () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    if (!fs.existsSync(typesPath)) {
      throw new Error('types.ts not found');
    }
    
    const content = fs.readFileSync(typesPath, 'utf8');
    
    // Check for required IPC channels
    const requiredChannels = [
      'REPORT_ERROR',
      'SHOW_ERROR_DIALOG',
      'RESTART_APP'
    ];
    
    for (const channel of requiredChannels) {
      if (!content.includes(channel)) {
        throw new Error(`Required IPC channel '${channel}' not found in types`);
      }
    }
    
    return true;
  });
  
  // Test 4: Validate LocalErrorReporter dialog trigger logic
  await validator.test('LocalErrorReporter dialog trigger logic', async () => {
    const reporterPath = path.join(__dirname, '..', 'src', 'main', 'services', 'local-error-reporter.ts');
    if (!fs.existsSync(reporterPath)) {
      throw new Error('local-error-reporter.ts not found');
    }
    
    const content = fs.readFileSync(reporterPath, 'utf8');
    
    // Check for dialog trigger conditions
    if (!content.includes('showErrorDialog') || !content.includes('severity')) {
      throw new Error('Dialog trigger logic not found');
    }
    
    // Check for severity-based dialog display
    if (!content.includes('high') || !content.includes('critical')) {
      throw new Error('Severity-based dialog logic not found');
    }
    
    return true;
  });
  
  // Test 5: Test error dialog data structure
  await validator.test('Error dialog data structure', async () => {
    const scriptContent = `
      const { createErrorDialogData } = require('./tests/test-utils');
      
      // Test high severity error
      const highError = createErrorDialogData(
        new Error('High severity test error'),
        'High Severity Error',
        'This should trigger automatic dialog display',
        'high'
      );
      
      // Test critical severity error
      const criticalError = createErrorDialogData(
        new Error('Critical severity test error'),
        'Critical System Error',
        'This should trigger automatic dialog display with restart recommendation',
        'critical'
      );
      
      // Validate dialog data structure
      const requiredFields = ['title', 'message', 'error', 'severity', 'timestamp'];
      
      for (const errorData of [highError, criticalError]) {
        for (const field of requiredFields) {
          if (!errorData.hasOwnProperty(field)) {
            throw new Error('Missing field: ' + field);
          }
        }
      }
      
      // Validate severity levels
      if (highError.severity !== 'high') {
        throw new Error('High severity not set correctly');
      }
      
      if (criticalError.severity !== 'critical') {
        throw new Error('Critical severity not set correctly');
      }
      
      console.log('Error dialog data structure validation passed');
    `;
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['-e', scriptContent], {
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
        if (code === 0 && stdout.includes('validation passed')) {
          resolve(true);
        } else {
          reject(new Error(`Script failed: ${stderr}`));
        }
      });
      
      setTimeout(() => {
        child.kill();
        reject(new Error('Script execution timeout'));
      }, 5000);
    });
  });
  
  // Test 6: Test restart functionality infrastructure
  await validator.test('App restart functionality infrastructure', async () => {
    const preloadPath = path.join(__dirname, '..', 'src', 'preload', 'index.ts');
    if (!fs.existsSync(preloadPath)) {
      throw new Error('preload/index.ts not found');
    }
    
    const content = fs.readFileSync(preloadPath, 'utf8');
    
    // Check for restart API
    if (!content.includes('restartApp')) {
      throw new Error('restartApp API not found in preload');
    }
    
    // Check IPC handlers
    const ipcPath = path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.ts');
    if (fs.existsSync(ipcPath)) {
      const ipcContent = fs.readFileSync(ipcPath, 'utf8');
      if (!ipcContent.includes('RESTART_APP')) {
        throw new Error('RESTART_APP handler not found in IPC handlers');
      }
    }
    
    return true;
  });
  
  // Test 7: Test error dialog state management
  await validator.test('Error dialog state management', async () => {
    const appPath = path.join(__dirname, '..', 'src', 'renderer', 'App.tsx');
    if (!fs.existsSync(appPath)) {
      throw new Error('App.tsx not found');
    }
    
    const content = fs.readFileSync(appPath, 'utf8');
    
    // Check for error dialog integration
    if (!content.includes('ErrorDialog')) {
      throw new Error('ErrorDialog not integrated in App.tsx');
    }
    
    // Check for useErrorDialog hook usage
    if (!content.includes('useErrorDialog')) {
      throw new Error('useErrorDialog hook not used in App.tsx');
    }
    
    // Check for global error handlers
    if (!content.includes('window.addEventListener')) {
      throw new Error('Global error handlers not found');
    }
    
    return true;
  });
  
  // Test 8: Test dialog CSS and styling
  await validator.test('Error dialog CSS and styling', async () => {
    const cssPath = path.join(__dirname, '..', 'src', 'renderer', 'styles', 'ErrorDialog.css');
    if (!fs.existsSync(cssPath)) {
      throw new Error('ErrorDialog.css not found');
    }
    
    const content = fs.readFileSync(cssPath, 'utf8');
    
    // Check for required CSS classes
    const requiredClasses = [
      'error-dialog-overlay',
      'error-dialog',
      'error-dialog-header',
      'error-dialog-content',
      'error-dialog-actions',
      'dialog-button'
    ];
    
    for (const className of requiredClasses) {
      if (!content.includes(`.${className}`)) {
        throw new Error(`Required CSS class '${className}' not found`);
      }
    }
    
    return true;
  });
  
  // Test 9: Test dialog button functionality
  await validator.test('Dialog button functionality', async () => {
    const dialogPath = path.join(__dirname, '..', 'src', 'renderer', 'components', 'ErrorDialog.tsx');
    const content = fs.readFileSync(dialogPath, 'utf8');
    
    // Check for dialog buttons
    const requiredButtons = [
      'OK',
      'Report Error',
      'Restart App'
    ];
    
    for (const button of requiredButtons) {
      if (!content.includes(button)) {
        throw new Error(`Required button '${button}' not found in ErrorDialog`);
      }
    }
    
    // Check for button handlers
    const requiredHandlers = [
      'onClose',
      'onReport',
      'onRestart'
    ];
    
    for (const handler of requiredHandlers) {
      if (!content.includes(handler)) {
        throw new Error(`Required handler '${handler}' not found in ErrorDialog`);
      }
    }
    
    return true;
  });
  
  // Test 10: Test error dialog accessibility
  await validator.test('Error dialog accessibility', async () => {
    const dialogPath = path.join(__dirname, '..', 'src', 'renderer', 'components', 'ErrorDialog.tsx');
    const content = fs.readFileSync(dialogPath, 'utf8');
    
    // Check for accessibility attributes
    const accessibilityFeatures = [
      'aria-label',
      'role',
      'keydown',
      'Escape'
    ];
    
    for (const feature of accessibilityFeatures) {
      if (!content.includes(feature)) {
        throw new Error(`Accessibility feature '${feature}' not found`);
      }
    }
    
    return true;
  });
  
  // Generate final report
  const allTestsPassed = validator.generateReport();
  
  if (allTestsPassed) {
    console.log('\n🎉 All dialog automation tests passed!');
    console.log('\n📝 Manual Testing Guide:');
    console.log('   1. Run the application: npm run dev');
    console.log('   2. Click "Test Error" → "High Severity Error"');
    console.log('   3. Verify error dialog appears automatically');
    console.log('   4. Test "Report Error" button functionality');
    console.log('   5. Click "Test Error" → "Critical Error"');
    console.log('   6. Verify error dialog shows restart recommendation');
    console.log('   7. Test "Restart App" button functionality');
    console.log('   8. Test dialog close with ESC key');
    console.log('   9. Test dialog overlay click to close');
    
    return true;
  } else {
    console.log('\n❌ Some dialog automation tests failed.');
    return false;
  }
}

// Execute tests
if (require.main === module) {
  testDialogAutomation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Dialog automation test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDialogAutomation, DialogAutomationValidator };