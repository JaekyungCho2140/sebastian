import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExcelProcessor } from '../../src/utils/excelProcessor';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import ExcelJS from 'exceljs';

// Test fixtures 경로
const TEST_FIXTURES_DIR = join(__dirname, '../test-data');
const TEST_OUTPUT_DIR = join(__dirname, '../test-outputs', 'excel-processor');

describe('ExcelProcessor', () => {
  let excelProcessor: ExcelProcessor;

  beforeEach(() => {
    // 테스트 출력 디렉토리 생성
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    excelProcessor = new ExcelProcessor();
  });

  afterEach(() => {
    // 테스트 출력 파일 정리
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('readWorkbook', () => {
    it('should read a valid Excel file', async () => {
      const testFile = join(TEST_FIXTURES_DIR, 'NPC.xlsm');
      
      if (existsSync(testFile)) {
        const workbookData = await excelProcessor.readWorkbook(testFile);
        
        expect(workbookData).toBeDefined();
        expect(workbookData.worksheets).toBeDefined();
        expect(workbookData.worksheets.length).toBeGreaterThan(0);
        expect(workbookData.worksheets[0].name).toBeDefined();
        expect(workbookData.worksheets[0].rows).toBeDefined();
      }
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = join(TEST_FIXTURES_DIR, 'non-existent.xlsx');
      
      await expect(excelProcessor.readWorkbook(nonExistentFile))
        .rejects.toThrow();
    });

    it('should handle empty Excel file', async () => {
      // 빈 Excel 파일 생성
      const emptyFile = join(TEST_OUTPUT_DIR, 'empty.xlsx');
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Sheet1');
      await workbook.xlsx.writeFile(emptyFile);

      const workbookData = await excelProcessor.readWorkbook(emptyFile);
      
      expect(workbookData.worksheets[0].rows.length).toBe(0);
    });
  });

  describe('writeWorkbook', () => {
    it('should write Excel file with data', async () => {
      const outputFile = join(TEST_OUTPUT_DIR, 'output.xlsx');
      const workbookData = {
        worksheets: [{
          name: 'TestSheet',
          columns: [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 20 },
          ],
          rows: [
            { id: 1, name: 'Test 1' },
            { id: 2, name: 'Test 2' },
          ],
        }],
      };

      await excelProcessor.writeWorkbook(outputFile, workbookData);
      
      expect(existsSync(outputFile)).toBe(true);
      
      // 생성된 파일 검증
      const readBack = await excelProcessor.readWorkbook(outputFile);
      expect(readBack.worksheets[0].rows.length).toBe(2);
    });

    it('should apply styles when provided', async () => {
      const outputFile = join(TEST_OUTPUT_DIR, 'styled.xlsx');
      const workbookData = {
        worksheets: [{
          name: 'StyledSheet',
          columns: [
            { header: 'Styled Column', key: 'col1', width: 15 },
          ],
          rows: [{ col1: 'Styled Data' }],
          styles: {
            headerStyle: {
              font: { bold: true, size: 14 },
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000FF' } },
            },
          },
        }],
      };

      await excelProcessor.writeWorkbook(outputFile, workbookData);
      expect(existsSync(outputFile)).toBe(true);
    });
  });

  describe('extractWorksheetData', () => {
    it('should extract data with column mapping', () => {
      const mockWorksheet = {
        name: 'TestSheet',
        getRow: vi.fn((rowNum) => ({
          values: ['', 'ID_001', 'Name 1', 'Value 1'],
          getCell: vi.fn((colNum) => ({
            value: ['', 'ID_001', 'Name 1', 'Value 1'][colNum - 1],
          })),
        })),
        rowCount: 3,
      };

      const options = {
        startRow: 1,
        columnMapping: {
          id: 1,
          name: 2,
          value: 3,
        },
      };

      const data = excelProcessor.extractWorksheetData(mockWorksheet as any, options);
      
      expect(data).toHaveLength(2); // Header row is skipped
      expect(data[0]).toEqual({
        id: 'ID_001',
        name: 'Name 1',
        value: 'Value 1',
      });
    });

    it('should filter empty rows based on filter column', () => {
      const mockWorksheet = {
        name: 'TestSheet',
        getRow: vi.fn((rowNum) => {
          const rows = [
            ['', 'Header1', 'Header2', 'Header3'],
            ['', 'Data1', 'Data2', 'Data3'],
            ['', '', 'Data2', 'Data3'], // Empty filter column
            ['', 'Data3', 'Data4', 'Data5'],
          ];
          return {
            values: rows[rowNum - 1],
            getCell: vi.fn((colNum) => ({
              value: rows[rowNum - 1][colNum - 1],
            })),
          };
        }),
        rowCount: 4,
      };

      const options = {
        startRow: 2,
        filterColumn: 1,
        columnMapping: {
          col1: 1,
          col2: 2,
          col3: 3,
        },
      };

      const data = excelProcessor.extractWorksheetData(mockWorksheet as any, options);
      
      expect(data).toHaveLength(2); // One row filtered out
      expect(data[0].col1).toBe('Data1');
      expect(data[1].col1).toBe('Data3');
    });
  });

  describe('cell value extraction', () => {
    it('should handle different cell types', () => {
      const testCases = [
        { input: 'simple text', expected: 'simple text' },
        { input: 123, expected: '123' },
        { input: true, expected: 'true' },
        { input: null, expected: '' },
        { input: undefined, expected: '' },
        { input: { text: 'rich text' }, expected: 'rich text' },
        { input: { richText: [{ text: 'rich' }, { text: ' text' }] }, expected: 'rich text' },
        { input: new Date('2024-01-01'), expected: expect.stringMatching(/2024.*01.*01/) },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = excelProcessor['getCellValue']({ value: input } as any);
        if (typeof expected === 'string') {
          expect(result).toBe(expected);
        } else {
          expect(result).toEqual(expected);
        }
      });
    });

    it('should handle formula results', () => {
      const formulaCell = {
        value: { formula: '=A1+B1', result: 100 },
      };
      
      const result = excelProcessor['getCellValue'](formulaCell as any);
      expect(result).toBe('100');
    });

    it('should handle error values', () => {
      const errorCell = {
        value: { error: '#DIV/0!' },
      };
      
      const result = excelProcessor['getCellValue'](errorCell as any);
      expect(result).toBe('#DIV/0!');
    });
  });

  describe('processM4Dialogue integration', () => {
    it('should validate required files for M4 Dialogue', async () => {
      const inputFolder = join(TEST_FIXTURES_DIR, 'invalid-folder');
      
      await expect(
        excelProcessor.processM4Dialogue(inputFolder, {})
      ).rejects.toThrow(/required files/i);
    });

    it('should handle NPC mapping correctly', async () => {
      // Mock NPC 매핑 데이터
      const mockNPCData = new Map([
        ['001', 'NPC_Name_1'],
        ['002', 'NPC_Name_2'],
      ]);

      // ExcelProcessor의 private 메서드 모킹
      vi.spyOn(excelProcessor as any, 'loadNPCMapping').mockResolvedValue(mockNPCData);

      const mockDialogueData = [
        { npc_id: '001', dialogue: 'Hello' },
        { npc_id: '002', dialogue: 'World' },
      ];

      const result = excelProcessor['applyNPCMapping'](mockDialogueData, mockNPCData);
      
      expect(result[0].npc_name).toBe('NPC_Name_1');
      expect(result[1].npc_name).toBe('NPC_Name_2');
    });
  });

  describe('processM4String integration', () => {
    it('should validate all required string files', async () => {
      const inputFolder = join(TEST_FIXTURES_DIR, 'incomplete-string-folder');
      
      await expect(
        excelProcessor.processM4String(inputFolder, {
          type: 'default',
          targetId: 1,
        })
      ).rejects.toThrow(/missing required files/i);
    });

    it('should generate correct Table/ID format', () => {
      const testData = [
        { filename: 'ACHIEVEMENT_STRING.xlsm', index: 5 },
        { filename: 'STRING.xlsm', index: 123 },
      ];

      testData.forEach(({ filename, index }) => {
        const tableId = excelProcessor['generateTableId'](filename, index);
        const expectedPrefix = filename.replace('_STRING.xlsm', '').replace('.xlsm', '');
        expect(tableId).toBe(`${expectedPrefix}/${index}`);
      });
    });

    it('should apply correct column mapping for each file type', () => {
      const fileMappings = excelProcessor['getStringFileColumnMappings']();
      
      expect(fileMappings['STRING.xlsm']).toEqual({
        outputColumns: [0, 6, 27, 12, 13, 19, 14, 17, 20, 24, 11, 21, 7, 10, 9],
      });
      
      expect(fileMappings['ITEM_STRING.xlsm']).toEqual({
        outputColumns: [0, 6, 26, 12, 13, 19, 14, 17, 20, 24, 11, 21, 7, 10, 9],
      });
    });
  });

  describe('error handling', () => {
    it('should handle corrupted Excel files gracefully', async () => {
      const corruptedFile = join(TEST_OUTPUT_DIR, 'corrupted.xlsx');
      // 잘못된 내용으로 파일 생성
      require('fs').writeFileSync(corruptedFile, 'This is not an Excel file');

      await expect(
        excelProcessor.readWorkbook(corruptedFile)
      ).rejects.toThrow();
    });

    it('should handle missing worksheets', async () => {
      const workbook = new ExcelJS.Workbook();
      const file = join(TEST_OUTPUT_DIR, 'no-sheets.xlsx');
      await workbook.xlsx.writeFile(file);

      const result = await excelProcessor.readWorkbook(file);
      expect(result.worksheets).toHaveLength(0);
    });

    it('should provide meaningful error messages', async () => {
      try {
        await excelProcessor.processM4Dialogue('/invalid/path', {});
      } catch (error: any) {
        expect(error.message).toMatch(/M4 Dialogue/i);
        expect(error.code).toBeDefined();
      }
    });
  });

  describe('performance considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const largeWorkbook = new ExcelJS.Workbook();
      const worksheet = largeWorkbook.addWorksheet('LargeData');
      
      // 10,000 행 추가
      for (let i = 1; i <= 10000; i++) {
        worksheet.addRow([i, `Name${i}`, `Value${i}`]);
      }
      
      const largeFile = join(TEST_OUTPUT_DIR, 'large.xlsx');
      await largeWorkbook.xlsx.writeFile(largeFile);

      const startTime = Date.now();
      const result = await excelProcessor.readWorkbook(largeFile);
      const endTime = Date.now();

      expect(result.worksheets[0].rows.length).toBe(10000);
      expect(endTime - startTime).toBeLessThan(5000); // 5초 이내
    });

    it('should skip empty rows efficiently', () => {
      const mockWorksheet = {
        name: 'TestSheet',
        rowCount: 1000,
        getRow: vi.fn((rowNum) => ({
          values: rowNum % 10 === 0 ? ['', '', '', ''] : ['', 'Data', 'Data', 'Data'],
          getCell: vi.fn(),
        })),
      };

      const options = {
        filterColumn: 1,
        skipEmptyRows: true,
      };

      const data = excelProcessor.extractWorksheetData(mockWorksheet as any, options);
      expect(data.length).toBeLessThan(1000); // 빈 행이 제외됨
    });
  });
});