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
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Enhanced progress bar animation with NSIS-optimized smooth transitions
  useEffect(() => {
    if (progress && progress.progress !== animatedProgress) {
      const targetProgress = progress.progress
      const currentTime = Date.now()
      const timeDiff = currentTime - lastUpdateTime
      
      // NSIS-specific timing adjustments
      const progressDiff = Math.abs(targetProgress - animatedProgress)
      const isNsisInstallation = progress.stage === 'installing'
      
      // Optimize duration based on NSIS installation characteristics
      let baseDuration = 500 // ms
      let maxDuration = 2000 // ms
      
      if (isNsisInstallation) {
        // NSIS installations can have irregular progress patterns
        // Use more conservative animation timing
        baseDuration = 800
        maxDuration = 3000
        
        // Special handling for phase transitions
        if (progress.phase !== 'preparation' && progressDiff > 20) {
          // Larger jumps in progress during extraction/registration phases
          baseDuration = 1200
          maxDuration = 4000
        }
      }
      
      const duration = Math.min(maxDuration, Math.max(baseDuration, progressDiff * 15))
      
      setIsAnimating(true)
      setLastUpdateTime(currentTime)
      
      // Higher step count for ultra-smooth animation
      const steps = Math.min(80, Math.max(40, progressDiff * 2))
      const stepDuration = duration / steps

      let currentStep = 0
      const interval = setInterval(() => {
        if (currentStep >= steps) {
          clearInterval(interval)
          setAnimatedProgress(targetProgress)
          setIsAnimating(false)
          return
        }

        setAnimatedProgress(prev => {
          // Enhanced easing for NSIS installations
          const easingFactor = isNsisInstallation 
            ? 1 - Math.pow(1 - (currentStep / steps), 2.5) // Smoother easing for NSIS
            : 1 - Math.pow(1 - (currentStep / steps), 3) // Original easing for others
          
          const newProgress = prev + (targetProgress - prev) * easingFactor * 0.1
          return Math.min(Math.max(newProgress, 0), 100)
        })
        currentStep++
      }, stepDuration)

      return () => {
        clearInterval(interval)
        setIsAnimating(false)
      }
    }
  }, [progress?.progress, animatedProgress, lastUpdateTime])

  // Update last seen progress when component unmounts or progress changes dramatically
  useEffect(() => {
    if (progress && Math.abs(progress.progress - animatedProgress) > 20) {
      setAnimatedProgress(progress.progress)
    }
  }, [progress?.stage, progress?.phase])

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

  const formatTimeRemaining = (milliseconds?: number): string => {
    if (!milliseconds || milliseconds <= 0) return 'Calculating...'
    
    const seconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    // NSIS-specific time formatting adjustments
    if (progress?.stage === 'installing') {
      // For NSIS installations, provide more realistic time estimates
      if (minutes > 5) {
        return 'A few minutes remaining'
      } else if (minutes > 2) {
        return `About ${minutes} minutes remaining`
      } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s remaining`
      } else if (remainingSeconds > 30) {
        return 'Less than a minute remaining'
      } else {
        return 'Almost complete...'
      }
    }
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s remaining`
    } else {
      return `${remainingSeconds}s remaining`
    }
  }

  const getPhaseDisplayName = (phase?: string): string => {
    switch (phase) {
      case 'preparation':
        return 'Preparing'
      case 'extracting':
        return 'Extracting files'
      case 'registering':
        return 'Registering components'
      case 'shortcuts':
        return 'Creating shortcuts'
      case 'uninstaller':
        return 'Setting up uninstaller'
      case 'completing':
        return 'Completing installation'
      case 'error':
        return 'Installation error'
      case 'cancelled':
        return 'Installation cancelled'
      case 'timeout':
        return 'Installation timeout'
      default:
        return 'Installing'
    }
  }

  const getPhaseIcon = (phase?: string): string => {
    switch (phase) {
      case 'preparation':
        return '🔧'
      case 'extracting':
        return '📦'
      case 'registering':
        return '⚙️'
      case 'shortcuts':
        return '🔗'
      case 'uninstaller':
        return '🗑️'
      case 'completing':
        return '✅'
      case 'error':
        return '❌'
      case 'cancelled':
        return '⏹️'
      case 'timeout':
        return '⏱️'
      default:
        return '⚙️'
    }
  }

  const getPhaseProgress = (phase?: string): number => {
    // NSIS-optimized phase progress thresholds
    switch (phase) {
      case 'preparation':
        return 5  // Reduced from 10 - preparation is usually very fast in NSIS
      case 'extracting':
        return 35 // Increased from 30 - extraction is the main work in NSIS
      case 'registering':
        return 70 // Increased from 60 - registry work is significant
      case 'shortcuts':
        return 85 // Increased from 80 - shortcuts creation is substantial
      case 'uninstaller':
        return 95 // Increased from 90 - uninstaller setup is near completion
      case 'completing':
        return 100
      default:
        return 0
    }
  }

  const getInstallationSteps = () => {
    const steps = [
      { phase: 'preparation', label: 'Preparing', icon: '🔧' },
      { phase: 'extracting', label: 'Extracting', icon: '📦' },
      { phase: 'registering', label: 'Registering', icon: '⚙️' },
      { phase: 'shortcuts', label: 'Shortcuts', icon: '🔗' },
      { phase: 'uninstaller', label: 'Uninstaller', icon: '🗑️' },
      { phase: 'completing', label: 'Completing', icon: '✅' }
    ]
    
    return steps.map(step => ({
      ...step,
      isActive: progress?.phase === step.phase,
      isCompleted: progress?.phase && getPhaseProgress(progress.phase) > getPhaseProgress(step.phase),
      isPending: progress?.phase && getPhaseProgress(progress.phase) < getPhaseProgress(step.phase)
    }))
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
    <div className="update-progress-overlay" role="dialog" aria-labelledby="update-dialog-title" aria-describedby="update-dialog-description">
      <div className="update-progress-dialog">
        <div className="update-progress-header">
          <div className="update-progress-title">
            <span className="progress-icon" aria-hidden="true">{getStageIcon(progress.stage)}</span>
            <h2 id="update-dialog-title">Updating Sebastian</h2>
          </div>
        </div>

        <div className="update-progress-content">
          <div className="progress-stage">
            <p id="update-dialog-description" className="stage-message">{progress.message || getStageMessage(progress.stage)}</p>
          </div>

          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div 
                className="progress-bar" 
                role="progressbar" 
                aria-valuenow={Math.round(progress.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Update progress: ${Math.round(progress.progress)}%`}
              >
                <div 
                  className={`progress-fill ${
                    isAnimating ? 'animating' : ''
                  } ${
                    progress?.stage === 'installing' ? 'nsis-installing' : ''
                  } ${
                    progress?.stage === 'installing' && progress?.phase !== 'preparation' ? 'nsis-phase-change' : ''
                  }`}
                  style={{ 
                    width: `${Math.min(Math.max(animatedProgress, 0), 100)}%`,
                    transition: isAnimating ? 'none' : 
                      progress?.stage === 'installing' && progress?.phase !== 'preparation' ? 'width 1.2s cubic-bezier(0.23, 1, 0.32, 1)' :
                      progress?.stage === 'installing' ? 'width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)' :
                      'width 0.3s ease-out'
                  }}
                />
              </div>
              <div className="progress-percentage" aria-live="polite">
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
              {/* Enhanced Phase Display */}
              <div className="install-phase-header">
                <div className="current-phase">
                  <span className="phase-icon">{getPhaseIcon(progress.phase)}</span>
                  <div className="phase-info">
                    <h3 className="phase-title">{getPhaseDisplayName(progress.phase)}</h3>
                    <p className="phase-subtitle">{progress.message || 'Processing...'}</p>
                  </div>
                </div>
                
                {progress.estimatedTimeRemaining && (
                  <div className="time-remaining-badge">
                    <span className="time-icon">⏱️</span>
                    <span className="time-value">
                      {formatTimeRemaining(progress.estimatedTimeRemaining)}
                    </span>
                  </div>
                )}
              </div>

              {/* Installation Steps Progress */}
              <div className="installation-steps" role="region" aria-labelledby="steps-heading">
                <div className="steps-header">
                  <h4 id="steps-heading">Installation Progress</h4>
                </div>
                <div className="steps-container" role="list">
                  {getInstallationSteps().map((step, index) => (
                    <div 
                      key={step.phase}
                      className={`step-item ${
                        step.isCompleted ? 'completed' : 
                        step.isActive ? 'active' : 
                        'pending'
                      }`}
                      role="listitem"
                      aria-current={step.isActive ? 'step' : undefined}
                    >
                      <div className="step-indicator" aria-hidden="true">
                        <span className="step-icon">
                          {step.isCompleted ? '✅' : step.isActive ? step.icon : '⏸️'}
                        </span>
                        <span className="step-number">{index + 1}</span>
                      </div>
                      <div className="step-content">
                        <span className="step-label">{step.label}</span>
                        <div className="step-progress" role="progressbar" aria-valuenow={step.isCompleted ? 100 : step.isActive ? 50 : 0} aria-valuemin={0} aria-valuemax={100}>
                          <div 
                            className="step-progress-bar"
                            style={{
                              width: step.isCompleted ? '100%' : 
                                     step.isActive ? `${Math.min(Math.max(
                                       ((progress?.progress || 0) - getPhaseProgress(progress?.phase)) / 
                                       (getPhaseProgress(step.phase) - getPhaseProgress(progress?.phase)) * 100, 
                                       20
                                     ), 80)}%` : '0%',
                              transition: progress?.stage === 'installing' ? 
                                'width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)' : 
                                'width 0.6s ease-out'
                            }}
                          />
                        </div>
                      </div>
                      <span className="sr-only">
                        {step.isCompleted ? `${step.label} completed` : 
                         step.isActive ? `${step.label} in progress` : 
                         `${step.label} pending`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installation Info */}
              <div className="install-info-grid" role="region" aria-label="Installation details">
                {progress.timestamp && (
                  <div className="info-item">
                    <span className="info-icon" aria-hidden="true">🕐</span>
                    <div className="info-content">
                      <span className="info-label">Started</span>
                      <span className="info-value" aria-label={`Installation started at ${new Date(progress.timestamp).toLocaleTimeString()}`}>
                        {new Date(progress.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="info-item">
                  <span className="info-icon" aria-hidden="true">📊</span>
                  <div className="info-content">
                    <span className="info-label">Progress</span>
                    <span className="info-value" aria-live="polite">{Math.round(progress.progress)}%</span>
                  </div>
                </div>
                
                <div className="info-item">
                  <span className="info-icon" aria-hidden="true">⚙️</span>
                  <div className="info-content">
                    <span className="info-label">Status</span>
                    <span className="info-value" aria-live="polite">{getPhaseDisplayName(progress.phase)}</span>
                  </div>
                </div>
              </div>
              
              <div className="install-message-container" role="region" aria-label="Installation instructions">
                <div className="install-message">
                  <span className="message-icon" aria-hidden="true">ℹ️</span>
                  <p>
                    Please wait while Sebastian is being updated. The application will restart 
                    automatically when the installation is complete.
                  </p>
                </div>
              </div>
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