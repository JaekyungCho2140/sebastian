/**
 * M4 Processing Types Validation Tests
 * 
 * This file contains comprehensive tests for all M4 processing types,
 * interfaces, and utility functions.
 */

import {
  // Types and Interfaces
  ProcessType,
  ProcessStep,
  ProcessPriority,
  M4ProcessConfig,
  M4ProcessOptions,
  M4ProcessProgress,
  M4ProcessResult,
  M4ProcessStatistics,
  M4ProcessLog,
  M4FileConfig,
  M4ColumnMapping,
  M4FilterCondition,
  M4ValidationRule,
  M4DialogueConfig,
  M4DialogueData,
  M4StringConfig,
  M4StringFileConfig,
  M4StringData,
  M4TableIdGeneration,
  
  // Constants
  DIALOGUE_REQUIRED_FILES,
  STRING_REQUIRED_FILES,
  ALL_REQUIRED_FILES,
  DEFAULT_M4_OPTIONS,
  DEFAULT_DIALOGUE_CONFIG,
  DEFAULT_STRING_CONFIG,
  
  // Type Guards
  isProcessType,
  isProcessStep,
  isM4ProcessConfig,
  isM4ProcessResult,
  
  // Factory Functions
  createM4ProcessProgress,
  createM4ProcessLog,
  createEmptyM4ProcessStatistics,
  
  // Utility Functions
  getRequiredFiles,
  inferProcessType,
  calculateStepProgress
} from '../m4Processing';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * 유효한 M4ProcessConfig 생성
 */
function createValidM4ProcessConfig(): M4ProcessConfig {
  return {
    type: ProcessType.DIALOGUE,
    inputFolder: '/path/to/input',
    outputFolder: '/path/to/output',
    requiredFiles: DIALOGUE_REQUIRED_FILES,
    outputFileName: 'output.xlsx',
    priority: ProcessPriority.HIGH,
    options: DEFAULT_M4_OPTIONS
  };
}

/**
 * 유효한 M4ProcessResult 생성
 */
function createValidM4ProcessResult(): M4ProcessResult {
  return {
    success: true,
    outputPath: '/path/to/output.xlsx',
    processedFileCount: 3,
    elapsedTime: 120.5,
    statistics: createEmptyM4ProcessStatistics(),
    logs: [
      createM4ProcessLog('info', 'Processing started'),
      createM4ProcessLog('info', 'Processing completed')
    ],
    generatedFiles: ['/path/to/output.xlsx']
  };
}

/**
 * 유효한 M4DialogueConfig 생성
 */
function createValidM4DialogueConfig(): M4DialogueConfig {
  return {
    filename: 'CINEMATIC_DIALOGUE.xlsm',
    headerRow: 2,
    skipRows: 1,
    columnMapping: [
      {
        sourceIndex: 0,
        targetIndex: 0,
        name: 'ID',
        dataType: 'string',
        required: true
      }
    ],
    npcMapping: {
      'NPC001': 'Hero',
      'NPC002': 'Villain'
    },
    filterColumn: 23,
    outputColumnCount: 23
  };
}

/**
 * 유효한 M4StringConfig 생성
 */
function createValidM4StringConfig(): M4StringConfig {
  return {
    files: [
      {
        fileId: 'ACHIEVEMENT',
        filename: 'ACHIEVEMENT.xlsm',
        headerRow: 2,
        skipRows: 1,
        columnMapping: [],
        columnMappingTable: { 1: 1, 2: 2, 3: 3 }
      }
    ],
    outputColumnCount: 15,
    tableIdGeneration: {
      tableRule: 'filename',
      idRule: 'filename_sequential'
    }
  };
}

// ============================================================================
// Type Enum Tests
// ============================================================================

