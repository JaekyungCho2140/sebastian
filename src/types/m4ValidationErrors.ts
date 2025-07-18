/**
 * M4 Excel Processing Validation Error Classes
 * 
 * This file contains custom error classes for M4 Excel processing
 * file validation and error handling functionality.
 */

// ============================================================================
// Base Validation Error
// ============================================================================

/**
 * 기본 검증 오류 클래스
 */
export class ValidationError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly resolutionSteps: string[];
  public readonly severity: 'low' | 'medium' | 'high';
  public readonly context?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    resolutionSteps: string[],
    severity: 'low' | 'medium' | 'high' = 'medium',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.userMessage = userMessage;
    this.resolutionSteps = resolutionSteps;
    this.severity = severity;
    this.context = context;
    
    // Error 클래스의 스택 트레이스 설정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

// ============================================================================
// File Missing Error
// ============================================================================

/**
 * 파일 누락 오류 클래스
 */
export class FileMissingError extends ValidationError {
  public readonly missingFiles: string[];
  public readonly folderPath: string;
  public readonly processType: 'dialogue' | 'string';

  constructor(
    missingFiles: string[],
    folderPath: string,
    processType: 'dialogue' | 'string',
    context?: Record<string, any>
  ) {
    const fileList = missingFiles.length === 1 
      ? `'${missingFiles[0]}'` 
      : `다음 파일들: ${missingFiles.map(f => `'${f}'`).join(', ')}`;
    
    const message = `Required files not found: ${missingFiles.join(', ')} in ${folderPath}`;
    
    const userMessage = `필수 파일이 누락되었습니다.\n\n` +
      `누락된 파일: ${fileList}\n` +
      `선택된 폴더: ${folderPath}\n` +
      `처리 타입: ${processType === 'dialogue' ? 'M4 Dialogue' : 'M4 String'}`;

    const resolutionSteps = [
      `선택한 폴더에 ${fileList}이(가) 있는지 확인하세요.`,
      `파일명이 정확한지 확인하세요 (대소문자 구분).`,
      `파일 확장자가 .xlsm인지 확인하세요.`,
      `다른 폴더를 선택하여 다시 시도하세요.`,
      `필요한 경우 파일을 해당 폴더에 복사하세요.`
    ];

    super(
      'FILE_MISSING',
      message,
      userMessage,
      resolutionSteps,
      'high',
      {
        missingFiles,
        folderPath,
        processType,
        ...context
      }
    );

    this.name = 'FileMissingError';
    this.missingFiles = missingFiles;
    this.folderPath = folderPath;
    this.processType = processType;
  }
}

// ============================================================================
// File Format Error
// ============================================================================

/**
 * 파일 형식 오류 클래스
 */
export class FileFormatError extends ValidationError {
  public readonly fileName: string;
  public readonly filePath: string;
  public readonly formatIssue: 'extension' | 'corrupted' | 'structure' | 'size';
  public readonly expectedExtension?: string;
  public readonly actualExtension?: string;
  public readonly fileSize?: number;
  public readonly maxFileSize?: number;

  constructor(
    fileName: string,
    filePath: string,
    formatIssue: 'extension' | 'corrupted' | 'structure' | 'size',
    details: {
      expectedExtension?: string;
      actualExtension?: string;
      fileSize?: number;
      maxFileSize?: number;
    } = {},
    context?: Record<string, any>
  ) {
    let message: string;
    let userMessage: string;
    let resolutionSteps: string[];
    let severity: 'low' | 'medium' | 'high' = 'medium';

    switch (formatIssue) {
      case 'extension':
        message = `Invalid file extension: ${fileName} (expected: ${details.expectedExtension}, actual: ${details.actualExtension})`;
        userMessage = `파일 확장자가 올바르지 않습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `예상 확장자: ${details.expectedExtension}\n` +
          `실제 확장자: ${details.actualExtension}`;
        resolutionSteps = [
          `파일 확장자를 ${details.expectedExtension}으로 변경하세요.`,
          `올바른 Excel 파일(.xlsm)인지 확인하세요.`,
          `파일을 다시 저장하여 올바른 형식으로 변환하세요.`,
          `다른 파일을 선택하여 다시 시도하세요.`
        ];
        severity = 'high';
        break;

      case 'corrupted':
        message = `Corrupted file: ${fileName}`;
        userMessage = `파일이 손상되었습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `파일을 열 수 없거나 Excel 형식이 아닙니다.`;
        resolutionSteps = [
          `파일을 Excel에서 열어서 정상적으로 작동하는지 확인하세요.`,
          `파일을 다시 저장하여 복구를 시도하세요.`,
          `백업 파일이 있다면 백업 파일을 사용하세요.`,
          `파일 복구 도구를 사용하여 복구를 시도하세요.`,
          `다른 파일을 선택하여 다시 시도하세요.`
        ];
        severity = 'high';
        break;

      case 'structure':
        message = `Invalid file structure: ${fileName}`;
        userMessage = `파일 구조가 올바르지 않습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `예상되는 시트 구조나 데이터 형식과 일치하지 않습니다.`;
        resolutionSteps = [
          `파일이 올바른 M4 Excel 파일인지 확인하세요.`,
          `파일에 필요한 시트가 있는지 확인하세요.`,
          `데이터 형식이 올바른지 확인하세요.`,
          `템플릿 파일을 참고하여 파일 구조를 확인하세요.`,
          `다른 파일을 선택하여 다시 시도하세요.`
        ];
        severity = 'medium';
        break;

      case 'size':
        message = `File too large: ${fileName} (${details.fileSize} bytes, max: ${details.maxFileSize} bytes)`;
        userMessage = `파일 크기가 너무 큽니다.\n\n` +
          `파일명: ${fileName}\n` +
          `파일 크기: ${Math.round((details.fileSize || 0) / 1024 / 1024)}MB\n` +
          `최대 허용 크기: ${Math.round((details.maxFileSize || 0) / 1024 / 1024)}MB`;
        resolutionSteps = [
          `파일 크기를 줄여서 다시 시도하세요.`,
          `불필요한 데이터나 시트를 제거하세요.`,
          `파일을 여러 개로 분할하여 처리하세요.`,
          `메모리 제한을 늘리고 다시 시도하세요.`
        ];
        severity = 'medium';
        break;

      default:
        message = `Unknown file format issue: ${fileName}`;
        userMessage = `알 수 없는 파일 형식 오류가 발생했습니다.\n\n파일명: ${fileName}`;
        resolutionSteps = [
          `파일이 올바른 Excel 파일인지 확인하세요.`,
          `다른 파일을 선택하여 다시 시도하세요.`,
          `기술 지원팀에 문의하세요.`
        ];
        severity = 'medium';
    }

    super(
      'FILE_FORMAT',
      message,
      userMessage,
      resolutionSteps,
      severity,
      {
        fileName,
        filePath,
        formatIssue,
        ...details,
        ...context
      }
    );

    this.name = 'FileFormatError';
    this.fileName = fileName;
    this.filePath = filePath;
    this.formatIssue = formatIssue;
    this.expectedExtension = details.expectedExtension;
    this.actualExtension = details.actualExtension;
    this.fileSize = details.fileSize;
    this.maxFileSize = details.maxFileSize;
  }
}

// ============================================================================
// Permission Error
// ============================================================================

/**
 * 파일 권한 오류 클래스
 */
export class PermissionError extends ValidationError {
  public readonly fileName: string;
  public readonly filePath: string;
  public readonly permissionType: 'read' | 'write' | 'locked' | 'access';
  public readonly platform: 'windows' | 'unix' | 'unknown';

  constructor(
    fileName: string,
    filePath: string,
    permissionType: 'read' | 'write' | 'locked' | 'access',
    platform: 'windows' | 'unix' | 'unknown' = 'unknown',
    context?: Record<string, any>
  ) {
    let message: string;
    let userMessage: string;
    let resolutionSteps: string[];

    switch (permissionType) {
      case 'read':
        message = `No read permission: ${fileName}`;
        userMessage = `파일을 읽을 수 없습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `경로: ${filePath}\n` +
          `읽기 권한이 없습니다.`;
        break;

      case 'write':
        message = `No write permission: ${fileName}`;
        userMessage = `파일에 쓸 수 없습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `경로: ${filePath}\n` +
          `쓰기 권한이 없습니다.`;
        break;

      case 'locked':
        message = `File is locked: ${fileName}`;
        userMessage = `파일이 잠겨있습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `경로: ${filePath}\n` +
          `다른 프로세스에서 파일을 사용 중입니다.`;
        break;

      case 'access':
        message = `Cannot access file: ${fileName}`;
        userMessage = `파일에 접근할 수 없습니다.\n\n` +
          `파일명: ${fileName}\n` +
          `경로: ${filePath}\n` +
          `파일 접근 권한이 없습니다.`;
        break;

      default:
        message = `Unknown permission issue: ${fileName}`;
        userMessage = `알 수 없는 권한 오류가 발생했습니다.\n\n파일명: ${fileName}`;
    }

    // 플랫폼별 해결 방법
    if (platform === 'windows') {
      resolutionSteps = [
        `파일이 Excel이나 다른 프로그램에서 열려있다면 닫으세요.`,
        `파일을 마우스 오른쪽 버튼으로 클릭하고 "속성" → "보안" 탭에서 권한을 확인하세요.`,
        `관리자 권한으로 Sebastian을 실행하세요.`,
        `파일을 다른 위치로 복사한 후 다시 시도하세요.`,
        `윈도우 파일 탐색기에서 파일에 접근할 수 있는지 확인하세요.`
      ];
    } else if (platform === 'unix') {
      resolutionSteps = [
        `터미널에서 chmod 명령을 사용하여 파일 권한을 변경하세요.`,
        `파일 소유자를 확인하고 필요시 chown으로 변경하세요.`,
        `sudo 권한으로 Sebastian을 실행하세요.`,
        `파일을 다른 위치로 복사한 후 다시 시도하세요.`,
        `ls -la 명령으로 파일 권한을 확인하세요.`
      ];
    } else {
      resolutionSteps = [
        `파일이 다른 프로그램에서 사용 중이라면 닫으세요.`,
        `파일 권한을 확인하고 필요시 수정하세요.`,
        `관리자 권한으로 Sebastian을 실행하세요.`,
        `파일을 다른 위치로 복사한 후 다시 시도하세요.`,
        `파일 시스템에 문제가 있는지 확인하세요.`
      ];
    }

    super(
      'PERMISSION',
      message,
      userMessage,
      resolutionSteps,
      'high',
      {
        fileName,
        filePath,
        permissionType,
        platform,
        ...context
      }
    );

    this.name = 'PermissionError';
    this.fileName = fileName;
    this.filePath = filePath;
    this.permissionType = permissionType;
    this.platform = platform;
  }
}

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * 검증 결과 인터페이스
 */
