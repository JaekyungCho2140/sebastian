/**
 * M4 Excel Processing TypeScript Data Models and Interfaces
 * 
 * This file contains all TypeScript interfaces, types, and enums
 * required for M4 Excel processing functionality.
 */

// Type aliases for backward compatibility
export type M4ProcessorResult = M4ProcessResult;
export type M4ProgressInfo = M4ProcessProgress;

// ============================================================================
// Core Processing Types
// ============================================================================

/**
 * M4 프로세스 타입
 */
export enum ProcessType {
  DIALOGUE = 'dialogue',
  STRING = 'string'
}

/**
 * 처리 단계
 */
export enum ProcessStep {
  INITIALIZING = 'initializing',
  READING_FILES = 'reading_files',
  PROCESSING_DATA = 'processing_data',
  WRITING_OUTPUT = 'writing_output',
  COMPLETED = 'completed',
  ERROR = 'error',
  PROCESSING = 'processing',
  DIALOGUE_PROCESSING = 'dialogue_processing',
  STRING_PROCESSING = 'string_processing'
}

/**
 * 처리 우선순위
 */
export enum ProcessPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ============================================================================
// M4 Processing Configuration
// ============================================================================

/**
 * M4 처리 구성 인터페이스
 */
export interface M4ProcessConfig {
  /** 처리 타입 (dialogue | string) */
  type: ProcessType;
  
  /** 입력 폴더 경로 */
  inputFolder: string;
  
  /** 출력 폴더 경로 */
  outputFolder: string;
  
  /** 필수 파일 목록 */
  requiredFiles: string[];
  
  /** 출력 파일명 */
  outputFileName: string;
  
  /** 처리 우선순위 */
  priority?: ProcessPriority;
  
  /** 프로세스 옵션 */
  options?: M4ProcessOptions;
}

/**
 * M4 처리 옵션
 */
export interface M4ProcessOptions {
  /** 병렬 처리 활성화 */
  enableParallelProcessing?: boolean;
  
  /** 최대 워커 스레드 수 */
  maxWorkerThreads?: number;
  
  /** 메모리 제한 (MB) */
  memoryLimit?: number;
  
  /** 타임아웃 (초) */
  timeout?: number;
  
  /** 백업 생성 여부 */
  createBackup?: boolean;
  
  /** 상세 로그 활성화 */
  verbose?: boolean;
}

// ============================================================================
// M4 Processing Progress
// ============================================================================

/**
 * M4 처리 진행률 인터페이스
 */
export interface M4ProcessProgress {
  /** 전체 진행률 (0-100) */
  percentage: number;
  
  /** 현재 처리 단계 */
  currentStep: ProcessStep;
  
  /** 현재 처리 중인 파일 */
  currentFile: string;
  
  /** 처리된 파일 수 */
  processedFiles: number;
  
  /** 전체 파일 수 */
  totalFiles: number;
  
  /** 남은 예상 시간 (초) */
  estimatedTimeRemaining: number;
  
  /** 처리 시작 시간 */
  startTime: number;
  
  /** 현재 시간 */
  currentTime: number;
  
  /** 상태 메시지 */
  statusMessage: string;
  
  /** 세부 진현률 정보 */
  details?: M4ProcessProgressDetails;
  
  // Backward compatibility fields
  /** 현재 처리 중인 항목 */
  current?: number;
  
  /** 전체 항목 수 */
  total?: number;
  
  /** 메모리 사용량 (MB) */
  memoryUsage?: number;
}

/**
 * M4 처리 세부 진행률 정보
 */
export interface M4ProcessProgressDetails {
  /** 파일별 처리 진행률 */
  fileProgress: Record<string, number>;
  
  /** 단계별 처리 시간 */
  stepTimes: Record<ProcessStep, number>;
  
  /** 메모리 사용량 (MB) */
  memoryUsage: number;
  
  /** 처리 속도 (files/sec) */
  processingSpeed: number;
  
  /** 오류 개수 */
  errorCount: number;
  
  /** 경고 개수 */
  warningCount: number;
}

// ============================================================================
// M4 Processing Result
// ============================================================================

/**
 * M4 처리 결과 인터페이스
 */
export interface M4ProcessResult {
  /** 처리 성공 여부 */
  success: boolean;
  
  /** 출력 파일 경로 */
  outputPath: string;
  
  /** 오류 메시지 (실패 시) */
  error?: string;
  
  /** 처리된 파일 수 */
  processedFileCount: number;
  
  /** 전체 소요 시간 (초) */
  elapsedTime: number;
  
  /** 처리 시간 (밀리초) - backward compatibility */
  processingTime?: number;
  
  /** 처리 통계 */
  statistics: M4ProcessStatistics;
  
  /** 처리 로그 */
  logs: M4ProcessLog[];
  
  /** 생성된 파일 목록 */
  generatedFiles: string[];
  
  // Backward compatibility fields
  /** 처리된 행 수 */
  rowsProcessed?: number;
  
  /** 처리된 파일 수 (다른 필드명) */
  filesProcessed?: number;
  
  /** 메모리 사용량 (bytes) */
  memoryUsed?: number;
}

/**
 * M4 처리 통계
 */
export interface M4ProcessStatistics {
  /** 총 처리된 행 수 */
  totalRowsProcessed: number;
  
  /** 총 처리된 열 수 */
  totalColumnsProcessed: number;
  
  /** 필터링된 행 수 */
  filteredRowsCount: number;
  
  /** 매핑된 데이터 수 */
  mappedDataCount: number;
  
  /** 검증 통과 행 수 */
  validatedRowsCount: number;
  
  /** 오류 발생 행 수 */
  errorRowsCount: number;
  
  /** 평균 처리 시간 (ms/row) */
  averageProcessingTime: number;
  
  /** 최대 메모리 사용량 (MB) */
  peakMemoryUsage: number;
}

/**
 * M4 처리 로그
 */
export interface M4ProcessLog {
  /** 로그 레벨 */
  level: 'debug' | 'info' | 'warn' | 'error';
  
  /** 로그 메시지 */
  message: string;
  
  /** 타임스탬프 */
  timestamp: number;
  
  /** 파일명 */
  filename?: string;
  
  /** 행 번호 */
  rowNumber?: number;
  
  /** 컨텍스트 데이터 */
  context?: Record<string, any>;
}

// ============================================================================
// M4 File Processing Types
// ============================================================================

/**
 * M4 파일 처리 구성
 */
export interface M4FileConfig {
  /** 파일명 */
  filename: string;
  
  /** 헤더 행 번호 */
  headerRow: number;
  
  /** 건너뛸 행 수 */
  skipRows: number;
  
  /** 열 매핑 정보 */
  columnMapping: M4ColumnMapping[];
  
  /** 필터링 조건 */
  filters?: M4FilterCondition[];
  
  /** 검증 규칙 */
  validationRules?: M4ValidationRule[];
}

/**
 * M4 열 매핑 정보
 */
export interface M4ColumnMapping {
  /** 소스 열 인덱스 */
  sourceIndex: number;
  
  /** 대상 열 인덱스 */
  targetIndex: number;
  
  /** 열 이름 */
  name: string;
  
  /** 데이터 타입 */
  dataType: 'string' | 'number' | 'date' | 'boolean';
  
  /** 기본값 */
  defaultValue?: any;
  
  /** 변환 함수 */
  transform?: string;
  
  /** 필수 여부 */
  required?: boolean;
}

/**
 * M4 필터 조건
 */
export interface M4FilterCondition {
  /** 필터 대상 열 */
  column: string;
  
  /** 필터 연산자 */
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty';
  
  /** 필터 값 */
  value: any;
  
  /** 대소문자 구분 여부 */
  caseSensitive?: boolean;
}

/**
 * M4 검증 규칙
 */
export interface M4ValidationRule {
  /** 규칙 이름 */
  name: string;
  
  /** 대상 열 */
  column: string;
  
  /** 규칙 타입 */
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
  
  /** 규칙 값 */
  value: any;
  
  /** 오류 메시지 */
  errorMessage: string;
}

// ============================================================================
// M4 Dialogue Processing Types
// ============================================================================

/**
 * M4 대화 처리 구성
 */
export interface M4DialogueConfig extends M4FileConfig {
  /** NPC 매핑 데이터 */
  npcMapping: Record<string, string>;
  
  /** 필터링 열 (EN (M) 컬럼) */
  filterColumn: number;
  
  /** 출력 열 수 */
  outputColumnCount: number;
}

/**
 * M4 대화 데이터
 */
export interface M4DialogueData {
  /** 행 번호 */
  rowNumber: number;
  
  /** 열 데이터 */
  columns: Record<string, any>;
  
  /** NPC 매핑 결과 */
  npcMapped: boolean;
  
  /** 필터링 통과 여부 */
  filtered: boolean;
}

/**
 * M4 Dialogue Row 인터페이스
 */
export interface M4DialogueRow {
  /** 행 번호 */
  rowNumber: number;
  
  /** 대화 데이터 열 (A-W columns) */
  columns: (string | number | null)[];
  
  /** NPC 이름 */
  npcName?: string;
  
  /** 필터링 상태 */
  isFiltered: boolean;
  
  /** Dialogue ID */
  dlgID?: string;
  
  /** String ID */
  stringID?: string;
  
  /** Comment */
  comment?: string;
  
  /** Asset ID */
  assetID?: string;
}

/**
 * NPC Mapping Row 인터페이스
 */
export interface NPCMappingRow {
  /** NPC ID (Column A) */
  npcId: string;
  
  /** NPC 이름 (Column B) */
  npcName: string;
  
  /** 행 번호 */
  rowNumber: number;
}

// ============================================================================
// M4 String Processing Types
// ============================================================================

/**
 * M4 문자열 처리 구성
 */
export interface M4StringConfig {
  /** 파일 설정 목록 */
  files: M4StringFileConfig[];
  
  /** 출력 열 수 */
  outputColumnCount: number;
  
  /** Table/ID 생성 규칙 */
  tableIdGeneration: M4TableIdGeneration;
}

/**
 * M4 문자열 파일 구성
 */
export interface M4StringFileConfig extends M4FileConfig {
  /** 파일 ID */
  fileId: string;
  
  /** 열 매핑 테이블 */
  columnMappingTable: Record<number, number>;
}

/**
 * M4 Table/ID 생성 규칙
 */
export interface M4TableIdGeneration {
  /** Table 생성 규칙 */
  tableRule: 'filename' | 'custom';
  
  /** ID 생성 규칙 */
  idRule: 'sequential' | 'filename_sequential' | 'custom';
  
  /** 사용자 정의 규칙 */
  customRule?: string;
}

/**
 * M4 문자열 데이터
 */
export interface M4StringData {
  /** 행 번호 */
  rowNumber: number;
  
  /** 파일 ID */
  fileId: string;
  
  /** 열 데이터 */
  columns: Record<string, any>;
  
  /** 생성된 Table 값 */
  table: string;
  
  /** 생성된 ID 값 */
  id: string;
}

/**
 * M4 String Row 인터페이스
 */
export interface M4StringRow {
  /** 행 번호 */
  rowNumber: number;
  
  /** 파일 이름 (Table 값으로 사용) */
  fileName: string;
  
  /** 문자열 데이터 열 */
  columns: (string | number | null)[];
  
  /** Table 값 */
  table: string;
  
  /** ID 값 */
  id: string;
  
  /** Asset ID */
  assetID?: string;
  
  /** String ID */
  stringID?: string;
}

// ============================================================================
// Required Files Constants
// ============================================================================

/**
 * M4 Dialogue 처리 필수 파일
 */
export const DIALOGUE_REQUIRED_FILES: string[] = [
  'CINEMATIC_DIALOGUE.xlsm',
  'SMALLTALK_DIALOGUE.xlsm',
  'NPC.xlsm'
];

/**
 * M4 String 처리 필수 파일
 */
export const STRING_REQUIRED_FILES: string[] = [
  'ACHIEVEMENT.xlsm',
  'BUFF.xlsm',
  'ITEM.xlsm',
  'QUEST.xlsm',
  'SKILL.xlsm',
  'SYSTEM.xlsm',
  'TITLE.xlsm',
  'UI.xlsm'
];

/**
 * 모든 M4 처리 필수 파일
 */
export const ALL_REQUIRED_FILES: string[] = [
  ...DIALOGUE_REQUIRED_FILES,
  ...STRING_REQUIRED_FILES
];

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * 기본 M4 처리 옵션
 */
export const DEFAULT_M4_OPTIONS: M4ProcessOptions = {
  enableParallelProcessing: true,
  maxWorkerThreads: 4,
  memoryLimit: 1024, // 1GB
  timeout: 300, // 5분
  createBackup: true,
  verbose: false
};

