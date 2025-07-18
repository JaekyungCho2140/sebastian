#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 M4 Bundle Verification Script\n');

// Critical M4 files that must be present in the bundle
const CRITICAL_M4_FILES = {
  // Main processors
  'dist/services/m4DialogueProcessor.js': 'M4 Dialogue Processor',
  'dist/services/m4StringProcessor.js': 'M4 String Processor',
  'dist/services/m4SettingsService.js': 'M4 Settings Service',
  'dist/services/m4ErrorIntegration.js': 'M4 Error Integration',
  
  // Worker files
  'dist/workers/m4ProcessWorker.js': 'M4 Process Worker',
  
  // M4 Service subdirectories
  'dist/services/m4/optimization/m4StreamingAdapter.js': 'M4 Streaming Adapter',
  'dist/services/m4/optimization/processingMonitor.js': 'Processing Monitor',
  'dist/services/m4/optimization/fileSizeValidator.js': 'File Size Validator',
  'dist/services/m4/optimization/memoryMonitor.js': 'Memory Monitor',
  'dist/services/m4/optimization/streamingExcelReader.js': 'Streaming Excel Reader',
  
  'dist/services/m4/performance/object-pool.js': 'Object Pool',
  'dist/services/m4/performance/profiler.js': 'Profiler',
  'dist/services/m4/performance/batch-processor.js': 'Batch Processor',
  'dist/services/m4/performance/memory-monitor.js': 'Performance Memory Monitor',
  'dist/services/m4/performance/benchmark-suite.js': 'Benchmark Suite',
  
  'dist/services/m4/processors/processorFactory.js': 'Processor Factory',
  'dist/services/m4/processors/m4DialogueProcessorStreaming.js': 'M4 Dialogue Processor Streaming',
  'dist/services/m4/processors/m4StringProcessorStreaming.js': 'M4 String Processor Streaming',
  
  // Utilities
  'dist/utils/m4ErrorSerializer.js': 'M4 Error Serializer',
  'dist/utils/m4-worker-error-bridge.js': 'M4 Worker Error Bridge',
  'dist/utils/m4WorkerErrorPropagator.js': 'M4 Worker Error Propagator',
  'dist/utils/m4MainThreadErrorBridge.js': 'M4 Main Thread Error Bridge',
  
  // Type definitions
  'dist/types/m4Processing.js': 'M4 Processing Types',
  'dist/types/m4ProcessingErrors.js': 'M4 Processing Error Types',
  'dist/types/m4ValidationErrors.js': 'M4 Validation Error Types'
};

const CRITICAL_PATTERNS = [
  {
    pattern: /^dist\/services\/m4\//,
    description: 'M4 service files'
  },
  {
    pattern: /^dist\/workers\/.*m4.*\.js$/,
    description: 'M4 worker files'
  },
  {
    pattern: /^dist\/utils\/m4.*\.js$/,
    description: 'M4 utility files'
  }
];

let allChecksPassed = true;
const missingFiles = [];
const foundFiles = [];

// Check individual critical files
console.log('📋 Checking critical M4 files...\n');

for (const [filePath, description] of Object.entries(CRITICAL_M4_FILES)) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}: ${filePath}`);
    foundFiles.push(filePath);
  } else {
    console.log(`❌ ${description}: ${filePath} - NOT FOUND`);
    missingFiles.push({ path: filePath, description });
    allChecksPassed = false;
  }
}

// Check patterns
console.log('\n📂 Checking M4 file patterns...\n');

const checkPattern = (dir, pattern, description) => {
  const files = [];
  
  const walkDir = (currentPath) => {
    if (!fs.existsSync(currentPath)) return;
    
    const entries = fs.readdirSync(currentPath);
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (pattern.test(relativePath)) {
        files.push(relativePath);
      }
    }
  };
  
  walkDir(dir);
  return files;
};

for (const { pattern, description } of CRITICAL_PATTERNS) {
  const files = checkPattern(path.join(process.cwd(), 'dist'), pattern, description);
  console.log(`📁 ${description}: Found ${files.length} files`);
  if (files.length === 0) {
    console.log(`   ⚠️  Warning: No files found matching pattern`);
  } else {
    files.forEach(file => console.log(`   ✓ ${file}`));
  }
}

// Check ASAR unpacking configuration
console.log('\n📦 Checking ASAR unpacking configuration...\n');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const asarUnpack = packageJson.build?.asarUnpack || [];
  
  const requiredUnpacks = [
    'dist/workers/**/*',
    'node_modules/exceljs/**/*'
  ];
  
  for (const pattern of requiredUnpacks) {
    if (asarUnpack.includes(pattern)) {
      console.log(`✅ ASAR unpack configured for: ${pattern}`);
    } else {
      console.log(`❌ ASAR unpack NOT configured for: ${pattern}`);
      allChecksPassed = false;
    }
  }
} catch (error) {
  console.log(`❌ Failed to check ASAR configuration: ${error.message}`);
  allChecksPassed = false;
}

// Check if bundle exists
console.log('\n🏗️  Checking if distribution bundle exists...\n');

const releaseDir = path.join(process.cwd(), 'release');
if (fs.existsSync(releaseDir)) {
  const releaseFiles = fs.readdirSync(releaseDir);
  const installers = releaseFiles.filter(f => 
    f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.dmg') || f.endsWith('.AppImage')
  );
  
  if (installers.length > 0) {
    console.log('✅ Found distribution packages:');
    installers.forEach(installer => {
      const stats = fs.statSync(path.join(releaseDir, installer));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   📦 ${installer} (${sizeMB} MB)`);
    });
  } else {
    console.log('ℹ️  No distribution packages found. Run "npm run dist" to create packages.');
  }
} else {
  console.log('ℹ️  Release directory not found. Run "npm run dist" to create distribution packages.');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Bundle Verification Summary');
console.log('='.repeat(60));
console.log(`   Total critical files checked: ${Object.keys(CRITICAL_M4_FILES).length}`);
console.log(`   Files found: ${foundFiles.length}`);
console.log(`   Files missing: ${missingFiles.length}`);

if (allChecksPassed) {
  console.log('\n✅ All critical M4 files are present in the build output!');
  process.exit(0);
} else {
  console.log('\n❌ Some critical M4 files are missing!');
  console.log('\nMissing files:');
  missingFiles.forEach(({ path, description }) => {
    console.log(`   - ${description}: ${path}`);
  });
  console.log('\nPlease check your build configuration and ensure all source files exist.');
  process.exit(1);
}