export interface ValidationResult {
  /** 검증 성공 여부 */
  success: boolean;
  
  /** 검증된 파일 목록 */
  validatedFiles: string[];
  
  /** 검증 오류 목록 */
  errors: ValidationError[];
  
  /** 검증 경고 목록 */
  warnings: ValidationError[];
  
  /** 검증 시간 (밀리초) */
  validationTime: number;
  
  /** 검증 결과 요약 */
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    errorCount: number;
    warningCount: number;
  };
}

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * ValidationError 타입 가드
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * FileMissingError 타입 가드
 */
export function isFileMissingError(error: any): error is FileMissingError {
  return error instanceof FileMissingError;
}

/**
 * FileFormatError 타입 가드
 */
export function isFileFormatError(error: any): error is FileFormatError {
  return error instanceof FileFormatError;
}

/**
 * PermissionError 타입 가드
 */
export function isPermissionError(error: any): error is PermissionError {
  return error instanceof PermissionError;
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * 파일 누락 오류 생성 헬퍼
 */
export function createFileMissingError(
  missingFiles: string[],
  folderPath: string,
  processType: 'dialogue' | 'string',
  context?: Record<string, any>
): FileMissingError {
  return new FileMissingError(missingFiles, folderPath, processType, context);
}

/**
 * 파일 형식 오류 생성 헬퍼
 */
export function createFileFormatError(
  fileName: string,
  filePath: string,
  formatIssue: 'extension' | 'corrupted' | 'structure' | 'size',
  details: {
    expectedExtension?: string;
    actualExtension?: string;
    fileSize?: number;
    maxFileSize?: number;
  } = {},
  context?: Record<string, any>
): FileFormatError {
  return new FileFormatError(fileName, filePath, formatIssue, details, context);
}

/**
 * 권한 오류 생성 헬퍼
 */
export function createPermissionError(
  fileName: string,
  filePath: string,
  permissionType: 'read' | 'write' | 'locked' | 'access',
  platform: 'windows' | 'unix' | 'unknown' = 'unknown',
  context?: Record<string, any>
): PermissionError {
  return new PermissionError(fileName, filePath, permissionType, platform, context);
}

/**
 * 빈 검증 결과 생성 헬퍼
 */
export function createEmptyValidationResult(): ValidationResult {
  return {
    success: true,
    validatedFiles: [],
    errors: [],
    warnings: [],
    validationTime: 0,
    summary: {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      errorCount: 0,
      warningCount: 0
    }
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 현재 플랫폼 감지
 */
export function detectPlatform(): 'windows' | 'unix' | 'unknown' {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32' ? 'windows' : 'unix';
  }
  return 'unknown';
}

/**
 * 파일 확장자 추출
 */
export function extractFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 오류 심각도별 정렬
 */
export function sortErrorsBySeverity(errors: ValidationError[]): ValidationError[] {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return errors.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}