/**
 * 기본 M4 Dialogue 구성
 */
export const DEFAULT_DIALOGUE_CONFIG: Partial<M4DialogueConfig> = {
  headerRow: 2,
  skipRows: 1,
  filterColumn: 23,
  outputColumnCount: 23
};

/**
 * 기본 M4 String 구성
 */
export const DEFAULT_STRING_CONFIG: Partial<M4StringConfig> = {
  outputColumnCount: 15,
  tableIdGeneration: {
    tableRule: 'filename',
    idRule: 'filename_sequential'
  }
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * ProcessType 타입 가드
 */
export function isProcessType(value: any): value is ProcessType {
  return Object.values(ProcessType).includes(value);
}

/**
 * ProcessStep 타입 가드
 */
export function isProcessStep(value: any): value is ProcessStep {
  return Object.values(ProcessStep).includes(value);
}

/**
 * M4ProcessConfig 타입 가드
 */
export function isM4ProcessConfig(value: any): value is M4ProcessConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    isProcessType(value.type) &&
    typeof value.inputFolder === 'string' &&
    typeof value.outputFolder === 'string' &&
    Array.isArray(value.requiredFiles) &&
    typeof value.outputFileName === 'string'
  );
}

/**
 * M4ProcessResult 타입 가드
 */
export function isM4ProcessResult(value: any): value is M4ProcessResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.success === 'boolean' &&
    typeof value.outputPath === 'string' &&
    typeof value.processedFileCount === 'number' &&
    typeof value.elapsedTime === 'number' &&
    typeof value.statistics === 'object' &&
    Array.isArray(value.logs) &&
    Array.isArray(value.generatedFiles)
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * M4 처리 진행률 객체 생성
 */
export function createM4ProcessProgress(
  percentage: number,
  currentStep: ProcessStep,
  currentFile: string,
  processedFiles: number,
  totalFiles: number
): M4ProcessProgress {
  const now = Date.now();
  const startTime = now - (processedFiles * 1000); // 임시 계산
  
  return {
    percentage,
    currentStep,
    currentFile,
    processedFiles,
    totalFiles,
    estimatedTimeRemaining: Math.max(0, (totalFiles - processedFiles) * 1000),
    startTime,
    currentTime: now,
    statusMessage: `Processing ${currentFile} (${processedFiles}/${totalFiles})`
  };
}

/**
 * M4 처리 로그 생성
 */
export function createM4ProcessLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  filename?: string,
  rowNumber?: number,
  context?: Record<string, any>
): M4ProcessLog {
  return {
    level,
    message,
    timestamp: Date.now(),
    filename,
    rowNumber,
    context
  };
}

/**
 * 빈 M4 처리 통계 생성
 */
export function createEmptyM4ProcessStatistics(): M4ProcessStatistics {
  return {
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 처리 타입에 따른 필수 파일 목록 반환
 */
export function getRequiredFiles(processType: ProcessType): string[] {
  switch (processType) {
    case ProcessType.DIALOGUE:
      return DIALOGUE_REQUIRED_FILES;
    case ProcessType.STRING:
      return STRING_REQUIRED_FILES;
    default:
      return [];
  }
}

/**
 * 파일명에서 처리 타입 추론
 */
export function inferProcessType(filename: string): ProcessType | null {
  const upperFilename = filename.toUpperCase();
  
  if (DIALOGUE_REQUIRED_FILES.some(file => upperFilename.includes(file.toUpperCase()))) {
    return ProcessType.DIALOGUE;
  }
  
  if (STRING_REQUIRED_FILES.some(file => upperFilename.includes(file.toUpperCase()))) {
    return ProcessType.STRING;
  }
  
  return null;
}

/**
 * 처리 단계 진행률 계산
 */
export function calculateStepProgress(currentStep: ProcessStep): number {
  const stepOrder = [
    ProcessStep.INITIALIZING,
    ProcessStep.READING_FILES,
    ProcessStep.PROCESSING_DATA,
    ProcessStep.WRITING_OUTPUT,
    ProcessStep.COMPLETED
  ];
  
  const currentIndex = stepOrder.indexOf(currentStep);
  return currentIndex >= 0 ? (currentIndex / (stepOrder.length - 1)) * 100 : 0;
}