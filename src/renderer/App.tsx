import React, { useEffect } from 'react'
import MainContent from './components/MainContent'
import Footer from './components/Footer'
import ErrorDialog from './components/ErrorDialog'
import UpdateDialog from './components/UpdateDialog'
import UpdateProgressDialog from './components/UpdateProgressDialog'
import { useErrorDialog, createErrorDialogData } from './hooks/useErrorDialog'
import { useUpdateManager } from './hooks/useUpdateManager'

const App: React.FC = () => {
  const { isOpen, errorData, showError, closeDialog, reportError, restartApp } = useErrorDialog()
  const updateManager = useUpdateManager()

  // 전역 에러 핸들러 설정
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorData = createErrorDialogData(
        new Error(event.message),
        'JavaScript Error',
        'An error occurred during script execution.',
        'high'
      )
      showError(errorData)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      const errorData = createErrorDialogData(
        error,
        'Promise Rejection Error',
        'An unhandled Promise rejection occurred.',
        'high'
      )
      showError(errorData)
    }

    // 전역 에러 리스너 등록
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // 컴포넌트에서 에러 다이얼로그를 사용할 수 있도록 전역 함수 등록
    window.showErrorDialog = showError

    // 메인 프로세스로부터 에러 다이얼로그 표시 요청 수신
    if (window.electronAPI?.onShowErrorDialog) {
      window.electronAPI.onShowErrorDialog(showError)
    }

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      delete window.showErrorDialog
      
      // IPC 리스너 정리
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('show-error-dialog')
      }
    }
  }, [showError])

  return (
    <div className="app-container">
      <MainContent />
      <Footer />
      
      <ErrorDialog
        isOpen={isOpen}
        errorData={errorData}
        onClose={closeDialog}
        onReport={reportError}
        onRestart={restartApp}
      />
      
      <UpdateDialog
        isOpen={updateManager.isShowingUpdateDialog}
        updateData={updateManager.updateInfo ? {
          updateInfo: updateManager.updateInfo,
          isUpdateAvailable: updateManager.isUpdateAvailable
        } : null}
        onClose={updateManager.hideUpdateDialog}
        onUpdateNow={updateManager.updateNow}
        onUpdateLater={updateManager.updateLater}
        onIgnoreUpdate={updateManager.ignoreUpdate}
      />
      
      <UpdateProgressDialog
        isOpen={updateManager.isDownloading || updateManager.isInstalling}
        progress={updateManager.downloadProgress}
        onCancel={updateManager.isDownloading ? () => {
          // TODO: Implement cancel download
        } : undefined}
        canCancel={updateManager.isDownloading && !updateManager.isInstalling}
      />
    </div>
  )
}

export default App