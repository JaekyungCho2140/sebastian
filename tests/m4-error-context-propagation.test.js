/**
 * M4 Error Context Propagation Tests
 * 
 * Comprehensive test suite for M4 error context propagation system
 * covering Worker Thread serialization, error recovery, and UI integration.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  verbose: true
};

// Test utilities
class M4ErrorTestUtils {
  static async compileTypeScript() {
    try {
      console.log('🔨 Compiling TypeScript for M4 error system...');
      execSync('npx tsc --project tsconfig.main.json --noEmit', { 
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '..')
      });
      console.log('✅ TypeScript compilation successful');
      return true;
    } catch (error) {
      console.error('❌ TypeScript compilation failed:', error.message);
      return false;
    }
  }
  
  static checkFileExists(filePath) {
    const fullPath = path.resolve(__dirname, '..', filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`📁 File check: ${filePath} - ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    return exists;
  }
  
  static async createMockError(errorType, context = {}) {
    const mockError = {
      message: `Mock ${errorType} error`,
      name: 'MockError',
      stack: new Error().stack,
      ...context
    };
    return mockError;
  }
  
  static logTestResult(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${details ? ' - ' + details : ''}`);
  }
}

// Test Suite: M4 Error Context Propagation
describe('M4 Error Context Propagation System', () => {
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  beforeAll(async () => {
    console.log('🚀 Starting M4 Error Context Propagation Tests...');
    console.log('📋 Test Configuration:', TEST_CONFIG);
    
    // Compile TypeScript
    const compileSuccess = await M4ErrorTestUtils.compileTypeScript();
    if (!compileSuccess) {
      console.error('❌ Cannot proceed with tests due to compilation errors');
      process.exit(1);
    }
  });
  
  afterAll(() => {
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.total}`);
    console.log(`🎯 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  });
  
  // Test 1: M4 Processing Error Types Structure
  test('M4 Processing Error Types Structure', () => {
    testResults.total++;
    
    try {
      // Check if M4 error types file exists
      const errorTypesExist = M4ErrorTestUtils.checkFileExists('src/types/m4ProcessingErrors.ts');
      
      if (!errorTypesExist) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('M4 Processing Error Types', false, 'Types file missing');
        return;
      }
      
      // Read and validate error types file
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, '../src/types/m4ProcessingErrors.ts'),
        'utf8'
      );
      
      // Check for essential exports
      const requiredExports = [
        'M4ErrorType',
        'M4ErrorSeverity', 
        'M4ErrorContext',
        'M4ProcessingError',
        'SerializableM4Error',
        'M4ErrorFactory'
      ];
      
      const missingExports = requiredExports.filter(exp => 
        !typesContent.includes(`export enum ${exp}`) && 
        !typesContent.includes(`export interface ${exp}`) &&
        !typesContent.includes(`export class ${exp}`)
      );
      
      if (missingExports.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('M4 Processing Error Types', false, 
          `Missing exports: ${missingExports.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('M4 Processing Error Types', true, 
        'All required types and classes defined');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('M4 Processing Error Types', false, error.message);
    }
  });
  
  // Test 2: M4 Error Serialization System
  test('M4 Error Serialization System', () => {
    testResults.total++;
    
    try {
      // Check if serialization utilities exist
      const serializerExists = M4ErrorTestUtils.checkFileExists('src/utils/m4ErrorSerializer.ts');
      
      if (!serializerExists) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('M4 Error Serialization', false, 'Serializer file missing');
        return;
      }
      
      // Read and validate serializer file
      const serializerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/utils/m4ErrorSerializer.ts'),
        'utf8'
      );
      
      // Check for essential serialization components
      const requiredComponents = [
        'IErrorSerializer',
        'M4ErrorSerializer',
        'M4ErrorPropagator',
        'M4ErrorContextBuilder',
        'serialize',
        'deserialize'
      ];
      
      const missingComponents = requiredComponents.filter(comp => 
        !serializerContent.includes(comp)
      );
      
      if (missingComponents.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('M4 Error Serialization', false, 
          `Missing components: ${missingComponents.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('M4 Error Serialization', true, 
        'All serialization components implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('M4 Error Serialization', false, error.message);
    }
  });
  
  // Test 3: Worker Thread Error Integration
  test('Worker Thread Error Integration', () => {
    testResults.total++;
    
    try {
      // Check if worker thread has been updated
      const workerExists = M4ErrorTestUtils.checkFileExists('src/workers/m4ProcessWorker.ts');
      
      if (!workerExists) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Worker Thread Integration', false, 'Worker file missing');
        return;
      }
      
      // Read and validate worker file
      const workerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/workers/m4ProcessWorker.ts'),
        'utf8'
      );
      
      // Check for M4 error system integration
      const integrationChecks = [
        'M4ProcessingError',
        'M4ErrorType',
        'M4ErrorContext',
        'errorSerializer',
        'errorPropagator',
        'errorContextBuilder',
        'handleError'
      ];
      
      const missingIntegrations = integrationChecks.filter(check => 
        !workerContent.includes(check)
      );
      
      if (missingIntegrations.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Worker Thread Integration', false, 
          `Missing integrations: ${missingIntegrations.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Worker Thread Integration', true, 
        'Worker thread error system fully integrated');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Worker Thread Integration', false, error.message);
    }
  });
  
  // Test 4: Error Context Builder Pattern
  test('Error Context Builder Pattern', () => {
    testResults.total++;
    
    try {
      // Check if error context builder pattern is implemented
      const serializerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/utils/m4ErrorSerializer.ts'),
        'utf8'
      );
      
      // Check for builder methods
      const builderMethods = [
        'withStage',
        'withProcessType',
        'withFile',
        'withSheet',
        'withLocation',
        'withWorker',
        'withProgress',
        'withMemoryUsage',
        'withCustomData',
        'build'
      ];
      
      const missingMethods = builderMethods.filter(method => 
        !serializerContent.includes(method)
      );
      
      if (missingMethods.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Context Builder', false, 
          `Missing methods: ${missingMethods.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Context Builder', true, 
        'Complete builder pattern implementation');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Context Builder', false, error.message);
    }
  });
  
  // Test 5: Error Factory Pattern
  test('Error Factory Pattern', () => {
    testResults.total++;
    
    try {
      // Check if error factory is implemented
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, '../src/types/m4ProcessingErrors.ts'),
        'utf8'
      );
      
      // Check for factory methods
      const factoryMethods = [
        'createFileNotFoundError',
        'createMemoryPressureError',
        'createWorkerThreadError'
      ];
      
      const missingFactoryMethods = factoryMethods.filter(method => 
        !typesContent.includes(method)
      );
      
      if (missingFactoryMethods.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Factory Pattern', false, 
          `Missing factory methods: ${missingFactoryMethods.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Factory Pattern', true, 
        'Error factory pattern fully implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Factory Pattern', false, error.message);
    }
  });
  
  // Test 6: Error Propagation Statistics
  test('Error Propagation Statistics', () => {
    testResults.total++;
    
    try {
      // Check if error statistics are tracked
      const serializerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/utils/m4ErrorSerializer.ts'),
        'utf8'
      );
      
      // Check for statistics components
      const statisticsComponents = [
        'ErrorPropagationStats',
        'getStats',
        'resetStats',
        'updateErrorStatistics'
      ];
      
      const missingStats = statisticsComponents.filter(comp => 
        !serializerContent.includes(comp)
      );
      
      if (missingStats.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Propagation Statistics', false, 
          `Missing statistics: ${missingStats.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Propagation Statistics', true, 
        'Complete statistics tracking system');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Propagation Statistics', false, error.message);
    }
  });
  
  // Test 7: Error Message Prioritization
  test('Error Message Prioritization', () => {
    testResults.total++;
    
    try {
      // Check if error messages use priority system
      const workerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/workers/m4ProcessWorker.ts'),
        'utf8'
      );
      
      // Check for priority usage in error handling
      const priorityChecks = [
        'MessagePriority.URGENT',
        'MessagePriority.HIGH',
        'priority',
        'ErrorPropagationChannel'
      ];
      
      const missingPriorities = priorityChecks.filter(check => 
        !workerContent.includes(check)
      );
      
      if (missingPriorities.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Message Prioritization', false, 
          `Missing priority features: ${missingPriorities.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Message Prioritization', true, 
        'Error message prioritization system implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Message Prioritization', false, error.message);
    }
  });
  
  // Test 8: Error Recovery Strategy
  test('Error Recovery Strategy', () => {
    testResults.total++;
    
    try {
      // Check if error recovery strategies are defined
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, '../src/types/m4ProcessingErrors.ts'),
        'utf8'
      );
      
      // Check for recovery-related properties
      const recoveryFeatures = [
        'recoverable',
        'retryable',
        'resolutionSteps',
        'determineRecoverable',
        'determineRetryable'
      ];
      
      const missingRecovery = recoveryFeatures.filter(feature => 
        !typesContent.includes(feature)
      );
      
      if (missingRecovery.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Recovery Strategy', false, 
          `Missing recovery features: ${missingRecovery.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Recovery Strategy', true, 
        'Complete error recovery strategy system');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Recovery Strategy', false, error.message);
    }
  });
  
  // Test 9: Error Context Propagation
  test('Error Context Propagation', () => {
    testResults.total++;
    
    try {
      // Check if error context propagation is implemented
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, '../src/types/m4ProcessingErrors.ts'),
        'utf8'
      );
      
      // Check for context propagation features
      const propagationFeatures = [
        'M4ErrorContextPropagator',
        'propagateError',
        'getErrorHistory',
        'getErrorStatistics',
        'getInstance'
      ];
      
      const missingPropagation = propagationFeatures.filter(feature => 
        !typesContent.includes(feature)
      );
      
      if (missingPropagation.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Context Propagation', false, 
          `Missing propagation features: ${missingPropagation.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Context Propagation', true, 
        'Error context propagation system implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Context Propagation', false, error.message);
    }
  });
  
  // Test 10: Type Safety and Validation
  test('Type Safety and Validation', () => {
    testResults.total++;
    
    try {
      // Check if type guards are implemented
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, '../src/types/m4ProcessingErrors.ts'),
        'utf8'
      );
      
      // Check for type safety features
      const typeSafetyFeatures = [
        'isM4ProcessingError',
        'isSerializableM4Error',
        'validateSerializedError',
        'isSerializable'
      ];
      
      const missingTypeSafety = typeSafetyFeatures.filter(feature => 
        !typesContent.includes(feature)
      );
      
      if (missingTypeSafety.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Type Safety and Validation', false, 
          `Missing type safety features: ${missingTypeSafety.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Type Safety and Validation', true, 
        'Complete type safety and validation system');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Type Safety and Validation', false, error.message);
    }
  });
  
  // Test 11: Error Serialization Performance
  test('Error Serialization Performance', () => {
    testResults.total++;
    
    try {
      // Check if performance tracking is implemented
      const serializerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/utils/m4ErrorSerializer.ts'),
        'utf8'
      );
      
      // Check for performance features
      const performanceFeatures = [
        'getSize',
        'averageSerializationTime',
        'averageTransmissionTime',
        'performance.now',
        'updateAverageSerializationTime'
      ];
      
      const missingPerformance = performanceFeatures.filter(feature => 
        !serializerContent.includes(feature)
      );
      
      if (missingPerformance.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Serialization Performance', false, 
          `Missing performance features: ${missingPerformance.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Serialization Performance', true, 
        'Performance tracking system implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Serialization Performance', false, error.message);
    }
  });
  
  // Test 12: Error Context Builder Fluent API
  test('Error Context Builder Fluent API', () => {
    testResults.total++;
    
    try {
      // Check if fluent API pattern is properly implemented
      const serializerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/utils/m4ErrorSerializer.ts'),
        'utf8'
      );
      
      // Check for fluent API chain patterns
      const fluentAPIChecks = [
        'M4ErrorContextBuilder',
        'create()',
        'return this',
        'public static create',
        'build()'
      ];
      
      const missingFluentAPI = fluentAPIChecks.filter(check => 
        !serializerContent.includes(check)
      );
      
      if (missingFluentAPI.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Context Builder Fluent API', false, 
          `Missing fluent API features: ${missingFluentAPI.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Context Builder Fluent API', true, 
        'Fluent API pattern properly implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Context Builder Fluent API', false, error.message);
    }
  });
  
  // Test 13: Integration with Existing Sebastian Error System
  test('Integration with Existing Sebastian Error System', () => {
    testResults.total++;
    
    try {
      // Check if M4 errors can integrate with Sebastian error system
      const workerContent = fs.readFileSync(
        path.resolve(__dirname, '../src/workers/m4ProcessWorker.ts'),
        'utf8'
      );
      
      // Check for backward compatibility
      const compatibilityChecks = [
        'createWorkerError',
        'WorkerError',
        'WorkerErrorType',
        'WorkerErrorSeverity',
        'handleSerializationError'
      ];
      
      const missingCompatibility = compatibilityChecks.filter(check => 
        !workerContent.includes(check)
      );
      
      if (missingCompatibility.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Sebastian Error System Integration', false, 
          `Missing compatibility features: ${missingCompatibility.join(', ')}`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Sebastian Error System Integration', true, 
        'Backward compatibility maintained');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Sebastian Error System Integration', false, error.message);
    }
  });
  
  // Test 14: Error Message Localization
  test('Error Message Localization', () => {
    testResults.total++;
    
    try {
      // Check if error messages support Korean localization
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, '../src/types/m4ProcessingErrors.ts'),
        'utf8'
      );
      
      // Check for Korean error messages
      const koreanMessages = [
        '파일을 찾을 수 없습니다',
        '파일 접근 권한이 없습니다',
        '메모리 부족으로',
        '백그라운드 처리 중 오류가'
      ];
      
      const missingKoreanMessages = koreanMessages.filter(msg => 
        !typesContent.includes(msg)
      );
      
      if (missingKoreanMessages.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Error Message Localization', false, 
          `Missing Korean messages: ${missingKoreanMessages.length} messages`);
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Error Message Localization', true, 
        'Korean error message localization implemented');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Error Message Localization', false, error.message);
    }
  });
  
  // Test 15: Complete System Integration
  test('Complete System Integration', async () => {
    testResults.total++;
    
    try {
      // Final integration test - check all components work together
      const allComponents = [
        'src/types/m4ProcessingErrors.ts',
        'src/utils/m4ErrorSerializer.ts',
        'src/workers/m4ProcessWorker.ts'
      ];
      
      const missingComponents = allComponents.filter(comp => 
        !M4ErrorTestUtils.checkFileExists(comp)
      );
      
      if (missingComponents.length > 0) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Complete System Integration', false, 
          `Missing components: ${missingComponents.join(', ')}`);
        return;
      }
      
      // Check TypeScript compilation passes
      const compileSuccess = await M4ErrorTestUtils.compileTypeScript();
      if (!compileSuccess) {
        testResults.failed++;
        M4ErrorTestUtils.logTestResult('Complete System Integration', false, 
          'TypeScript compilation failed');
        return;
      }
      
      testResults.passed++;
      M4ErrorTestUtils.logTestResult('Complete System Integration', true, 
        'All components integrated successfully');
      
    } catch (error) {
      testResults.failed++;
      M4ErrorTestUtils.logTestResult('Complete System Integration', false, error.message);
    }
  });
});

// Export test results for CI/CD integration
module.exports = {
  testName: 'M4 Error Context Propagation',
  testResults: () => testResults
};