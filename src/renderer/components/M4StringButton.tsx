import React, { useState, useEffect, useRef } from 'react'
import ProgressWindow from './ProgressWindow'
import { M4StringMergerService } from '../services/m4StringMerger'
import type { M4StringMergeProgress } from '../../shared/types'

const M4StringButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastUsedPath, setLastUsedPath] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState<M4StringMergeProgress>({
    current: 0,
    total: 8,
    percentage: 0,
    status: 'idle'
  })
  const mergerServiceRef = useRef<M4StringMergerService | null>(null)

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
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      if (mergerServiceRef.current) {
        mergerServiceRef.current.dispose()
        mergerServiceRef.current = null
      }
    }
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
      
      // 4. M4 String 병합 실행
      console.log('Starting M4 String merge...')
      setShowProgress(true)
      setProgress({
        current: 0,
        total: 8,
        percentage: 0,
        message: 'M4 String 병합을 시작합니다...',
        status: 'processing'
      })
      
      // 병합 서비스 생성
      if (!mergerServiceRef.current) {
        mergerServiceRef.current = new M4StringMergerService()
      }
      
      // 병합 실행
      const mergeResult = await mergerServiceRef.current.mergeStringFiles(
        {
          inputFolder: folderResult.folderPath,
          outputFolder: folderResult.folderPath // 같은 폴더에 출력
        },
        (mergeProgress) => {
          console.log('M4 String merge progress:', mergeProgress)
          setProgress(mergeProgress)
          
          // 완료 메시지 확인
          if (mergeProgress.message?.startsWith('완료:')) {
            setTimeout(() => {
              setShowProgress(false)
              alert(mergeProgress.message)
            }, 1000)
          }
        }
      )
      
      if (!mergeResult.success) {
        throw new Error(mergeResult.error || 'M4 String 병합에 실패했습니다.')
      }
      
      console.log('M4 String merge completed:', mergeResult)
      
    } catch (error) {
      console.error('M4 String processing error:', error)
      setShowProgress(false)
      alert('M4 String 처리 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleProgressClose = () => {
    setShowProgress(false)
  }

  return (
    <>
      <button 
        className={`success-button ${isProcessing ? 'loading' : ''}`}
        onClick={handleClick}
        disabled={isProcessing}
        type="button"
        aria-label={isProcessing ? 'Processing...' : 'M4 String Merge'}
        aria-busy={isProcessing}
        tabIndex={0}
        role="button"
      >
        {isProcessing ? 'Processing...' : 'M4\nString'}
      </button>
      
      {showProgress && (
        <ProgressWindow
          isOpen={showProgress}
          onClose={handleProgressClose}
          progress={progress}
        />
      )}
    </>
  )
}

export default M4StringButton