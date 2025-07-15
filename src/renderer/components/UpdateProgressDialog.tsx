import React, { useState, useEffect } from 'react'
import { UpdateProgress } from '../../shared/types'

interface UpdateProgressDialogProps {
  isOpen: boolean
  progress: UpdateProgress | null
  onCancel?: () => void
  canCancel?: boolean
}

const UpdateProgressDialog: React.FC<UpdateProgressDialogProps> = ({
  isOpen,
  progress,
  onCancel,
  canCancel = false
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  // Animate progress bar
  useEffect(() => {
    if (progress) {
      const targetProgress = progress.progress
      const duration = 300 // ms
      const steps = 30
      const stepSize = (targetProgress - animatedProgress) / steps
      const stepDuration = duration / steps

      let currentStep = 0
      const interval = setInterval(() => {
        if (currentStep >= steps) {
          clearInterval(interval)
          setAnimatedProgress(targetProgress)
          return
        }

        setAnimatedProgress(prev => prev + stepSize)
        currentStep++
      }, stepDuration)

      return () => clearInterval(interval)
    }
  }, [progress?.progress, animatedProgress])

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return '0 B/s'
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024))
    return Math.round((bytesPerSecond / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'downloading':
        return '⬇️'
      case 'installing':
        return '⚙️'
      case 'complete':
        return '✅'
      default:
        return '📦'
    }
  }

  const getStageMessage = (stage: string) => {
    switch (stage) {
      case 'downloading':
        return 'Downloading update...'
      case 'installing':
        return 'Installing update...'
      case 'complete':
        return 'Update completed successfully!'
      default:
        return 'Preparing update...'
    }
  }

  if (!isOpen || !progress) {
    return null
  }

  return (
    <div className="update-progress-overlay">
      <div className="update-progress-dialog">
        <div className="update-progress-header">
          <div className="update-progress-title">
            <span className="progress-icon">{getStageIcon(progress.stage)}</span>
            <h2>Updating Sebastian</h2>
          </div>
        </div>

        <div className="update-progress-content">
          <div className="progress-stage">
            <p className="stage-message">{progress.message || getStageMessage(progress.stage)}</p>
          </div>

          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(Math.max(animatedProgress, 0), 100)}%` }}
                />
              </div>
              <div className="progress-percentage">
                {Math.round(progress.progress)}%
              </div>
            </div>
          </div>

          {progress.stage === 'downloading' && (
            <div className="download-details">
              <div className="download-info">
                {progress.downloadedSize && progress.downloadSize && (
                  <span className="download-size">
                    {formatFileSize(progress.downloadedSize)} of {formatFileSize(progress.downloadSize)}
                  </span>
                )}
                {progress.speed && (
                  <span className="download-speed">
                    {formatSpeed(progress.speed)}
                  </span>
                )}
              </div>
              
              {progress.downloadSize && progress.downloadedSize && (
                <div className="estimated-time">
                  {progress.speed && progress.speed > 0 && (
                    <span className="time-remaining">
                      {(() => {
                        const remainingBytes = progress.downloadSize - progress.downloadedSize
                        const seconds = Math.ceil(remainingBytes / progress.speed)
                        const minutes = Math.floor(seconds / 60)
                        const remainingSeconds = seconds % 60
                        
                        if (minutes > 0) {
                          return `${minutes}m ${remainingSeconds}s remaining`
                        } else {
                          return `${remainingSeconds}s remaining`
                        }
                      })()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {progress.stage === 'installing' && (
            <div className="install-details">
              <p className="install-message">
                Please wait while Sebastian is being updated. The application will restart 
                automatically when the installation is complete.
              </p>
            </div>
          )}

          {progress.stage === 'complete' && (
            <div className="complete-details">
              <p className="complete-message">
                Sebastian has been successfully updated! The application will restart shortly.
              </p>
            </div>
          )}
        </div>

        {canCancel && progress.stage === 'downloading' && (
          <div className="update-progress-actions">
            <button 
              className="dialog-button cancel"
              onClick={onCancel}
            >
              Cancel Update
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpdateProgressDialog