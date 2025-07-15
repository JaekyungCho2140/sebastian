import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 에러가 발생하면 상태를 업데이트하여 다음 렌더링에서 fallback UI를 표시
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 정보를 상태에 저장
    this.setState({
      error,
      errorInfo
    })

    // 에러를 메인 프로세스로 전송
    this.reportError(error, errorInfo)
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      // electronAPI가 사용 가능한지 확인
      if (window.electronAPI && window.electronAPI.reportError) {
        await window.electronAPI.reportError({
          title: 'React Component Error',
          message: error.message || 'An error occurred in a React component',
          error,
          errorType: 'react-component',
          severity: 'high',
          context: {
            customData: {
              componentStack: errorInfo.componentStack,
              errorBoundary: true,
              timestamp: Date.now(),
              url: window.location.href
            }
          },
          url: window.location.href,
          stack: error.stack
        })
      }
    } catch (reportingError) {
      console.error('Failed to report error to main process:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 사용자 정의 fallback UI가 있으면 사용, 없으면 기본 UI 사용
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 기본 에러 UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>문제가 발생했습니다</h2>
            <p>애플리케이션에서 예상치 못한 오류가 발생했습니다.</p>
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button"
              >
                다시 시도
              </button>
              <button 
                onClick={this.handleReload}
                className="reload-button"
              >
                새로고침
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>에러 세부사항 (개발 모드)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error.toString()}</pre>
                  
                  {this.state.error.stack && (
                    <>
                      <h4>Stack Trace:</h4>
                      <pre>{this.state.error.stack}</pre>
                    </>
                  )}
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary