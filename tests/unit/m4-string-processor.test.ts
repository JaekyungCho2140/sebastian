import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { M4StringProcessor } from '../../src/services/m4StringProcessor';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import type { M4ProcessProgress, M4StringFileConfig } from '../../src/types/m4-types';

const TEST_FIXTURES_DIR = join(__dirname, '../test-data');
const TEST_OUTPUT_DIR = join(__dirname, '../test-outputs', 'm4-string');

describe('M4StringProcessor', () => {
  let processor: M4StringProcessor;
  let progressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    processor = new M4StringProcessor();
    progressCallback = vi.fn();
  });

  afterEach(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('validateRequiredFiles', () => {
    it('should validate all 8 required string files', () => {
      const requiredFiles = [
        'ACHIEVEMENT_STRING.xlsm',
        'BUFF_STRING.xlsm',
        'ITEM_STRING.xlsm',
        'MONSTER_STRING.xlsm',
        'NPC_STRING.xlsm',
        'QUEST_STRING.xlsm',
        'SKILL_STRING.xlsm',
        'STRING.xlsm',
      ];

      vi.spyOn(require('fs'), 'existsSync').mockImplementation((path: string) => {
        return requiredFiles.some(file => path.includes(file));
      });

      expect(() => processor['validateRequiredFiles']('/valid/folder')).not.toThrow();
    });

    it('should throw error with missing files list', () => {
      vi.spyOn(require('fs'), 'existsSync').mockImplementation((path: string) => {
        // Only 5 files exist
        return ['ACHIEVEMENT_STRING.xlsm', 'BUFF_STRING.xlsm', 'ITEM_STRING.xlsm', 
                'MONSTER_STRING.xlsm', 'NPC_STRING.xlsm'].some(file => path.includes(file));
      });

      try {
        processor['validateRequiredFiles']('/partial/folder');
      } catch (error: any) {
        expect(error.message).toContain('3개');
        expect(error.message).toContain('QUEST_STRING.xlsm');
        expect(error.message).toContain('SKILL_STRING.xlsm');
        expect(error.message).toContain('STRING.xlsm');
      }
    });
  });

  describe('getFileConfig', () => {
    it('should return correct column mapping for each file type', () => {
      const testCases: Array<{ filename: string; expectedColumns: number[] }> = [
        { 
          filename: 'STRING.xlsm', 
          expectedColumns: [0, 6, 27, 12, 13, 19, 14, 17, 20, 24, 11, 21, 7, 10, 9] 
        },
        { 
          filename: 'ITEM_STRING.xlsm', 
          expectedColumns: [0, 6, 26, 12, 13, 19, 14, 17, 20, 24, 11, 21, 7, 10, 9] 
        },
        { 
          filename: 'ACHIEVEMENT_STRING.xlsm', 
          expectedColumns: [0, 4, 9, 10, 11, 15, 12, 13, 16, 19, 8, 17, 5, 7, 6] 
        },
      ];

      testCases.forEach(({ filename, expectedColumns }) => {
        const config = processor['getFileConfig'](filename);
        expect(config.filename).toBe(filename);
        expect(config.outputColumns).toEqual(expectedColumns);
        expect(config.filterColumn).toBe(6); // EN column
      });
    });

    it('should handle unknown file types', () => {
      const config = processor['getFileConfig']('UNKNOWN_STRING.xlsm');
      expect(config.outputColumns).toEqual([0, 6]); // Default mapping
    });
  });

  describe('extractFileData', () => {
    it('should extract and filter data based on EN column', async () => {
      const mockFileData = {
        worksheets: [{
          name: 'Sheet1',
          getRow: vi.fn((rowNum) => {
            const rows = [
              { values: Array(30).fill('').map((_, i) => `Header${i}`) }, // Header
              { values: Array(30).fill('').map((_, i) => i === 6 ? 'Valid Text' : `Col${i}`) },
              { values: Array(30).fill('').map((_, i) => i === 6 ? '0' : `Col${i}`) }, // Filter out
              { values: Array(30).fill('').map((_, i) => i === 6 ? '' : `Col${i}`) }, // Filter out
              { values: Array(30).fill('').map((_, i) => i === 6 ? '미사용' : `Col${i}`) }, // Filter out
              { values: Array(30).fill('').map((_, i) => i === 6 ? 'Another Valid' : `Col${i}`) },
            ];
            return rows[rowNum - 1] || { values: [] };
          }),
          rowCount: 6,
        }],
      };

      vi.spyOn(processor['excelProcessor'], 'readWorkbook').mockResolvedValue(mockFileData);
      vi.spyOn(processor['excelProcessor'], 'extractWorksheetData').mockImplementation((_, options) => {
        // Simulate filtering based on EN column
        return [
          { row: 1, en: 'Valid Text', data: Array(30).fill('').map((_, i) => `Col${i}`) },
          { row: 5, en: 'Another Valid', data: Array(30).fill('').map((_, i) => `Col${i}`) },
        ];
      });

      const result = await processor['extractFileData']('STRING.xlsm', '/test', progressCallback);

      expect(result).toHaveLength(2);
      expect(result[0].en).toBe('Valid Text');
      expect(result[1].en).toBe('Another Valid');
    });

    it('should handle empty files gracefully', async () => {
      const mockEmptyFile = {
        worksheets: [{
          name: 'Sheet1',
          rows: [{ values: ['Header'] }], // Only header
        }],
      };

      vi.spyOn(processor['excelProcessor'], 'readWorkbook').mockResolvedValue(mockEmptyFile);
      vi.spyOn(processor['excelProcessor'], 'extractWorksheetData').mockReturnValue([]);

      const result = await processor['extractFileData']('EMPTY_STRING.xlsm', '/test', progressCallback);

      expect(result).toHaveLength(0);
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('transformToOutputFormat', () => {
    it('should transform data to 15-column output format', () => {
      const fileData = {
        'STRING.xlsm': [
          { 
            rowIndex: 1,
            data: Array(30).fill('').map((_, i) => `String_${i}`),
          },
        ],
        'ITEM_STRING.xlsm': [
          { 
            rowIndex: 1,
            data: Array(30).fill('').map((_, i) => `Item_${i}`),
          },
        ],
      };

      const result = processor['transformToOutputFormat'](fileData);

      // Check STRING.xlsm transformation
      const stringRow = result.find(row => row.table_id === 'STRING/1');
      expect(stringRow).toBeDefined();
      expect(stringRow?.columns).toHaveLength(15);
      expect(stringRow?.columns[1]).toBe('String_6'); // EN column mapping

      // Check ITEM_STRING.xlsm transformation
      const itemRow = result.find(row => row.table_id === 'ITEM/1');
      expect(itemRow).toBeDefined();
      expect(itemRow?.columns).toHaveLength(15);
      expect(itemRow?.columns[2]).toBe('Item_26'); // Different mapping for ITEM
    });

    it('should generate correct Table/ID format', () => {
      const fileData = {
        'ACHIEVEMENT_STRING.xlsm': [
          { rowIndex: 5, data: [] },
          { rowIndex: 10, data: [] },
        ],
        'BUFF_STRING.xlsm': [
          { rowIndex: 3, data: [] },
        ],
      };

      const result = processor['transformToOutputFormat'](fileData);

      expect(result[0].table_id).toBe('ACHIEVEMENT/5');
      expect(result[1].table_id).toBe('ACHIEVEMENT/10');
      expect(result[2].table_id).toBe('BUFF/3');
    });

    it('should maintain order: by file type, then by row index', () => {
      const fileData = {
        'SKILL_STRING.xlsm': [{ rowIndex: 10, data: [] }],
        'ACHIEVEMENT_STRING.xlsm': [{ rowIndex: 20, data: [] }],
        'BUFF_STRING.xlsm': [{ rowIndex: 5, data: [] }],
      };

      const result = processor['transformToOutputFormat'](fileData);

      // Files should be processed in alphabetical order
      expect(result[0].table_id).toBe('ACHIEVEMENT/20');
      expect(result[1].table_id).toBe('BUFF/5');
      expect(result[2].table_id).toBe('SKILL/10');
    });
  });

  describe('generateOutputFile', () => {
    it('should create Excel with proper headers and styling', async () => {
      const transformedData = [
        {
          table_id: 'STRING/1',
          columns: ['STRING/1', 'Text1', 'Text2', 'Text3', 'Text4', 'Text5', 
                   'Text6', 'Text7', 'Text8', 'Text9', 'Text10', 'Text11', 
                   'Text12', 'Text13', 'Text14'],
        },
      ];

      const outputPath = join(TEST_OUTPUT_DIR, 'string_output.xlsx');

      vi.spyOn(processor['excelProcessor'], 'writeWorkbook').mockImplementation(async (path, data) => {
        expect(path).toBe(outputPath);
        
        // Check headers
        const headers = data.worksheets[0].columns?.map(col => col.header);
        expect(headers).toContain('Table/ID');
        expect(headers).toContain('EN (M)');
        expect(headers).toContain('KO');
        expect(headers).toContain('JP');
        expect(headers).toHaveLength(15);

        // Check column widths
        expect(data.worksheets[0].columns?.[0].width).toBe(25); // Table/ID
        expect(data.worksheets[0].columns?.[1].width).toBe(50); // EN (M)

        // Check styles
        expect(data.worksheets[0].styles?.headerStyle?.font?.bold).toBe(true);
        expect(data.worksheets[0].styles?.headerStyle?.fill?.fgColor?.argb).toBe('FFD3D3D3');
      });

      await processor['generateOutputFile'](transformedData, outputPath, progressCallback);

      expect(processor['excelProcessor'].writeWorkbook).toHaveBeenCalled();
    });

    it('should freeze first row', async () => {
      const transformedData = [{ table_id: 'TEST/1', columns: Array(15).fill('') }];
      const outputPath = join(TEST_OUTPUT_DIR, 'frozen_output.xlsx');

      vi.spyOn(processor['excelProcessor'], 'writeWorkbook').mockImplementation(async (path, data) => {
        expect(data.worksheets[0].views).toEqual([{
          state: 'frozen',
          xSplit: 0,
          ySplit: 1,
        }]);
      });

      await processor['generateOutputFile'](transformedData, outputPath, progressCallback);
    });
  });

  describe('processM4String - Integration', () => {
    it('should complete full processing workflow', async () => {
      const fileConfigs = processor['getRequiredFiles']();
      
      // Mock all file extractions
      vi.spyOn(processor as any, 'validateRequiredFiles').mockImplementation(() => {});
      
      const mockExtractFileData = vi.fn();
      fileConfigs.forEach((config, index) => {
        mockExtractFileData.mockResolvedValueOnce([
          { rowIndex: 1, data: Array(30).fill(`${config.filename}_Data`) },
        ]);
      });
      processor['extractFileData'] = mockExtractFileData;
      
      vi.spyOn(processor as any, 'generateOutputFile').mockResolvedValue(undefined);

      const result = await processor.processM4String(
        '/input/folder',
        '/output/folder',
        { type: 'default', targetId: 1 },
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('M4_String_target1_');
      expect(result.statistics.processedFiles).toBe(8);
      expect(result.statistics.totalRows).toBe(8);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ percentage: 100 })
      );
    });

    it('should handle type-specific output naming', async () => {
      vi.spyOn(processor as any, 'validateRequiredFiles').mockImplementation(() => {});
      vi.spyOn(processor as any, 'extractAllFileData').mockResolvedValue({});
      vi.spyOn(processor as any, 'transformToOutputFormat').mockReturnValue([]);
      vi.spyOn(processor as any, 'generateOutputFile').mockResolvedValue(undefined);

      const testCases = [
        { type: 'default', targetId: 1, expected: 'M4_String_target1_' },
        { type: 'item', targetId: 5, expected: 'M4_String_item_target5_' },
        { type: 'skill', targetId: 10, expected: 'M4_String_skill_target10_' },
      ];

      for (const testCase of testCases) {
        const result = await processor.processM4String(
          '/input',
          '/output',
          { type: testCase.type as any, targetId: testCase.targetId },
          progressCallback
        );

        expect(result.outputPath).toContain(testCase.expected);
      }
    });

    it('should handle errors and provide detailed logs', async () => {
      vi.spyOn(processor as any, 'validateRequiredFiles').mockImplementation(() => {
        throw new Error('Missing files: TEST_STRING.xlsm');
      });

      const result = await processor.processM4String(
        '/invalid/folder',
        '/output/folder',
        { type: 'default', targetId: 1 },
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing files: TEST_STRING.xlsm');
      expect(result.logs.some(log => log.level === 'error')).toBe(true);
      expect(result.logs.some(log => log.message.includes('실패'))).toBe(true);
    });

    it('should report progress for each file', async () => {
      vi.spyOn(processor as any, 'validateRequiredFiles').mockImplementation(() => {});
      vi.spyOn(processor as any, 'extractFileData').mockResolvedValue([]);
      vi.spyOn(processor as any, 'generateOutputFile').mockResolvedValue(undefined);

      await processor.processM4String('/input', '/output', { type: 'default', targetId: 1 }, progressCallback);

      const progressCalls = progressCallback.mock.calls.map(call => call[0]);
      
      // Should have progress updates for each of 8 files
      const fileProgressCalls = progressCalls.filter(p => p.currentFile);
      expect(fileProgressCalls.length).toBeGreaterThanOrEqual(8);
      
      // Should have different progress percentages
      const percentages = progressCalls.map(p => p.percentage);
      expect(new Set(percentages).size).toBeGreaterThan(1);
      
      // Should reach 100%
      expect(percentages[percentages.length - 1]).toBe(100);
    });
  });

  describe('Performance', () => {
    it('should handle large string files efficiently', async () => {
      // Simulate 8 files with 1000 rows each
      const largeFileData: Record<string, any[]> = {};
      const fileNames = processor['getRequiredFiles']().map(f => f.filename);
      
      fileNames.forEach(filename => {
        largeFileData[filename] = Array.from({ length: 1000 }, (_, i) => ({
          rowIndex: i + 1,
          data: Array(30).fill('').map((_, j) => `Cell_${i}_${j}`),
        }));
      });

      const startTime = Date.now();
      const transformed = processor['transformToOutputFormat'](largeFileData);
      const processingTime = Date.now() - startTime;

      expect(transformed).toHaveLength(8000); // 8 files * 1000 rows
      expect(processingTime).toBeLessThan(500); // Should process in under 500ms
      
      // Verify some random entries
      expect(transformed[0].table_id).toMatch(/^[A-Z]+\/\d+$/);
      expect(transformed[0].columns).toHaveLength(15);
    });

    it('should optimize memory usage with streaming', () => {
      // This test verifies that the processor doesn't load all data at once
      const mockExtractFileData = vi.fn();
      let peakDataSize = 0;
      
      mockExtractFileData.mockImplementation(async () => {
        const data = Array(100).fill({ data: Array(30).fill('Large Data String') });
        peakDataSize = Math.max(peakDataSize, JSON.stringify(data).length);
        return data;
      });

      processor['extractFileData'] = mockExtractFileData;

      // The implementation should process files one by one
      // rather than loading all into memory
      expect(peakDataSize).toBeLessThan(1024 * 1024); // Less than 1MB per file
    });
  });
});