import { useState, useCallback } from 'react'
import { ErrorDialogData } from '../../types/errorDialog'

interface UseErrorDialogReturn {
  isOpen: boolean
  errorData: ErrorDialogData | null
  showError: (errorData: ErrorDialogData) => void
  closeDialog: () => void
  reportError: (errorData: ErrorDialogData) => Promise<void>
  restartApp: () => void
}

export const useErrorDialog = (): UseErrorDialogReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [errorData, setErrorData] = useState<ErrorDialogData | null>(null)

  const showError = useCallback((data: ErrorDialogData) => {
    setErrorData(data)
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    // 애니메이션 완료 후 데이터 정리
    setTimeout(() => {
      setErrorData(null)
    }, 300)
  }, [])

  const reportError = useCallback(async (data: ErrorDialogData) => {
    try {
      // electronAPI가 사용 가능한지 확인
      if (window.electronAPI && window.electronAPI.reportError) {
        await window.electronAPI.reportError({
          title: data.title,
          message: data.message,
          error: data.error || new Error(data.message),
          errorType: 'javascript',
          severity: data.severity || 'medium',
          context: {
            customData: {
              title: data.title,
              message: data.message,
              details: data.details,
              timestamp: data.timestamp || Date.now(),
              userReported: true,
              url: window.location.href
            }
          },
          url: window.location.href,
          stack: data.stack || data.error?.stack
        })
      } else {
        console.warn('electronAPI.reportError is not available')
      }
    } catch (error) {
      console.error('Failed to report error:', error)
      throw error
    }
  }, [])

  const restartApp = useCallback(() => {
    try {
      // electronAPI를 통해 앱 재시작 요청
      if (window.electronAPI && window.electronAPI.restartApp) {
        window.electronAPI.restartApp()
      } else {
        // fallback: 페이지 새로고침
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to restart app:', error)
      // 최후 수단: 페이지 새로고침
      window.location.reload()
    }
  }, [])

  return {
    isOpen,
    errorData,
    showError,
    closeDialog,
    reportError,
    restartApp
  }
}

// 전역 에러 핸들러용 유틸리티 함수들
export const createErrorDialogData = (
  error: Error,
  title?: string,
  message?: string,
  severity?: 'low' | 'medium' | 'high' | 'critical'
): ErrorDialogData => {
  return {
    title: title || 'An unexpected error occurred',
    message: message || 'An error occurred in the application. If the problem persists, please contact the developer.',
    error,
    stack: error.stack,
    timestamp: Date.now(),
    severity: severity || 'high'
  }
}

export const createCustomErrorData = (
  title: string,
  message: string,
  details?: string,
  severity?: 'low' | 'medium' | 'high' | 'critical'
): ErrorDialogData => {
  return {
    title,
    message,
    details,
    timestamp: Date.now(),
    severity: severity || 'medium'
  }
}