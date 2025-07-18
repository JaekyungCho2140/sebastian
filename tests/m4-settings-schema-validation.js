/**
 * M4 Settings Schema Validation Test
 * M4 설정 스키마 검증 테스트
 */

const fs = require('fs');
const path = require('path');

// M4 설정 스키마 검증 테스트
function runM4SettingsSchemaValidation() {
  console.log('🧪 M4 Settings Schema Validation Test\n');
  
  const tests = [];
  const startTime = Date.now();
  
  // 테스트 결과를 저장할 함수
  function addTest(name, testFn) {
    tests.push({ name, testFn });
  }
  
  // 간단한 assertion 함수
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
  
  // 테스트 실행 함수
  function runTest(name, testFn) {
    try {
      const testStartTime = Date.now();
      testFn();
      const duration = Date.now() - testStartTime;
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      return { name, status: 'PASSED', duration };
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      return { name, status: 'FAILED', error: error.message };
    }
  }
  
  // TypeScript 파일 존재 확인
  addTest('TypeScript types file exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    assert(fs.existsSync(typesPath), 'types.ts file should exist');
  });
  
  // TypeScript 파일 내용 검증
  addTest('M4Settings interface definition exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4Settings'), 'M4Settings interface should be defined');
    assert(content.includes('version: string'), 'M4Settings should have version property');
    assert(content.includes('folderPaths: M4FolderPaths'), 'M4Settings should have folderPaths property');
    assert(content.includes('outputSettings: M4OutputSettings'), 'M4Settings should have outputSettings property');
    assert(content.includes('processingOptions: M4ProcessingOptions'), 'M4Settings should have processingOptions property');
    assert(content.includes('recentFolders: M4RecentFolders'), 'M4Settings should have recentFolders property');
    assert(content.includes('defaults: M4DefaultSettings'), 'M4Settings should have defaults property');
    assert(content.includes('lastUpdated: number'), 'M4Settings should have lastUpdated property');
  });
  
  // M4FolderPaths 인터페이스 확인
  addTest('M4FolderPaths interface definition exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4FolderPaths'), 'M4FolderPaths interface should be defined');
    assert(content.includes('dialogue: {'), 'M4FolderPaths should have dialogue property');
    assert(content.includes('string: {'), 'M4FolderPaths should have string property');
    assert(content.includes('commonOutputDirectory: string'), 'M4FolderPaths should have commonOutputDirectory property');
  });
  
  // M4OutputSettings 인터페이스 확인
  addTest('M4OutputSettings interface definition exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4OutputSettings'), 'M4OutputSettings interface should be defined');
    assert(content.includes('defaultOutputDirectory: string'), 'M4OutputSettings should have defaultOutputDirectory property');
    assert(content.includes('outputFileNaming: M4OutputFileNaming'), 'M4OutputSettings should have outputFileNaming property');
    assert(content.includes('createBackup: boolean'), 'M4OutputSettings should have createBackup property');
    assert(content.includes("outputFormat: 'xlsx' | 'xlsm' | 'csv'"), 'M4OutputSettings should have outputFormat property');
  });
  
  // M4ProcessingOptions 인터페이스 확인
  addTest('M4ProcessingOptions interface definition exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4ProcessingOptions'), 'M4ProcessingOptions interface should be defined');
    assert(content.includes('autoOpenOutput: boolean'), 'M4ProcessingOptions should have autoOpenOutput property');
    assert(content.includes('preserveOriginalFiles: boolean'), 'M4ProcessingOptions should have preserveOriginalFiles property');
    assert(content.includes('enableParallelProcessing: boolean'), 'M4ProcessingOptions should have enableParallelProcessing property');
    assert(content.includes('maxWorkerThreads: number'), 'M4ProcessingOptions should have maxWorkerThreads property');
    assert(content.includes('notificationSettings: M4NotificationSettings'), 'M4ProcessingOptions should have notificationSettings property');
    assert(content.includes('validationSettings: M4ValidationSettings'), 'M4ProcessingOptions should have validationSettings property');
  });
  
  // M4RecentFolders 인터페이스 확인
  addTest('M4RecentFolders interface definition exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4RecentFolders'), 'M4RecentFolders interface should be defined');
    assert(content.includes('dialogue: M4RecentFolderItem[]'), 'M4RecentFolders should have dialogue property');
    assert(content.includes('string: M4RecentFolderItem[]'), 'M4RecentFolders should have string property');
    assert(content.includes('maxItems: number'), 'M4RecentFolders should have maxItems property');
    assert(content.includes('autoCleanup: boolean'), 'M4RecentFolders should have autoCleanup property');
  });
  
  // M4RecentFolderItem 인터페이스 확인
  addTest('M4RecentFolderItem interface definition exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4RecentFolderItem'), 'M4RecentFolderItem interface should be defined');
    assert(content.includes('path: string'), 'M4RecentFolderItem should have path property');
    assert(content.includes('lastUsed: number'), 'M4RecentFolderItem should have lastUsed property');
    assert(content.includes('usageCount: number'), 'M4RecentFolderItem should have usageCount property');
    assert(content.includes('isFavorite: boolean'), 'M4RecentFolderItem should have isFavorite property');
    assert(content.includes("validationStatus: 'valid' | 'invalid' | 'unknown'"), 'M4RecentFolderItem should have validationStatus property');
  });
  
  // 기본값 상수 확인
  addTest('M4_SETTINGS_DEFAULTS constant exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('M4_SETTINGS_DEFAULTS: M4Settings'), 'M4_SETTINGS_DEFAULTS constant should be defined');
    assert(content.includes("version: '1.0.0'"), 'M4_SETTINGS_DEFAULTS should have version 1.0.0');
    assert(content.includes("autoOpenOutput: true"), 'M4_SETTINGS_DEFAULTS should have autoOpenOutput: true');
    assert(content.includes("createBackup: true"), 'M4_SETTINGS_DEFAULTS should have createBackup: true');
    assert(content.includes("maxWorkerThreads: 4"), 'M4_SETTINGS_DEFAULTS should have maxWorkerThreads: 4');
  });
  
  // 파일명 패턴 상수 확인
  addTest('M4_FILENAME_PATTERNS constant exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('M4_FILENAME_PATTERNS = {'), 'M4_FILENAME_PATTERNS constant should be defined');
    assert(content.includes("SIMPLE: '{processType}'"), 'M4_FILENAME_PATTERNS should have SIMPLE pattern');
    assert(content.includes("WITH_TIMESTAMP: '{processType}_{timestamp}'"), 'M4_FILENAME_PATTERNS should have WITH_TIMESTAMP pattern');
    assert(content.includes("FULL: '{prefix}_{processType}_{timestamp}'"), 'M4_FILENAME_PATTERNS should have FULL pattern');
  });
  
  // 타임스탬프 형식 상수 확인
  addTest('M4_TIMESTAMP_FORMATS constant exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('M4_TIMESTAMP_FORMATS = {'), 'M4_TIMESTAMP_FORMATS constant should be defined');
    assert(content.includes("DATETIME: 'YYYY-MM-DD_HH-mm-ss'"), 'M4_TIMESTAMP_FORMATS should have DATETIME format');
    assert(content.includes("DATE_ONLY: 'YYYY-MM-DD'"), 'M4_TIMESTAMP_FORMATS should have DATE_ONLY format');
    assert(content.includes("ISO: 'YYYY-MM-DDTHH:mm:ss'"), 'M4_TIMESTAMP_FORMATS should have ISO format');
  });
  
  // 타입 가드 함수 확인
  addTest('Type guard functions exist', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('function isM4Settings(value: any): value is M4Settings'), 'isM4Settings type guard should be defined');
    assert(content.includes('function isM4FolderPaths(value: any): value is M4FolderPaths'), 'isM4FolderPaths type guard should be defined');
    assert(content.includes('function isM4RecentFolderItem(value: any): value is M4RecentFolderItem'), 'isM4RecentFolderItem type guard should be defined');
    assert(content.includes('function isM4ProcessingOptions(value: any): value is M4ProcessingOptions'), 'isM4ProcessingOptions type guard should be defined');
  });
  
  // 유틸리티 함수 확인
  addTest('Utility functions exist', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('function mergeM4Settings('), 'mergeM4Settings function should be defined');
    assert(content.includes('function initializeM4Settings('), 'initializeM4Settings function should be defined');
    assert(content.includes('function validateM4Settings('), 'validateM4Settings function should be defined');
    assert(content.includes('function migrateM4Settings('), 'migrateM4Settings function should be defined');
    assert(content.includes('function addRecentFolder('), 'addRecentFolder function should be defined');
    assert(content.includes('function cleanupRecentFolders('), 'cleanupRecentFolders function should be defined');
  });
  
  // IPC 채널 확인
  addTest('M4 settings IPC channels exist', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes("GET_M4_SETTINGS: 'get-m4-settings'"), 'GET_M4_SETTINGS IPC channel should be defined');
    assert(content.includes("SET_M4_SETTINGS: 'set-m4-settings'"), 'SET_M4_SETTINGS IPC channel should be defined');
    assert(content.includes("RESET_M4_SETTINGS: 'reset-m4-settings'"), 'RESET_M4_SETTINGS IPC channel should be defined');
    assert(content.includes("VALIDATE_M4_SETTINGS: 'validate-m4-settings'"), 'VALIDATE_M4_SETTINGS IPC channel should be defined');
    assert(content.includes("ADD_RECENT_M4_FOLDER: 'add-recent-m4-folder'"), 'ADD_RECENT_M4_FOLDER IPC channel should be defined');
    assert(content.includes("CLEANUP_RECENT_M4_FOLDERS: 'cleanup-recent-m4-folders'"), 'CLEANUP_RECENT_M4_FOLDERS IPC channel should be defined');
  });
  
  // IPC 요청 타입 확인
  addTest('M4 settings IPC request types exist', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('[IPC_CHANNELS.GET_M4_SETTINGS]: void'), 'GET_M4_SETTINGS request type should be defined');
    assert(content.includes('[IPC_CHANNELS.SET_M4_SETTINGS]: Partial<M4Settings>'), 'SET_M4_SETTINGS request type should be defined');
    assert(content.includes('[IPC_CHANNELS.VALIDATE_M4_SETTINGS]: M4Settings'), 'VALIDATE_M4_SETTINGS request type should be defined');
    assert(content.includes("processType: 'dialogue' | 'string'"), 'Process type should be defined in request types');
  });
  
  // IPC 응답 타입 확인
  addTest('M4 settings IPC response types exist', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('[IPC_CHANNELS.GET_M4_SETTINGS]: M4Settings'), 'GET_M4_SETTINGS response type should be defined');
    assert(content.includes('[IPC_CHANNELS.SET_M4_SETTINGS]: void'), 'SET_M4_SETTINGS response type should be defined');
    assert(content.includes('[IPC_CHANNELS.RESET_M4_SETTINGS]: M4Settings'), 'RESET_M4_SETTINGS response type should be defined');
    assert(content.includes('[IPC_CHANNELS.VALIDATE_M4_SETTINGS]: { isValid: boolean; errors: string[] }'), 'VALIDATE_M4_SETTINGS response type should be defined');
  });
  
  // electronAPI 확장 확인
  addTest('electronAPI M4 settings functions exist', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('getM4Settings: () => Promise<M4Settings>'), 'getM4Settings function should be defined in electronAPI');
    assert(content.includes('setM4Settings: (settings: Partial<M4Settings>) => Promise<void>'), 'setM4Settings function should be defined in electronAPI');
    assert(content.includes('resetM4Settings: () => Promise<M4Settings>'), 'resetM4Settings function should be defined in electronAPI');
    assert(content.includes('validateM4Settings: (settings: M4Settings) => Promise<{ isValid: boolean; errors: string[] }>'), 'validateM4Settings function should be defined in electronAPI');
    assert(content.includes('addRecentM4Folder: (processType: \'dialogue\' | \'string\', folderPath: string, alias?: string) => Promise<M4Settings>'), 'addRecentM4Folder function should be defined in electronAPI');
  });
  
  // AppState 확장 확인
  addTest('AppState interface includes M4Settings', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('m4Settings?: M4Settings'), 'AppState should include m4Settings property');
  });
  
  // 알림 설정 인터페이스 확인
  addTest('M4NotificationSettings interface exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4NotificationSettings'), 'M4NotificationSettings interface should be defined');
    assert(content.includes('notifyOnStart: boolean'), 'M4NotificationSettings should have notifyOnStart property');
    assert(content.includes('notifyOnComplete: boolean'), 'M4NotificationSettings should have notifyOnComplete property');
    assert(content.includes('notifyOnError: boolean'), 'M4NotificationSettings should have notifyOnError property');
    assert(content.includes('soundNotification: boolean'), 'M4NotificationSettings should have soundNotification property');
    assert(content.includes('systemNotification: boolean'), 'M4NotificationSettings should have systemNotification property');
  });
  
  // 검증 설정 인터페이스 확인
  addTest('M4ValidationSettings interface exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4ValidationSettings'), 'M4ValidationSettings interface should be defined');
    assert(content.includes('enableFileValidation: boolean'), 'M4ValidationSettings should have enableFileValidation property');
    assert(content.includes('enableDataValidation: boolean'), 'M4ValidationSettings should have enableDataValidation property');
    assert(content.includes('strictValidation: boolean'), 'M4ValidationSettings should have strictValidation property');
    assert(content.includes('customValidationRules: string[]'), 'M4ValidationSettings should have customValidationRules property');
  });
  
  // 출력 파일명 규칙 인터페이스 확인
  addTest('M4OutputFileNaming interface exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4OutputFileNaming'), 'M4OutputFileNaming interface should be defined');
    assert(content.includes('pattern: string'), 'M4OutputFileNaming should have pattern property');
    assert(content.includes('includeTimestamp: boolean'), 'M4OutputFileNaming should have includeTimestamp property');
    assert(content.includes('timestampFormat: string'), 'M4OutputFileNaming should have timestampFormat property');
    assert(content.includes('includeProcessType: boolean'), 'M4OutputFileNaming should have includeProcessType property');
    assert(content.includes('customPrefix: string'), 'M4OutputFileNaming should have customPrefix property');
  });
  
  // 기본 설정 인터페이스 확인
  addTest('M4DefaultSettings interface exists', () => {
    const typesPath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert(content.includes('interface M4DefaultSettings'), 'M4DefaultSettings interface should be defined');
    assert(content.includes("defaultProcessType: 'dialogue' | 'string'"), 'M4DefaultSettings should have defaultProcessType property');
    assert(content.includes('defaultInputFolder: string'), 'M4DefaultSettings should have defaultInputFolder property');
    assert(content.includes('defaultOutputFolder: string'), 'M4DefaultSettings should have defaultOutputFolder property');
    assert(content.includes('defaultProcessingOptions: Partial<M4ProcessingOptions>'), 'M4DefaultSettings should have defaultProcessingOptions property');
    assert(content.includes('customDefaults: Record<string, any>'), 'M4DefaultSettings should have customDefaults property');
  });
  
  // 실행 및 결과 정리
  console.log('Starting M4 Settings Schema validation tests...\n');
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  for (const test of tests) {
    const result = runTest(test.name, test.testFn);
    results.push(result);
    
    if (result.status === 'PASSED') {
      passedCount++;
    } else {
      failedCount++;
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  console.log('\n============================================================');
  console.log('📊 M4 Settings Schema Test Results Summary');
  console.log('============================================================');
  console.log(`   Total Tests: ${tests.length}`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Success Rate: ${((passedCount / tests.length) * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${totalDuration}ms`);
  
  if (failedCount > 0) {
    console.log('\n❌ Failed Tests:');
    results.forEach(result => {
      if (result.status === 'FAILED') {
        console.log(`   - ${result.name}: ${result.error}`);
      }
    });
  }
  
  console.log('\n🎉 All M4 Settings Schema validation tests completed!');
  
  // 테스트 결과 파일 저장
  const testResultsPath = path.join(__dirname, '..', 'test-outputs', 'm4-settings-schema-test-results.json');
  const testResults = {
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passedTests: passedCount,
    failedTests: failedCount,
    successRate: ((passedCount / tests.length) * 100).toFixed(1) + '%',
    totalDuration: totalDuration,
    results: results
  };
  
  // 출력 디렉토리 생성
  const outputDir = path.dirname(testResultsPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📋 Test results saved to: ${testResultsPath}`);
  
  return {
    success: failedCount === 0,
    results: testResults
  };
}

// 메인 실행
if (require.main === module) {
  try {
    const result = runM4SettingsSchemaValidation();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ M4 Settings Schema validation failed:', error);
    process.exit(1);
  }
}

module.exports = { runM4SettingsSchemaValidation };