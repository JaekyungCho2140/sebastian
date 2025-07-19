import React, { useState, useEffect } from 'react'
import ProgressWindow from './ProgressWindow'
import { M4DialogueMergeProgress } from '../../shared/types'

const M4DialogueButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastUsedPath, setLastUsedPath] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [mergeProgress, setMergeProgress] = useState<M4DialogueMergeProgress | null>(null)

  // 컴포넌트 마운트 시 M4 설정 로드
  useEffect(() => {
    const loadM4Settings = async () => {
      try {
        const settings = await window.electronAPI.getM4Settings()
        if (settings && settings.folderPaths?.dialogue?.inputFolder) {
          setLastUsedPath(settings.folderPaths.dialogue.inputFolder)
          console.log('M4 Dialogue - Last used path loaded:', settings.folderPaths.dialogue.inputFolder)
        }
      } catch (error) {
        console.error('Failed to load M4 settings:', error)
      }
    }
    
    loadM4Settings()
  }, [])

  // M4 Dialog 병합 진행률 리스너
  useEffect(() => {
    const handleMergeProgress = (progress: M4DialogueMergeProgress) => {
      console.log('M4 Dialogue merge progress:', progress)
      setMergeProgress(progress)
      
      // 완료되면 자동으로 닫기
      if (progress.percentage >= 100) {
        setTimeout(() => {
          setShowProgress(false)
          setIsProcessing(false)
          setMergeProgress(null)
        }, 2000) // 2초 후 닫기
      }
    }

    window.electronAPI.onM4DialogueMergeProgress(handleMergeProgress)

    return () => {
      window.electronAPI.removeAllListeners('m4-dialogue-merge-progress')
    }
  }, [])

  const handleClick = async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    try {
      console.log('M4 Dialogue button clicked')
      
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
      
      // 2. M4 Dialogue 파일 유효성 검증
      const validationResult = await window.electronAPI.validateM4Folder({
        folderPath: folderResult.folderPath,
        processType: 'dialogue'
      })
      
      if (!validationResult.isValid) {
        alert(validationResult.errorMessage || 'M4 Dialogue 파일 유효성 검증에 실패했습니다.')
        return
      }
      
      console.log('Validation successful:', validationResult)
      
      // 3. 선택한 폴더를 설정에 저장
      let currentSettings
      try {
        currentSettings = await window.electronAPI.getM4Settings()
        await window.electronAPI.setM4Settings({
          folderPaths: {
            ...currentSettings.folderPaths,
            dialogue: {
              inputFolder: folderResult.folderPath,
              outputFolder: currentSettings.folderPaths.dialogue.outputFolder
            }
          }
        })
        setLastUsedPath(folderResult.folderPath)
        console.log('M4 Dialogue - Last used path updated:', folderResult.folderPath)
      } catch (error) {
        console.error('Failed to update last used folder:', error)
        // 설정을 불러오지 못한 경우 기본값 사용
        currentSettings = await window.electronAPI.getM4Settings()
      }
      
      // 4. 출력 폴더 경로 설정
      const outputFolder = currentSettings.folderPaths.dialogue.outputFolder || 
                          currentSettings.folderPaths.commonOutputDirectory ||
                          folderResult.folderPath
      
      console.log('Starting M4 Dialogue merge...')
      console.log('Input folder:', folderResult.folderPath)
      console.log('Output folder:', outputFolder)
      
      // 5. 진행률 창 표시
      setShowProgress(true)
      setMergeProgress({
        current: 0,
        total: 100,
        status: 'Initializing...',
        percentage: 0
      })
      
      // 6. M4 Dialog 병합 시작
      try {
        const mergeResult = await window.electronAPI.startM4DialogueMerge({
          inputFolder: folderResult.folderPath,
          outputFolder: outputFolder
        })
        
        if (mergeResult.success) {
          alert(`M4 Dialogue 병합이 완료되었습니다!\n\n출력 파일: ${mergeResult.outputPath}`)
        } else {
          throw new Error(mergeResult.error || 'Unknown merge error')
        }
      } catch (mergeError) {
        console.error('M4 Dialogue merge error:', mergeError)
        alert('M4 Dialogue 병합 중 오류가 발생했습니다: ' + 
              (mergeError instanceof Error ? mergeError.message : '알 수 없는 오류'))
        setShowProgress(false)
        setMergeProgress(null)
      }
      
    } catch (error) {
      console.error('M4 Dialogue processing error:', error)
      alert('M4 Dialogue 처리 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <button 
        className={`success-button ${isProcessing ? 'loading' : ''}`}
        onClick={handleClick}
        disabled={isProcessing}
        type="button"
        aria-label={isProcessing ? 'Processing...' : 'M4 Dialogue Merge'}
        aria-busy={isProcessing}
        tabIndex={0}
        role="button"
      >
        {isProcessing ? 'Processing...' : 'M4\nDialogue'}
      </button>
      
      <ProgressWindow
        isOpen={showProgress}
        onClose={() => {
          setShowProgress(false)
          setMergeProgress(null)
        }}
        progress={mergeProgress}
      />
    </>
  )
}

export default M4DialogueButton