import React, { useState, useEffect } from 'react'

const M4StringButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastUsedPath, setLastUsedPath] = useState<string | null>(null)

  // 컴포넌트 마운트 시 M4 설정 로드
  useEffect(() => {
    const loadM4Settings = async () => {
      try {
        const settings = await window.electronAPI.getM4Settings()
        if (settings && settings.folderPaths?.string?.inputFolder) {
          setLastUsedPath(settings.folderPaths.string.inputFolder)
          console.log('M4 String - Last used path loaded:', settings.folderPaths.string.inputFolder)
        }
      } catch (error) {
        console.error('Failed to load M4 settings:', error)
      }
    }
    
    loadM4Settings()
  }, [])

  const handleClick = async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    try {
      console.log('M4 String button clicked')
      
      // 1. 폴더 선택 다이얼로그 열기 (마지막 사용 경로 제공)
      const folderResult = await window.electronAPI.selectM4Folder()
      
      if (!folderResult.success) {
        if (folderResult.error) {
          alert(folderResult.error)
        }
        return
      }
      
      if (!folderResult.folderPath) {
        alert('폴더가 선택되지 않았습니다.')
        return
      }
      
      console.log('Selected folder:', folderResult.folderPath)
      
      // 2. M4 String 파일 유효성 검증
      const validationResult = await window.electronAPI.validateM4Folder({
        folderPath: folderResult.folderPath,
        processType: 'string'
      })
      
      if (!validationResult.isValid) {
        alert(validationResult.errorMessage || 'M4 String 파일 유효성 검증에 실패했습니다.')
        return
      }
      
      console.log('Validation successful:', validationResult)
      
      // 3. 선택한 폴더를 설정에 저장
      try {
        const currentSettings = await window.electronAPI.getM4Settings()
        await window.electronAPI.setM4Settings({
          folderPaths: {
            ...currentSettings.folderPaths,
            string: {
              inputFolder: folderResult.folderPath,
              outputFolder: currentSettings.folderPaths.string.outputFolder
            }
          }
        })
        setLastUsedPath(folderResult.folderPath)
        console.log('M4 String - Last used path updated:', folderResult.folderPath)
      } catch (error) {
        console.error('Failed to update last used folder:', error)
      }
      
      alert('M4 String 파일 검증 성공!\n\n' + 
            `찾은 파일: ${validationResult.foundFiles.join(', ')}`)
      
      // TODO: 실제 M4 String 처리 로직 구현
      
    } catch (error) {
      console.error('M4 String processing error:', error)
      alert('M4 String 처리 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <button
      className={`px-4 py-2 text-white rounded transition-colors ${
        isProcessing 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-green-500 hover:bg-green-600'
      }`}
      onClick={handleClick}
      disabled={isProcessing}
    >
      {isProcessing ? 'Processing...' : 'M4_String'}
    </button>
  )
}

export default M4StringButton