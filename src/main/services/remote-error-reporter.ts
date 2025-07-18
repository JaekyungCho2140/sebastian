import { net } from 'electron'
import log from 'electron-log'
import { ErrorReport } from '../../shared/types'
import { LocalErrorReporter } from './local-error-reporter'
import { app } from 'electron'
import { randomUUID } from 'crypto'

// M4ErrorReport extends ErrorReport with M4-specific context
interface M4ErrorReport extends ErrorReport {
  context: ErrorReport['context'] & {
    m4Context?: {
      fileName?: string
      inputFolder?: string
      outputFolder?: string
      processType?: 'dialogue' | 'string'
      stage?: number
      totalFiles?: number
      processedFiles?: number
    }
  }
}

interface RemoteErrorConfig {
  endpoint?: string
  apiKey?: string
  enabled: boolean
  batchSize: number
  batchInterval: number // milliseconds
  maxRetries: number
  retryDelay: number // milliseconds
  timeout: number // milliseconds
  enableBatching: boolean
}

interface ErrorBatch {
  id: string
  errors: ErrorReport[]
  retryCount: number
  createdAt: number
}

export class RemoteErrorReporter {
  private config: RemoteErrorConfig
  private localReporter: LocalErrorReporter
  private errorBatch: ErrorReport[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private pendingBatches: Map<string, ErrorBatch> = new Map()
  private isOnline: boolean = true
  private sessionId: string

  constructor(localReporter: LocalErrorReporter, enabled: boolean = false, sentryDsn: string = '', config?: Partial<RemoteErrorConfig>) {
    this.localReporter = localReporter
    this.sessionId = randomUUID()
    
    this.config = {
      endpoint: process.env.SEBASTIAN_ERROR_ENDPOINT || sentryDsn || '',
      apiKey: process.env.SEBASTIAN_API_KEY || '',
      enabled: enabled,
      batchSize: 10,
      batchInterval: 5000, // 5초
      maxRetries: 3,
      retryDelay: 1000, // 1초
      timeout: 30000, // 30초
      enableBatching: true,
      ...config
    }

    // 네트워크 상태 모니터링
    this.monitorNetworkStatus()
    
    // 앱 종료 시 펜딩 에러 전송
    app.on('before-quit', () => {
      this.flushPendingErrors()
    })
  }

  /**
   * 네트워크 상태 모니터링
   */
  private monitorNetworkStatus(): void {
    // Electron의 net API를 사용하여 네트워크 상태 확인
    setInterval(() => {
      this.checkNetworkStatus()
    }, 10000) // 10초마다 확인
  }

  /**
   * 네트워크 연결 상태 확인
   */
  private async checkNetworkStatus(): Promise<void> {
    try {
      const request = net.request({
        method: 'HEAD',
        url: 'https://www.google.com'
      })

      request.on('response', () => {
        this.isOnline = true
        this.processPendingBatches()
      })

      request.on('error', () => {
        this.isOnline = false
      })

      request.end()
    } catch (error) {
      this.isOnline = false
    }
  }

  /**
   * 에러 리포트 전송 (로컬 저장 후 원격 전송 시도)
   */
  public async reportError(error: ErrorReport): Promise<{ success: boolean; localSaved: boolean; remoteSent: boolean }> {
    // 항상 로컬에 먼저 저장
    const localResult = await this.localReporter.captureError(
      new Error(error.message),
      error.errorType,
      error.processType,
      error.severity,
      error.context
    )
    
    // 원격 전송이 비활성화되었거나 설정이 없으면 로컬만 저장
    if (!this.config.enabled || !this.config.endpoint || !this.config.apiKey) {
      return {
        success: localResult !== null,
        localSaved: localResult !== null,
        remoteSent: false
      }
    }

    // 배치 모드가 활성화되어 있으면 배치에 추가
    if (this.config.enableBatching) {
      this.addToBatch(error)
      return {
        success: localResult !== null,
        localSaved: localResult !== null,
        remoteSent: false // 배치로 나중에 전송됨
      }
    }

    // 즉시 전송 모드
    const remoteResult = await this.sendErrorsToRemote([error])
    return {
      success: localResult !== null && remoteResult,
      localSaved: localResult !== null,
      remoteSent: remoteResult
    }
  }

  /**
   * 배치에 에러 추가
   */
  private addToBatch(error: ErrorReport): void {
    // 민감한 정보 마스킹
    const maskedError = this.maskSensitiveData(error)
    this.errorBatch.push(maskedError)

    // 배치 크기에 도달하면 즉시 전송
    if (this.errorBatch.length >= this.config.batchSize) {
      this.flushBatch()
    } else if (!this.batchTimer) {
      // 타이머 시작
      this.batchTimer = setTimeout(() => {
        this.flushBatch()
      }, this.config.batchInterval)
    }
  }

  /**
   * 배치 전송
   */
  private async flushBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.errorBatch.length === 0) {
      return
    }

    const batch: ErrorBatch = {
      id: randomUUID(),
      errors: [...this.errorBatch],
      retryCount: 0,
      createdAt: Date.now()
    }

    this.errorBatch = []

    // 오프라인이면 펜딩 배치에 추가
    if (!this.isOnline) {
      this.pendingBatches.set(batch.id, batch)
      return
    }

