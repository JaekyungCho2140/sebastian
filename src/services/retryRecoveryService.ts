/**
 * M4 Excel Processing Retry and Error Recovery Service
 * 
 * This service handles retry mechanisms and error recovery for M4 processing
 * with exponential backoff and validation result caching.
 */

import { ProcessType } from '../types/m4Processing';
import {
  ValidationError,
  ValidationResult,
  isFileMissingError,
  isFileFormatError,
  isPermissionError,
  createEmptyValidationResult
} from '../types/m4ValidationErrors';
import { FileValidationService } from './fileValidationService';
import { FolderDialogService } from './folderDialogService';
import { errorMessageService } from './errorMessageService';
import { isRenderer, getWindow } from '../utils/environment';

// ============================================================================
// Retry Configuration
// ============================================================================

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  transientErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,       // 1초
  maxDelay: 30000,       // 30초
  backoffMultiplier: 2,
  retryableErrors: [
    'PERMISSION',
    'FILE_FORMAT',
    'VALIDATION_FAILED'
  ],
  transientErrors: [
    'PERMISSION'  // 파일이 잠긴 경우 등
  ]
};

// ============================================================================
// Validation Cache
// ============================================================================

interface ValidationCacheEntry {
  folderPath: string;
  processType: ProcessType;
  result: ValidationResult;
  timestamp: number;
  expiresAt: number;
}

class ValidationCache {
  private cache = new Map<string, ValidationCacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분

  /**
   * 캐시 키 생성
   */
  private getCacheKey(folderPath: string, processType: ProcessType): string {
    return `${folderPath}:${processType}`;
  }

  /**
   * 캐시에서 검증 결과 가져오기
   */
  get(folderPath: string, processType: ProcessType): ValidationResult | null {
    const key = this.getCacheKey(folderPath, processType);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * 캐시에 검증 결과 저장
   */
  set(folderPath: string, processType: ProcessType, result: ValidationResult): void {
    const key = this.getCacheKey(folderPath, processType);
    const timestamp = Date.now();
    
    this.cache.set(key, {
      folderPath,
      processType,
      result,
      timestamp,
      expiresAt: timestamp + this.CACHE_DURATION
    });
  }

  /**
   * 캐시 무효화
   */
  invalidate(folderPath: string, processType: ProcessType): void {
    const key = this.getCacheKey(folderPath, processType);
    this.cache.delete(key);
  }

  /**
   * 전체 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 엔트리 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// Retry State Management
// ============================================================================

interface RetryState {
  attempt: number;
  lastError: ValidationError | null;
  lastFolderPath: string | null;
  nextRetryAt: number;
  isRetrying: boolean;
  retryHistory: Array<{
    attempt: number;
    error: ValidationError;
    timestamp: number;
    folderPath: string;
  }>;
}

class RetryStateManager {
  private state: RetryState = {
    attempt: 0,
    lastError: null,
    lastFolderPath: null,
    nextRetryAt: 0,
    isRetrying: false,
    retryHistory: []
  };

  /**
   * 재시도 상태 초기화
   */
  reset(): void {
    this.state = {
      attempt: 0,
      lastError: null,
      lastFolderPath: null,
      nextRetryAt: 0,
      isRetrying: false,
      retryHistory: []
    };
  }

  /**
   * 재시도 상태 업데이트
   */
  updateRetryState(error: ValidationError, folderPath: string): void {
    this.state.attempt++;
    this.state.lastError = error;
    this.state.lastFolderPath = folderPath;
    this.state.retryHistory.push({
      attempt: this.state.attempt,
      error,
      timestamp: Date.now(),
      folderPath
    });
  }

  /**
   * 재시도 대기 시간 설정
   */
  setNextRetryDelay(delay: number): void {
    this.state.nextRetryAt = Date.now() + delay;
  }

  /**
   * 재시도 상태 설정
   */
  setRetrying(isRetrying: boolean): void {
    this.state.isRetrying = isRetrying;
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): Readonly<RetryState> {
    return this.state;
  }

  /**
   * 재시도 가능 여부 확인
   */
  canRetry(maxRetries: number): boolean {
    return this.state.attempt < maxRetries;
  }

  /**
   * 재시도 대기 시간 계산
   */
  calculateRetryDelay(config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, this.state.attempt - 1),
      config.maxDelay
    );
    
    // 지터 추가 (랜덤 변동)
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }
}

// ============================================================================
// Retry and Recovery Service
// ============================================================================

export class RetryRecoveryService {
  private fileValidationService: FileValidationService;
  private folderDialogService: FolderDialogService;
  private validationCache: ValidationCache;
  private retryStateManager: RetryStateManager;
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.fileValidationService = new FileValidationService();
    this.folderDialogService = new FolderDialogService();
    this.validationCache = new ValidationCache();
    this.retryStateManager = new RetryStateManager();
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };

    // 주기적으로 캐시 정리
    setInterval(() => {
      this.validationCache.cleanup();
    }, 60000); // 1분마다
  }

  // ============================================================================
  // Main Retry Flow
  // ============================================================================

  /**
   * 파일 검증 재시도 플로우
   */
  async validateWithRetry(
    folderPath: string,
    processType: ProcessType,
    options: {
      enableCache?: boolean;
      showProgressDialog?: boolean;
      onRetryAttempt?: (attempt: number, error: ValidationError) => void;
      onRecoverySuccess?: (result: ValidationResult) => void;
    } = {}
  ): Promise<ValidationResult> {
    const {
      enableCache = true,
      showProgressDialog = true,
      onRetryAttempt,
      onRecoverySuccess
    } = options;

    // 캐시 확인
    if (enableCache) {
      const cachedResult = this.validationCache.get(folderPath, processType);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // 재시도 상태 초기화
    this.retryStateManager.reset();

    let lastError: ValidationError | null = null;
    let result: ValidationResult;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 진행 상태 표시
        if (showProgressDialog && attempt > 1) {
          errorMessageService.notification.showErrorNotification(
            '재시도 중...',
            `${attempt}번째 시도 중입니다. (최대 ${this.config.maxRetries}번)`
          );
        }

        // 파일 검증 수행
        result = await this.fileValidationService.validateFiles(folderPath, processType);

        // 성공한 경우
        if (result.success) {
          if (enableCache) {
            this.validationCache.set(folderPath, processType, result);
          }
          
          if (onRecoverySuccess) {
            onRecoverySuccess(result);
          }

          return result;
        }

        // 실패한 경우 - 주요 오류 분석
        const primaryError = result.errors[0];
        if (!primaryError) {
          return result;
        }

        lastError = primaryError;

        // 재시도 가능 여부 확인
        if (!this.isRetryableError(primaryError)) {
          break;
        }

        // 재시도 상태 업데이트
        this.retryStateManager.updateRetryState(primaryError, folderPath);

        // 콜백 호출
        if (onRetryAttempt) {
          onRetryAttempt(attempt, primaryError);
        }

        // 마지막 시도가 아니면 대기
        if (attempt < this.config.maxRetries) {
          const delay = this.retryStateManager.calculateRetryDelay(this.config);
          this.retryStateManager.setNextRetryDelay(delay);
          
          await this.waitForRetry(delay);
        }

      } catch (error) {
        // 예상치 못한 오류
        const validationError = new ValidationError(
          'RETRY_FAILED',
          `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          '재시도 중 예상치 못한 오류가 발생했습니다.',
          ['다른 방법으로 시도해보세요.', '기술 지원팀에 문의하세요.'],
          'high',
          { attempt, error: error instanceof Error ? error.message : 'Unknown error' }
        );

        result = createEmptyValidationResult();
        result.errors.push(validationError);
        result.success = false;
        
        lastError = validationError;
        break;
      }
    }

    // 모든 재시도 실패
    if (lastError) {
      this.retryStateManager.updateRetryState(lastError, folderPath);
    }

    return result!;
  }

  /**
   * 사용자 상호작용 기반 재시도 플로우
   */
  async validateWithUserRetry(
    initialFolderPath: string,
    processType: ProcessType,
    options: {
      enableCache?: boolean;
      maxUserRetries?: number;
    } = {}
  ): Promise<ValidationResult> {
    const { enableCache = true, maxUserRetries = 5 } = options;

    let currentFolderPath = initialFolderPath;
    let userRetryCount = 0;

    while (userRetryCount < maxUserRetries) {
      // 자동 재시도 수행
      const result = await this.validateWithRetry(
        currentFolderPath,
        processType,
        { enableCache }
      );

      // 성공한 경우
      if (result.success) {
        return result;
      }

      // 사용자에게 재시도 옵션 제공
      const userChoice = await this.showRetryOptions(result);

      switch (userChoice) {
        case 'retry-same-folder':
          // 같은 폴더로 재시도
          this.validationCache.invalidate(currentFolderPath, processType);
          break;

        case 'retry-different-folder':
          // 다른 폴더 선택
          const folderResult = await this.folderDialogService.openFolderDialog();
          if (folderResult.success && folderResult.folderPath) {
            currentFolderPath = folderResult.folderPath;
          } else {
            return result; // 사용자가 폴더 선택 취소
          }
          break;

        case 'cancel':
          // 취소
          return result;

        default:
          return result;
      }

      userRetryCount++;
    }

    // 최대 사용자 재시도 횟수 초과
    const maxRetryResult = createEmptyValidationResult();
    maxRetryResult.errors.push(new ValidationError(
      'MAX_USER_RETRIES_EXCEEDED',
      `Maximum user retries exceeded (${maxUserRetries})`,
      `최대 재시도 횟수(${maxUserRetries}회)를 초과했습니다.`,
      ['나중에 다시 시도해보세요.', '기술 지원팀에 문의하세요.'],
      'high',
      { maxUserRetries, userRetryCount }
    ));
    maxRetryResult.success = false;

    return maxRetryResult;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * 재시도 가능한 오류인지 확인
   */
  private isRetryableError(error: ValidationError): boolean {
    return this.config.retryableErrors.includes(error.code);
  }

  /**
   * 일시적 오류인지 확인
   */
  private isTransientError(error: ValidationError): boolean {
    return this.config.transientErrors.includes(error.code);
  }

  /**
   * 재시도 대기
   */
  private async waitForRetry(delay: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  /**
   * 사용자 재시도 옵션 표시
   */
  private async showRetryOptions(
    result: ValidationResult
  ): Promise<'retry-same-folder' | 'retry-different-folder' | 'cancel'> {
    const primaryError = result.errors[0];
    
    if (isFileMissingError(primaryError)) {
      // 파일 누락 - 다른 폴더 선택 권장
      return await this.showRetryDialog(
        '필수 파일이 누락되었습니다.',
        '다른 폴더 선택',
        '같은 폴더에서 재시도',
        '취소'
      );
    } else if (isPermissionError(primaryError)) {
      // 권한 오류 - 같은 폴더 재시도 권장
      return await this.showRetryDialog(
        '파일 접근 권한 오류가 발생했습니다.',
        '같은 폴더에서 재시도',
        '다른 폴더 선택',
        '취소'
      );
    } else if (isFileFormatError(primaryError)) {
      // 형식 오류 - 다른 폴더 선택 권장
      return await this.showRetryDialog(
        '파일 형식 오류가 발생했습니다.',
        '다른 폴더 선택',
        '같은 폴더에서 재시도',
        '취소'
      );
    } else {
      // 기타 오류 - 기본 옵션
      return await this.showRetryDialog(
        '파일 검증에 실패했습니다.',
        '다른 폴더 선택',
        '같은 폴더에서 재시도',
        '취소'
      );
    }
  }

  /**
   * 재시도 다이얼로그 표시
   */
  private async showRetryDialog(
    message: string,
    primaryAction: string,
    secondaryAction: string,
    cancelAction: string
  ): Promise<'retry-same-folder' | 'retry-different-folder' | 'cancel'> {
    return new Promise((resolve) => {
      // 서버/워커 환경에서는 기본적으로 취소 반환
      if (!isRenderer()) {
        console.warn('showRetryDialog: Not in renderer process, defaulting to cancel');
        resolve('cancel');
        return;
      }
      
      // renderer process 환경 체크
      const windowObj = getWindow();
      const electronAPI = windowObj?.electronAPI;
      if (electronAPI && electronAPI.showRetryDialog) {
        electronAPI.showRetryDialog({
          title: '재시도 옵션',
          message,
          primaryAction,
          secondaryAction,
          cancelAction
        }).then((result: string) => {
          switch (result) {
            case primaryAction:
              resolve(primaryAction.includes('다른 폴더') ? 'retry-different-folder' : 'retry-same-folder');
              break;
            case secondaryAction:
              resolve(secondaryAction.includes('다른 폴더') ? 'retry-different-folder' : 'retry-same-folder');
              break;
            default:
              resolve('cancel');
          }
        });
      } else if (windowObj?.confirm) {
        // 폴백: 기본 확인 다이얼로그 (renderer process에서만)
        const userChoice = windowObj.confirm(
          `${message}\n\n${primaryAction}을 선택하려면 확인을, ${cancelAction}을 선택하려면 취소를 클릭하세요.`
        );
        
        if (userChoice) {
          resolve(primaryAction.includes('다른 폴더') ? 'retry-different-folder' : 'retry-same-folder');
        } else {
          resolve('cancel');
        }
      } else {
        // renderer process가 아닌 경우 자동으로 취소
        console.warn('showRetryDialog: Not in renderer process, defaulting to cancel');
        resolve('cancel');
      }
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * 재시도 상태 조회
   */
  getRetryState(): Readonly<RetryState> {
    return this.retryStateManager.getState();
  }

  /**
   * 재시도 상태 초기화
   */
  resetRetryState(): void {
    this.retryStateManager.reset();
  }

  /**
   * 검증 캐시 클리어
   */
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  /**
   * 재시도 설정 업데이트
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 재시도 통계 조회
   */
  getRetryStatistics(): {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryTime: number;
  } {
    const state = this.retryStateManager.getState();
    
    return {
      totalRetries: state.retryHistory.length,
      successfulRetries: 0, // 성공 시 상태가 리셋되므로 추적 필요
      failedRetries: state.retryHistory.length,
      averageRetryTime: state.retryHistory.reduce(
        (sum, entry) => sum + (entry.timestamp - (state.retryHistory[0]?.timestamp || 0)),
        0
      ) / Math.max(state.retryHistory.length, 1)
    };
  }
}

// ============================================================================
// Service Instance
// ============================================================================

/**
 * 재시도 및 복구 서비스 인스턴스 (싱글톤)
 */
let retryRecoveryServiceInstance: RetryRecoveryService | null = null;

/**
 * 재시도 및 복구 서비스 인스턴스 가져오기
 */
export function getRetryRecoveryService(): RetryRecoveryService {
  if (!retryRecoveryServiceInstance) {
    retryRecoveryServiceInstance = new RetryRecoveryService();
  }
  return retryRecoveryServiceInstance;
}

/**
 * 재시도 및 복구 서비스 인스턴스 리셋 (테스트용)
 */
export function resetRetryRecoveryService(): void {
  retryRecoveryServiceInstance = null;
}

export default RetryRecoveryService;