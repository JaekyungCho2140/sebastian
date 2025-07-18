import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { FileSizeValidator, validateFileSize } from '../src/services/m4/optimization/fileSizeValidator';

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, 'test-data', 'file-size');

// Helper to create test files of specific sizes
async function createTestFile(filePath: string, sizeInMB: number): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const sizeInBytes = Math.floor(sizeInMB * 1024 * 1024);
  const buffer = Buffer.alloc(sizeInBytes);
  await fs.promises.writeFile(filePath, buffer);
}

describe('FileSizeValidator', () => {
  let validator: FileSizeValidator;
  
  beforeAll(async () => {
    // Create test files
    await createTestFile(path.join(TEST_DATA_DIR, 'small.xlsx'), 10);
    await createTestFile(path.join(TEST_DATA_DIR, 'medium.xlsx'), 150);
    await createTestFile(path.join(TEST_DATA_DIR, 'large.xlsx'), 600);
    await createTestFile(path.join(TEST_DATA_DIR, 'huge.xlsx'), 1100);
    
    // Create M4 String test files
    const stringDir = path.join(TEST_DATA_DIR, 'm4-strings');
    await createTestFile(path.join(stringDir, '01_Item.xlsx'), 50);
    await createTestFile(path.join(stringDir, '02_NPCs&Mobs.xlsx'), 75);
    await createTestFile(path.join(stringDir, '03_Quest.xlsx'), 60);
    await createTestFile(path.join(stringDir, '04_Skill.xlsx'), 30);
    await createTestFile(path.join(stringDir, '05_UI.xlsx'), 40);
    await createTestFile(path.join(stringDir, '06_System.xlsx'), 35);
    await createTestFile(path.join(stringDir, '07_Tutorial.xlsx'), 20);
    await createTestFile(path.join(stringDir, '08_CashShop.xlsx'), 25);
  });
  
  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });
  
  beforeEach(() => {
    validator = new FileSizeValidator();
  });
  
  describe('File validation', () => {
    it('should validate small file without warnings', async () => {
      const validation = await validator.validateFile(path.join(TEST_DATA_DIR, 'small.xlsx'));
      
      expect(validation.isValid).toBe(true);
      expect(validation.warningLevel).toBe('none');
      expect(validation.sizeInMB).toBeCloseTo(10, 1);
      expect(validation.estimatedProcessingTime).toBeDefined();
    });
    
    it('should emit warning for medium file', async () => {
      const validation = await validator.validateFile(path.join(TEST_DATA_DIR, 'medium.xlsx'));
      
      expect(validation.isValid).toBe(true);
      expect(validation.warningLevel).toBe('warning');
      expect(validation.message).toContain('large');
      expect(validation.sizeInMB).toBeCloseTo(150, 1);
    });
    
    it('should require confirmation for large file', async () => {
      const validation = await validator.validateFile(path.join(TEST_DATA_DIR, 'large.xlsx'));
      
      expect(validation.isValid).toBe(true);
      expect(validation.warningLevel).toBe('confirmation');
      expect(validation.message).toContain('very large');
      expect(validation.recommendation).toBeDefined();
      expect(validation.sizeInMB).toBeCloseTo(600, 1);
    });
    
    it('should block huge file', async () => {
      const validation = await validator.validateFile(path.join(TEST_DATA_DIR, 'huge.xlsx'));
      
      expect(validation.isValid).toBe(false);
      expect(validation.warningLevel).toBe('blocked');
      expect(validation.message).toContain('exceeds hard limit');
      expect(validation.recommendation).toContain('Split the file');
      expect(validation.sizeInMB).toBeCloseTo(1100, 1);
    });
    
    it('should handle non-existent file', async () => {
      const validation = await validator.validateFile(path.join(TEST_DATA_DIR, 'does-not-exist.xlsx'));
      
      expect(validation.isValid).toBe(false);
      expect(validation.warningLevel).toBe('blocked');
      expect(validation.message).toContain('Failed to check file size');
    });
  });
  
  describe('Multiple file validation', () => {
    it('should validate multiple files', async () => {
      const files = [
        path.join(TEST_DATA_DIR, 'small.xlsx'),
        path.join(TEST_DATA_DIR, 'medium.xlsx'),
        path.join(TEST_DATA_DIR, 'large.xlsx')
      ];
      
      const validations = await validator.validateFiles(files);
      
      expect(validations).toHaveLength(3);
      expect(validations[0].warningLevel).toBe('none');
      expect(validations[1].warningLevel).toBe('warning');
      expect(validations[2].warningLevel).toBe('confirmation');
    });
  });
  
  describe('M4-specific validation', () => {
    it('should validate M4 Dialogue file', async () => {
      await createTestFile(path.join(TEST_DATA_DIR, 'M4_Dialogue.xlsx'), 200);
      
      const validation = await validator.validateDialogueFile(TEST_DATA_DIR);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warningLevel).toBe('warning');
      expect(validation.filePath).toContain('M4_Dialogue.xlsx');
    });
    
    it('should validate M4 String folder', async () => {
      const summary = await validator.validateStringFolder(path.join(TEST_DATA_DIR, 'm4-strings'));
      
      expect(summary.fileCount).toBe(8);
      expect(summary.totalSizeInMB).toBeCloseTo(335, 1); // Sum of all file sizes
      expect(summary.largestFile).toBeDefined();
      expect(summary.largestFile!.path).toContain('02_NPCs&Mobs.xlsx');
      expect(summary.largestFile!.sizeInMB).toBeCloseTo(75, 1);
      expect(summary.filesRequiringAttention).toHaveLength(0); // All under 100MB
    });
  });
  
  describe('Processing time estimation', () => {
    it('should estimate processing time', () => {
      const time10MB = validator.estimateProcessingTime(10);
      const time100MB = validator.estimateProcessingTime(100);
      const time1000MB = validator.estimateProcessingTime(1000);
      
      expect(time10MB).toBeGreaterThan(0);
      expect(time100MB).toBeGreaterThan(time10MB);
      expect(time1000MB).toBeGreaterThan(time100MB);
      
      // Check reasonable estimates
      expect(time10MB).toBeLessThan(60); // Less than 1 minute for 10MB
      expect(time1000MB).toBeGreaterThan(180); // More than 3 minutes for 1GB
    });
    
    it('should format duration correctly', () => {
      expect(validator.formatDuration(30)).toBe('30 seconds');
      expect(validator.formatDuration(90)).toBe('1 minutes 30 seconds');
      expect(validator.formatDuration(3665)).toBe('1 hours 1 minutes');
    });
  });
  
  describe('Size recommendations', () => {
    it('should provide appropriate recommendations', () => {
      expect(validator.getSizeRecommendation(5)).toContain('optimal');
      expect(validator.getSizeRecommendation(30)).toContain('good');
      expect(validator.getSizeRecommendation(80)).toContain('monitoring');
      expect(validator.getSizeRecommendation(300)).toContain('Streaming mode');
      expect(validator.getSizeRecommendation(800)).toContain('splitting');
    });
  });
  
  describe('Configuration', () => {
    it('should update limits', () => {
      const updateSpy = jest.fn();
      validator.on('limitsUpdated', updateSpy);
      
      validator.updateLimits({
        warningThreshold: 50,
        confirmationThreshold: 200
      });
      
      expect(updateSpy).toHaveBeenCalled();
      
      const limits = validator.getLimits();
      expect(limits.warningThreshold).toBe(50);
      expect(limits.confirmationThreshold).toBe(200);
    });
    
    it('should disable validation when configured', async () => {
      const disabledValidator = FileSizeValidator.createDisabled();
      const validation = await disabledValidator.validateFile(path.join(TEST_DATA_DIR, 'huge.xlsx'));
      
      expect(validation.isValid).toBe(true);
      expect(validation.warningLevel).toBe('none');
    });
  });
  
  describe('Preset validators', () => {
    it('should create strict validator', async () => {
      const strict = FileSizeValidator.createStrict();
      const validation = await strict.validateFile(path.join(TEST_DATA_DIR, 'medium.xlsx'));
      
      expect(validation.warningLevel).toBe('warning'); // 150MB > 50MB warning threshold
    });
    
    it('should create relaxed validator', async () => {
      const relaxed = FileSizeValidator.createRelaxed();
      const validation = await relaxed.validateFile(path.join(TEST_DATA_DIR, 'medium.xlsx'));
      
      expect(validation.warningLevel).toBe('none'); // 150MB < 200MB warning threshold
    });
  });
  
  describe('Events', () => {
    it('should emit fileValidated event', async () => {
      const eventSpy = jest.fn();
      validator.on('fileValidated', eventSpy);
      
      await validator.validateFile(path.join(TEST_DATA_DIR, 'small.xlsx'));
      
      expect(eventSpy).toHaveBeenCalled();
      const validation = eventSpy.mock.calls[0][0];
      expect(validation).toHaveProperty('filePath');
      expect(validation).toHaveProperty('sizeInMB');
    });
    
    it('should emit folderValidated event', async () => {
      const eventSpy = jest.fn();
      validator.on('folderValidated', eventSpy);
      
      await validator.validateStringFolder(path.join(TEST_DATA_DIR, 'm4-strings'));
      
      expect(eventSpy).toHaveBeenCalled();
      const summary = eventSpy.mock.calls[0][0];
      expect(summary).toHaveProperty('totalSizeInMB');
      expect(summary).toHaveProperty('fileCount');
    });
  });
  
  describe('Middleware', () => {
    it('should throw error for invalid file', async () => {
      const middleware = validateFileSize(validator);
      
      await expect(middleware(path.join(TEST_DATA_DIR, 'huge.xlsx')))
        .rejects.toThrow('exceeds hard limit');
    });
    
    it('should pass for valid file', async () => {
      const middleware = validateFileSize(validator);
      
      await expect(middleware(path.join(TEST_DATA_DIR, 'small.xlsx')))
        .resolves.toBeUndefined();
    });
    
    it('should log warning for confirmation-required file', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const middleware = validateFileSize(validator);
      
      await middleware(path.join(TEST_DATA_DIR, 'large.xlsx'));
      
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Estimated processing time'));
      
      warnSpy.mockRestore();
    });
  });
});