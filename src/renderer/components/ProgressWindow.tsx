import React, { useEffect, useState } from 'react'
import { MergeProgress } from '../services/m4DialogueMerger'
import './ProgressWindow.css'

interface ProgressWindowProps {
  isOpen: boolean
  onClose: () => void
  progress: MergeProgress | null
}

const ProgressWindow: React.FC<ProgressWindowProps> = ({ isOpen, onClose, progress }) => {
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (progress && progress.percentage >= 100) {
      setIsCompleted(true)
    }
  }, [progress])

  if (!isOpen) return null

  const handleClose = () => {
    if (isCompleted || error) {
      setIsCompleted(false)
      setError(null)
      onClose()
    }
  }

  return (
    <div className="progress-window-overlay">
      <div className="progress-window">
        <div className="progress-header">
          <h2>M4 Dialogue Merge Progress</h2>
          {(isCompleted || error) && (
            <button className="close-button" onClick={handleClose}>
              ×
            </button>
          )}
        </div>

        <div className="progress-body">
          {error ? (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="progress-status">
                {progress?.status || 'Initializing...'}
              </div>

              <div className="progress-bar-container">
                <div 
                  className="progress-bar"
                  style={{ width: `${progress?.percentage || 0}%` }}
                />
              </div>

              <div className="progress-percentage">
                {progress?.percentage || 0}%
              </div>

              {isCompleted && (
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  <p>Merge completed successfully!</p>
                </div>
              )}
            </>
          )}
        </div>

        {(isCompleted || error) && (
          <div className="progress-footer">
            <button className="primary-button" onClick={handleClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProgressWindow