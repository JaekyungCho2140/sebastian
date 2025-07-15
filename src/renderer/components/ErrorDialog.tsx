import React, { useState, useEffect } from 'react'

export interface ErrorDialogData {
  title: string
  message: string
  error?: Error
  details?: string
  stack?: string
  timestamp?: number
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

interface ErrorDialogProps {
  isOpen: boolean
  errorData: ErrorDialogData | null
  onClose: () => void
  onReport?: (errorData: ErrorDialogData) => void
  onRestart?: () => void
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  isOpen,
  errorData,
  onClose,
  onReport,
  onRestart
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [isReporting, setIsReporting] = useState(false)

  // ESC 키로 다이얼로그 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // 다이얼로그가 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleReport = async () => {
    if (!errorData || !onReport) return

    setIsReporting(true)
    try {
      await onReport(errorData)
    } catch (error) {
      console.error('Failed to report error:', error)
    } finally {
      setIsReporting(false)
    }
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '⚡'
      case 'low':
        return 'ℹ️'
      default:
        return '⚠️'
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'var(--error-critical)'
      case 'high':
        return 'var(--error-high)'
      case 'medium':
        return 'var(--error-medium)'
      case 'low':
        return 'var(--error-low)'
      default:
        return 'var(--error-high)'
    }
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (!isOpen || !errorData) {
    return null
  }

  return (
    <div className="error-dialog-overlay" onClick={onClose}>
      <div className="error-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="error-dialog-header">
          <div className="error-dialog-title">
            <span 
              className="error-icon"
              style={{ color: getSeverityColor(errorData.severity) }}
            >
              {getSeverityIcon(errorData.severity)}
            </span>
            <h2>{errorData.title}</h2>
          </div>
          <button 
            className="error-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="error-dialog-content">
          <div className="error-message">
            <p>{errorData.message}</p>
          </div>

          {errorData.timestamp && (
            <div className="error-timestamp">
              <small>Occurred at: {formatTimestamp(errorData.timestamp)}</small>
            </div>
          )}

          {(errorData.details || errorData.stack || errorData.error) && (
            <div className="error-details-section">
              <button
                className="error-details-toggle"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'} 
                <span className={`arrow ${showDetails ? 'up' : 'down'}`}>▼</span>
              </button>

              {showDetails && (
                <div className="error-details-content">
                  {errorData.details && (
                    <div className="error-detail-block">
                      <h4>Details:</h4>
                      <pre>{errorData.details}</pre>
                    </div>
                  )}

                  {errorData.error && (
                    <div className="error-detail-block">
                      <h4>Error Object:</h4>
                      <pre>{errorData.error.toString()}</pre>
                    </div>
                  )}

                  {(errorData.stack || errorData.error?.stack) && (
                    <div className="error-detail-block">
                      <h4>Stack Trace:</h4>
                      <pre>{errorData.stack || errorData.error?.stack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="error-dialog-actions">
          <div className="primary-actions">
            <button 
              className="dialog-button primary"
              onClick={onClose}
            >
              OK
            </button>
            
            {onRestart && (
              <button 
                className="dialog-button secondary"
                onClick={onRestart}
              >
                Restart App
              </button>
            )}
          </div>

          <div className="secondary-actions">
            {onReport && (
              <button 
                className="dialog-button report"
                onClick={handleReport}
                disabled={isReporting}
              >
                {isReporting ? 'Sending...' : 'Report Error'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDialog