import React, { useState, useEffect, useRef } from 'react'
import { M4ProgressUpdate, M4ProgressMessage } from '../../shared/types'

// M4 Progress Modal 전용 인터페이스
interface M4ProgressData {
  percentage: number
  currentStep: number
  totalSteps: number
  currentFile: string
  processedCount: number
  totalCount: number
  estimatedTime: number
  startTime: number
  stage: 'preparing' | 'processing' | 'complete' | 'error' | 'cancelled'
  isActive: boolean
}

interface M4ProgressModalProps {
  isOpen: boolean
  onCancel?: () => void
  onClose?: () => void
  canCancel?: boolean
}

const M4ProgressModal: React.FC<M4ProgressModalProps> = ({
  isOpen,
  onCancel,
  onClose,
  canCancel = true
}) => {
  // 진행률 상태 관리
  const [progressData, setProgressData] = useState<M4ProgressData>({
    percentage: 0,
    currentStep: 1,
    totalSteps: 1,
    currentFile: '',
    processedCount: 0,
    totalCount: 1,
    estimatedTime: 0,
    startTime: Date.now(),
    stage: 'preparing',
    isActive: false
  })

  // 애니메이션 상태
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // 시간 추정 상태
  const [timeEstimation, setTimeEstimation] = useState({
    smoothedEstimate: 0,
    progressHistory: [] as Array<{ time: number; progress: number }>,
    lastUpdateTime: Date.now()
  })

  // Canvas 애니메이션 상태
  const [canvasAnimation, setCanvasAnimation] = useState({
    dotPosition: 0,
    animationId: null as number | null,
    isRunning: false
  })

  // 컴포넌트 참조
  const modalRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // IPC 메시지 프로토콜 핸들러
  useEffect(() => {
    if (!isOpen) return

    const handleProgressUpdate = (update: M4ProgressUpdate) => {
      switch (update.type) {
        case 'step':
          if (typeof update.data === 'string') {
            const stepMatch = update.data.match(/단계:(\d+)\/(\d+)/)
            if (stepMatch) {
              const currentStep = parseInt(stepMatch[1])
              const totalSteps = parseInt(stepMatch[2])
              setProgressData(prev => ({
                ...prev,
                currentStep,
                totalSteps
              }))
            }
          }
          break

        case 'file':
          if (typeof update.data === 'string') {
            const fileName = update.data.replace('파일:', '')
            setProgressData(prev => ({
              ...prev,
              currentFile: fileName,
              isActive: true
            }))
          }
          break

        case 'progress':
          if (typeof update.data === 'number') {
            const newPercentage = update.data as number
            const estimatedTime = calculateEstimatedTime(newPercentage)
            setProgressData(prev => ({
              ...prev,
              percentage: newPercentage,
              estimatedTime,
              isActive: true
            }))
          }
          break

        case 'processed':
          if (typeof update.data === 'string') {
            const processedMatch = update.data.match(/처리된 파일:(\d+)/)
            if (processedMatch) {
              const processedCount = parseInt(processedMatch[1])
              setProgressData(prev => ({
                ...prev,
                processedCount
              }))
            }
          }
          break

        case 'complete':
          if (typeof update.data === 'object' && update.data !== null && 'message' in update.data) {
            setProgressData(prev => ({
              ...prev,
              stage: 'complete',
              isActive: false,
              percentage: 100,
              currentFile: (update.data as { message: string }).message
            }))
          }
          break

        case 'error':
          if (typeof update.data === 'object' && update.data !== null && 'message' in update.data) {
            setProgressData(prev => ({
              ...prev,
              stage: 'error',
              isActive: false,
              currentFile: (update.data as { message: string }).message
            }))
          }
          break
      }
    }

    // IPC 리스너 등록
    if (window.electronAPI?.onM4ProgressUpdate) {
      window.electronAPI.onM4ProgressUpdate(handleProgressUpdate)
    }

    return () => {
      // 컴포넌트 언마운트 시 리스너 정리
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('m4-progress-update')
      }
    }
  }, [isOpen])

  // 진행률 애니메이션 효과
  useEffect(() => {
    if (progressData.percentage !== animatedPercentage) {
      const targetPercentage = progressData.percentage
      const duration = 500 // ms
      const steps = 60
      const stepDuration = duration / steps
      
      setIsAnimating(true)
      let currentStep = 0
      
      const interval = setInterval(() => {
        if (currentStep >= steps) {
          clearInterval(interval)
          setAnimatedPercentage(targetPercentage)
          setIsAnimating(false)
          return
        }
        
        setAnimatedPercentage(prev => {
          const easingFactor = 1 - Math.pow(1 - (currentStep / steps), 3)
          const newPercentage = prev + (targetPercentage - prev) * easingFactor * 0.1
          return Math.min(Math.max(newPercentage, 0), 100)
        })
        currentStep++
      }, stepDuration)
      
      return () => {
        clearInterval(interval)
        setIsAnimating(false)
      }
    }
  }, [progressData.percentage, animatedPercentage])

  // 시간 추정 업데이트 (100ms마다)
  useEffect(() => {
    if (!progressData.isActive || progressData.stage !== 'processing') return

    const interval = setInterval(() => {
      const currentTime = calculateEstimatedTime(progressData.percentage)
      setProgressData(prev => ({
        ...prev,
        estimatedTime: currentTime
      }))
    }, 100)

    return () => clearInterval(interval)
  }, [progressData.isActive, progressData.stage, progressData.percentage])

  // Canvas 애니메이션 함수
  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 배경 그리기
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 테두리 그리기
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, canvas.width, canvas.height)

    // 애니메이션 점 그리기 (활성 상태일 때만)
    if (progressData.isActive && progressData.stage === 'processing') {
      const dotRadius = 3
      const dotColor = 'var(--color-primary, #3b82f6)'
      
      // 점 위치 계산 (좌우로 움직임)
      const maxX = canvas.width - 20
      const minX = 10
      const dotX = minX + (maxX - minX) * ((canvasAnimation.dotPosition % 200) / 200)
      const dotY = canvas.height / 2

      // 점 그리기
      ctx.beginPath()
      ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
      ctx.fillStyle = '#3b82f6'
      ctx.fill()

      // 점 위치 업데이트
      setCanvasAnimation(prev => ({
        ...prev,
        dotPosition: prev.dotPosition + 1
      }))
    }
  }

  // Canvas 애니메이션 시작/중지
  useEffect(() => {
    if (progressData.isActive && progressData.stage === 'processing') {
      // 애니메이션 시작
      const animate = () => {
        drawCanvas()
        setCanvasAnimation(prev => ({
          ...prev,
          animationId: requestAnimationFrame(animate)
        }))
      }
      
      if (!canvasAnimation.isRunning) {
        setCanvasAnimation(prev => ({
          ...prev,
          isRunning: true,
          animationId: requestAnimationFrame(animate)
        }))
      }
    } else {
      // 애니메이션 중지
      if (canvasAnimation.animationId) {
        cancelAnimationFrame(canvasAnimation.animationId)
        setCanvasAnimation(prev => ({
          ...prev,
          isRunning: false,
          animationId: null
        }))
      }
      
      // 최종 상태 그리기
      drawCanvas()
    }

    return () => {
      if (canvasAnimation.animationId) {
        cancelAnimationFrame(canvasAnimation.animationId)
      }
    }
  }, [progressData.isActive, progressData.stage])

  // Canvas 초기화
  useEffect(() => {
    if (canvasRef.current) {
      drawCanvas()
    }
  }, [canvasRef.current])

  // 모달 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // M4 처리 중에는 외부 클릭으로 닫기 비활성화
        if (progressData.stage === 'complete' || progressData.stage === 'error') {
          onClose?.()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, progressData.stage, onClose])

  // 취소 확인 다이얼로그
  const handleCancel = async () => {
    if (progressData.stage === 'complete' || progressData.stage === 'error') {
      onClose?.()
      return
    }

    // 취소 확인 다이얼로그
    const confirmed = window.confirm(
      `M4 처리를 취소하시겠습니까?\n\n` +
      `현재 진행률: ${Math.round(progressData.percentage)}%\n` +
      `처리된 파일: ${progressData.processedCount}개\n\n` +
      `취소 시 처리 중인 작업이 중단되고 임시 파일이 정리됩니다.`
    )
    
    if (confirmed) {
      // 취소 중 상태로 변경
      setProgressData(prev => ({ 
        ...prev, 
        stage: 'cancelled',
        isActive: false,
        currentFile: '취소 중...'
      }))
      
      // IPC를 통해 메인 프로세스에 취소 요청
      try {
        if (window.electronAPI?.cancelM4Processing) {
          await window.electronAPI.cancelM4Processing()
        }
      } catch (error) {
        console.error('Failed to cancel M4 processing:', error)
      }
      
      // 상위 컴포넌트에 취소 알림
      onCancel?.()
    }
  }

  // 시간 추정 알고리즘
  const calculateEstimatedTime = (currentProgress: number): number => {
    const now = Date.now()
    const elapsed = now - progressData.startTime
    
    if (currentProgress <= 0) return 0
    
    // 진행률 기록 업데이트
    const newHistory = [...timeEstimation.progressHistory, { time: now, progress: currentProgress }]
    
    // 최근 5개 기록만 유지 (스무딩을 위해)
    const recentHistory = newHistory.slice(-5)
    
    // 평균 속도 계산
    if (recentHistory.length < 2) {
      // 초기 추정 - 현재 진행률 기반
      const estimatedTotal = (elapsed / currentProgress) * 100
      const remaining = estimatedTotal - elapsed
      return Math.max(0, Math.round(remaining / 1000))
    }
    
    // 최근 진행률 변화 기반 속도 계산
    const firstRecord = recentHistory[0]
    const lastRecord = recentHistory[recentHistory.length - 1]
    
    const timeSpan = lastRecord.time - firstRecord.time
    const progressSpan = lastRecord.progress - firstRecord.progress
    
    if (timeSpan <= 0 || progressSpan <= 0) {
      return timeEstimation.smoothedEstimate
    }
    
    // 진행률 증가 속도 (% per ms)
    const progressRate = progressSpan / timeSpan
    
    // 남은 진행률
    const remainingProgress = 100 - currentProgress
    
    // 남은 시간 계산 (ms)
    const rawEstimate = remainingProgress / progressRate
    
    // 초 단위로 변환
    const estimateInSeconds = Math.round(rawEstimate / 1000)
    
    // 스무딩 적용 (급격한 변화 방지)
    const smoothingFactor = 0.3
    const smoothedEstimate = timeEstimation.smoothedEstimate === 0 
      ? estimateInSeconds 
      : Math.round(timeEstimation.smoothedEstimate * (1 - smoothingFactor) + estimateInSeconds * smoothingFactor)
    
    // 히스토리 업데이트
    setTimeEstimation(prev => ({
      ...prev,
      smoothedEstimate,
      progressHistory: recentHistory,
      lastUpdateTime: now
    }))
    
    return Math.max(0, smoothedEstimate)
  }

  // 시간 포맷 함수
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '계산 중...'
    if (seconds < 60) {
      return `남은 시간: ${seconds}초`
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `남은 시간: ${minutes}분 ${remainingSeconds}초`
    }
  }

  // 단계 텍스트 생성
  const getStepText = (): string => {
    return `단계: ${progressData.currentStep}/${progressData.totalSteps}`
  }

  // 파일 텍스트 생성
  const getFileText = (): string => {
    return progressData.currentFile ? `처리 중: ${progressData.currentFile}` : '준비 중...'
  }

  // 처리된 파일 텍스트 생성
  const getProcessedText = (): string => {
    return `처리된 파일: ${progressData.processedCount}`
  }

  // 버튼 텍스트 결정
  const getButtonText = (): string => {
    switch (progressData.stage) {
      case 'complete':
        return '닫기'
      case 'error':
        return '닫기'
      case 'cancelled':
        return '닫기'
      default:
        return '취소'
    }
  }

  // 버튼 색상 결정
  const getButtonColor = (): string => {
    switch (progressData.stage) {
      case 'complete':
        return '#28a745' // 완료 - 녹색
      case 'error':
        return '#dc3545' // 에러 - 빨간색
      case 'cancelled':
        return '#6c757d' // 취소 - 회색
      default:
        return '#f44336' // 취소 - 빨간색
    }
  }

  // 컴포넌트 언마운트 시 전체 정리
  useEffect(() => {
    return () => {
      // 모든 타이머 정리
      if (canvasAnimation.animationId) {
        cancelAnimationFrame(canvasAnimation.animationId)
      }
      
      // 진행률 히스토리 정리
      setTimeEstimation(prev => ({
        ...prev,
        progressHistory: []
      }))
      
      // 애니메이션 상태 정리
      setCanvasAnimation(prev => ({
        ...prev,
        dotPosition: 0,
        animationId: null,
        isRunning: false
      }))
    }
  }, [])

  if (!isOpen) {
    return null
  }

  return (
    <div className="m4-progress-overlay" role="dialog" aria-labelledby="m4-progress-title">
      <div 
        ref={modalRef}
        className="m4-progress-modal"
        style={{
          width: '500px',
          height: '300px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Malgun Gothic", "맑은 고딕", sans-serif'
        }}
      >
        {/* Step Frame - 현재 단계 X/Y 표시 */}
        <div className="step-frame">
          <div className="step-label">
            {getStepText()}
          </div>
        </div>

        {/* File Frame - 현재 파일명 표시 (왼쪽 여백 포함) */}
        <div className="file-frame">
          <div className="file-label">
            {getFileText()}
          </div>
        </div>

        {/* Progress Frame - 사용자 정의 테마 색상 진행률 바 */}
        <div className="progress-frame">
          <div className="progress-container">
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill"
                style={{
                  width: `${animatedPercentage}%`,
                  transition: isAnimating ? 'none' : 'width 0.3s ease-out'
                }}
              >
                {/* 진행률 바 내부 애니메이션 효과 */}
                <div 
                  className="progress-shimmer"
                  style={{
                    animation: progressData.isActive ? 'shimmer 2s infinite' : 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info Frame - 퍼센트 + 남은 시간 표시 */}
        <div className="info-frame">
          <div className="info-content">
            <span className="progress-percentage">
              {Math.round(progressData.percentage)}%
            </span>
            <span className="estimated-time">
              {formatTime(progressData.estimatedTime)}
            </span>
          </div>
        </div>

        {/* Files Frame - 처리된 파일 카운터 표시 */}
        <div className="files-frame">
          <div className="files-counter">
            {getProcessedText()}
          </div>
        </div>

        {/* Canvas Frame - 애니메이션 점 표시 */}
        <div className="canvas-frame">
          <canvas 
            ref={canvasRef}
            width="100"
            height="30"
            className={`progress-canvas ${progressData.isActive ? 'animated' : ''}`}
          />
        </div>

        {/* Button Frame - 취소/닫기 버튼 (확인 다이얼로그 포함) */}
        <div className="button-frame">
          <button
            onClick={handleCancel}
            className={`progress-button ${progressData.stage}`}
            disabled={progressData.stage === 'processing' && !canCancel}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  )
}

export default M4ProgressModal