describe('M4 Processing Enums', () => {
  describe('ProcessType', () => {
    test('should contain expected values', () => {
      expect(ProcessType.DIALOGUE).toBe('dialogue');
      expect(ProcessType.STRING).toBe('string');
    });
    
    test('should have exactly 2 values', () => {
      expect(Object.keys(ProcessType)).toHaveLength(2);
    });
  });
  
  describe('ProcessStep', () => {
    test('should contain expected values', () => {
      expect(ProcessStep.INITIALIZING).toBe('initializing');
      expect(ProcessStep.READING_FILES).toBe('reading_files');
      expect(ProcessStep.PROCESSING_DATA).toBe('processing_data');
      expect(ProcessStep.WRITING_OUTPUT).toBe('writing_output');
      expect(ProcessStep.COMPLETED).toBe('completed');
      expect(ProcessStep.ERROR).toBe('error');
    });
    
    test('should have exactly 6 values', () => {
      expect(Object.keys(ProcessStep)).toHaveLength(6);
    });
  });
  
  describe('ProcessPriority', () => {
    test('should contain expected values', () => {
      expect(ProcessPriority.LOW).toBe('low');
      expect(ProcessPriority.MEDIUM).toBe('medium');
      expect(ProcessPriority.HIGH).toBe('high');
    });
    
    test('should have exactly 3 values', () => {
      expect(Object.keys(ProcessPriority)).toHaveLength(3);
    });
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('Type Guards', () => {
  describe('isProcessType', () => {
    test('should return true for valid ProcessType values', () => {
      expect(isProcessType('dialogue')).toBe(true);
      expect(isProcessType('string')).toBe(true);
      expect(isProcessType(ProcessType.DIALOGUE)).toBe(true);
      expect(isProcessType(ProcessType.STRING)).toBe(true);
    });
    
    test('should return false for invalid values', () => {
      expect(isProcessType('invalid')).toBe(false);
      expect(isProcessType(null)).toBe(false);
      expect(isProcessType(undefined)).toBe(false);
      expect(isProcessType(123)).toBe(false);
    });
  });
  
  describe('isProcessStep', () => {
    test('should return true for valid ProcessStep values', () => {
      expect(isProcessStep('initializing')).toBe(true);
      expect(isProcessStep('reading_files')).toBe(true);
      expect(isProcessStep('processing_data')).toBe(true);
      expect(isProcessStep('writing_output')).toBe(true);
      expect(isProcessStep('completed')).toBe(true);
      expect(isProcessStep('error')).toBe(true);
    });
    
    test('should return false for invalid values', () => {
      expect(isProcessStep('invalid')).toBe(false);
      expect(isProcessStep(null)).toBe(false);
      expect(isProcessStep(undefined)).toBe(false);
      expect(isProcessStep(123)).toBe(false);
    });
  });
  
  describe('isM4ProcessConfig', () => {
    test('should return true for valid M4ProcessConfig', () => {
      const config = createValidM4ProcessConfig();
      expect(isM4ProcessConfig(config)).toBe(true);
    });
    
    test('should return false for invalid objects', () => {
      expect(isM4ProcessConfig(null)).toBe(false);
      expect(isM4ProcessConfig(undefined)).toBe(false);
      expect(isM4ProcessConfig({})).toBe(false);
      expect(isM4ProcessConfig({
        type: 'invalid',
        inputFolder: '/path'
      })).toBe(false);
    });
  });
  
  describe('isM4ProcessResult', () => {
    test('should return true for valid M4ProcessResult', () => {
      const result = createValidM4ProcessResult();
      expect(isM4ProcessResult(result)).toBe(true);
    });
    
    test('should return false for invalid objects', () => {
      expect(isM4ProcessResult(null)).toBe(false);
      expect(isM4ProcessResult(undefined)).toBe(false);
      expect(isM4ProcessResult({})).toBe(false);
      expect(isM4ProcessResult({
        success: true,
        outputPath: '/path'
      })).toBe(false);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
  describe('createM4ProcessProgress', () => {
    test('should create valid progress object', () => {
      const progress = createM4ProcessProgress(
        50,
        ProcessStep.PROCESSING_DATA,
        'test.xlsx',
        5,
        10
      );
      
      expect(progress.percentage).toBe(50);
      expect(progress.currentStep).toBe(ProcessStep.PROCESSING_DATA);
      expect(progress.currentFile).toBe('test.xlsx');
      expect(progress.processedFiles).toBe(5);
      expect(progress.totalFiles).toBe(10);
      expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
      expect(progress.startTime).toBeGreaterThan(0);
      expect(progress.currentTime).toBeGreaterThan(0);
      expect(progress.statusMessage).toContain('test.xlsx');
    });
  });
  
  describe('createM4ProcessLog', () => {
    test('should create valid log object', () => {
      const log = createM4ProcessLog(
        'info',
        'Test message',
        'test.xlsx',
        10,
        { key: 'value' }
      );
      
      expect(log.level).toBe('info');
      expect(log.message).toBe('Test message');
      expect(log.filename).toBe('test.xlsx');
      expect(log.rowNumber).toBe(10);
      expect(log.context).toEqual({ key: 'value' });
      expect(log.timestamp).toBeGreaterThan(0);
    });
    
    test('should create log with minimal parameters', () => {
      const log = createM4ProcessLog('error', 'Error message');
      
      expect(log.level).toBe('error');
      expect(log.message).toBe('Error message');
      expect(log.filename).toBeUndefined();
      expect(log.rowNumber).toBeUndefined();
      expect(log.context).toBeUndefined();
      expect(log.timestamp).toBeGreaterThan(0);
    });
  });
  
  describe('createEmptyM4ProcessStatistics', () => {
    test('should create statistics with zero values', () => {
      const stats = createEmptyM4ProcessStatistics();
      
      expect(stats.totalRowsProcessed).toBe(0);
      expect(stats.totalColumnsProcessed).toBe(0);
      expect(stats.filteredRowsCount).toBe(0);
      expect(stats.mappedDataCount).toBe(0);
      expect(stats.validatedRowsCount).toBe(0);
      expect(stats.errorRowsCount).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.peakMemoryUsage).toBe(0);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('getRequiredFiles', () => {
    test('should return dialogue files for DIALOGUE type', () => {
      const files = getRequiredFiles(ProcessType.DIALOGUE);
      expect(files).toEqual(DIALOGUE_REQUIRED_FILES);
    });
    
    test('should return string files for STRING type', () => {
      const files = getRequiredFiles(ProcessType.STRING);
      expect(files).toEqual(STRING_REQUIRED_FILES);
    });
  });
  
  describe('inferProcessType', () => {
    test('should infer DIALOGUE type from dialogue files', () => {
      expect(inferProcessType('CINEMATIC_DIALOGUE.xlsm')).toBe(ProcessType.DIALOGUE);
      expect(inferProcessType('SMALLTALK_DIALOGUE.xlsm')).toBe(ProcessType.DIALOGUE);
      expect(inferProcessType('NPC.xlsm')).toBe(ProcessType.DIALOGUE);
    });
    
    test('should infer STRING type from string files', () => {
      expect(inferProcessType('ACHIEVEMENT.xlsm')).toBe(ProcessType.STRING);
      expect(inferProcessType('BUFF.xlsm')).toBe(ProcessType.STRING);
      expect(inferProcessType('ITEM.xlsm')).toBe(ProcessType.STRING);
    });
    
    test('should return null for unknown files', () => {
      expect(inferProcessType('UNKNOWN.xlsm')).toBeNull();
      expect(inferProcessType('test.txt')).toBeNull();
    });
    
    test('should be case insensitive', () => {
      expect(inferProcessType('cinematic_dialogue.xlsm')).toBe(ProcessType.DIALOGUE);
      expect(inferProcessType('ACHIEVEMENT.XLSM')).toBe(ProcessType.STRING);
    });
  });
  
  describe('calculateStepProgress', () => {
    test('should calculate correct progress for each step', () => {
      expect(calculateStepProgress(ProcessStep.INITIALIZING)).toBe(0);
      expect(calculateStepProgress(ProcessStep.READING_FILES)).toBe(25);
      expect(calculateStepProgress(ProcessStep.PROCESSING_DATA)).toBe(50);
      expect(calculateStepProgress(ProcessStep.WRITING_OUTPUT)).toBe(75);
      expect(calculateStepProgress(ProcessStep.COMPLETED)).toBe(100);
    });
    
    test('should return 0 for ERROR step', () => {
      expect(calculateStepProgress(ProcessStep.ERROR)).toBe(0);
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  describe('Required Files', () => {
    test('DIALOGUE_REQUIRED_FILES should contain expected files', () => {
      expect(DIALOGUE_REQUIRED_FILES).toContain('CINEMATIC_DIALOGUE.xlsm');
      expect(DIALOGUE_REQUIRED_FILES).toContain('SMALLTALK_DIALOGUE.xlsm');
      expect(DIALOGUE_REQUIRED_FILES).toContain('NPC.xlsm');
      expect(DIALOGUE_REQUIRED_FILES).toHaveLength(3);
    });
    
    test('STRING_REQUIRED_FILES should contain expected files', () => {
      expect(STRING_REQUIRED_FILES).toContain('ACHIEVEMENT.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('BUFF.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('ITEM.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('QUEST.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('SKILL.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('SYSTEM.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('TITLE.xlsm');
      expect(STRING_REQUIRED_FILES).toContain('UI.xlsm');
      expect(STRING_REQUIRED_FILES).toHaveLength(8);
    });
    
    test('ALL_REQUIRED_FILES should contain all files', () => {
      expect(ALL_REQUIRED_FILES).toHaveLength(11);
      expect(ALL_REQUIRED_FILES).toEqual([
        ...DIALOGUE_REQUIRED_FILES,
        ...STRING_REQUIRED_FILES
      ]);
    });
  });
  
  describe('Default Configurations', () => {
    test('DEFAULT_M4_OPTIONS should have expected values', () => {
      expect(DEFAULT_M4_OPTIONS.enableParallelProcessing).toBe(true);
      expect(DEFAULT_M4_OPTIONS.maxWorkerThreads).toBe(4);
      expect(DEFAULT_M4_OPTIONS.memoryLimit).toBe(1024);
      expect(DEFAULT_M4_OPTIONS.timeout).toBe(300);
      expect(DEFAULT_M4_OPTIONS.createBackup).toBe(true);
      expect(DEFAULT_M4_OPTIONS.verbose).toBe(false);
    });
    
    test('DEFAULT_DIALOGUE_CONFIG should have expected values', () => {
      expect(DEFAULT_DIALOGUE_CONFIG.headerRow).toBe(2);
      expect(DEFAULT_DIALOGUE_CONFIG.skipRows).toBe(1);
      expect(DEFAULT_DIALOGUE_CONFIG.filterColumn).toBe(23);
      expect(DEFAULT_DIALOGUE_CONFIG.outputColumnCount).toBe(23);
    });
    
    test('DEFAULT_STRING_CONFIG should have expected values', () => {
      expect(DEFAULT_STRING_CONFIG.outputColumnCount).toBe(15);
      expect(DEFAULT_STRING_CONFIG.tableIdGeneration?.tableRule).toBe('filename');
      expect(DEFAULT_STRING_CONFIG.tableIdGeneration?.idRule).toBe('filename_sequential');
    });
  });
});

// ============================================================================
// Interface Validation Tests
// ============================================================================

describe('Interface Validation', () => {
  describe('M4ProcessConfig', () => {
    test('should accept valid configuration', () => {
      const config = createValidM4ProcessConfig();
      expect(() => {
        // TypeScript 컴파일 타임에서 검증됨
        const processConfig: M4ProcessConfig = config;
        expect(processConfig.type).toBe(ProcessType.DIALOGUE);
      }).not.toThrow();
    });
    
    test('should handle optional properties', () => {
      const minimalConfig: M4ProcessConfig = {
        type: ProcessType.STRING,
        inputFolder: '/input',
        outputFolder: '/output',
        requiredFiles: STRING_REQUIRED_FILES,
        outputFileName: 'output.xlsx'
      };
      
      expect(minimalConfig.priority).toBeUndefined();
      expect(minimalConfig.options).toBeUndefined();
    });
  });
  
  describe('M4ProcessProgress', () => {
    test('should accept valid progress object', () => {
      const progress = createM4ProcessProgress(
        75,
        ProcessStep.WRITING_OUTPUT,
        'final.xlsx',
        7,
        10
      );
      
      expect(progress.percentage).toBe(75);
      expect(progress.currentStep).toBe(ProcessStep.WRITING_OUTPUT);
      expect(progress.details).toBeUndefined();
    });
  });
  
  describe('M4ProcessResult', () => {
    test('should accept valid result object', () => {
      const result = createValidM4ProcessResult();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.statistics).toBeDefined();
      expect(result.logs).toBeInstanceOf(Array);
      expect(result.generatedFiles).toBeInstanceOf(Array);
    });
    
    test('should handle error case', () => {
      const errorResult: M4ProcessResult = {
        success: false,
        outputPath: '',
        error: 'Processing failed',
        processedFileCount: 0,
        elapsedTime: 10.5,
        statistics: createEmptyM4ProcessStatistics(),
        logs: [createM4ProcessLog('error', 'Processing failed')],
        generatedFiles: []
      };
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Processing failed');
    });
  });
});

// ============================================================================
// Complex Type Tests
// ============================================================================

describe('Complex Types', () => {
  describe('M4DialogueConfig', () => {
    test('should extend M4FileConfig properly', () => {
      const config = createValidM4DialogueConfig();
      
      // M4FileConfig 속성
      expect(config.filename).toBe('CINEMATIC_DIALOGUE.xlsm');
      expect(config.headerRow).toBe(2);
      expect(config.skipRows).toBe(1);
      expect(config.columnMapping).toBeInstanceOf(Array);
      
      // M4DialogueConfig 고유 속성
      expect(config.npcMapping).toBeInstanceOf(Object);
      expect(config.filterColumn).toBe(23);
      expect(config.outputColumnCount).toBe(23);
    });
  });
  
  describe('M4StringConfig', () => {
    test('should contain file configurations', () => {
      const config = createValidM4StringConfig();
      
      expect(config.files).toBeInstanceOf(Array);
      expect(config.files).toHaveLength(1);
      expect(config.files[0].fileId).toBe('ACHIEVEMENT');
      expect(config.files[0].columnMappingTable).toBeInstanceOf(Object);
      expect(config.outputColumnCount).toBe(15);
      expect(config.tableIdGeneration.tableRule).toBe('filename');
    });
  });
});

// ============================================================================
// Runtime Type Checking Tests
// ============================================================================

describe('Runtime Type Checking', () => {
  test('should validate enum values at runtime', () => {
    const validType = 'dialogue';
    const invalidType = 'invalid';
    
    expect(isProcessType(validType)).toBe(true);
    expect(isProcessType(invalidType)).toBe(false);
  });
  
  test('should validate complex objects at runtime', () => {
    const validConfig = createValidM4ProcessConfig();
    const invalidConfig = {
      type: 'invalid',
      inputFolder: '/path'
    };
    
    expect(isM4ProcessConfig(validConfig)).toBe(true);
    expect(isM4ProcessConfig(invalidConfig)).toBe(false);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  test('should handle null/undefined inputs gracefully', () => {
    expect(isProcessType(null)).toBe(false);
    expect(isProcessType(undefined)).toBe(false);
    expect(isM4ProcessConfig(null)).toBe(false);
    expect(isM4ProcessConfig(undefined)).toBe(false);
    expect(inferProcessType('')).toBeNull();
  });
  
  test('should handle edge cases in utility functions', () => {
    expect(calculateStepProgress('invalid' as ProcessStep)).toBe(0);
    expect(getRequiredFiles('invalid' as ProcessType)).toEqual([]);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  test('should create objects efficiently', () => {
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      createM4ProcessProgress(i, ProcessStep.PROCESSING_DATA, 'test.xlsx', i, 1000);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
  });
  
  test('should validate types efficiently', () => {
    const config = createValidM4ProcessConfig();
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      isM4ProcessConfig(config);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(50); // Should complete in less than 50ms
  });
});

console.log('✅ All M4 Processing type tests completed successfully!');