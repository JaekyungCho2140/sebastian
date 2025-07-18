import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { M4DialogueProcessor } from '../../src/services/m4DialogueProcessor';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import type { M4ProcessProgress } from '../../src/types/m4-types';

const TEST_FIXTURES_DIR = join(__dirname, '../test-data');
const TEST_OUTPUT_DIR = join(__dirname, '../test-outputs', 'm4-dialogue');

describe('M4DialogueProcessor', () => {
  let processor: M4DialogueProcessor;
  let progressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    processor = new M4DialogueProcessor();
    progressCallback = vi.fn();
  });

  afterEach(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('validateInputFolder', () => {
    it('should validate folder with all required files', () => {
      // Mock file existence checks
      vi.spyOn(require('fs'), 'existsSync').mockImplementation((path: string) => {
        const requiredFiles = ['NPC.xlsm', 'CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm'];
        return requiredFiles.some(file => path.includes(file));
      });

      expect(() => processor['validateInputFolder']('/valid/folder')).not.toThrow();
    });

    it('should throw error when required files are missing', () => {
      vi.spyOn(require('fs'), 'existsSync').mockReturnValue(false);

      expect(() => processor['validateInputFolder']('/invalid/folder'))
        .toThrow(/필수 파일이 없습니다/);
    });

    it('should list missing files in error message', () => {
      vi.spyOn(require('fs'), 'existsSync').mockImplementation((path: string) => {
        // NPC.xlsm만 존재
        return path.includes('NPC.xlsm');
      });

      try {
        processor['validateInputFolder']('/partial/folder');
      } catch (error: any) {
        expect(error.message).toContain('CINEMATIC_DIALOGUE.xlsm');
        expect(error.message).toContain('SMALLTALK_DIALOGUE.xlsm');
        expect(error.message).not.toContain('NPC.xlsm');
      }
    });
  });

  describe('loadNPCMapping', () => {
    it('should load and parse NPC mapping correctly', async () => {
      // Mock Excel data
      const mockNPCData = {
        worksheets: [{
          name: 'NPC',
          rows: [
            { values: ['', 'ID', 'NAME'] }, // Header
            { values: ['', '001', 'Hero'] },
            { values: ['', '002', 'Villain'] },
            { values: ['', '003', 'Merchant'] },
          ],
        }],
      };

      vi.spyOn(processor['excelProcessor'], 'readWorkbook').mockResolvedValue(mockNPCData);

      const mapping = await processor['loadNPCMapping']('/test/folder');

      expect(mapping.size).toBe(3);
      expect(mapping.get('001')).toBe('Hero');
      expect(mapping.get('002')).toBe('Villain');
      expect(mapping.get('003')).toBe('Merchant');
    });

    it('should skip empty rows in NPC data', async () => {
      const mockNPCData = {
        worksheets: [{
          name: 'NPC',
          rows: [
            { values: ['', 'ID', 'NAME'] },
            { values: ['', '001', 'Hero'] },
            { values: ['', '', ''] }, // Empty row
            { values: ['', '003', 'Merchant'] },
            { values: ['', null, 'Invalid'] }, // Invalid ID
          ],
        }],
      };

      vi.spyOn(processor['excelProcessor'], 'readWorkbook').mockResolvedValue(mockNPCData);

      const mapping = await processor['loadNPCMapping']('/test/folder');

      expect(mapping.size).toBe(2);
      expect(mapping.has('')).toBe(false);
      expect(mapping.has(null as any)).toBe(false);
    });
  });

  describe('extractDialogueData', () => {
    it('should extract cinematic dialogue with EN filtering', async () => {
      const mockDialogueData = {
        worksheets: [{
          name: 'CINEMATIC',
          getRow: vi.fn((rowNum) => {
            const rows = [
              { values: ['', 'DIALOGUE_ID', 'KO', 'EN (M)', 'FR'] }, // Header
              { values: ['', 'DLG_001', '안녕하세요', 'Hello', 'Bonjour'] },
              { values: ['', 'DLG_002', '미사용', '0', 'Non utilisé'] }, // Should be filtered
              { values: ['', 'DLG_003', '', '', ''] }, // Empty EN
              { values: ['', 'DLG_004', '감사합니다', 'Thank you', 'Merci'] },
            ];
            return rows[rowNum - 1] || { values: [] };
          }),
          rowCount: 5,
        }],
      };

      vi.spyOn(processor['excelProcessor'], 'readWorkbook').mockResolvedValue(mockDialogueData);
      vi.spyOn(processor['excelProcessor'], 'extractWorksheetData').mockImplementation(() => {
        return [
          { dialogue_id: 'DLG_001', ko: '안녕하세요', en: 'Hello', fr: 'Bonjour' },
          { dialogue_id: 'DLG_004', ko: '감사합니다', en: 'Thank you', fr: 'Merci' },
        ];
      });

      const result = await processor['extractCinematicDialogue']('/test', progressCallback);

      expect(result).toHaveLength(2);
      expect(result[0].dialogue_id).toBe('DLG_001');
      expect(result[1].dialogue_id).toBe('DLG_004');
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle dialogue with NPC references', async () => {
      const mockDialogueData = [
        { 
          dialogue_id: 'DLG_001', 
          npc_id: '001',
          ko: '안녕하세요', 
          en: 'Hello',
        },
        { 
          dialogue_id: 'DLG_002', 
          npc_id: '002',
          ko: '어서오세요', 
          en: 'Welcome',
        },
      ];

      const npcMapping = new Map([
        ['001', 'Hero'],
        ['002', 'Merchant'],
      ]);

      const result = processor['applyNPCMapping'](mockDialogueData, npcMapping);

      expect(result[0].npc_name).toBe('Hero');
      expect(result[1].npc_name).toBe('Merchant');
    });
  });

  describe('mergeDialogueData', () => {
    it('should merge cinematic and smalltalk dialogue', () => {
      const cinematicData = [
        { id: 'C1', type: 'cinematic', text: 'Cinematic 1' },
        { id: 'C2', type: 'cinematic', text: 'Cinematic 2' },
      ];

      const smalltalkData = [
        { id: 'S1', type: 'smalltalk', text: 'Smalltalk 1' },
        { id: 'S2', type: 'smalltalk', text: 'Smalltalk 2' },
      ];

      const merged = processor['mergeDialogueData'](cinematicData, smalltalkData);

      expect(merged).toHaveLength(4);
      expect(merged[0].type).toBe('cinematic');
      expect(merged[2].type).toBe('smalltalk');
    });

    it('should maintain order: cinematic first, then smalltalk', () => {
      const cinematicData = [{ id: 'C1', order: 2 }];
      const smalltalkData = [{ id: 'S1', order: 1 }];

      const merged = processor['mergeDialogueData'](cinematicData, smalltalkData);

      expect(merged[0].id).toBe('C1'); // Cinematic comes first
      expect(merged[1].id).toBe('S1');
    });
  });

  describe('createOutputExcel', () => {
    it('should create Excel with proper structure', async () => {
      const dialogueData = [
        {
          dialogue_id: 'DLG_001',
          npc_name: 'Hero',
          ko: '안녕하세요',
          en: 'Hello',
          fr: 'Bonjour',
        },
      ];

      const outputPath = join(TEST_OUTPUT_DIR, 'dialogue_output.xlsx');
      
      vi.spyOn(processor['excelProcessor'], 'writeWorkbook').mockImplementation(async (path, data) => {
        expect(path).toBe(outputPath);
        expect(data.worksheets[0].columns).toContainEqual(
          expect.objectContaining({ header: 'DIALOGUE_ID', key: 'dialogue_id' })
        );
        expect(data.worksheets[0].columns).toContainEqual(
          expect.objectContaining({ header: 'NPC_NAME', key: 'npc_name' })
        );
        expect(data.worksheets[0].rows).toEqual(dialogueData);
      });

      await processor['createOutputExcel'](dialogueData, outputPath, progressCallback);

      expect(processor['excelProcessor'].writeWorkbook).toHaveBeenCalled();
    });

    it('should apply styles to header row', async () => {
      const dialogueData = [{ dialogue_id: 'TEST' }];
      const outputPath = join(TEST_OUTPUT_DIR, 'styled_output.xlsx');

      vi.spyOn(processor['excelProcessor'], 'writeWorkbook').mockImplementation(async (path, data) => {
        const styles = data.worksheets[0].styles;
        expect(styles?.headerStyle).toBeDefined();
        expect(styles?.headerStyle?.font?.bold).toBe(true);
        expect(styles?.headerStyle?.fill?.type).toBe('pattern');
      });

      await processor['createOutputExcel'](dialogueData, outputPath, progressCallback);
    });
  });

  describe('processM4Dialogue - Integration', () => {
    it('should complete full processing workflow', async () => {
      // Mock all dependencies
      vi.spyOn(processor as any, 'validateInputFolder').mockImplementation(() => {});
      vi.spyOn(processor as any, 'loadNPCMapping').mockResolvedValue(new Map([['001', 'Hero']]));
      vi.spyOn(processor as any, 'extractCinematicDialogue').mockResolvedValue([
        { dialogue_id: 'C1', npc_id: '001', en: 'Hello' },
      ]);
      vi.spyOn(processor as any, 'extractSmalltalkDialogue').mockResolvedValue([
        { dialogue_id: 'S1', npc_id: '001', en: 'Hi there' },
      ]);
      vi.spyOn(processor as any, 'createOutputExcel').mockResolvedValue(undefined);

      const result = await processor.processM4Dialogue(
        '/input/folder',
        '/output/folder',
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('M4_Dialogue_merged_');
      expect(result.statistics.totalRows).toBe(2);
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ percentage: 100 })
      );
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(processor as any, 'validateInputFolder').mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result = await processor.processM4Dialogue(
        '/invalid/folder',
        '/output/folder',
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.logs).toContainEqual(
        expect.objectContaining({ level: 'error' })
      );
    });

    it('should report progress at each step', async () => {
      // Setup mocks
      vi.spyOn(processor as any, 'validateInputFolder').mockImplementation(() => {});
      vi.spyOn(processor as any, 'loadNPCMapping').mockResolvedValue(new Map());
      vi.spyOn(processor as any, 'extractCinematicDialogue').mockResolvedValue([]);
      vi.spyOn(processor as any, 'extractSmalltalkDialogue').mockResolvedValue([]);
      vi.spyOn(processor as any, 'createOutputExcel').mockResolvedValue(undefined);

      await processor.processM4Dialogue('/input', '/output', progressCallback);

      // Progress callback이 각 단계에서 호출되었는지 확인
      const progressCalls = progressCallback.mock.calls.map(call => call[0]);
      
      expect(progressCalls.some(p => p.currentStep === 'NPC 매핑 로드 중')).toBe(true);
      expect(progressCalls.some(p => p.currentStep === 'CINEMATIC_DIALOGUE 처리 중')).toBe(true);
      expect(progressCalls.some(p => p.currentStep === 'SMALLTALK_DIALOGUE 처리 중')).toBe(true);
      expect(progressCalls.some(p => p.currentStep === '데이터 병합 중')).toBe(true);
      expect(progressCalls.some(p => p.percentage === 100)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // 대용량 데이터셋 시뮬레이션
      const largeNPCMapping = new Map();
      for (let i = 1; i <= 1000; i++) {
        largeNPCMapping.set(i.toString().padStart(3, '0'), `NPC_${i}`);
      }

      const largeCinematicData = Array.from({ length: 5000 }, (_, i) => ({
        dialogue_id: `C_${i}`,
        npc_id: (i % 1000 + 1).toString().padStart(3, '0'),
        en: `Dialogue ${i}`,
      }));

      const largeSmalltalkData = Array.from({ length: 3000 }, (_, i) => ({
        dialogue_id: `S_${i}`,
        npc_id: (i % 1000 + 1).toString().padStart(3, '0'),
        en: `Smalltalk ${i}`,
      }));

      const startTime = Date.now();
      
      const merged = processor['mergeDialogueData'](largeCinematicData, largeSmalltalkData);
      const withNPCNames = processor['applyNPCMapping'](merged, largeNPCMapping);
      
      const processingTime = Date.now() - startTime;

      expect(withNPCNames).toHaveLength(8000);
      expect(processingTime).toBeLessThan(1000); // 1초 이내 처리
    });
  });
});