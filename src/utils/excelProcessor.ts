import * as ExcelJS from 'exceljs';
import { join } from 'path';
import { existsSync } from 'fs';

// M4 Excel 처리를 위한 타입 정의
export interface M4ExcelFile {
  filename: string;
  headerRow: number;
  skipRows: number;
  columns: M4Column[];
}

export interface M4Column {
  sourceIndex: number;
  targetIndex: number;
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

export interface M4ProcessingOptions {
  inputFolder: string;
  outputFolder: string;
  files: M4ExcelFile[];
  progressCallback?: (progress: number, message: string) => void;
}

export interface M4ProcessingResult {
  success: boolean;
  processedFiles: string[];
  errors: string[];
  processingTime: number;
}

export interface ExcelCellData {
  value: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'formula';
  address: string;
}

export interface ExcelWorksheetData {
  name: string;
  rowCount: number;
  columnCount: number;
  cells: ExcelCellData[];
}

export interface ExcelWorkbookData {
  filename: string;
  worksheets: ExcelWorksheetData[];
}

/**
 * ExcelJS Wrapper 클래스
 * Electron 메인/렌더러 프로세스에서 모두 사용 가능한 Excel 처리 유틸리티
 */
export class ExcelProcessor {
  private workbook: ExcelJS.Workbook;
  private logger: (message: string, level?: 'info' | 'warn' | 'error') => void;

  constructor(logger?: (message: string, level?: 'info' | 'warn' | 'error') => void) {
    this.workbook = new ExcelJS.Workbook();
    this.logger = logger || ((message: string, level = 'info') => {
      console.log(`[ExcelProcessor:${level}] ${message}`);
    });
  }

  /**
   * Excel 파일 읽기
   * @param filePath 파일 경로
   * @returns Promise<ExcelWorkbookData>
   */
  async readWorkbook(filePath: string): Promise<ExcelWorkbookData> {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      this.logger(`Reading Excel file: ${filePath}`);
      await this.workbook.xlsx.readFile(filePath);

      const workbookData: ExcelWorkbookData = {
        filename: filePath,
        worksheets: []
      };

      this.workbook.eachSheet((worksheet, sheetId) => {
        const worksheetData: ExcelWorksheetData = {
          name: worksheet.name,
          rowCount: worksheet.rowCount,
          columnCount: worksheet.columnCount,
          cells: []
        };

        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell, colNumber) => {
            const cellData: ExcelCellData = {
              value: cell.value,
              type: this.getCellType(cell.value),
              address: cell.address
            };
            worksheetData.cells.push(cellData);
          });
        });

        workbookData.worksheets.push(worksheetData);
      });

      this.logger(`Successfully read ${workbookData.worksheets.length} worksheets`);
      return workbookData;
    } catch (error) {
      this.logger(`Error reading Excel file: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Excel 파일 쓰기
   * @param filePath 출력 파일 경로
   * @param workbookData 워크북 데이터
   */
  async writeWorkbook(filePath: string, workbookData: ExcelWorkbookData): Promise<void> {
    try {
      this.logger(`Writing Excel file: ${filePath}`);
      
      // 새 워크북 생성
      const newWorkbook = new ExcelJS.Workbook();
      
      for (const worksheetData of workbookData.worksheets) {
        const worksheet = newWorkbook.addWorksheet(worksheetData.name);
        
        // 셀 데이터 설정
        for (const cellData of worksheetData.cells) {
          const cell = worksheet.getCell(cellData.address);
          cell.value = cellData.value;
        }
      }

      await newWorkbook.xlsx.writeFile(filePath);
      this.logger(`Successfully wrote Excel file: ${filePath}`);
    } catch (error) {
      this.logger(`Error writing Excel file: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * 워크시트 데이터 추출
   * @param worksheetName 워크시트 이름
   * @param options 추출 옵션
   */
  async extractWorksheetData(
    worksheetName: string,
    options: {
      headerRow?: number;
      skipRows?: number;
      maxRows?: number;
      columnMapping?: Record<number, string>;
    } = {}
  ): Promise<Record<string, any>[]> {
    try {
      const worksheet = this.workbook.getWorksheet(worksheetName);
      if (!worksheet) {
        throw new Error(`Worksheet not found: ${worksheetName}`);
      }

      const {
        headerRow = 1,
        skipRows = 0,
        maxRows = worksheet.rowCount,
        columnMapping = {}
      } = options;

      const data: Record<string, any>[] = [];
      let headers: string[] = [];

      // 헤더 행 읽기
      if (headerRow > 0) {
        const headerRowData = worksheet.getRow(headerRow);
        headerRowData.eachCell((cell, colNumber) => {
          headers[colNumber] = columnMapping[colNumber] || cell.value?.toString() || `Column${colNumber}`;
        });
      }

      // 데이터 행 읽기
      const startRow = Math.max(headerRow + 1, skipRows + 1);
      const endRow = Math.min(startRow + maxRows - 1, worksheet.rowCount);

      for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: Record<string, any> = {};

        row.eachCell((cell, colNumber) => {
          const columnName = headers[colNumber] || `Column${colNumber}`;
          rowData[columnName] = this.getCellValue(cell);
        });

        // 빈 행 스킵
        if (Object.values(rowData).some(value => value !== null && value !== undefined && value !== '')) {
          data.push(rowData);
        }
      }

      this.logger(`Extracted ${data.length} rows from worksheet: ${worksheetName}`);
      return data;
    } catch (error) {
      this.logger(`Error extracting worksheet data: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * M4 Dialogue 파일 처리
   * @param filePath 입력 파일 경로
   * @param npcMappingData NPC 매핑 데이터
   */
  async processM4Dialogue(
    filePath: string,
    npcMappingData: Record<string, string>
  ): Promise<Record<string, any>[]> {
    try {
      this.logger(`Processing M4 Dialogue file: ${filePath}`);
      
      await this.workbook.xlsx.readFile(filePath);
      const worksheet = this.workbook.getWorksheet(1); // 첫 번째 워크시트
      
      if (!worksheet) {
        throw new Error('No worksheet found in file');
      }

      const dialogueData: Record<string, any>[] = [];
      
      // 데이터 행 처리 (2행부터 시작)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        // EN (M) 컬럼 필터링 (23번째 컬럼)
        const enMValue = row.getCell(23).value;
        if (!enMValue || enMValue.toString().trim() === '') {
          continue;
        }

        const rowData: Record<string, any> = {};
        
        // 23개 컬럼 매핑
        for (let colIndex = 1; colIndex <= 23; colIndex++) {
          const cellValue = row.getCell(colIndex).value;
          
          // NPC 매핑 처리 (7번째 컬럼 → 9번째 컬럼 매핑)
          if (colIndex === 7 && cellValue) {
            const mappedValue = npcMappingData[cellValue.toString()] || cellValue;
            rowData[`Column${colIndex}`] = mappedValue;
          } else {
            rowData[`Column${colIndex}`] = this.getCellValue(row.getCell(colIndex));
          }
        }

        dialogueData.push(rowData);
      }

      this.logger(`Processed ${dialogueData.length} dialogue entries`);
      return dialogueData;
    } catch (error) {
      this.logger(`Error processing M4 Dialogue: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * M4 String 파일 처리
   * @param filePath 입력 파일 경로
   * @param fileConfig 파일 설정
   */
  async processM4String(
    filePath: string,
    fileConfig: {
      headerRow: number;
      skipRows: number;
      columnMapping: Record<number, number>;
    }
  ): Promise<Record<string, any>[]> {
    try {
      this.logger(`Processing M4 String file: ${filePath}`);
      
      await this.workbook.xlsx.readFile(filePath);
      const worksheet = this.workbook.getWorksheet(1);
      
      if (!worksheet) {
        throw new Error('No worksheet found in file');
      }

      const stringData: Record<string, any>[] = [];
      
      // 데이터 행 처리
      const startRow = Math.max(fileConfig.headerRow + 1, fileConfig.skipRows + 1);
      
      for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        const rowData: Record<string, any> = {};
        
        // 15개 출력 컬럼 생성
        for (let targetCol = 1; targetCol <= 15; targetCol++) {
          const sourceCol = fileConfig.columnMapping[targetCol];
          if (sourceCol) {
            rowData[`Column${targetCol}`] = this.getCellValue(row.getCell(sourceCol));
          } else {
            rowData[`Column${targetCol}`] = null;
          }
        }

        // Table/ID 생성 로직
        const filename = filePath.split('/').pop()?.split('.')[0] || 'unknown';
        rowData.Table = filename;
        rowData.ID = `${filename}_${rowNumber - startRow + 1}`;

        stringData.push(rowData);
      }

      this.logger(`Processed ${stringData.length} string entries`);
      return stringData;
    } catch (error) {
      this.logger(`Error processing M4 String: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * 셀 값 추출
   * @param cell ExcelJS Cell 객체
   */
  private getCellValue(cell: ExcelJS.Cell): any {
    if (cell.value === null || cell.value === undefined) {
      return null;
    }

    // 수식 결과 반환
    if (cell.type === ExcelJS.ValueType.Formula) {
      return cell.result || cell.value;
    }

    // 날짜 처리
    if (cell.value instanceof Date) {
      return cell.value.toISOString();
    }

    // 리치 텍스트 처리
    if (typeof cell.value === 'object' && 'richText' in cell.value) {
      return cell.value.richText.map((rt: any) => rt.text).join('');
    }

    return cell.value;
  }

  /**
   * 셀 타입 확인
   * @param value 셀 값
   */
  private getCellType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'formula' {
    if (value === null || value === undefined) {
      return 'string';
    }

    if (typeof value === 'number') {
      return 'number';
    }

    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (value instanceof Date) {
      return 'date';
    }

    if (typeof value === 'object' && 'formula' in value) {
      return 'formula';
    }

    return 'string';
  }

  /**
   * 메모리 정리
   */
  dispose(): void {
    this.workbook = new ExcelJS.Workbook();
    this.logger('ExcelProcessor disposed');
  }
}

/**
 * ExcelJS 기본 기능 테스트
 */
export async function testExcelProcessing(): Promise<boolean> {
  try {
    const processor = new ExcelProcessor();
    
    // 기본 워크북 생성 테스트
    const testWorkbook = new ExcelJS.Workbook();
    const testWorksheet = testWorkbook.addWorksheet('Test Sheet');
    
    testWorksheet.getCell('A1').value = 'Test Value';
    testWorksheet.getCell('B1').value = 42;
    testWorksheet.getCell('C1').value = new Date();
    
    console.log('ExcelJS basic functionality test passed');
    processor.dispose();
    return true;
  } catch (error) {
    console.error('ExcelJS test failed:', error);
    return false;
  }
}

// 기본 내보내기
export default ExcelProcessor;