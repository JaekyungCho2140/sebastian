import { ExcelProcessor } from '../utils/excelProcessor';
import { 
  M4ProcessConfig, 
  M4ProcessResult, 
  M4ProcessProgress, 
  M4ProcessStatistics,
  M4ProcessLog,
  ProcessStep,
  createEmptyM4ProcessStatistics
} from '../types/m4Processing';
import { WorkerMessage } from '../types/workerTypes';
import * as ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export interface M4StringFileConfig {
  filename: string;
  headerRow: number;
  skipRows: number;
  columnMapping: (number | null)[];
}

export interface M4StringProcessorConfig {
  folderPath: string;
  outputPath: string;
  progressCallback?: (progress: M4ProcessProgress) => void;
  logCallback?: (log: M4ProcessLog) => void;
}

export class M4StringProcessor {
  private config: M4StringProcessorConfig;
  private excelProcessor: ExcelProcessor;
  private statistics: M4ProcessStatistics;
  private logs: M4ProcessLog[] = [];

  // 8개 STRING 파일별 설정 (Python 명세 기반)
  private readonly FILE_CONFIGS: Record<string, M4StringFileConfig> = {
    'SEQUENCE_DIALOGUE.xlsm': {
      filename: 'SEQUENCE_DIALOGUE.xlsm',
      headerRow: 2,
      skipRows: 9,
      columnMapping: [7, null, 10, 11, 12, 13, 14, 15, 16, 17, null, null]
    },
    'STRING_BUILTIN.xlsm': {
      filename: 'STRING_BUILTIN.xlsm',
      headerRow: 2,
      skipRows: 4,
      columnMapping: [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
    },
    'STRING_MAIL.xlsm': {
      filename: 'STRING_MAIL.xlsm',
      headerRow: 2,
      skipRows: 4,
      columnMapping: [7, null, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
    },
    'STRING_MESSAGE.xlsm': {
      filename: 'STRING_MESSAGE.xlsm',
      headerRow: 2,
      skipRows: 4,
      columnMapping: [7, 21, 8, 9, 10, 11, 12, 13, 14, 15, null, null]
    },
    'STRING_NPC.xlsm': {
      filename: 'STRING_NPC.xlsm',
      headerRow: 2,
      skipRows: 4,
      columnMapping: [7, 20, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]
    },
    'STRING_QUESTTEMPLATE.xlsm': {
      filename: 'STRING_QUESTTEMPLATE.xlsm',
      headerRow: 2,
      skipRows: 7,
      columnMapping: [7, 0, 12, 13, 14, 15, 16, 17, 18, 19, null, null]
    },
    'STRING_TEMPLATE.xlsm': {
      filename: 'STRING_TEMPLATE.xlsm',
      headerRow: 2,
      skipRows: 4,
      columnMapping: [7, 19, 8, 9, 10, 11, 12, 13, 14, 15, null, 18]
    },
    'STRING_TOOLTIP.xlsm': {
      filename: 'STRING_TOOLTIP.xlsm',
      headerRow: 2,
      skipRows: 4,
      columnMapping: [7, 8, 11, 12, 13, 14, 15, 16, 17, 18, null, null]
    }
  };

  // 15개 출력 열 구조 (Python 명세 기반)
  private readonly OUTPUT_COLUMNS = [
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

  constructor(config: M4StringProcessorConfig) {
    this.config = config;
    this.excelProcessor = new ExcelProcessor();
    this.statistics = {
      totalRowsProcessed: 0,
      totalColumnsProcessed: 0,
      filteredRowsCount: 0,
      mappedDataCount: 0,
      validatedRowsCount: 0,
      errorRowsCount: 0,
      averageProcessingTime: 0,
      peakMemoryUsage: 0
    };
  }

  /**
   * 파일별 설정 가져오기
   */
  getFileConfig(filename: string): M4StringFileConfig | null {
    return this.FILE_CONFIGS[filename] || null;
  }

  /**
   * 모든 파일 설정 가져오기
   */
  getAllFileConfigs(): Record<string, M4StringFileConfig> {
    return { ...this.FILE_CONFIGS };
  }

  /**
   * 파일 존재 여부 확인
   */
  validateRequiredFiles(): { isValid: boolean; missingFiles: string[] } {
    const missingFiles: string[] = [];
    
    Object.keys(this.FILE_CONFIGS).forEach(filename => {
      const filePath = path.join(this.config.folderPath, filename);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(filename);
      }
    });

    return {
      isValid: missingFiles.length === 0,
      missingFiles
    };
  }

  /**
   * 파일 설정 검증
   */
  validateFileConfig(filename: string): boolean {
    const config = this.FILE_CONFIGS[filename];
    if (!config) return false;

    // 기본 설정 검증
    if (config.headerRow !== 2) return false;
    if (config.skipRows < 0) return false;
    if (!Array.isArray(config.columnMapping)) return false;
    if (config.columnMapping.length !== 12) return false;

    // 컬럼 매핑 검증 (null 또는 0 이상의 정수)
    for (const mapping of config.columnMapping) {
      if (mapping !== null && (typeof mapping !== 'number' || mapping < 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 모든 파일 설정 검증
   */
  validateAllFileConfigs(): { isValid: boolean; invalidFiles: string[] } {
    const invalidFiles: string[] = [];
    
    Object.keys(this.FILE_CONFIGS).forEach(filename => {
      if (!this.validateFileConfig(filename)) {
        invalidFiles.push(filename);
      }
    });

    return {
      isValid: invalidFiles.length === 0,
      invalidFiles
    };
  }

  /**
   * 테이블 이름 생성 (.xlsm 확장자 제거)
   */
  generateTableName(filename: string): string {
    return filename.replace(/\.xlsm$/, '');
  }

  /**
   * 현재 날짜 기반 출력 파일명 생성
   */
  generateOutputFilename(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${month}${day}_MIR4_MASTER_STRING.xlsx`;
  }

  /**
   * 로그 추가
   */
  private addLog(level: 'info' | 'warn' | 'error', message: string, details?: any): void {
    const log: M4ProcessLog = {
      timestamp: Date.now(),
      level,
      message,
      context: details
    };
    
    this.logs.push(log);
    
    if (this.config.logCallback) {
      this.config.logCallback(log);
    }
  }

  /**
   * 진행률 업데이트
   */
  private updateProgress(step: string, percentage: number, currentFile?: string): void {
    const now = Date.now();
    const progress: M4ProcessProgress = {
      percentage,
      currentStep: step as any, // 임시 타입 변환
      currentFile: currentFile || '',
      processedFiles: 0, // 임시값
      totalFiles: 8, // STRING 파일 8개
      estimatedTimeRemaining: 0,
      startTime: now,
      currentTime: now,
      statusMessage: `${step}: ${percentage}%`
    };

    if (this.config.progressCallback) {
      this.config.progressCallback(progress);
    }
  }

  /**
   * 메모리 사용량 업데이트
   */
  private updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.statistics.peakMemoryUsage = Math.max(
      this.statistics.peakMemoryUsage,
      Math.round(memUsage.heapUsed / 1024 / 1024)
    ); // MB
  }

  /**
   * 통계 정보 가져오기
   */
  getStatistics(): M4ProcessStatistics {
    return { ...this.statistics };
  }

  /**
   * 로그 정보 가져오기
   */
  getLogs(): M4ProcessLog[] {
    return [...this.logs];
  }

  /**
   * 컬럼 매핑을 사용하여 행 데이터 추출
   */
  extractRowData(row: any[], columnMapping: (number | null)[]): string[] {
    return columnMapping.map(colIndex => {
      if (colIndex === null) {
        return '';
      }
      
      const value = row[colIndex];
      
      // null, undefined, NaN 처리
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '';
      }
      
      // 문자열 변환
      return String(value).trim();
    });
  }

  /**
   * 특정 파일의 데이터 추출
   */
  async extractFileData(filename: string): Promise<string[][]> {
    const config = this.getFileConfig(filename);
    if (!config) {
      throw new Error(`Unknown file: ${filename}`);
    }

    const filePath = path.join(this.config.folderPath, filename);
    
    try {
      this.addLog('info', `Processing file: ${filename}`);
      
      // Excel 파일 읽기
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        throw new Error(`No worksheet found in ${filename}`);
      }

      const extractedData: string[][] = [];
      let processedRows = 0;
      
      // 헤더 행 이후부터 처리 (headerRow=2이므로 3행부터)
      const startRow = config.headerRow + config.skipRows + 1;
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < startRow) {
          return;
        }

        // 행 데이터를 배열로 변환
        const rowData: any[] = [];
        row.eachCell((cell, colNumber) => {
          rowData[colNumber - 1] = cell.value;
        });

        // 빈 행 건너뛰기
        if (rowData.every(cell => cell === null || cell === undefined || cell === '')) {
          return;
        }

        // 컬럼 매핑 적용
        const extractedRow = this.extractRowData(rowData, config.columnMapping);
        extractedData.push(extractedRow);
        processedRows++;

        // 진행률 업데이트 (매 100행마다)
        if (processedRows % 100 === 0) {
          this.updateMemoryUsage();
        }
      });

      this.addLog('info', `Extracted ${extractedData.length} rows from ${filename}`);
      this.statistics.totalRowsProcessed += extractedData.length;
      
      return extractedData;
      
    } catch (error) {
      this.addLog('error', `Failed to extract data from ${filename}`, error);
      throw error;
    }
  }

  /**
   * 모든 파일의 데이터 추출 및 병합
   */
  async extractAllFileData(): Promise<{ tableName: string; data: string[][] }[]> {
    const allData: { tableName: string; data: string[][] }[] = [];
    
    const totalFiles = Object.keys(this.FILE_CONFIGS).length;
    this.updateProgress('Extracting file data', 0);
    
    let fileIndex = 0;
    
    for (const filename of Object.keys(this.FILE_CONFIGS)) {
      try {
        const tableName = this.generateTableName(filename);
        const data = await this.extractFileData(filename);
        
        allData.push({ tableName, data });
        
        fileIndex++;
        
        const progress = (fileIndex / totalFiles) * 100;
        this.updateProgress('Extracting file data', progress, filename);
        
      } catch (error) {
        this.addLog('error', `Failed to process ${filename}`, error);
        this.statistics.errorRowsCount++;
        // 계속 진행 (일부 파일 실패해도 다른 파일 처리)
      }
    }
    
    return allData;
  }

  /**
   * 컬럼 매핑 검증 (테스트용)
   */
  validateColumnMapping(filename: string, sampleRow: any[]): boolean {
    const config = this.getFileConfig(filename);
    if (!config) return false;

    try {
      const extracted = this.extractRowData(sampleRow, config.columnMapping);
      return extracted.length === config.columnMapping.length;
    } catch (error) {
      return false;
    }
  }

  /**
   * 파일별 컬럼 매핑 정보 가져오기 (디버깅용)
   */
  getColumnMappingInfo(filename: string): { 
    filename: string; 
    headerRow: number; 
    skipRows: number; 
    mappingLength: number; 
    nullCount: number; 
    mapping: (number | null)[] 
  } | null {
    const config = this.getFileConfig(filename);
    if (!config) return null;

    return {
      filename: config.filename,
      headerRow: config.headerRow,
      skipRows: config.skipRows,
      mappingLength: config.columnMapping.length,
      nullCount: config.columnMapping.filter(m => m === null).length,
      mapping: [...config.columnMapping]
    };
  }

  /**
   * Table/ID 포맷팅 생성 (Table Name/String ID)
   */
  formatTableId(tableName: string, stringId: string): string {
    return `${tableName}/${stringId}`;
  }

  /**
   * EN 컬럼 (index 6) 기준 데이터 필터링
   * NaN, 0, '미사용' 제거
   */
  filterValidData(data: string[][]): string[][] {
    return data.filter(row => {
      const enValue = row[6]; // EN 컬럼 (0-indexed)
      
      // 빈 값 체크
      if (!enValue || enValue.trim() === '') {
        return false;
      }
      
      // '미사용' 체크
      if (enValue.trim() === '미사용') {
        return false;
      }
      
      // 숫자 0 체크
      if (enValue.trim() === '0') {
        return false;
      }
      
      // NaN 체크 (숫자로 변환했을 때 NaN이면 유효한 문자열로 판단)
      const numValue = Number(enValue);
      if (!isNaN(numValue) && numValue === 0) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 추출된 데이터를 출력 형식으로 변환
   */
  transformToOutputFormat(allData: { tableName: string; data: string[][] }[]): string[][] {
    const outputData: string[][] = [];
    let sequenceNumber = 1;

    this.updateProgress('Transforming data', 0);

    for (let i = 0; i < allData.length; i++) {
      const { tableName, data } = allData[i];
      
      // 유효한 데이터만 필터링
      const validData = this.filterValidData(data);
      
      this.addLog('info', `Processing ${tableName}: ${validData.length} valid rows out of ${data.length} total rows`);

      // 각 행을 출력 형식으로 변환
      for (const row of validData) {
        const outputRow: string[] = new Array(this.OUTPUT_COLUMNS.length).fill('');
        
        // 15개 컬럼 구조로 변환
        outputRow[0] = String(sequenceNumber++);           // # (순서)
        outputRow[1] = tableName;                          // Table Name
        outputRow[2] = row[0] || '';                       // String ID
        outputRow[3] = this.formatTableId(tableName, row[0] || ''); // Table/ID
        outputRow[4] = row[1] || '';                       // NOTE
        outputRow[5] = row[2] || '';                       // KO
        outputRow[6] = row[3] || '';                       // EN
        outputRow[7] = row[4] || '';                       // CT
        outputRow[8] = row[5] || '';                       // CS
        outputRow[9] = row[6] || '';                       // JA
        outputRow[10] = row[7] || '';                      // TH
        outputRow[11] = row[8] || '';                      // ES-LATAM
        outputRow[12] = row[9] || '';                      // PT-BR
        outputRow[13] = row[10] || '';                     // NPC 이름
        outputRow[14] = row[11] || '';                     // 비고

        outputData.push(outputRow);
      }

      // 진행률 업데이트
      const progress = ((i + 1) / allData.length) * 100;
      this.updateProgress('Transforming data', progress, tableName);
    }

    this.addLog('info', `Generated ${outputData.length} output rows with sequential numbering`);
    return outputData;
  }

  /**
   * 비즈니스 로직 검증 (테스트용)
   */
  validateBusinessLogic(sampleData: string[][]): {
    isValid: boolean;
    issues: string[];
    stats: {
      totalRows: number;
      validRows: number;
      filteredRows: number;
      sequenceCheck: boolean;
    };
  } {
    const issues: string[] = [];
    const stats = {
      totalRows: sampleData.length,
      validRows: 0,
      filteredRows: 0,
      sequenceCheck: false
    };

    // 빈 데이터 체크
    if (sampleData.length === 0) {
      issues.push('No data to validate');
      return { isValid: false, issues, stats };
    }

    // 컬럼 수 체크
    const expectedColumns = this.OUTPUT_COLUMNS.length;
    const invalidRows = sampleData.filter(row => row.length !== expectedColumns);
    if (invalidRows.length > 0) {
      issues.push(`${invalidRows.length} rows have incorrect column count (expected ${expectedColumns})`);
    }

    // 순차 번호 체크
    let sequenceValid = true;
    for (let i = 0; i < sampleData.length; i++) {
      const expectedSeq = String(i + 1);
      const actualSeq = sampleData[i][0];
      if (actualSeq !== expectedSeq) {
        sequenceValid = false;
        issues.push(`Row ${i + 1} has incorrect sequence number: expected ${expectedSeq}, got ${actualSeq}`);
        break;
      }
    }
    stats.sequenceCheck = sequenceValid;

    // Table/ID 포맷 체크
    for (let i = 0; i < Math.min(sampleData.length, 10); i++) {
      const row = sampleData[i];
      const tableName = row[1];
      const stringId = row[2];
      const tableId = row[3];
      const expectedTableId = this.formatTableId(tableName, stringId);
      
      if (tableId !== expectedTableId) {
        issues.push(`Row ${i + 1} has incorrect Table/ID format: expected ${expectedTableId}, got ${tableId}`);
      }
    }

    // 유효한 데이터 통계
    stats.validRows = sampleData.filter(row => row[6] && row[6].trim() !== '' && row[6].trim() !== '미사용' && row[6].trim() !== '0').length;
    stats.filteredRows = stats.totalRows - stats.validRows;

    return {
      isValid: issues.length === 0,
      issues,
      stats
    };
  }

  /**
   * 데이터 필터링 통계 (디버깅용)
   */
  getFilteringStats(data: string[][]): {
    total: number;
    valid: number;
    filtered: number;
    filterReasons: Record<string, number>;
  } {
    const filterReasons: Record<string, number> = {
      empty: 0,
      unused: 0,
      zero: 0,
      other: 0
    };

    let valid = 0;
    
    for (const row of data) {
      const enValue = row[6]; // EN 컬럼
      
      if (!enValue || enValue.trim() === '') {
        filterReasons.empty++;
      } else if (enValue.trim() === '미사용') {
        filterReasons.unused++;
      } else if (enValue.trim() === '0') {
        filterReasons.zero++;
      } else {
        const numValue = Number(enValue);
        if (!isNaN(numValue) && numValue === 0) {
          filterReasons.zero++;
        } else {
          valid++;
        }
      }
    }

    return {
      total: data.length,
      valid,
      filtered: data.length - valid,
      filterReasons
    };
  }

  /**
   * Excel 포맷팅 적용 (Python 명세 기반)
   */
  private async applyExcelFormatting(worksheet: any, dataRowCount: number): Promise<void> {
    this.addLog('info', 'Applying Excel formatting...');
    
    try {
      // 헤더 행 포맷팅
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: any, colNumber: number) => {
        // 헤더 폰트: 맑은 고딕 12pt bold #9C5700
        cell.font = {
          name: '맑은 고딕',
          size: 12,
          bold: true,
          color: { argb: 'FF9C5700' }
        };
        
        // 헤더 배경색: #FFEB9C
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' }
        };
        
        // 헤더 테두리
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        
        // 헤더 정렬
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
      });
      
      // 데이터 행 포맷팅
      for (let rowIndex = 2; rowIndex <= dataRowCount + 1; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        row.eachCell((cell: any, colNumber: number) => {
          // 데이터 폰트: 맑은 고딕 10pt
          cell.font = {
            name: '맑은 고딕',
            size: 10
          };
          
          // 데이터 테두리
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          
          // 데이터 정렬
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle'
          };
        });
      }
      
      // 컬럼 너비 자동 조정
      worksheet.columns.forEach((column: any, index: number) => {
        const headerLength = this.OUTPUT_COLUMNS[index]?.length || 10;
        column.width = Math.max(headerLength + 2, 12); // 최소 너비 12
      });
      
      // 틀 고정 (A2에서 고정)
      worksheet.views = [
        {
          state: 'frozen',
          xSplit: 0,
          ySplit: 1,
          topLeftCell: 'A2',
          activeCell: 'A2'
        }
      ];
      
      // 워크시트 보호 설정 (읽기 전용)
      worksheet.protection = {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false
      };
      
      this.addLog('info', `Applied formatting to ${dataRowCount + 1} rows`);
      
    } catch (error) {
      this.addLog('error', 'Failed to apply Excel formatting', error);
      throw error;
    }
  }

  /**
   * 출력 Excel 파일 생성
   */
  async generateOutputFile(outputData: string[][]): Promise<string> {
    const outputFilename = this.generateOutputFilename();
    const outputFilePath = path.join(this.config.outputPath, outputFilename);
    
    this.updateProgress('Generating output file', 0);
    
    try {
      // 새 워크북 생성
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('MIR4_MASTER_STRING');
      
      // 헤더 행 추가
      const headerRow = worksheet.addRow(this.OUTPUT_COLUMNS);
      this.addLog('info', `Added header row with ${this.OUTPUT_COLUMNS.length} columns`);
      
      // 데이터 행 추가
      let rowIndex = 2; // 헤더 다음부터
      for (let i = 0; i < outputData.length; i++) {
        const row = outputData[i];
        worksheet.addRow(row);
        
        // 진행률 업데이트 (매 1000행마다)
        if (i % 1000 === 0) {
          const progress = (i / outputData.length) * 60; // 60%까지 데이터 추가
          this.updateProgress('Generating output file', progress);
          this.updateMemoryUsage();
        }
        
        rowIndex++;
      }
      
      this.addLog('info', `Added ${outputData.length} data rows`);
      
      // Excel 포맷팅 적용
      this.updateProgress('Generating output file', 60);
      await this.applyExcelFormatting(worksheet, outputData.length);
      
      this.updateProgress('Generating output file', 90);
      
      // 파일 저장
      await workbook.xlsx.writeFile(outputFilePath);
      
      this.updateProgress('Generating output file', 100);
      this.addLog('info', `Output file saved: ${outputFilePath}`);
      
      return outputFilePath;
      
    } catch (error) {
      this.addLog('error', `Failed to generate output file: ${outputFilename}`, error);
      throw error;
    }
  }

  /**
   * 출력 파일 구조 검증
   */
  async validateOutputStructure(filePath: string): Promise<{
    isValid: boolean;
    issues: string[];
    stats: {
      totalRows: number;
      totalColumns: number;
      headerMatch: boolean;
      dataRowsCount: number;
    };
  }> {
    const issues: string[] = [];
    const stats = {
      totalRows: 0,
      totalColumns: 0,
      headerMatch: false,
      dataRowsCount: 0
    };

    try {
      // 파일 읽기
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        issues.push('No worksheet found in output file');
        return { isValid: false, issues, stats };
      }

      // 총 행과 열 수 계산
      stats.totalRows = worksheet.rowCount;
      stats.totalColumns = worksheet.columnCount;
      
      // 헤더 검증
      if (stats.totalRows > 0) {
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        
        headerRow.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || '');
        });
        
        // 헤더 일치 검증
        if (headers.length === this.OUTPUT_COLUMNS.length) {
          let headerMatch = true;
          for (let i = 0; i < this.OUTPUT_COLUMNS.length; i++) {
            if (headers[i] !== this.OUTPUT_COLUMNS[i]) {
              headerMatch = false;
              issues.push(`Header mismatch at column ${i + 1}: expected '${this.OUTPUT_COLUMNS[i]}', got '${headers[i]}'`);
            }
          }
          stats.headerMatch = headerMatch;
        } else {
          issues.push(`Header column count mismatch: expected ${this.OUTPUT_COLUMNS.length}, got ${headers.length}`);
        }
        
        stats.dataRowsCount = stats.totalRows - 1; // 헤더 제외
      }
      
      // 데이터 행 검증 (처음 몇 행만 샘플링)
      const sampleRows = Math.min(stats.dataRowsCount, 10);
      for (let i = 2; i <= sampleRows + 1; i++) {
        const row = worksheet.getRow(i);
        const cellCount = row.cellCount;
        
        if (cellCount !== this.OUTPUT_COLUMNS.length) {
          issues.push(`Row ${i} has ${cellCount} cells, expected ${this.OUTPUT_COLUMNS.length}`);
        }
        
        // 순차 번호 검증
        const sequenceCell = row.getCell(1);
        const expectedSequence = String(i - 1);
        if (String(sequenceCell.value || '') !== expectedSequence) {
          issues.push(`Row ${i} has incorrect sequence number: expected ${expectedSequence}, got ${sequenceCell.value}`);
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        stats
      };
      
    } catch (error) {
      issues.push(`Failed to validate output file: ${error}`);
      return { isValid: false, issues, stats };
    }
  }

  /**
   * 출력 컬럼 정보 가져오기
   */
  getOutputColumnInfo(): {
    columns: string[];
    columnCount: number;
    columnMapping: Record<string, number>;
  } {
    const columnMapping: Record<string, number> = {};
    
    this.OUTPUT_COLUMNS.forEach((column, index) => {
      columnMapping[column] = index;
    });
    
    return {
      columns: [...this.OUTPUT_COLUMNS],
      columnCount: this.OUTPUT_COLUMNS.length,
      columnMapping
    };
  }

  /**
   * 출력 데이터 미리보기 생성
   */
  generateDataPreview(outputData: string[][], maxRows: number = 10): {
    headers: string[];
    rows: string[][];
    totalRows: number;
    previewRows: number;
  } {
    const previewRows = Math.min(outputData.length, maxRows);
    const rows = outputData.slice(0, previewRows);
    
    return {
      headers: [...this.OUTPUT_COLUMNS],
      rows,
      totalRows: outputData.length,
      previewRows
    };
  }

  /**
   * 메인 처리 함수 (전체 파이프라인)
   */
  async processM4String(): Promise<M4ProcessResult> {
    const startTime = Date.now();
    
    try {
      this.addLog('info', 'Starting M4 String processing');
      this.updateProgress('Initializing', 0, 'Starting M4 String processing...');
      
      // 1. 파일 검증 (5% 할당)
      this.updateProgress('Reading files', 5, 'Validating required files...');
      const validation = this.validateRequiredFiles();
      if (!validation.isValid) {
        throw new Error(`Missing required files: ${validation.missingFiles.join(', ')}`);
      }
      this.updateProgress('Reading files', 10, 'File validation completed');
      
      // 2. 데이터 추출 (50% 할당)
      this.updateProgress('Processing data', 15, 'Extracting data from 8 STRING files...');
      const allData = await this.extractAllFileData();
      this.updateProgress('Processing data', 65, 'Data extraction completed');
      
      // 3. 데이터 변환 (20% 할당)
      this.updateProgress('Processing data', 70, 'Transforming data to output format...');
      const outputData = this.transformToOutputFormat(allData);
      this.updateProgress('Processing data', 85, `Transformed ${outputData.length} data rows`);
      
      // 4. 출력 파일 생성 (15% 할당)
      this.updateProgress('Writing output', 90, 'Creating output Excel file...');
      const outputFilePath = await this.generateOutputFile(outputData);
      
      // 5. 처리 시간 계산
      const processingTime = Date.now() - startTime;
      this.statistics.averageProcessingTime = processingTime;
      
      this.updateProgress('Completed', 100, 'M4 String processing completed');
      this.addLog('info', `Processing completed successfully in ${processingTime}ms`);
      
      return {
        success: true,
        outputPath: outputFilePath,
        processedFileCount: Object.keys(this.FILE_CONFIGS).length,
        elapsedTime: processingTime / 1000, // 초 단위
        statistics: this.getStatistics(),
        logs: this.getLogs(),
        generatedFiles: [outputFilePath]
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.statistics.averageProcessingTime = processingTime;
      this.addLog('error', 'Processing failed', error);
      
      return {
        success: false,
        outputPath: '',
        error: error instanceof Error ? error.message : String(error),
        processedFileCount: 0,
        elapsedTime: processingTime / 1000,
        statistics: this.getStatistics(),
        logs: this.getLogs(),
        generatedFiles: []
      };
    }
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.excelProcessor.dispose();
    this.logs = [];
    this.statistics = createEmptyM4ProcessStatistics();
  }

  /**
   * Process folder - wrapper method for processM4String
   * @param inputFolder Input folder path
   * @param outputPath Output file path
   * @param progressCallback Progress callback function
   */
  async processFolder(
    inputFolder: string, 
    outputPath: string, 
    progressCallback?: (progress: M4ProcessProgress) => void
  ): Promise<M4ProcessResult> {
    // Update config with new paths
    this.config.folderPath = inputFolder;
    this.config.outputPath = outputPath;
    if (progressCallback) {
      this.config.progressCallback = progressCallback;
    }
    
    return this.processM4String();
  }
}