import * as ExcelJS from 'exceljs';
import { existsSync } from 'fs';
import path from 'path';
import { ExcelProcessor } from '../utils/excelProcessor';
import { 
  M4ProcessProgress, 
  M4ProcessResult, 
  ProcessStep, 
  createEmptyM4ProcessStatistics 
} from '../types/m4Processing';

// M4 Dialogue 처리를 위한 전용 타입들
export interface DialogueFileConfig {
  filename: string;
  sheetName: string | number;
  headerRow: number;
  skipRows: number;
  stringIdColumn: number;
  npcIdColumn: number;
  languageColumns: {
    koM: number;
    koF: number;
    enM: number;
    enF: number;
    ctM: number;
    ctF: number;
    csM: number;
    csF: number;
    jaM: number;
    jaF: number;
    thM: number;
    thF: number;
    esLatamM: number;
    esLatamF: number;
    ptBrM: number;
    ptBrF: number;
    note: number;
  };
  filterColumn: number; // EN (M) 컬럼으로 필터링
}

export interface NPCMappingData {
  [npcId: string]: string;
}

export interface DialogueData {
  index: number;
  tableName: string;
  stringId: string;
  tableId: string;
  npcId: string;
  speakerName: string;
  koM: string;
  koF: string;
  enM: string;
  enF: string;
  ctM: string;
  ctF: string;
  csM: string;
  csF: string;
  jaM: string;
  jaF: string;
  thM: string;
  thF: string;
  esLatamM: string;
  esLatamF: string;
  ptBrM: string;
  ptBrF: string;
  note: string;
}

export interface M4DialogueProcessorResult {
  success: boolean;
  outputFilePath: string;
  processedRows: number;
  errors: string[];
  processingTime: number;
}

/**
 * M4 Dialogue 처리 서비스
 * Python Merged_M4.py의 DIALOGUE 처리 로직을 TypeScript로 포팅
 */
export class M4DialogueProcessor {
  private excelProcessor: ExcelProcessor;
  private logger: (message: string, level?: 'info' | 'warn' | 'error') => void;
  
  // Python 코드 명세에 따른 파일 구성
  private readonly CINEMATIC_CONFIG: DialogueFileConfig = {
    filename: 'CINEMATIC_DIALOGUE.xlsm',
    sheetName: 1, // 첫 번째 시트
    headerRow: 1,
    skipRows: 9, // 9행 스킵
    stringIdColumn: 7, // 0-indexed로 변환하면 6
    npcIdColumn: 8,   // 0-indexed로 변환하면 7
    languageColumns: {
      koM: 11,   // 0-indexed: 10
      koF: 12,   // 0-indexed: 11
      enM: 13,   // 0-indexed: 12
      enF: 14,   // 0-indexed: 13
      ctM: 15,   // 0-indexed: 14
      ctF: 16,   // 0-indexed: 15
      csM: 17,   // 0-indexed: 16
      csF: 18,   // 0-indexed: 17
      jaM: 19,   // 0-indexed: 18
      jaF: 20,   // 0-indexed: 19
      thM: 21,   // 0-indexed: 20
      thF: 22,   // 0-indexed: 21
      esLatamM: 23, // 0-indexed: 22
      esLatamF: 24, // 0-indexed: 23
      ptBrM: 25, // 0-indexed: 24
      ptBrF: 26, // 0-indexed: 25
      note: 29   // 0-indexed: 28
    },
    filterColumn: 13 // EN (M) 컬럼으로 필터링
  };

  private readonly SMALLTALK_CONFIG: DialogueFileConfig = {
    filename: 'SMALLTALK_DIALOGUE.xlsm',
    sheetName: 1, // 첫 번째 시트
    headerRow: 1,
    skipRows: 4, // 4행 스킵
    stringIdColumn: 7, // 0-indexed로 변환하면 6
    npcIdColumn: 8,   // 0-indexed로 변환하면 7
    languageColumns: {
      koM: 12,   // 0-indexed: 11
      koF: 13,   // 0-indexed: 12
      enM: 14,   // 0-indexed: 13
      enF: 15,   // 0-indexed: 14
      ctM: 16,   // 0-indexed: 15
      ctF: 17,   // 0-indexed: 16
      csM: 18,   // 0-indexed: 17
      csF: 19,   // 0-indexed: 18
      jaM: 20,   // 0-indexed: 19
      jaF: 21,   // 0-indexed: 20
      thM: 22,   // 0-indexed: 21
      thF: 23,   // 0-indexed: 22
      esLatamM: 24, // 0-indexed: 23
      esLatamF: 25, // 0-indexed: 24
      ptBrM: 26, // 0-indexed: 25
      ptBrF: 27, // 0-indexed: 26
      note: 30   // 0-indexed: 29
    },
    filterColumn: 14 // EN (M) 컬럼으로 필터링
  };

  private readonly NPC_CONFIG = {
    filename: 'NPC.xlsm',
    sheetName: 'NPC',
    headerRow: 1,
    idColumn: 7,   // 0-indexed: 6
    nameColumn: 9  // 0-indexed: 8
  };

  constructor(logger?: (message: string, level?: 'info' | 'warn' | 'error') => void) {
    this.excelProcessor = new ExcelProcessor(logger);
    this.logger = logger || ((message: string, level = 'info') => {
      console.log(`[M4DialogueProcessor:${level}] ${message}`);
    });
  }

  /**
   * M4 Dialogue 처리 메인 함수
   * @param inputFolder 입력 폴더 경로
   * @param outputFolder 출력 폴더 경로
   * @param progressCallback 진행률 콜백
   */
  async processM4Dialogue(
    inputFolder: string,
    outputFolder: string,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<M4DialogueProcessorResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processedRows = 0;

    try {
      this.logger('Starting M4 Dialogue processing');
      
      // 1. NPC 매핑 데이터 로드 (10% 할당)
      progressCallback?.(5, 'Loading NPC mapping data...');
      const npcMapping = await this.loadNPCMapping(inputFolder);
      progressCallback?.(10, 'NPC mapping data loaded');
      
      // 2. CINEMATIC_DIALOGUE 데이터 추출 (30% 할당)
      progressCallback?.(15, 'Processing CINEMATIC_DIALOGUE...');
      const cinematicData = await this.extractCinematicDialogue(
        inputFolder, 
        npcMapping, 
        (fileProgress, message) => {
          const adjustedProgress = 15 + (fileProgress * 0.25); // 15% ~ 40%
          progressCallback?.(adjustedProgress, message);
        }
      );
      
      // 3. SMALLTALK_DIALOGUE 데이터 추출 (30% 할당)
      progressCallback?.(45, 'Processing SMALLTALK_DIALOGUE...');
      const smalltalkData = await this.extractSmalltalkDialogue(
        inputFolder, 
        npcMapping,
        (fileProgress, message) => {
          const adjustedProgress = 45 + (fileProgress * 0.25); // 45% ~ 70%
          progressCallback?.(adjustedProgress, message);
        }
      );
      
      // 4. 데이터 병합 (10% 할당)
      progressCallback?.(75, 'Merging dialogue data...');
      const mergedData = this.mergeDialogueData(cinematicData, smalltalkData);
      processedRows = mergedData.length;
      progressCallback?.(80, `Merged ${processedRows} dialogue entries`);
      
      // 5. Excel 파일 생성 (20% 할당)
      progressCallback?.(85, 'Creating output Excel file...');
      const outputFilePath = await this.createOutputExcel(
        mergedData, 
        outputFolder,
        (excelProgress, message) => {
          const adjustedProgress = 85 + (excelProgress * 0.15); // 85% ~ 100%
          progressCallback?.(adjustedProgress, message);
        }
      );
      
      progressCallback?.(100, 'M4 Dialogue processing completed');
      
      const processingTime = Date.now() - startTime;
      this.logger(`M4 Dialogue processing completed in ${processingTime}ms`);
      
      return {
        success: true,
        outputFilePath,
        processedRows,
        errors,
        processingTime
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      this.logger(`M4 Dialogue processing failed: ${errorMessage}`, 'error');
      
      return {
        success: false,
        outputFilePath: '',
        processedRows,
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * NPC 매핑 데이터 로드
   * @param inputFolder 입력 폴더 경로
   */
  private async loadNPCMapping(inputFolder: string): Promise<NPCMappingData> {
    const npcFilePath = `${inputFolder}/${this.NPC_CONFIG.filename}`;
    
    if (!existsSync(npcFilePath)) {
      throw new Error(`NPC file not found: ${npcFilePath}`);
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(npcFilePath);
      
      const worksheet = workbook.getWorksheet(this.NPC_CONFIG.sheetName);
      if (!worksheet) {
        throw new Error(`NPC worksheet not found: ${this.NPC_CONFIG.sheetName}`);
      }

      const npcMapping: NPCMappingData = {};
      
      // 2행부터 데이터 읽기 (1행은 헤더)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        const npcId = row.getCell(this.NPC_CONFIG.idColumn).value;
        const npcName = row.getCell(this.NPC_CONFIG.nameColumn).value;
        
        if (npcId && npcName) {
          npcMapping[npcId.toString()] = npcName.toString();
        }
      }

      this.logger(`Loaded ${Object.keys(npcMapping).length} NPC mappings`);
      return npcMapping;
      
    } catch (error) {
      throw new Error(`Failed to load NPC mapping: ${error}`);
    }
  }

  /**
   * CINEMATIC_DIALOGUE 데이터 추출
   * @param inputFolder 입력 폴더 경로
   * @param npcMapping NPC 매핑 데이터
   * @param progressCallback 진행률 콜백
   */
  private async extractCinematicDialogue(
    inputFolder: string,
    npcMapping: NPCMappingData,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<DialogueData[]> {
    const cinematicFilePath = `${inputFolder}/${this.CINEMATIC_CONFIG.filename}`;
    
    if (!existsSync(cinematicFilePath)) {
      throw new Error(`CINEMATIC_DIALOGUE file not found: ${cinematicFilePath}`);
    }

    return await this.extractDialogueData(cinematicFilePath, this.CINEMATIC_CONFIG, npcMapping, 'CINEMATIC_DIALOGUE', progressCallback);
  }

  /**
   * SMALLTALK_DIALOGUE 데이터 추출
   * @param inputFolder 입력 폴더 경로
   * @param npcMapping NPC 매핑 데이터
   * @param progressCallback 진행률 콜백
   */
  private async extractSmalltalkDialogue(
    inputFolder: string,
    npcMapping: NPCMappingData,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<DialogueData[]> {
    const smalltalkFilePath = `${inputFolder}/${this.SMALLTALK_CONFIG.filename}`;
    
    if (!existsSync(smalltalkFilePath)) {
      throw new Error(`SMALLTALK_DIALOGUE file not found: ${smalltalkFilePath}`);
    }

    return await this.extractDialogueData(smalltalkFilePath, this.SMALLTALK_CONFIG, npcMapping, 'SMALLTALK_DIALOGUE', progressCallback);
  }

  /**
   * 공통 Dialogue 데이터 추출 로직
   * @param filePath 파일 경로
   * @param config 파일 구성
   * @param npcMapping NPC 매핑 데이터
   * @param tableName 테이블 이름
   * @param progressCallback 진행률 콜백
   */
  private async extractDialogueData(
    filePath: string,
    config: DialogueFileConfig,
    npcMapping: NPCMappingData,
    tableName: string,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<DialogueData[]> {
    try {
      progressCallback?.(0, `Opening ${tableName} file...`);
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const worksheet = workbook.getWorksheet(config.sheetName);
      if (!worksheet) {
        throw new Error(`Worksheet not found: ${config.sheetName}`);
      }

      const dialogueData: DialogueData[] = [];
      
      // 데이터 행 처리 (skipRows 이후부터 시작)
      const startRow = config.skipRows + 1;
      const totalRows = worksheet.rowCount;
      const dataRows = Math.max(0, totalRows - startRow + 1);
      
      progressCallback?.(10, `Processing ${dataRows} rows from ${tableName}...`);
      
      let processedRows = 0;
      let validRows = 0;
      
      for (let rowNumber = startRow; rowNumber <= totalRows; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        // EN (M) 컬럼 필터링
        const enMValue = row.getCell(config.filterColumn).value;
        if (!enMValue || 
            enMValue.toString().trim() === '' || 
            enMValue.toString().trim() === '0' ||
            enMValue.toString().trim() === '미사용') {
          processedRows++;
          continue;
        }

        const stringId = row.getCell(config.stringIdColumn).value?.toString() || '';
        const npcId = row.getCell(config.npcIdColumn).value?.toString() || '';
        
        // NPC 이름 매핑
        const speakerName = npcMapping[npcId] || npcId;
        
        // Table/ID 생성
        const tableId = `${tableName}/${stringId}`;
        
        const dialogueRow: DialogueData = {
          index: 0, // 나중에 설정
          tableName,
          stringId,
          tableId,
          npcId,
          speakerName,
          koM: row.getCell(config.languageColumns.koM).value?.toString() || '',
          koF: row.getCell(config.languageColumns.koF).value?.toString() || '',
          enM: row.getCell(config.languageColumns.enM).value?.toString() || '',
          enF: row.getCell(config.languageColumns.enF).value?.toString() || '',
          ctM: row.getCell(config.languageColumns.ctM).value?.toString() || '',
          ctF: row.getCell(config.languageColumns.ctF).value?.toString() || '',
          csM: row.getCell(config.languageColumns.csM).value?.toString() || '',
          csF: row.getCell(config.languageColumns.csF).value?.toString() || '',
          jaM: row.getCell(config.languageColumns.jaM).value?.toString() || '',
          jaF: row.getCell(config.languageColumns.jaF).value?.toString() || '',
          thM: row.getCell(config.languageColumns.thM).value?.toString() || '',
          thF: row.getCell(config.languageColumns.thF).value?.toString() || '',
          esLatamM: row.getCell(config.languageColumns.esLatamM).value?.toString() || '',
          esLatamF: row.getCell(config.languageColumns.esLatamF).value?.toString() || '',
          ptBrM: row.getCell(config.languageColumns.ptBrM).value?.toString() || '',
          ptBrF: row.getCell(config.languageColumns.ptBrF).value?.toString() || '',
          note: row.getCell(config.languageColumns.note).value?.toString() || ''
        };

        dialogueData.push(dialogueRow);
        processedRows++;
        validRows++;
        
        // 진행률 업데이트 (10% ~ 90%)
        if (processedRows % 100 === 0 || processedRows === dataRows) {
          const fileProgress = 10 + (processedRows / dataRows) * 80;
          progressCallback?.(fileProgress, `Processed ${validRows} valid entries from ${tableName}...`);
        }
      }

      progressCallback?.(100, `Extracted ${dialogueData.length} dialogue entries from ${tableName}`);
      this.logger(`Extracted ${dialogueData.length} dialogue entries from ${tableName}`);
      return dialogueData;
      
    } catch (error) {
      throw new Error(`Failed to extract ${tableName} data: ${error}`);
    }
  }

  /**
   * Dialogue 데이터 병합
   * @param cinematicData CINEMATIC_DIALOGUE 데이터
   * @param smalltalkData SMALLTALK_DIALOGUE 데이터
   */
  private mergeDialogueData(
    cinematicData: DialogueData[],
    smalltalkData: DialogueData[]
  ): DialogueData[] {
    const mergedData = [...cinematicData, ...smalltalkData];
    
    // 인덱스 설정 (1부터 시작)
    mergedData.forEach((row, index) => {
      row.index = index + 1;
    });
    
    this.logger(`Merged ${mergedData.length} dialogue entries`);
    return mergedData;
  }

  /**
   * Excel 출력 파일 생성
   * @param dialogueData 병합된 dialogue 데이터
   * @param outputFolder 출력 폴더 경로
   * @param progressCallback 진행률 콜백
   */
  private async createOutputExcel(
    dialogueData: DialogueData[],
    outputFolder: string,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<string> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filename = `${month}${day}_MIR4_MASTER_DIALOGUE.xlsx`;
    const outputPath = `${outputFolder}/${filename}`;

    try {
      progressCallback?.(0, 'Creating Excel workbook...');
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dialogue Data');
      
      progressCallback?.(10, 'Setting up headers...');
      
      // 헤더 설정
      const headers = [
        '#', 'Table Name', 'String ID', 'Table/ID', 'NPC ID', 'Speaker Name',
        'KO (M)', 'KO (F)', 'EN (M)', 'EN (F)', 'CT (M)', 'CT (F)',
        'CS (M)', 'CS (F)', 'JA (M)', 'JA (F)', 'TH (M)', 'TH (F)',
        'ES-LATAM (M)', 'ES-LATAM (F)', 'PT-BR (M)', 'PT-BR (F)', 'NOTE'
      ];
      
      worksheet.getRow(1).values = headers;
      
      progressCallback?.(20, 'Applying header styles...');
      
      // 헤더 스타일 설정
      const headerRow = worksheet.getRow(1);
      headerRow.font = {
        name: '맑은 고딕',
        size: 12,
        bold: true,
        color: { argb: 'FF9C5700' }
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB9C' }
      };
      
      progressCallback?.(30, `Writing ${dialogueData.length} data rows...`);
      
      // 데이터 입력
      dialogueData.forEach((row, index) => {
        const excelRow = worksheet.getRow(index + 2);
        excelRow.values = [
          row.index, row.tableName, row.stringId, row.tableId, row.npcId, row.speakerName,
          row.koM, row.koF, row.enM, row.enF, row.ctM, row.ctF,
          row.csM, row.csF, row.jaM, row.jaF, row.thM, row.thF,
          row.esLatamM, row.esLatamF, row.ptBrM, row.ptBrF, row.note
        ];
        
        // 데이터 행 스타일 설정
        excelRow.font = {
          name: '맑은 고딕',
          size: 10
        };
        
        // 진행률 업데이트 (30% ~ 60%)
        if (index % 500 === 0 || index === dialogueData.length - 1) {
          const dataProgress = 30 + (index / dialogueData.length) * 30;
          progressCallback?.(dataProgress, `Writing row ${index + 1}/${dialogueData.length}...`);
        }
      });
      
      progressCallback?.(65, 'Applying borders and formatting...');
      
      // 전체 테두리 설정
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= dialogueData.length + 1) {
          row.eachCell((cell, colNumber) => {
            if (colNumber <= headers.length) {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }
          });
        }
      });
      
      progressCallback?.(80, 'Setting up freeze panes and column widths...');
      
      // 틀 고정 (A2)
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];
      
      // 컬럼 너비 자동 조정
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      progressCallback?.(90, 'Saving Excel file...');
      
      // 파일 저장
      await workbook.xlsx.writeFile(outputPath);
      
      progressCallback?.(100, `Excel file created: ${filename}`);
      
      this.logger(`Output file created: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      throw new Error(`Failed to create output Excel: ${error}`);
    }
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.excelProcessor.dispose();
    this.logger('M4DialogueProcessor disposed');
  }

  /**
   * Process file - wrapper method for processM4Dialogue
   * @param inputPath Input folder path
   * @param outputPath Output file path
   * @param progressCallback Progress callback function
   */
  async processFile(
    inputPath: string, 
    outputPath: string, 
    progressCallback?: (progress: M4ProcessProgress) => void
  ): Promise<M4ProcessResult> {
    const result = await this.processM4Dialogue(
      inputPath,
      path.dirname(outputPath),
      progressCallback ? (percentage, message) => {
        const progress: M4ProcessProgress = {
          percentage,
          currentStep: ProcessStep.PROCESSING,
          currentFile: '',
          processedFiles: 0,
          totalFiles: 3, // CINEMATIC, SMALLTALK, NPC
          estimatedTimeRemaining: 0,
          startTime: Date.now(),
          currentTime: Date.now(),
          statusMessage: message
        };
        progressCallback(progress);
      } : undefined
    );

    // Convert result to M4ProcessResult format
    return {
      success: result.success,
      outputPath: result.outputPath,
      error: result.errors.join('; '),
      processedFileCount: result.filesProcessed,
      elapsedTime: result.processingTime / 1000,
      statistics: createEmptyM4ProcessStatistics(),
      logs: [],
      generatedFiles: result.success ? [result.outputPath] : [],
      rowsProcessed: result.rowsProcessed,
      filesProcessed: result.filesProcessed,
      memoryUsed: result.memoryUsed
    };
  }
}

export default M4DialogueProcessor;