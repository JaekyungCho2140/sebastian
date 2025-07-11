import React, { useState } from 'react'
import { electronAPI } from '../utils/electron-api'

const SuccessButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    
    try {
      await electronAPI.showSuccessDialog()
    } catch (error) {
      console.error('Failed to show success dialog:', error)
      // Show error feedback to user
      alert(`오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Enter and Space key for accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!isLoading) {
        handleClick()
      }
    }
  }

  return (
    <button 
      className={`success-button ${isLoading ? 'loading' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isLoading}
      type="button"
      aria-label={isLoading ? '처리 중입니다...' : '성공 테스트 실행'}
      aria-busy={isLoading}
      tabIndex={0}
      role="button"
    >
      {isLoading ? '처리 중...' : '성공 테스트'}
    </button>
  )
}

export default SuccessButton