import type { 
  M4StringMergeRequest, 
  M4StringMergeResult, 
  M4StringMergeProgress 
} from '../../shared/types'

/**
 * M4 String 병합 서비스 (렌더러 프로세스)
 * Electron API를 통해 메인 프로세스와 통신
 */
export class M4StringMergerService {
  private progressCallback?: (progress: M4StringMergeProgress) => void
  private progressListener?: () => void

  /**
   * M4 String 파일 병합 시작
   */
  async mergeStringFiles(
    request: M4StringMergeRequest,
    onProgress?: (progress: M4StringMergeProgress) => void
  ): Promise<M4StringMergeResult> {
    try {
      // 기존 리스너 정리
      this.cleanup()

      // 진행률 콜백 저장
      this.progressCallback = onProgress

      // 진행률 리스너 등록
      if (onProgress) {
        this.progressListener = () => {
          window.electronAPI.onM4StringMergeProgress((progress: M4StringMergeProgress) => {
            onProgress(progress)
          })
        }
        this.progressListener()
      }

      // 메인 프로세스에서 병합 실행
      const result = await window.electronAPI.startM4StringMerge(request)

      // 완료 후 리스너 정리
      this.cleanup()

      return result

    } catch (error) {
      this.cleanup()
      console.error('M4 String merge error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 진행률 리스너 정리
   */
  private cleanup(): void {
    if (this.progressListener) {
      window.electronAPI.removeAllListeners('m4-string-merge-progress')
      this.progressListener = undefined
    }
    this.progressCallback = undefined
  }

  /**
   * 서비스 인스턴스 정리
   */
  dispose(): void {
    this.cleanup()
  }
}