    // 전송 시도
    const success = await this.sendBatch(batch)
    if (!success) {
      this.pendingBatches.set(batch.id, batch)
    }
  }

  /**
   * 배치 전송 시도
   */
  private async sendBatch(batch: ErrorBatch): Promise<boolean> {
    const maxRetries = this.config.maxRetries
    
    while (batch.retryCount < maxRetries) {
      const success = await this.sendErrorsToRemote(batch.errors)
      
      if (success) {
        this.pendingBatches.delete(batch.id)
        return true
      }

      batch.retryCount++
      
      // 재시도 전 대기
      if (batch.retryCount < maxRetries) {
        await this.delay(this.config.retryDelay * Math.pow(2, batch.retryCount - 1)) // 지수 백오프
      }
    }

    log.error(`Failed to send error batch ${batch.id} after ${maxRetries} retries`)
    return false
  }

  /**
   * 원격 서버로 에러 전송
   */
  private async sendErrorsToRemote(errors: ErrorReport[]): Promise<boolean> {
    if (!this.config.endpoint || !this.config.apiKey) {
      return false
    }

    try {
      const request = net.request({
        method: 'POST',
        url: this.config.endpoint
      })

      // 헤더 설정
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('Authorization', `Bearer ${this.config.apiKey}`)
      request.setHeader('X-Session-Id', this.sessionId)
      request.setHeader('X-App-Version', app.getVersion())
      request.setHeader('X-Platform', process.platform)

      // 요청 본문
      const payload = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        appVersion: app.getVersion(),
        platform: process.platform,
        errors: errors.map(error => this.sanitizeErrorForTransmission(error))
      }

      return new Promise((resolve) => {
        request.on('response', (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            log.info(`Successfully sent ${errors.length} errors to remote endpoint`)
            resolve(true)
          } else {
            log.error(`Failed to send errors: HTTP ${response.statusCode}`)
            resolve(false)
          }
        })

        request.on('error', (error) => {
          log.error('Error sending to remote endpoint:', error)
          resolve(false)
        })

        request.write(JSON.stringify(payload))
        request.end()
      })
    } catch (error) {
      log.error('Exception while sending errors to remote:', error)
      return false
    }
  }

  /**
   * 민감한 데이터 마스킹
   */
  private maskSensitiveData(error: ErrorReport | M4ErrorReport): ErrorReport | M4ErrorReport {
    const masked = JSON.parse(JSON.stringify(error)) // Deep clone
    
    // 파일 경로에서 사용자 이름 마스킹
    const pathRegex = /(\/home\/|\/Users\/|C:\\Users\\)([^\/\\]+)/g
    const maskPaths = (str: string) => str.replace(pathRegex, '$1[MASKED]')
    
    // 에러 메시지와 스택 트레이스 마스킹
    if (masked.message) {
      masked.message = maskPaths(masked.message)
    }
    if (masked.stack) {
      masked.stack = maskPaths(masked.stack)
    }
    
    // M4 특화 컨텍스트 마스킹
    if ('context' in masked && masked.context?.m4Context) {
      if (masked.context.m4Context.fileName) {
        masked.context.m4Context.fileName = maskPaths(masked.context.m4Context.fileName)
      }
      if (masked.context.m4Context.inputFolder) {
        masked.context.m4Context.inputFolder = maskPaths(masked.context.m4Context.inputFolder)
      }
      if (masked.context.m4Context.outputFolder) {
        masked.context.m4Context.outputFolder = maskPaths(masked.context.m4Context.outputFolder)
      }
    }
    
    return masked
  }

  /**
   * 전송을 위한 에러 정리
   */
  private sanitizeErrorForTransmission(error: ErrorReport | M4ErrorReport): any {
    const sanitized = { ...error }
    
    // 불필요한 대용량 데이터 제거
    if ('breadcrumbs' in sanitized && sanitized.breadcrumbs && sanitized.breadcrumbs.length > 20) {
      sanitized.breadcrumbs = sanitized.breadcrumbs.slice(-20) // 마지막 20개만
    }
    
    // 스택 트레이스 길이 제한
    if (sanitized.stack && sanitized.stack.length > 5000) {
      sanitized.stack = sanitized.stack.substring(0, 5000) + '...(truncated)'
    }
    
    return sanitized
  }

  /**
   * 펜딩 배치 처리
   */
  private async processPendingBatches(): Promise<void> {
    if (!this.isOnline || this.pendingBatches.size === 0) {
      return
    }

    const batches = Array.from(this.pendingBatches.values())
      .sort((a, b) => a.createdAt - b.createdAt) // 오래된 것부터
    
    for (const batch of batches) {
      await this.sendBatch(batch)
    }
  }

  /**
   * 모든 펜딩 에러 즉시 전송
   */
  public async flushPendingErrors(): Promise<void> {
    // 현재 배치 플러시
    await this.flushBatch()
    
    // 펜딩 배치 처리
    await this.processPendingBatches()
  }

  /**
   * 설정 업데이트
   */
  public updateConfig(config: Partial<RemoteErrorConfig>): void {
    this.config = { ...this.config, ...config }
    
    // 설정이 활성화되면 펜딩 에러 전송 시도
    if (config.enabled && this.config.endpoint && this.config.apiKey) {
      this.processPendingBatches()
    }
  }

  /**
   * 통계 정보 조회
   */
  public getStats(): {
    pendingBatches: number
    pendingErrors: number
    isOnline: boolean
    sessionId: string
  } {
    const pendingErrors = Array.from(this.pendingBatches.values())
      .reduce((sum, batch) => sum + batch.errors.length, 0) + this.errorBatch.length
    
    return {
      pendingBatches: this.pendingBatches.size,
      pendingErrors,
      isOnline: this.isOnline,
      sessionId: this.sessionId
    }
  }

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}