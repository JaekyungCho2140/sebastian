import React, { useState } from 'react'
import { createErrorDialogData } from '../hooks/useErrorDialog'

interface ErrorTestOption {
  id: string
  label: string
  description: string
  action: () => void
}

const TestErrorButton: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRunning, setIsRunning] = useState<string | null>(null)

  const runWithFeedback = async (testId: string, testFn: () => void | Promise<void>) => {
    setIsRunning(testId)
    try {
      await testFn()
      setTimeout(() => setIsRunning(null), 1000) // Show success for 1 second
    } catch (error) {
      setIsRunning(null)
      // Error is expected and will be handled by global handlers
    }
  }

  const testOptions: ErrorTestOption[] = [
    {
      id: 'javascript-error',
      label: 'JavaScript Runtime Error',
      description: 'Trigger basic JavaScript error with throw new Error()',
      action: () => runWithFeedback('javascript-error', () => {
        throw new Error('Test JavaScript Error: Verifying error dialog system')
      })
    },
    {
      id: 'promise-rejection',
      label: 'Promise Rejection Error',
      description: 'Trigger unhandled Promise rejection',
      action: () => runWithFeedback('promise-rejection', () => {
        Promise.reject(new Error('Test Promise Rejection: Async error handling verification'))
      })
    },
    {
      id: 'react-component-error',
      label: 'React Component Error',
      description: 'Trigger React component rendering error',
      action: () => runWithFeedback('react-component-error', () => {
        // Force a React rendering error by creating invalid JSX
        const invalidComponent = React.createElement('invalid-tag', {
          children: 'This will cause a React error'
        })
        // Trigger by attempting to access a property that doesn't exist
        const errorTrigger = (null as any).nonExistentProperty
        throw new Error('Test React Component Error: ErrorBoundary verification')
      })
    },
    {
      id: 'high-severity-error',
      label: 'High Severity Error',
      description: 'Test high severity error with auto dialog display',
      action: () => runWithFeedback('high-severity-error', async () => {
        // Show error dialog directly to test the dialog system
        if (window.showErrorDialog) {
          const errorData = createErrorDialogData(
            new Error('Test High Severity Error: Dialog UI verification'),
            'System Error Test',
            'This is an intentional error to test the error dialog system.',
            'high'
          )
          window.showErrorDialog(errorData)
        }
      })
    },
    {
      id: 'critical-error',
      label: 'Critical Error',
      description: 'Test critical severity error with restart recommendation',
      action: () => runWithFeedback('critical-error', async () => {
        if (window.showErrorDialog) {
          const errorData = createErrorDialogData(
            new Error('Test Critical Error: App restart recommended'),
            'Critical System Error',
            'This is an intentional critical error to test the error dialog. App restart is recommended.',
            'critical'
          )
          window.showErrorDialog(errorData)
        }
      })
    },
    {
      id: 'main-process-error',
      label: 'Main Process Error',
      description: 'Simulate main process error via IPC',
      action: () => runWithFeedback('main-process-error', async () => {
        // Trigger an error via IPC that will be handled by main process
        if (window.electronAPI?.reportError) {
          await window.electronAPI.reportError({
            title: 'Test Main Process Error',
            message: 'Test Main Process Error: IPC error reporting verification',
            error: new Error('Test Main Process Error: IPC error reporting verification'),
            errorType: 'main-process',
            severity: 'high',
            context: {
              customData: {
                testScenario: 'main-process-error-simulation',
                triggeredBy: 'test-error-button',
                timestamp: Date.now()
              }
            },
            url: window.location.href
          })
        }
      })
    }
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleOptionClick = (option: ErrorTestOption) => {
    option.action()
    closeMenu()
  }

  return (
    <div className="test-error-button-container">
      <button
        className="test-error-button"
        onClick={toggleMenu}
        disabled={isRunning !== null}
        title="Error System Test Options"
      >
        {isRunning ? 'Running...' : 'Test Error'}
      </button>

      {isMenuOpen && (
        <>
          <div className="test-error-overlay" onClick={closeMenu} />
          <div className="test-error-menu">
            <div className="test-error-menu-header">
              <h3>Error Test Options</h3>
              <button 
                className="test-error-close"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            
            <div className="test-error-options">
              {testOptions.map((option) => (
                <button
                  key={option.id}
                  className={`test-error-option ${isRunning === option.id ? 'running' : ''}`}
                  onClick={() => handleOptionClick(option)}
                  disabled={isRunning !== null}
                >
                  <div className="option-label">{option.label}</div>
                  <div className="option-description">{option.description}</div>
                  {isRunning === option.id && (
                    <div className="option-status">Running...</div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="test-error-footer">
              <small>⚠️ For development and testing purposes only</small>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TestErrorButton