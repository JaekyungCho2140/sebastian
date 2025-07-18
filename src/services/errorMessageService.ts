/**
 * M4 Excel Processing Error Message Service
 * 
 * This service handles conversion of validation errors to user-friendly
 * messages and integration with Sebastian's error dialog system.
 */

import {
  ValidationError,
  FileMissingError,
  FileFormatError,
  PermissionError,
  ValidationResult,
  isFileMissingError,
  isFileFormatError,
  isPermissionError,
  sortErrorsBySeverity
} from '../types/m4ValidationErrors';
import { ErrorDialogData } from '../types/errorDialog';
import { isRenderer, getWindow, getNavigator } from '../utils/environment';

// ============================================================================
// Error Message Formatter
// ============================================================================

export class ErrorMessageFormatter {
  private static readonly LEARN_MORE_BASE_URL = 'https://sebastian-docs.example.com/troubleshooting';
  private static readonly SUPPORT_EMAIL = 'support@sebastian.example.com';

  /**
   * ValidationError를 ErrorDialogData로 변환
   */
  static formatValidationError(error: ValidationError): ErrorDialogData {
    const baseData: ErrorDialogData = {
      title: this.getErrorTitle(error),
      message: this.getFormattedMessage(error),
      severity: error.severity,
      timestamp: Date.now(),
      details: this.getErrorDetails(error)
    };

    // 에러 타입별 추가 정보
    if (isFileMissingError(error)) {
      baseData.title = `필수 파일 누락 - ${error.processType === 'dialogue' ? 'M4 Dialogue' : 'M4 String'}`;
    } else if (isFileFormatError(error)) {
      baseData.title = `파일 형식 오류 - ${error.fileName}`;
    } else if (isPermissionError(error)) {
      baseData.title = `파일 접근 권한 오류 - ${error.fileName}`;
    }

    return baseData;
  }

  /**
   * ValidationResult를 ErrorDialogData로 변환
   */
  static formatValidationResult(result: ValidationResult): ErrorDialogData {
    const sortedErrors = sortErrorsBySeverity(result.errors);
    const primaryError = sortedErrors[0];
    const totalErrors = result.errors.length;
    const totalWarnings = result.warnings.length;

    let title = '파일 검증 실패';
    let message = '';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

    if (primaryError) {
      // 주요 에러 기반 메시지 생성
      title = this.getErrorTitle(primaryError);
      message = this.getFormattedMessage(primaryError);
      severity = primaryError.severity;

      // 다중 에러 정보 추가
      if (totalErrors > 1) {
        message += `\n\n추가로 ${totalErrors - 1}개의 ${totalErrors - 1 === 1 ? '오류가' : '오류들이'} 발견되었습니다.`;
      }

      if (totalWarnings > 0) {
        message += `\n경고: ${totalWarnings}개의 ${totalWarnings === 1 ? '경고가' : '경고들이'} 있습니다.`;
      }
    } else {
      // 에러는 없지만 경고만 있는 경우
      title = '파일 검증 경고';
      message = `${totalWarnings}개의 경고가 발견되었습니다.\n\n파일을 계속 처리할 수 있지만, 경고 사항을 확인하는 것이 좋습니다.`;
      severity = 'medium';
    }

    return {
      title,
      message,
      severity,
      timestamp: Date.now(),
      details: this.getValidationResultDetails(result)
    };
  }

  /**
   * 에러 제목 생성
   */
  private static getErrorTitle(error: ValidationError): string {
    switch (error.code) {
      case 'FILE_MISSING':
        return '필수 파일 누락';
      case 'FILE_FORMAT':
        return '파일 형식 오류';
      case 'PERMISSION':
        return '파일 접근 권한 오류';
      case 'FOLDER_NOT_FOUND':
        return '폴더를 찾을 수 없음';
      case 'VALIDATION_FAILED':
        return '파일 검증 실패';
      default:
        return '알 수 없는 오류';
    }
  }

