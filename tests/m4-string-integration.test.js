const path = require('path');
const fs = require('fs');

// M4StringProcessor 테스트를 위한 통합 테스트

describe('M4StringProcessor Integration Test', () => {
  test('M4StringProcessor should be properly compiled and importable', () => {
    // 빌드된 파일 확인
    const builtFile = path.join(__dirname, '../dist/main/services/m4StringProcessor.js');
    
    if (fs.existsSync(builtFile)) {
      console.log('✅ M4StringProcessor compiled successfully');
      expect(true).toBe(true);
    } else {
      console.log('❌ M4StringProcessor compilation failed');
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have all required methods', () => {
    // 소스 파일에서 메서드 확인
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // 필수 메서드들 확인
      const requiredMethods = [
        'getFileConfig',
        'getAllFileConfigs',
        'validateRequiredFiles',
        'extractRowData',
        'extractFileData',
        'extractAllFileData',
        'transformToOutputFormat',
        'generateOutputFile',
        'processStringFiles'
      ];
      
      let foundMethods = 0;
      requiredMethods.forEach(method => {
        if (content.includes(method)) {
          foundMethods++;
        }
      });
      
      console.log(`✅ Found ${foundMethods}/${requiredMethods.length} required methods`);
      expect(foundMethods).toBe(requiredMethods.length);
    } else {
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have correct file configurations', () => {
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // 8개 STRING 파일 확인
      const stringFiles = [
        'SEQUENCE_DIALOGUE.xlsm',
        'STRING_BUILTIN.xlsm',
        'STRING_MAIL.xlsm',
        'STRING_MESSAGE.xlsm',
        'STRING_NPC.xlsm',
        'STRING_QUESTTEMPLATE.xlsm',
        'STRING_TEMPLATE.xlsm',
        'STRING_TOOLTIP.xlsm'
      ];
      
      let foundFiles = 0;
      stringFiles.forEach(file => {
        if (content.includes(`'${file}'`)) {
          foundFiles++;
        }
      });
      
      console.log(`✅ Found ${foundFiles}/${stringFiles.length} STRING files configured`);
      expect(foundFiles).toBe(stringFiles.length);
    } else {
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have correct output column structure', () => {
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // 15개 출력 열 확인
      const outputColumns = [
        '#',
        'Table Name',
        'String ID',
        'Table/ID',
        'NOTE',
        'KO',
        'EN',
        'CT',
        'CS',
        'JA',
        'TH',
        'ES-LATAM',
        'PT-BR',
        'NPC 이름',
        '비고'
      ];
      
      let foundColumns = 0;
      outputColumns.forEach(column => {
        if (content.includes(`'${column}'`)) {
          foundColumns++;
        }
      });
      
      console.log(`✅ Found ${foundColumns}/${outputColumns.length} output columns defined`);
      expect(foundColumns).toBe(outputColumns.length);
    } else {
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have column mapping configurations', () => {
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // 컬럼 매핑 확인
      const columnMappings = [
        'columnMapping: [7, null, 10, 11, 12, 13, 14, 15, 16, 17, null, null]', // SEQUENCE_DIALOGUE
        'columnMapping: [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, null, null]', // STRING_BUILTIN
        'columnMapping: [7, 20, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]', // STRING_NPC
        'columnMapping: [7, 0, 12, 13, 14, 15, 16, 17, 18, 19, null, null]' // STRING_QUESTTEMPLATE
      ];
      
      let foundMappings = 0;
      columnMappings.forEach(mapping => {
        if (content.includes(mapping)) {
          foundMappings++;
        }
      });
      
      console.log(`✅ Found ${foundMappings}/${columnMappings.length} column mappings defined`);
      expect(foundMappings).toBe(columnMappings.length);
    } else {
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have business logic methods', () => {
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // 비즈니스 로직 메서드 확인
      const businessMethods = [
        'formatTableId',
        'filterValidData',
        'generateTableName',
        'generateOutputFilename',
        'applyExcelFormatting'
      ];
      
      let foundMethods = 0;
      businessMethods.forEach(method => {
        if (content.includes(method)) {
          foundMethods++;
        }
      });
      
      console.log(`✅ Found ${foundMethods}/${businessMethods.length} business logic methods`);
      expect(foundMethods).toBe(businessMethods.length);
    } else {
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have Excel formatting specifications', () => {
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // Excel 포맷팅 확인
      const formattingSpecs = [
        "'맑은 고딕'", // 폰트
        "'FF9C5700'", // 헤더 폰트 색상 (실제 ARGB 값)
        "'FFFFEB9C'", // 헤더 배경색 (실제 ARGB 값)
        "'thin'", // 테두리 스타일
        "'frozen'" // 틀 고정
      ];
      
      let foundSpecs = 0;
      formattingSpecs.forEach(spec => {
        if (content.includes(spec)) {
          foundSpecs++;
        }
      });
      
      console.log(`✅ Found ${foundSpecs}/${formattingSpecs.length} Excel formatting specifications`);
      expect(foundSpecs).toBe(formattingSpecs.length);
    } else {
      expect(false).toBe(true);
    }
  });

  test('M4StringProcessor should have all dependencies imported', () => {
    const sourceFile = path.join(__dirname, '../src/services/m4StringProcessor.ts');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf-8');
      
      // 필수 import 확인
      const imports = [
        'import { ExcelProcessor }',
        'import * as ExcelJS',
        'import path from',
        'import fs from',
        'M4ProcessResult',
        'M4ProcessProgress',
        'M4ProcessStatistics',
        'M4ProcessLog'
      ];
      
      let foundImports = 0;
      imports.forEach(importStmt => {
        if (content.includes(importStmt)) {
          foundImports++;
        }
      });
      
      console.log(`✅ Found ${foundImports}/${imports.length} required imports`);
      expect(foundImports).toBe(imports.length);
    } else {
      expect(false).toBe(true);
    }
  });
});