import React, { useState, useEffect } from 'react'
import { electronAPI } from '../utils/electron-api'

interface CircuitBreakerStatus {
  isOpen: boolean
  failureCount: number
  lastFailureTime?: number
  nextAttemptTime?: number
  message?: string
}

const DevPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<CircuitBreakerStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 개발 모드에서만 렌더링
  if (!electronAPI.isDevelopmentMode()) {
    return null
  }

  const updateCircuitBreakerStatus = async () => {
    try {
      const status = await electronAPI.getCircuitBreakerStatus()
      setCircuitBreakerStatus(status)
    } catch (error) {
      console.error('Failed to get circuit breaker status:', error)
    }
  }

  const handleMockUpdate = async () => {
    setIsLoading(true)
    try {
      const result = await electronAPI.mockUpdateAvailable()
      console.log('Mock update triggered:', result)
    } catch (error) {
      console.error('Failed to trigger mock update:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetCircuitBreaker = async () => {
    setIsLoading(true)
    try {
      const result = await electronAPI.resetCircuitBreaker()
      console.log('Circuit breaker reset:', result)
      await updateCircuitBreakerStatus()
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForceUpdateCheck = async () => {
    setIsLoading(true)
    try {
      const result = await electronAPI.forceUpdateCheck()
      console.log('Force update check result:', result)
    } catch (error) {
      console.error('Force update check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      updateCircuitBreakerStatus()
    }
  }, [isVisible])

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {!isVisible ? (
        <button
          onClick={() => setIsVisible(true)}
          style={{
            background: '#007ACC',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🛠️ DEV
        </button>
      ) : (
        <div style={{ padding: '16px', minWidth: '300px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid #333',
            paddingBottom: '8px'
          }}>
            <strong>🛠️ Developer Panel</strong>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'transparent',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>Auto Update Testing</strong>
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={handleMockUpdate}
                disabled={isLoading}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  margin: '2px',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                🎭 Mock Update Available
              </button>
              <button
                onClick={handleForceUpdateCheck}
                disabled={isLoading}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  margin: '2px',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                🔄 Force Update Check
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>Circuit Breaker</strong>
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={updateCircuitBreakerStatus}
                disabled={isLoading}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  margin: '2px',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                📊 Check Status
              </button>
              <button
                onClick={handleResetCircuitBreaker}
                disabled={isLoading}
                style={{
                  background: '#ffc107',
                  color: 'black',
                  border: 'none',
                  padding: '6px 12px',
                  margin: '2px',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                🔄 Reset Circuit Breaker
              </button>
            </div>
            
            {circuitBreakerStatus && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                background: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                <div>Status: <span style={{ 
                  color: circuitBreakerStatus.isOpen ? '#dc3545' : '#28a745' 
                }}>
                  {circuitBreakerStatus.isOpen ? 'OPEN' : 'CLOSED'}
                </span></div>
                <div>Failure Count: {circuitBreakerStatus.failureCount}</div>
                {circuitBreakerStatus.lastFailureTime && (
                  <div>Last Failure: {new Date(circuitBreakerStatus.lastFailureTime).toLocaleTimeString()}</div>
                )}
                {circuitBreakerStatus.message && (
                  <div>Message: {circuitBreakerStatus.message}</div>
                )}
              </div>
            )}
          </div>

          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #333' }}>
            💡 Tip: Open DevTools (F12) to see console logs
          </div>
        </div>
      )}
    </div>
  )
}

export default DevPanel