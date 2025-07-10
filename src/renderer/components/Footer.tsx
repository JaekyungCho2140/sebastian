import React, { useState, useEffect } from 'react'
import { electronAPI } from '../utils/electron-api'

const Footer: React.FC = () => {
  const [version, setVersion] = useState<string>('1.0.0')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getVersion = async () => {
      try {
        const appVersion = await electronAPI.getVersion()
        setVersion(appVersion)
      } catch (error) {
        console.error('Failed to get version:', error)
        setVersion('1.0.0') // Fallback version
      } finally {
        setIsLoading(false)
      }
    }

    getVersion()
  }, [])

  return (
    <div className="footer-content">
      <div>
        <span>Sebastian Application</span>
      </div>
      <div className="version-display">
        {isLoading ? '로딩 중...' : `v${version}`}
      </div>
    </div>
  )
}

export default Footer