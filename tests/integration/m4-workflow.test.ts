import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { M4DialogueProcessor } from '../../src/services/m4DialogueProcessor';
import { M4StringProcessor } from '../../src/services/m4StringProcessor';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as ExcelJS from 'exceljs';
import type { M4ProcessProgress } from '../../src/types/m4-types';

const TEST_FIXTURES_DIR = join(__dirname, '../test-data');
const TEST_OUTPUT_DIR = join(__dirname, '../test-outputs', 'm4-workflow');

describe('M4 Workflow Integration Tests', () => {
  let dialogueProcessor: M4DialogueProcessor;
  let stringProcessor: M4StringProcessor;
  let progressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    if (!existsSync(TEST_FIXTURES_DIR)) {
      mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
    }
    
    dialogueProcessor = new M4DialogueProcessor();
    stringProcessor = new M4StringProcessor({
      folderPath: TEST_FIXTURES_DIR,
      outputPath: TEST_OUTPUT_DIR,
    });
    progressCallback = vi.fn();
  });

  afterEach(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('M4 Dialogue Processing Workflow', () => {
    it('should complete full dialogue processing with test data', async () => {
      // Create test Excel files
      await createTestNPCFile();
      await createTestCinematicDialogueFile();
      await createTestSmalltalkDialogueFile();

      const result = await dialogueProcessor.processM4Dialogue(
        TEST_FIXTURES_DIR,
        TEST_OUTPUT_DIR,
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(result.outputFilePath).toBeDefined();
      expect(existsSync(result.outputFilePath)).toBe(true);
      
      // Verify progress was reported
      const progressCalls = progressCallback.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1][0]).toBe(100);
      
      // Verify output file structure
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(result.outputFilePath);
      
      const worksheet = workbook.getWorksheet(1);
      expect(worksheet).toBeDefined();
      
      // Check headers
      const headerRow = worksheet.getRow(1);
      expect(headerRow.getCell(1).value).toBe('DIALOGUE_ID');
      expect(headerRow.getCell(2).value).toBe('NPC_NAME');
      
      // Check data rows exist
      expect(worksheet.rowCount).toBeGreaterThan(1);
    });

    it('should handle missing files gracefully', async () => {
      const result = await dialogueProcessor.processM4Dialogue(
        '/non-existent-folder',
        TEST_OUTPUT_DIR,
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track memory usage during processing', async () => {
      await createTestNPCFile();
      await createTestCinematicDialogueFile();
      await createTestSmalltalkDialogueFile();

      const result = await dialogueProcessor.processM4Dialogue(
        TEST_FIXTURES_DIR,
        TEST_OUTPUT_DIR,
        progressCallback
      );

      expect(result.processedRows).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('M4 String Processing Workflow', () => {
    it('should complete full string processing with test data', async () => {
      // Create all 8 required string files
      await createAllTestStringFiles();

      const result = await stringProcessor.processM4String();

      if (!result.success) {
        console.error('String processing failed:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.outputFilePath).toBeDefined();
      expect(existsSync(result.outputFilePath)).toBe(true);
      
      // Verify processing completed
      expect(result.processingTime).toBeGreaterThan(0);
      
      // Verify output structure
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(result.outputFilePath);
      
      const worksheet = workbook.getWorksheet(1);
      expect(worksheet).toBeDefined();
      
      // Check 15 columns
      const headerRow = worksheet.getRow(1);
      expect(headerRow.cellCount).toBe(15);
      expect(headerRow.getCell(1).value).toBe('Table/ID');
      expect(headerRow.getCell(2).value).toBe('EN (M)');
    });

    it('should filter rows based on EN column', async () => {
      await createAllTestStringFiles(true); // Include invalid data

      const result = await stringProcessor.processM4String();

      if (!result.success) {
        console.error('String processing failed:', result.error);
      }
      expect(result.success).toBe(true);
      
      // Verify filtered data
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(result.outputPath);
      const worksheet = workbook.getWorksheet(1);
      
      // Check that no rows contain '0', '미사용', or empty EN values
      for (let row = 2; row <= worksheet.rowCount; row++) {
        const enValue = worksheet.getRow(row).getCell(2).value;
        expect(enValue).not.toBe('0');
        expect(enValue).not.toBe('미사용');
        expect(enValue).not.toBe('');
        expect(enValue).not.toBeNull();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted Excel files', async () => {
      // Create corrupted file
      const corruptedFile = join(TEST_FIXTURES_DIR, 'NPC.xlsm');
      writeFileSync(corruptedFile, 'This is not an Excel file');

      const result = await dialogueProcessor.processM4Dialogue(
        TEST_FIXTURES_DIR,
        TEST_OUTPUT_DIR,
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty worksheets', async () => {
      // Create Excel files with empty worksheets
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Empty');
      
      await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'NPC.xlsm'));
      await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'CINEMATIC_DIALOGUE.xlsm'));
      await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'SMALLTALK_DIALOGUE.xlsm'));

      const result = await dialogueProcessor.processM4Dialogue(
        TEST_FIXTURES_DIR,
        TEST_OUTPUT_DIR,
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(result.processedRows).toBe(0);
    });
  });

  describe('Performance and Memory', () => {
    it('should process large files within acceptable time', async () => {
      // Create large test files
      await createLargeTestFiles();

      const startTime = Date.now();
      const result = await dialogueProcessor.processM4Dialogue(
        TEST_FIXTURES_DIR,
        TEST_OUTPUT_DIR,
        progressCallback
      );
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.processingTime).toBeLessThan(10000);
    });

    it('should not leak memory during processing', async () => {
      await createTestNPCFile();
      await createTestCinematicDialogueFile();
      await createTestSmalltalkDialogueFile();

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple times
      for (let i = 0; i < 3; i++) {
        await dialogueProcessor.processM4Dialogue(
          TEST_FIXTURES_DIR,
          TEST_OUTPUT_DIR,
          progressCallback
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

// Helper functions to create test Excel files
async function createTestNPCFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('NPC');
  
  worksheet.addRow(['ID', 'NAME']);
  worksheet.addRow(['001', 'Hero']);
  worksheet.addRow(['002', 'Merchant']);
  worksheet.addRow(['003', 'Guard']);
  
  await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'NPC.xlsm'));
}

async function createTestCinematicDialogueFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CINEMATIC');
  
  // Add header row with language columns
  const headers = ['DIALOGUE_ID', 'NPC_ID', 'KO', 'EN (M)', 'JP', 'CN', 'FR'];
  worksheet.addRow(headers);
  
  // Add test data
  worksheet.addRow(['DLG_001', '001', '안녕하세요', 'Hello', 'こんにちは', '你好', 'Bonjour']);
  worksheet.addRow(['DLG_002', '002', '어서오세요', 'Welcome', 'ようこそ', '欢迎', 'Bienvenue']);
  worksheet.addRow(['DLG_003', '001', '미사용', '0', '', '', '']); // Should be filtered
  worksheet.addRow(['DLG_004', '003', '멈춰!', 'Stop!', '止まれ！', '停！', 'Arrêtez!']);
  
  await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'CINEMATIC_DIALOGUE.xlsm'));
}

async function createTestSmalltalkDialogueFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SMALLTALK');
  
  const headers = ['DIALOGUE_ID', 'NPC_ID', 'KO', 'EN (M)', 'JP', 'CN', 'FR'];
  worksheet.addRow(headers);
  
  worksheet.addRow(['ST_001', '002', '좋은 날씨네요', 'Nice weather', 'いい天気ですね', '天气真好', 'Beau temps']);
  worksheet.addRow(['ST_002', '003', '조심하세요', 'Be careful', '気をつけて', '小心', 'Faites attention']);
  
  await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'SMALLTALK_DIALOGUE.xlsm'));
}

async function createAllTestStringFiles(includeInvalid = false) {
  const stringFiles = [
    'ACHIEVEMENT_STRING.xlsm',
    'BUFF_STRING.xlsm',
    'ITEM_STRING.xlsm',
    'MONSTER_STRING.xlsm',
    'NPC_STRING.xlsm',
    'QUEST_STRING.xlsm',
    'SKILL_STRING.xlsm',
    'STRING.xlsm',
  ];

  for (const filename of stringFiles) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Add columns (30 columns as per the actual implementation)
    const headers = Array(30).fill('').map((_, i) => `Column${i}`);
    headers[6] = 'EN'; // EN column is at index 6
    worksheet.addRow(headers);
    
    // Add test data
    worksheet.addRow(Array(30).fill('').map((_, i) => i === 6 ? 'Valid Text 1' : `Data${i}`));
    worksheet.addRow(Array(30).fill('').map((_, i) => i === 6 ? 'Valid Text 2' : `Data${i}`));
    
    if (includeInvalid) {
      worksheet.addRow(Array(30).fill('').map((_, i) => i === 6 ? '0' : `Data${i}`));
      worksheet.addRow(Array(30).fill('').map((_, i) => i === 6 ? '미사용' : `Data${i}`));
      worksheet.addRow(Array(30).fill('').map((_, i) => i === 6 ? '' : `Data${i}`));
    }
    
    await workbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, filename));
  }
}

async function createLargeTestFiles() {
  // Create NPC file with 1000 entries
  const npcWorkbook = new ExcelJS.Workbook();
  const npcWorksheet = npcWorkbook.addWorksheet('NPC');
  
  npcWorksheet.addRow(['ID', 'NAME']);
  for (let i = 1; i <= 1000; i++) {
    npcWorksheet.addRow([i.toString().padStart(3, '0'), `NPC_${i}`]);
  }
  
  await npcWorkbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'NPC.xlsm'));
  
  // Create large dialogue files
  const cinematicWorkbook = new ExcelJS.Workbook();
  const cinematicWorksheet = cinematicWorkbook.addWorksheet('CINEMATIC');
  
  const headers = ['DIALOGUE_ID', 'NPC_ID', 'KO', 'EN (M)', 'JP', 'CN', 'FR'];
  cinematicWorksheet.addRow(headers);
  
  for (let i = 1; i <= 5000; i++) {
    const npcId = ((i % 1000) + 1).toString().padStart(3, '0');
    cinematicWorksheet.addRow([
      `C_DLG_${i}`,
      npcId,
      `한국어 대사 ${i}`,
      `English dialogue ${i}`,
      `日本語セリフ ${i}`,
      `中文对话 ${i}`,
      `Dialogue français ${i}`
    ]);
  }
  
  await cinematicWorkbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'CINEMATIC_DIALOGUE.xlsm'));
  
  // Similar for smalltalk
  const smalltalkWorkbook = new ExcelJS.Workbook();
  const smalltalkWorksheet = smalltalkWorkbook.addWorksheet('SMALLTALK');
  
  smalltalkWorksheet.addRow(headers);
  
  for (let i = 1; i <= 3000; i++) {
    const npcId = ((i % 1000) + 1).toString().padStart(3, '0');
    smalltalkWorksheet.addRow([
      `ST_DLG_${i}`,
      npcId,
      `잡담 ${i}`,
      `Smalltalk ${i}`,
      `雑談 ${i}`,
      `闲聊 ${i}`,
      `Bavardage ${i}`
    ]);
  }
  
  await smalltalkWorkbook.xlsx.writeFile(join(TEST_FIXTURES_DIR, 'SMALLTALK_DIALOGUE.xlsm'));
}