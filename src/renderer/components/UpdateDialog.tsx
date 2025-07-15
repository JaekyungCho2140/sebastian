import React, { useState, useEffect } from 'react'
import { UpdateInfo } from '../../shared/types'

export interface UpdateDialogData {
  updateInfo: UpdateInfo
  downloadSize?: number
  isUpdateAvailable: boolean
}

interface UpdateDialogProps {
  isOpen: boolean
  updateData: UpdateDialogData | null
  onClose: () => void
  onUpdateNow: () => void
  onUpdateLater: () => void
  onIgnoreUpdate: () => void
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isOpen,
  updateData,
  onClose,
  onUpdateNow,
  onUpdateLater,
  onIgnoreUpdate
}) => {
  const [showChangelog, setShowChangelog] = useState(false)

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

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatReleaseDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const handleUpdateNow = () => {
    onUpdateNow()
    onClose()
  }

  const handleUpdateLater = () => {
    onUpdateLater()
    onClose()
  }

  const handleIgnoreUpdate = () => {
    onIgnoreUpdate()
    onClose()
  }

  if (!isOpen || !updateData) {
    return null
  }

  const { updateInfo, downloadSize } = updateData

  return (
    <div className="update-dialog-overlay" onClick={onClose}>
      <div className="update-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="update-dialog-header">
          <div className="update-dialog-title">
            <span className="update-icon">🚀</span>
            <h2>Update Available</h2>
          </div>
          <button 
            className="update-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="update-dialog-content">
          <div className="update-info">
            <div className="version-info">
              <h3>Sebastian {updateInfo.version}</h3>
              <p className="release-date">
                Released on {formatReleaseDate(updateInfo.releaseDate)}
              </p>
            </div>

            {downloadSize && (
              <div className="download-info">
                <span className="download-size">
                  Download size: {formatFileSize(downloadSize)}
                </span>
              </div>
            )}
          </div>

          {updateInfo.changelog && (
            <div className="changelog-section">
              <button
                className="changelog-toggle"
                onClick={() => setShowChangelog(!showChangelog)}
              >
                {showChangelog ? 'Hide' : 'Show'} What's New
                <span className={`arrow ${showChangelog ? 'up' : 'down'}`}>▼</span>
              </button>

              {showChangelog && (
                <div className="changelog-content">
                  <div className="changelog-text">
                    {updateInfo.changelog.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="update-description">
            <p>
              A new version of Sebastian is available. Would you like to update now?
            </p>
            <p className="update-note">
              The update will download and install automatically. Sebastian will restart 
              when the update is complete.
            </p>
          </div>
        </div>

        <div className="update-dialog-actions">
          <div className="primary-actions">
            <button 
              className="dialog-button primary"
              onClick={handleUpdateNow}
            >
              Update Now
            </button>
            
            <button 
              className="dialog-button secondary"
              onClick={handleUpdateLater}
            >
              Later
            </button>
          </div>

          <div className="secondary-actions">
            <button 
              className="dialog-button ignore"
              onClick={handleIgnoreUpdate}
            >
              Ignore This Version
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateDialog