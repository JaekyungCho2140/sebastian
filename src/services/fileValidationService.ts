/**
 * M4 Excel Processing File Validation Service
 * 
 * This service handles comprehensive file validation for M4 processing
 * including presence, format, and permission checks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ExcelProcessor } from '../utils/excelProcessor';
import { ProcessType, getRequiredFiles } from '../types/m4Processing';
import {
  ValidationError,
  FileMissingError,
  FileFormatError,
  PermissionError,
  ValidationResult,
  createFileMissingError,
  createFileFormatError,
  createPermissionError,
  createEmptyValidationResult,
  detectPlatform,
  extractFileExtension,
  formatFileSize
} from '../types/m4ValidationErrors';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const SUPPORTED_EXTENSIONS = ['.xlsm', '.xlsx'];
const VALIDATION_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// File Validation Service
// ============================================================================

export class FileValidationService {
  private excelProcessor: ExcelProcessor;
  private platform: 'windows' | 'unix' | 'unknown';

  constructor() {
    this.excelProcessor = new ExcelProcessor();
    this.platform = detectPlatform();
  }

  // ============================================================================
  // Main Validation Methods
  // ============================================================================

  /**
   * 전체 파일 검증 수행
   */
  async validateFiles(
    folderPath: string,
    processType: ProcessType,
    options: {
      checkPermissions?: boolean;
      checkFormat?: boolean;
      checkStructure?: boolean;
      maxFileSize?: number;
      timeout?: number;
    } = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const result = createEmptyValidationResult();
    
    try {
      // 기본 옵션 설정
      const {
        checkPermissions = true,
        checkFormat = true,
        checkStructure = false,
        maxFileSize = MAX_FILE_SIZE,
        timeout = VALIDATION_TIMEOUT
      } = options;

      // 필수 파일 목록 가져오기
      const requiredFiles = getRequiredFiles(processType);
      result.summary.totalFiles = requiredFiles.length;

      // 1. 파일 존재 여부 검증
      const presenceResult = await this.validateFilePresence(
        folderPath,
        requiredFiles,
        processType
      );
      
      if (!presenceResult.success) {
        result.errors.push(...presenceResult.errors);
        result.summary.invalidFiles += presenceResult.errors.length;
      } else {
        result.validatedFiles.push(...presenceResult.validatedFiles);
      }

      // 2. 파일 형식 검증 (존재하는 파일만)
      if (checkFormat && presenceResult.validatedFiles.length > 0) {
        const formatResult = await this.validateFileFormats(
          folderPath,
          presenceResult.validatedFiles,
          { maxFileSize, checkStructure }
        );
        
        result.errors.push(...formatResult.errors);
        result.warnings.push(...formatResult.warnings);
        
        if (formatResult.errors.length > 0) {
          result.summary.invalidFiles += formatResult.errors.length;
        }
      }

      // 3. 파일 권한 검증 (존재하는 파일만)
      if (checkPermissions && presenceResult.validatedFiles.length > 0) {
        const permissionResult = await this.validateFilePermissions(
          folderPath,
          presenceResult.validatedFiles
        );
        
        result.errors.push(...permissionResult.errors);
        result.warnings.push(...permissionResult.warnings);
        
        if (permissionResult.errors.length > 0) {
          result.summary.invalidFiles += permissionResult.errors.length;
        }
      }

      // 결과 정리
      result.success = result.errors.length === 0;
      result.summary.validFiles = result.validatedFiles.length - result.summary.invalidFiles;
      result.summary.errorCount = result.errors.length;
      result.summary.warningCount = result.warnings.length;
      result.validationTime = Date.now() - startTime;

      return result;

    } catch (error) {
      // 예상치 못한 오류 처리
      const validationError = new ValidationError(
        'VALIDATION_FAILED',
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        '파일 검증 중 예상치 못한 오류가 발생했습니다.',
        [
          '폴더 경로가 올바른지 확인하세요.',
          '폴더에 대한 접근 권한이 있는지 확인하세요.',
          '다른 폴더를 선택하여 다시 시도하세요.',
          '문제가 계속되면 기술 지원팀에 문의하세요.'
        ],
        'high',
        { folderPath, processType, error: error instanceof Error ? error.message : 'Unknown error' }
      );

      result.errors.push(validationError);
      result.success = false;
      result.summary.errorCount = 1;
      result.validationTime = Date.now() - startTime;

      return result;
    }
  }

  // ============================================================================
  // File Presence Validation
  // ============================================================================

  /**
   * 파일 존재 여부 검증
   */
  async validateFilePresence(
    folderPath: string,
    requiredFiles: string[],
    processType: ProcessType
  ): Promise<{
    success: boolean;
    validatedFiles: string[];
    errors: ValidationError[];
  }> {
    const validatedFiles: string[] = [];
    const errors: ValidationError[] = [];

    try {
      // 폴더 존재 여부 확인
      const folderExists = await this.checkPathExists(folderPath);
      if (!folderExists) {
        errors.push(new ValidationError(
          'FOLDER_NOT_FOUND',
          `Folder not found: ${folderPath}`,
          `선택한 폴더가 존재하지 않습니다.\n\n경로: ${folderPath}`,
          [
            '폴더 경로가 올바른지 확인하세요.',
            '폴더가 삭제되거나 이동되었는지 확인하세요.',
            '다른 폴더를 선택하여 다시 시도하세요.'
          ],
          'high',
          { folderPath }
        ));
        return { success: false, validatedFiles, errors };
      }

      // 각 필수 파일 존재 여부 확인
      const missingFiles: string[] = [];
      
      for (const fileName of requiredFiles) {
        const filePath = path.join(folderPath, fileName);
        const fileExists = await this.checkPathExists(filePath);
        
        if (fileExists) {
          validatedFiles.push(fileName);
        } else {
          missingFiles.push(fileName);
        }
      }

      // 누락된 파일이 있으면 오류 생성
      if (missingFiles.length > 0) {
        const processTypeStr = processType === ProcessType.DIALOGUE ? 'dialogue' : 'string';
        errors.push(createFileMissingError(
          missingFiles,
          folderPath,
          processTypeStr,
          { requiredFiles, foundFiles: validatedFiles }
        ));
      }

      return {
        success: errors.length === 0,
        validatedFiles,
        errors
      };

    } catch (error) {
      errors.push(new ValidationError(
        'PRESENCE_CHECK_FAILED',
        `File presence check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        '파일 존재 여부 확인 중 오류가 발생했습니다.',
        [
          '폴더에 대한 접근 권한이 있는지 확인하세요.',
          '폴더 경로가 올바른지 확인하세요.',
          '다른 폴더를 선택하여 다시 시도하세요.'
        ],
        'high',
        { folderPath, requiredFiles, error: error instanceof Error ? error.message : 'Unknown error' }
      ));

      return { success: false, validatedFiles, errors };
    }
  }

  // ============================================================================
  // File Format Validation
  // ============================================================================

  /**
   * 파일 형식 검증
   */
  async validateFileFormats(
    folderPath: string,
    filenames: string[],
    options: {
      maxFileSize?: number;
      checkStructure?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  }> {
    const { maxFileSize = MAX_FILE_SIZE, checkStructure = false } = options;
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      for (const filename of filenames) {
        const filePath = path.join(folderPath, filename);
        
        // 1. 파일 확장자 검증
        const extension = extractFileExtension(filename);
        if (!SUPPORTED_EXTENSIONS.includes(extension.toLowerCase())) {
          errors.push(createFileFormatError(
            filename,
            filePath,
            'extension',
            {
              expectedExtension: '.xlsm',
              actualExtension: extension
            }
          ));
          continue;
        }

        // 2. 파일 크기 검증
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.size > maxFileSize) {
            errors.push(createFileFormatError(
              filename,
              filePath,
              'size',
              {
                fileSize: stats.size,
                maxFileSize: maxFileSize
              }
            ));
            continue;
          }

          // 큰 파일에 대한 경고
          if (stats.size > 100 * 1024 * 1024) { // 100MB
            warnings.push(createFileFormatError(
              filename,
              filePath,
              'size',
              {
                fileSize: stats.size,
                maxFileSize: maxFileSize
              }
            ));
          }
        } catch (error) {
          errors.push(createFileFormatError(
            filename,
            filePath,
            'corrupted',
            {},
            { error: error instanceof Error ? error.message : 'Unknown error' }
          ));
          continue;
        }

        // 3. Excel 파일 형식 검증
        // TODO: validateExcelFile 메서드 구현 필요
        // try {
        //   await this.excelProcessor.validateExcelFile(filePath);
        // } catch (error) {
        //   errors.push(createFileFormatError(
        //     filename,
        //     filePath,
        //     'corrupted',
        //     {},
        //     { error: error instanceof Error ? error.message : 'Unknown error' }
        //   ));
        //   continue;
        // }

        // 4. 파일 구조 검증 (옵션)
        if (checkStructure) {
          try {
            await this.validateFileStructure(filePath, filename);
          } catch (error) {
            errors.push(createFileFormatError(
              filename,
              filePath,
              'structure',
              {},
              { error: error instanceof Error ? error.message : 'Unknown error' }
            ));
          }
        }
      }

      return {
        success: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(new ValidationError(
        'FORMAT_CHECK_FAILED',
        `File format check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        '파일 형식 검증 중 오류가 발생했습니다.',
        [
          '파일이 손상되지 않았는지 확인하세요.',
          '파일을 Excel에서 열어보고 정상적인지 확인하세요.',
          '다른 파일을 선택하여 다시 시도하세요.'
        ],
        'high',
        { folderPath, filenames, error: error instanceof Error ? error.message : 'Unknown error' }
      ));

      return { success: false, errors, warnings };
    }
  }

  // ============================================================================
  // File Permission Validation
  // ============================================================================

  /**
   * 파일 권한 검증
   */
  async validateFilePermissions(
    folderPath: string,
    filenames: string[]
  ): Promise<{
    success: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      for (const filename of filenames) {
        const filePath = path.join(folderPath, filename);
        
        // 1. 읽기 권한 검증
        try {
          await fs.promises.access(filePath, fs.constants.R_OK);
        } catch (error) {
          errors.push(createPermissionError(
            filename,
            filePath,
            'read',
            this.platform,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          ));
          continue;
        }

        // 2. 파일 잠금 상태 확인 (Windows에서 중요)
        if (this.platform === 'windows') {
          try {
            // 파일을 열어보고 즉시 닫아서 잠금 상태 확인
            const fd = await fs.promises.open(filePath, 'r');
            await fd.close();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (errorMessage.includes('EBUSY') || errorMessage.includes('EACCES')) {
              errors.push(createPermissionError(
                filename,
                filePath,
                'locked',
                this.platform,
                { error: errorMessage }
              ));
            } else {
              errors.push(createPermissionError(
                filename,
                filePath,
                'access',
                this.platform,
                { error: errorMessage }
              ));
            }
            continue;
          }
        }

        // 3. 파일 통계 정보 접근 확인
        try {
          await fs.promises.stat(filePath);
        } catch (error) {
          errors.push(createPermissionError(
            filename,
            filePath,
            'access',
            this.platform,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          ));
        }
      }

      return {
        success: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(new ValidationError(
        'PERMISSION_CHECK_FAILED',
        `File permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        '파일 권한 검증 중 오류가 발생했습니다.',
        [
          '파일에 대한 접근 권한이 있는지 확인하세요.',
          '파일이 다른 프로그램에서 사용 중인지 확인하세요.',
          '관리자 권한으로 실행해보세요.',
          '다른 파일을 선택하여 다시 시도하세요.'
        ],
        'high',
        { folderPath, filenames, error: error instanceof Error ? error.message : 'Unknown error' }
      ));

      return { success: false, errors, warnings };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * 경로 존재 여부 확인
   */
  private async checkPathExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 파일 구조 검증
   */
  private async validateFileStructure(filePath: string, filename: string): Promise<void> {
    try {
      // TODO: readExcelFile 메서드 구현 필요
      // const workbook = await this.excelProcessor.readExcelFile(filePath);
      const workbook: any = null; // 임시 처리
      
      // 기본 구조 검증
      if (!workbook.worksheets || workbook.worksheets.length === 0) {
        throw new Error('No worksheets found in the file');
      }

      // 파일별 특정 구조 검증
      if (filename.includes('DIALOGUE')) {
        await this.validateDialogueFileStructure(workbook, filename);
      } else if (filename.includes('STRING')) {
        await this.validateStringFileStructure(workbook, filename);
      } else if (filename.includes('NPC')) {
        await this.validateNPCFileStructure(workbook, filename);
      }

    } catch (error) {
      throw new Error(`File structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dialogue 파일 구조 검증
   */
  private async validateDialogueFileStructure(workbook: any, filename: string): Promise<void> {
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in dialogue file');
    }

    // 최소 행 수 확인
    if (worksheet.rowCount < 10) {
      throw new Error('Dialogue file has insufficient rows');
    }

    // 최소 열 수 확인
    if (worksheet.columnCount < 20) {
      throw new Error('Dialogue file has insufficient columns');
    }
  }

  /**
   * String 파일 구조 검증
   */
  private async validateStringFileStructure(workbook: any, filename: string): Promise<void> {
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in string file');
    }

    // 최소 행 수 확인
    if (worksheet.rowCount < 5) {
      throw new Error('String file has insufficient rows');
    }

    // 최소 열 수 확인
    if (worksheet.columnCount < 10) {
      throw new Error('String file has insufficient columns');
    }
  }

  /**
   * NPC 파일 구조 검증
   */
  private async validateNPCFileStructure(workbook: any, filename: string): Promise<void> {
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in NPC file');
    }

    // 최소 행 수 확인
    if (worksheet.rowCount < 5) {
      throw new Error('NPC file has insufficient rows');
    }

    // 최소 열 수 확인
    if (worksheet.columnCount < 8) {
      throw new Error('NPC file has insufficient columns');
    }
  }
}

// ============================================================================
// Service Instance
// ============================================================================

/**
 * 파일 검증 서비스 인스턴스 (싱글톤)
 */
let fileValidationServiceInstance: FileValidationService | null = null;

/**
 * 파일 검증 서비스 인스턴스 가져오기
 */
export function getFileValidationService(): FileValidationService {
  if (!fileValidationServiceInstance) {
    fileValidationServiceInstance = new FileValidationService();
  }
  return fileValidationServiceInstance;
}

/**
 * 파일 검증 서비스 인스턴스 리셋 (테스트용)
 */
export function resetFileValidationService(): void {
  fileValidationServiceInstance = null;
}