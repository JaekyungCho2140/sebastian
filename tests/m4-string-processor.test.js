const { M4StringProcessor } = require('../src/services/m4StringProcessor');
const path = require('path');
const fs = require('fs');

describe('M4StringProcessor', () => {
  let processor;
  let testConfig;

  beforeEach(() => {
    testConfig = {
      folderPath: path.join(__dirname, 'test-data', 'm4-string'),
      outputPath: path.join(__dirname, 'test-outputs'),
      progressCallback: (progress) => {
        console.log(`Progress: ${progress.step} - ${progress.percentage}%`);
      },
      logCallback: (log) => {
        console.log(`[${log.type}] ${log.message}`);
      }
    };

    processor = new M4StringProcessor(testConfig);

    // 테스트 출력 폴더 생성
    if (!fs.existsSync(testConfig.outputPath)) {
      fs.mkdirSync(testConfig.outputPath, { recursive: true });
    }
  });

  afterEach(() => {
    // 테스트 출력 파일 정리
    if (fs.existsSync(testConfig.outputPath)) {
      const files = fs.readdirSync(testConfig.outputPath);
      files.forEach(file => {
        if (file.endsWith('.xlsx')) {
          fs.unlinkSync(path.join(testConfig.outputPath, file));
        }
      });
    }
  });

  describe('File Configuration', () => {
    test('should have correct file configs for all STRING files', () => {
      const allConfigs = processor.getAllFileConfigs();
      
      // 8개 파일 확인
      expect(Object.keys(allConfigs)).toHaveLength(8);
      
      // 각 파일별 설정 확인
      expect(allConfigs['SEQUENCE_DIALOGUE.xlsm']).toEqual({
        filename: 'SEQUENCE_DIALOGUE.xlsm',
        headerRow: 2,
        skipRows: 9,
        columnMapping: [7, null, 10, 11, 12, 13, 14, 15, 16, 17, null, null]
      });
      
      expect(allConfigs['STRING_BUILTIN.xlsm']).toEqual({
        filename: 'STRING_BUILTIN.xlsm',
        headerRow: 2,
        skipRows: 4,
        columnMapping: [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
      });
      
      expect(allConfigs['STRING_NPC.xlsm']).toEqual({
        filename: 'STRING_NPC.xlsm',
        headerRow: 2,
        skipRows: 4,
        columnMapping: [7, 20, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]
      });
      
      expect(allConfigs['STRING_QUESTTEMPLATE.xlsm']).toEqual({
        filename: 'STRING_QUESTTEMPLATE.xlsm',
        headerRow: 2,
        skipRows: 7,
        columnMapping: [7, 0, 12, 13, 14, 15, 16, 17, 18, 19, null, null]
      });
    });

    test('should validate file configurations correctly', () => {
      const validation = processor.validateAllFileConfigs();
      expect(validation.isValid).toBe(true);
      expect(validation.invalidFiles).toHaveLength(0);
    });

    test('should get specific file config', () => {
      const config = processor.getFileConfig('STRING_BUILTIN.xlsm');
      expect(config).toBeDefined();
      expect(config.headerRow).toBe(2);
      expect(config.skipRows).toBe(4);
      expect(config.columnMapping).toHaveLength(12);
    });
  });

  describe('Column Mapping System', () => {
    test('should extract row data correctly with column mapping', () => {
      const sampleRow = Array.from({length: 25}, (_, i) => `cell_${i}`);
      const mapping = [7, null, 10, 11, 12, 13, 14, 15, 16, 17, null, null];
      
      const result = processor.extractRowData(sampleRow, mapping);
      
      expect(result).toHaveLength(12);
      expect(result[0]).toBe('cell_7');
      expect(result[1]).toBe(''); // null mapping
      expect(result[2]).toBe('cell_10');
      expect(result[3]).toBe('cell_11');
      expect(result[10]).toBe(''); // null mapping
      expect(result[11]).toBe(''); // null mapping
    });

    test('should handle null and undefined values in row data', () => {
      const sampleRow = [null, undefined, 'valid', '', 0, NaN];
      const mapping = [0, 1, 2, 3, 4, 5];
      
      const result = processor.extractRowData(sampleRow, mapping);
      
      expect(result[0]).toBe('');
      expect(result[1]).toBe('');
      expect(result[2]).toBe('valid');
      expect(result[3]).toBe('');
      expect(result[4]).toBe('0');
      expect(result[5]).toBe('');
    });

    test('should validate column mapping for each file', () => {
      const filenames = [
        'SEQUENCE_DIALOGUE.xlsm',
        'STRING_BUILTIN.xlsm',
        'STRING_MAIL.xlsm',
        'STRING_MESSAGE.xlsm',
        'STRING_NPC.xlsm',
        'STRING_QUESTTEMPLATE.xlsm',
        'STRING_TEMPLATE.xlsm',
        'STRING_TOOLTIP.xlsm'
      ];

      filenames.forEach(filename => {
        const sampleRow = Array.from({length: 25}, (_, i) => `cell_${i}`);
        const isValid = processor.validateColumnMapping(filename, sampleRow);
        expect(isValid).toBe(true);
      });
    });

    test('should provide column mapping info for debugging', () => {
      const info = processor.getColumnMappingInfo('STRING_NPC.xlsm');
      
      expect(info).toBeDefined();
      expect(info.filename).toBe('STRING_NPC.xlsm');
      expect(info.headerRow).toBe(2);
      expect(info.skipRows).toBe(4);
      expect(info.mappingLength).toBe(12);
      expect(info.nullCount).toBe(0); // STRING_NPC has no null mappings
      expect(info.mapping).toEqual([7, 20, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]);
    });
  });

  describe('Business Logic Processing', () => {
    test('should format Table/ID correctly', () => {
      const tableName = 'STRING_BUILTIN';
      const stringId = 'TEST_001';
      
      const result = processor.formatTableId(tableName, stringId);
      
      expect(result).toBe('STRING_BUILTIN/TEST_001');
    });

    test('should filter valid data correctly', () => {
      const testData = [
        ['id1', 'note1', 'ko1', 'en1', 'ct1', 'cs1', 'ja1', 'th1', 'es1', 'pt1', 'npc1', 'remark1'],
        ['id2', 'note2', 'ko2', '', 'ct2', 'cs2', 'ja2', 'th2', 'es2', 'pt2', 'npc2', 'remark2'], // empty EN
        ['id3', 'note3', 'ko3', '미사용', 'ct3', 'cs3', 'ja3', 'th3', 'es3', 'pt3', 'npc3', 'remark3'], // 미사용
        ['id4', 'note4', 'ko4', '0', 'ct4', 'cs4', 'ja4', 'th4', 'es4', 'pt4', 'npc4', 'remark4'], // zero
        ['id5', 'note5', 'ko5', 'en5', 'ct5', 'cs5', 'ja5', 'th5', 'es5', 'pt5', 'npc5', 'remark5']
      ];
      
      const validData = processor.filterValidData(testData);
      
      expect(validData).toHaveLength(2);
      expect(validData[0][0]).toBe('id1');
      expect(validData[1][0]).toBe('id5');
    });

    test('should transform data to output format correctly', () => {
      const testData = [
        {
          tableName: 'STRING_BUILTIN',
          data: [
            ['id1', 'note1', 'ko1', 'en1', 'ct1', 'cs1', 'ja1', 'th1', 'es1', 'pt1', 'npc1', 'remark1'],
            ['id2', 'note2', 'ko2', 'en2', 'ct2', 'cs2', 'ja2', 'th2', 'es2', 'pt2', 'npc2', 'remark2']
          ]
        }
      ];
      
      const output = processor.transformToOutputFormat(testData);
      
      expect(output).toHaveLength(2);
      
      // 첫 번째 행 검증
      expect(output[0][0]).toBe('1'); // 순서
      expect(output[0][1]).toBe('STRING_BUILTIN'); // Table Name
      expect(output[0][2]).toBe('id1'); // String ID
      expect(output[0][3]).toBe('STRING_BUILTIN/id1'); // Table/ID
      expect(output[0][4]).toBe('note1'); // NOTE
      expect(output[0][5]).toBe('ko1'); // KO
      expect(output[0][6]).toBe('en1'); // EN
      
      // 두 번째 행 검증
      expect(output[1][0]).toBe('2'); // 순서
      expect(output[1][1]).toBe('STRING_BUILTIN'); // Table Name
      expect(output[1][3]).toBe('STRING_BUILTIN/id2'); // Table/ID
    });

    test('should validate business logic correctly', () => {
      const sampleData = [
        ['1', 'TABLE1', 'id1', 'TABLE1/id1', 'note1', 'ko1', 'en1', 'ct1', 'cs1', 'ja1', 'th1', 'es1', 'pt1', 'npc1', 'remark1'],
        ['2', 'TABLE1', 'id2', 'TABLE1/id2', 'note2', 'ko2', 'en2', 'ct2', 'cs2', 'ja2', 'th2', 'es2', 'pt2', 'npc2', 'remark2']
      ];
      
      const validation = processor.validateBusinessLogic(sampleData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.stats.sequenceCheck).toBe(true);
      expect(validation.stats.totalRows).toBe(2);
    });

    test('should provide filtering statistics', () => {
      const testData = [
        ['id1', 'note1', 'ko1', 'en1', 'ct1', 'cs1', 'ja1', 'th1', 'es1', 'pt1', 'npc1', 'remark1'],
        ['id2', 'note2', 'ko2', '', 'ct2', 'cs2', 'ja2', 'th2', 'es2', 'pt2', 'npc2', 'remark2'],
        ['id3', 'note3', 'ko3', '미사용', 'ct3', 'cs3', 'ja3', 'th3', 'es3', 'pt3', 'npc3', 'remark3'],
        ['id4', 'note4', 'ko4', '0', 'ct4', 'cs4', 'ja4', 'th4', 'es4', 'pt4', 'npc4', 'remark4']
      ];
      
      const stats = processor.getFilteringStats(testData);
      
      expect(stats.total).toBe(4);
      expect(stats.valid).toBe(1);
      expect(stats.filtered).toBe(3);
      expect(stats.filterReasons.empty).toBe(1);
      expect(stats.filterReasons.unused).toBe(1);
      expect(stats.filterReasons.zero).toBe(1);
    });
  });

  describe('Output File Generation', () => {
    test('should generate correct output filename', () => {
      const filename = processor.generateOutputFilename();
      
      expect(filename).toMatch(/^\d{4}_MIR4_MASTER_STRING\.xlsx$/);
      
      const now = new Date();
      const expectedPrefix = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      expect(filename).toStartWith(expectedPrefix);
    });

    test('should generate table name correctly', () => {
      expect(processor.generateTableName('STRING_BUILTIN.xlsm')).toBe('STRING_BUILTIN');
      expect(processor.generateTableName('STRING_NPC.xlsm')).toBe('STRING_NPC');
      expect(processor.generateTableName('SEQUENCE_DIALOGUE.xlsm')).toBe('SEQUENCE_DIALOGUE');
    });

    test('should provide output column information', () => {
      const info = processor.getOutputColumnInfo();
      
      expect(info.columns).toHaveLength(15);
      expect(info.columnCount).toBe(15);
      expect(info.columns[0]).toBe('#');
      expect(info.columns[1]).toBe('Table Name');
      expect(info.columns[6]).toBe('EN');
      expect(info.columnMapping['#']).toBe(0);
      expect(info.columnMapping['EN']).toBe(6);
    });

    test('should generate data preview correctly', () => {
      const sampleData = [
        ['1', 'TABLE1', 'id1', 'TABLE1/id1', 'note1', 'ko1', 'en1', 'ct1', 'cs1', 'ja1', 'th1', 'es1', 'pt1', 'npc1', 'remark1'],
        ['2', 'TABLE1', 'id2', 'TABLE1/id2', 'note2', 'ko2', 'en2', 'ct2', 'cs2', 'ja2', 'th2', 'es2', 'pt2', 'npc2', 'remark2']
      ];
      
      const preview = processor.generateDataPreview(sampleData, 1);
      
      expect(preview.headers).toHaveLength(15);
      expect(preview.rows).toHaveLength(1);
      expect(preview.totalRows).toBe(2);
      expect(preview.previewRows).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing files gracefully', () => {
      const invalidProcessor = new M4StringProcessor({
        folderPath: '/nonexistent/path',
        outputPath: testConfig.outputPath
      });
      
      const validation = invalidProcessor.validateRequiredFiles();
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingFiles).toHaveLength(8);
    });

    test('should handle invalid column mapping', () => {
      const result = processor.validateColumnMapping('nonexistent.xlsm', []);
      expect(result).toBe(false);
    });

    test('should handle empty data arrays', () => {
      const validation = processor.validateBusinessLogic([]);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('No data to validate');
    });
  });
});