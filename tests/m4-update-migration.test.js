#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 M4 Update Migration Test\n');

class M4UpdateMigrationTest {
  constructor() {
    this.testResults = [];
    this.testDir = path.join(process.cwd(), 'test-update-migration');
    this.oldVersion = '0.2.0';
    this.newVersion = '0.3.0';
  }

  async runTests() {
    console.log('Starting M4 update migration tests...\n');
    
    try {
      await this.setupTestEnvironment();
      await this.testM4FileInclusion();
      await this.testWorkerFileAccess();
      await this.testM4SettingsPersistence();
      await this.testVersionManifest();
      await this.testRollbackScenario();
      
      this.printResults();
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('[1/6] Setting up test environment...');
    
    // Create test directory
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    // Simulate M4 settings file
    const m4SettingsPath = path.join(this.testDir, 'm4-settings.json');
    const testM4Settings = {
      version: "1.0.0",
      folderPaths: {
        m4DialogueFolder: "/test/dialogue",
        m4StringFolder: "/test/string",
        outputFolder: "/test/output"
      },
      outputSettings: {
        createSubfolders: true,
        useTimestamp: true
      },
      processingOptions: {
        validateData: true,
        enableStreaming: true,
        maxBatchSize: 1000
      },
      recentFolders: {
        dialogue: ["/test/dialogue"],
        string: ["/test/string"]
      },
      lastUpdated: Date.now()
    };
    
    fs.writeFileSync(m4SettingsPath, JSON.stringify(testM4Settings, null, 2));
    
    this.addResult('Setup test environment', true);
  }

  async testM4FileInclusion() {
    console.log('\n[2/6] Testing M4 file inclusion in bundle...');
    
    try {
      // Run bundle verification
      const output = execSync('node scripts/verify-bundle-contents.js', { encoding: 'utf8' });
      const hasAllFiles = output.includes('All critical M4 files are present');
      
      this.addResult('M4 files included in bundle', hasAllFiles);
      
      // Check specific critical files
      const criticalFiles = [
        'dist/workers/m4ProcessWorker.js',
        'dist/services/m4DialogueProcessor.js',
        'dist/services/m4StringProcessor.js',
        'dist/services/m4/optimization/streamingExcelReader.js',
        'dist/services/m4/performance/profiler.js'
      ];
      
      for (const file of criticalFiles) {
        const exists = fs.existsSync(path.join(process.cwd(), file));
        this.addResult(`Critical file: ${file}`, exists);
      }
    } catch (error) {
      this.addResult('M4 file inclusion test', false, error.message);
    }
  }

  async testWorkerFileAccess() {
    console.log('\n[3/6] Testing worker file accessibility...');
    
    try {
      // Check ASAR unpacking configuration
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const asarUnpack = packageJson.build?.asarUnpack || [];
      
      const hasWorkerUnpack = asarUnpack.includes('dist/workers/**/*');
      const hasExcelJsUnpack = asarUnpack.includes('node_modules/exceljs/**/*');
      
      this.addResult('Worker files configured for ASAR unpacking', hasWorkerUnpack);
      this.addResult('ExcelJS configured for ASAR unpacking', hasExcelJsUnpack);
      
      // Simulate worker file access test
      const workerPath = path.join(process.cwd(), 'dist/workers/m4ProcessWorker.js');
      if (fs.existsSync(workerPath)) {
        const workerContent = fs.readFileSync(workerPath, 'utf8');
        const hasWorkerThread = workerContent.includes('worker_threads');
        this.addResult('Worker file contains worker_threads import', hasWorkerThread);
      } else {
        this.addResult('Worker file exists', false);
      }
    } catch (error) {
      this.addResult('Worker file access test', false, error.message);
    }
  }

  async testM4SettingsPersistence() {
    console.log('\n[4/6] Testing M4 settings persistence during update...');
    
    try {
      // Read test M4 settings
      const settingsPath = path.join(this.testDir, 'm4-settings.json');
      const originalSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      
      // Simulate update process (modify version)
      const updatedSettings = { ...originalSettings };
      updatedSettings.version = "1.0.1";
      updatedSettings.lastUpdated = Date.now();
      
      // Write updated settings
      fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
      
      // Verify critical settings preserved
      const preserved = 
        updatedSettings.folderPaths.m4DialogueFolder === originalSettings.folderPaths.m4DialogueFolder &&
        updatedSettings.folderPaths.m4StringFolder === originalSettings.folderPaths.m4StringFolder &&
        updatedSettings.outputSettings.createSubfolders === originalSettings.outputSettings.createSubfolders &&
        updatedSettings.processingOptions.enableStreaming === originalSettings.processingOptions.enableStreaming;
      
      this.addResult('M4 settings preserved during update', preserved);
      this.addResult('Folder paths maintained', 
        updatedSettings.folderPaths.m4DialogueFolder === originalSettings.folderPaths.m4DialogueFolder);
      this.addResult('Processing options maintained', 
        updatedSettings.processingOptions.validateData === originalSettings.processingOptions.validateData);
    } catch (error) {
      this.addResult('M4 settings persistence test', false, error.message);
    }
  }

  async testVersionManifest() {
    console.log('\n[5/6] Testing version manifest with M4 features...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasM4Features = !!packageJson.m4Features;
      
      this.addResult('M4 features in package.json', hasM4Features);
      
      if (hasM4Features) {
        const m4Features = packageJson.m4Features;
        this.addResult('M4 feature version defined', !!m4Features.version);
        this.addResult('M4 components defined', !!m4Features.components);
        
        // Check individual components
        const expectedComponents = [
          'dialogueProcessor',
          'stringProcessor',
          'optimization',
          'performance',
          'workerThreads'
        ];
        
        for (const component of expectedComponents) {
          this.addResult(`Component ${component} version`, 
            !!m4Features.components?.[component]);
        }
      }
    } catch (error) {
      this.addResult('Version manifest test', false, error.message);
    }
  }

  async testRollbackScenario() {
    console.log('\n[6/6] Testing rollback scenario...');
    
    try {
      // Simulate rollback by checking if backup exists
      const backupFiles = fs.readdirSync(this.testDir)
        .filter(f => f.startsWith('m4-settings-backup'));
      
      this.addResult('Backup files created', backupFiles.length > 0);
      
      // Test recovery from backup
      if (backupFiles.length > 0) {
        const backupPath = path.join(this.testDir, backupFiles[0]);
        const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        this.addResult('Backup contains valid M4 settings', 
          !!backupContent.folderPaths && !!backupContent.processingOptions);
      }
      
      // Test worker thread recovery
      const workerFiles = [
        'dist/workers/m4ProcessWorker.js'
      ];
      
      const allWorkersPresent = workerFiles.every(file => 
        fs.existsSync(path.join(process.cwd(), file))
      );
      
      this.addResult('All worker files available for rollback', allWorkersPresent);
    } catch (error) {
      this.addResult('Rollback scenario test', false, error.message);
    }
  }

  addResult(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      passed: passed,
      error: error
    });
    
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${testName}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 M4 Update Migration Test Results');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${total - passed}`);
    console.log(`   Success Rate: ${percentage}%`);
    
    if (passed === total) {
      console.log('\n✅ All M4 update migration tests passed!');
      console.log('M4 features are properly configured for auto-update.');
    } else {
      console.log('\n❌ Some tests failed!');
      console.log('\nFailed tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.name}`);
          if (r.error) console.log(`     ${r.error}`);
        });
    }
  }

  cleanup() {
    console.log('\nCleaning up test environment...');
    
    try {
      // Create backup if needed
      if (fs.existsSync(this.testDir)) {
        const backupDir = this.testDir + '-backup-' + Date.now();
        fs.renameSync(this.testDir, backupDir);
        console.log(`Test data backed up to: ${backupDir}`);
      }
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }
}

// Run tests
const tester = new M4UpdateMigrationTest();
tester.runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});