  /**
   * 사용자 친화적 메시지 생성
   */
  private static getFormattedMessage(error: ValidationError): string {
    let message = error.userMessage;

    // 해결 방법 추가
    if (error.resolutionSteps && error.resolutionSteps.length > 0) {
      message += '\n\n해결 방법:';
      error.resolutionSteps.forEach((step, index) => {
        message += `\n${index + 1}. ${step}`;
      });
    }

    // 추가 도움말 링크
    const learnMoreUrl = this.getLearnMoreUrl(error.code);
    if (learnMoreUrl) {
      message += `\n\n자세한 정보: ${learnMoreUrl}`;
    }

    return message;
  }

  /**
   * 에러 세부사항 생성
   */
  private static getErrorDetails(error: ValidationError): string {
    const details = [`오류 코드: ${error.code}`];
    
    if (error.context) {
      details.push('\n컨텍스트 정보:');
      Object.entries(error.context).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          details.push(`  ${key}: ${value}`);
        } else if (Array.isArray(value)) {
          details.push(`  ${key}: [${value.join(', ')}]`);
        } else {
          details.push(`  ${key}: ${JSON.stringify(value)}`);
        }
      });
    }

    details.push(`\n기술적 메시지: ${error.message}`);
    
    if (error.stack) {
      details.push(`\n스택 트레이스:\n${error.stack}`);
    }

    return details.join('\n');
  }

  /**
   * 검증 결과 세부사항 생성
   */
  private static getValidationResultDetails(result: ValidationResult): string {
    const details = [
      `검증 시간: ${result.validationTime}ms`,
      `전체 파일 수: ${result.summary.totalFiles}`,
      `유효한 파일 수: ${result.summary.validFiles}`,
      `무효한 파일 수: ${result.summary.invalidFiles}`,
      `오류 수: ${result.summary.errorCount}`,
      `경고 수: ${result.summary.warningCount}`
    ];

    if (result.validatedFiles.length > 0) {
      details.push(`\n검증된 파일:`);
      result.validatedFiles.forEach(file => {
        details.push(`  - ${file}`);
      });
    }

    if (result.errors.length > 0) {
      details.push(`\n오류 목록:`);
      result.errors.forEach((error, index) => {
        details.push(`  ${index + 1}. [${error.code}] ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      details.push(`\n경고 목록:`);
      result.warnings.forEach((warning, index) => {
        details.push(`  ${index + 1}. [${warning.code}] ${warning.message}`);
      });
    }

    return details.join('\n');
  }

  /**
   * 도움말 URL 생성
   */
  private static getLearnMoreUrl(errorCode: string): string | null {
    const urlMap: Record<string, string> = {
      'FILE_MISSING': `${this.LEARN_MORE_BASE_URL}/file-missing`,
      'FILE_FORMAT': `${this.LEARN_MORE_BASE_URL}/file-format`,
      'PERMISSION': `${this.LEARN_MORE_BASE_URL}/file-permissions`,
      'FOLDER_NOT_FOUND': `${this.LEARN_MORE_BASE_URL}/folder-not-found`,
      'VALIDATION_FAILED': `${this.LEARN_MORE_BASE_URL}/validation-failed`
    };

    return urlMap[errorCode] || null;
  }
}

// ============================================================================
// Error Dialog Integration
// ============================================================================

export class ValidationErrorDialog {
  private static readonly RETRY_DIALOG_DELAY = 300; // 300ms

  /**
   * 검증 오류를 다이얼로그로 표시
   */
  static async showValidationError(
    error: ValidationError,
    onRetry?: () => void,
    onCancel?: () => void
  ): Promise<'retry' | 'cancel'> {
    return new Promise((resolve) => {
      const errorDialogData = ErrorMessageFormatter.formatValidationError(error);
      
      // 사용자 선택 다이얼로그 표시
      this.showErrorDialog(
        errorDialogData,
        () => {
          if (onRetry) onRetry();
          resolve('retry');
        },
        () => {
          if (onCancel) onCancel();
          resolve('cancel');
        }
      );
    });
  }

  /**
   * 검증 결과를 다이얼로그로 표시
   */
  static async showValidationResult(
    result: ValidationResult,
    onRetry?: () => void,
    onCancel?: () => void
  ): Promise<'retry' | 'cancel'> {
    return new Promise((resolve) => {
      const errorDialogData = ErrorMessageFormatter.formatValidationResult(result);
      
      // 사용자 선택 다이얼로그 표시
      this.showErrorDialog(
        errorDialogData,
        () => {
          if (onRetry) onRetry();
          resolve('retry');
        },
        () => {
          if (onCancel) onCancel();
          resolve('cancel');
        }
      );
    });
  }

  /**
   * 재시도 확인 다이얼로그 표시
   */
  static async showRetryDialog(
    errorMessage: string,
    onRetryWithDifferentFolder?: () => void,
    onCancel?: () => void
  ): Promise<'retry' | 'cancel'> {
    return new Promise((resolve) => {
      const errorDialogData: ErrorDialogData = {
        title: '다시 시도하시겠습니까?',
        message: `${errorMessage}\n\n다른 폴더를 선택하여 다시 시도하거나 작업을 취소할 수 있습니다.`,
        severity: 'medium',
        timestamp: Date.now()
      };

      this.showErrorDialog(
        errorDialogData,
        () => {
          if (onRetryWithDifferentFolder) onRetryWithDifferentFolder();
          resolve('retry');
        },
        () => {
          if (onCancel) onCancel();
          resolve('cancel');
        },
        '다른 폴더 선택',
        '취소'
      );
    });
  }

  /**
   * 에러 다이얼로그 표시 (내부 구현)
   */
  private static showErrorDialog(
    errorDialogData: ErrorDialogData,
    onRetry?: () => void,
    onCancel?: () => void,
    retryText: string = '다시 시도',
    cancelText: string = '취소'
  ): void {
    // renderer process 환경 체크
    if (isRenderer()) {
      // IPC를 통해 메인 프로세스에 다이얼로그 표시 요청
      const windowObj = getWindow();
      const ipcRenderer = windowObj?.electronAPI;
      
      if (ipcRenderer && ipcRenderer.showErrorDialog) {
        ipcRenderer.showErrorDialog(
          errorDialogData,
          {
            showRetry: !!onRetry,
            showCancel: !!onCancel,
            retryText,
            cancelText
          }
        ).then((result: 'retry' | 'cancel') => {
          if (result === 'retry' && onRetry) {
            setTimeout(onRetry, this.RETRY_DIALOG_DELAY);
          } else if (result === 'cancel' && onCancel) {
            onCancel();
          }
        });
      } else if (windowObj?.confirm) {
        // 폴백: 브라우저 기본 다이얼로그
        const userChoice = windowObj.confirm(
          `${errorDialogData.title}\n\n${errorDialogData.message}\n\n${retryText}을 선택하려면 확인을, ${cancelText}을 선택하려면 취소를 클릭하세요.`
        );
        
        if (userChoice && onRetry) {
          setTimeout(onRetry, this.RETRY_DIALOG_DELAY);
        } else if (!userChoice && onCancel) {
          onCancel();
        }
      }
    } else {
      // main process나 worker에서 호출된 경우
      console.warn('showErrorDialog: Not in renderer process, cannot show dialog');
      if (onCancel) {
        onCancel();
      }
    }
  }
}

// ============================================================================
// Error Notification Service
// ============================================================================

export class ErrorNotificationService {
  private static readonly NOTIFICATION_TIMEOUT = 5000; // 5초

  /**
   * 간단한 오류 알림 표시
   */
  static showErrorNotification(
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    if (isRenderer()) {
      const windowObj = getWindow();
      const ipcRenderer = windowObj?.electronAPI;
      
      if (ipcRenderer && ipcRenderer.showNotification) {
        ipcRenderer.showNotification({
          title,
          body: message,
          type: severity === 'high' ? 'error' : 'warning',
          timeout: this.NOTIFICATION_TIMEOUT
        });
      }
    } else {
      // main process나 worker에서 호출된 경우 콘솔 로그
      console.warn(`Error Notification [${severity}]: ${title} - ${message}`);
    }
  }

  /**
   * 성공 알림 표시
   */
  static showSuccessNotification(
    title: string,
    message: string
  ): void {
    if (isRenderer()) {
      const windowObj = getWindow();
      const ipcRenderer = windowObj?.electronAPI;
      
      if (ipcRenderer && ipcRenderer.showNotification) {
        ipcRenderer.showNotification({
          title,
          body: message,
          type: 'success',
          timeout: this.NOTIFICATION_TIMEOUT
        });
      }
    } else {
      // main process나 worker에서 호출된 경우 콘솔 로그
      console.info(`Success Notification: ${title} - ${message}`);
    }
  }

  /**
   * 검증 성공 알림
   */
  static showValidationSuccessNotification(
    fileCount: number,
    validationTime: number
  ): void {
    this.showSuccessNotification(
      '파일 검증 성공',
      `${fileCount}개의 파일이 성공적으로 검증되었습니다. (${validationTime}ms)`
    );
  }

  /**
   * 검증 실패 알림
   */
  static showValidationFailureNotification(
    errorCount: number,
    warningCount: number
  ): void {
    const message = `${errorCount}개의 오류${warningCount > 0 ? `와 ${warningCount}개의 경고` : ''}가 발견되었습니다.`;
    this.showErrorNotification(
      '파일 검증 실패',
      message,
      'high'
    );
  }
}

// ============================================================================
// Error Message Utilities
// ============================================================================

export class ErrorMessageUtils {
  /**
   * 에러 메시지를 로컬라이즈
   */
  static localizeErrorMessage(
    error: ValidationError,
    locale: string = 'ko'
  ): string {
    if (locale === 'ko') {
      return error.userMessage;
    }
    
    // 영어 메시지 (기본값)
    return error.message;
  }

  /**
   * 에러 메시지를 클립보드에 복사
   */
  static async copyErrorToClipboard(error: ValidationError): Promise<void> {
    const errorText = [
      `Error Code: ${error.code}`,
      `Message: ${error.message}`,
      `User Message: ${error.userMessage}`,
      `Severity: ${error.severity}`,
      `Timestamp: ${new Date().toISOString()}`
    ].join('\n');

    const navigator = getNavigator();
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(errorText);
      } catch (err) {
        console.error('Failed to copy error to clipboard:', err);
      }
    } else {
      console.warn('Clipboard API not available in this environment');
      console.log('Error text:', errorText);
    }
  }

  /**
   * 에러 메시지를 파일로 저장
   */
  static async saveErrorToFile(
    error: ValidationError,
    filename?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `sebastian-error-${timestamp}.txt`;
    
    const errorText = [
      `Sebastian Error Report`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Error Code: ${error.code}`,
      `Severity: ${error.severity}`,
      `Message: ${error.message}`,
      `User Message: ${error.userMessage}`,
      ``,
      `Resolution Steps:`,
      ...error.resolutionSteps.map((step, index) => `${index + 1}. ${step}`),
      ``,
      `Context:`,
      JSON.stringify(error.context, null, 2),
      ``,
      `Stack Trace:`,
      error.stack || 'No stack trace available'
    ].join('\n');

    if (isRenderer()) {
      const windowObj = getWindow();
      const ipcRenderer = windowObj?.electronAPI;
      
      if (ipcRenderer && ipcRenderer.saveFile) {
        await ipcRenderer.saveFile(
          filename || defaultFilename,
          errorText,
          'text/plain'
        );
      }
    } else {
      console.warn('Cannot save file in non-renderer environment');
      console.log('Error report:', errorText);
    }
  }

  /**
   * 에러 심각도에 따른 색상 반환
   */
  static getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'high':
        return '#ff4444';
      case 'medium':
        return '#ff8800';
      case 'low':
        return '#4488ff';
      default:
        return '#666666';
    }
  }

  /**
   * 에러 심각도에 따른 아이콘 반환
   */
  static getSeverityIcon(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '❓';
    }
  }
}

// ============================================================================
// Service Instances
// ============================================================================

/**
 * 에러 메시지 서비스 인스턴스 (싱글톤)
 */
export const errorMessageService = {
  formatter: ErrorMessageFormatter,
  dialog: ValidationErrorDialog,
  notification: ErrorNotificationService,
  utils: ErrorMessageUtils
};

export default errorMessageService;