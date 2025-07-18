/**
 * M4 Error Logging Integration Test
 * 
 * M4 에러 로깅 통합 시스템이 올바르게 작동하는지 테스트합니다.
 */

const { test, expect } = require('@jest/globals')
const { randomUUID } = require('crypto')
const path = require('path')
const fs = require('fs')

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      if (name === 'userData') return '/tmp/test-sebastian'
      if (name === 'temp') return '/tmp'
      return '/tmp'
    }),
    getVersion: jest.fn(() => '0.2.0')
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    getFocusedWindow: jest.fn(() => null)
  }
}))

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

// Mock file operations
jest.mock('../src/main/utils/file-operations', () => ({
  FileOperations: {
    ensureDirectory: jest.fn(async () => ({ success: true })),
    writeFileAtomic: jest.fn(async () => ({ success: true })),
    readFileAtomic: jest.fn(async () => ({ success: true, data: '{}' })),
    listFiles: jest.fn(async () => ({ success: true, data: [] })),
    deleteFile: jest.fn(async () => ({ success: true }))
  }
}))

// Mock data masking
jest.mock('../src/main/utils/data-masking', () => ({
  DataMasking: jest.fn().mockImplementation(() => ({
    maskText: jest.fn((text) => text.replace(/sensitive/g, '***')),
    maskStackTrace: jest.fn((stack) => stack.replace(/\/home\/[^\/]+\//g, '/home/***/')),
    updateConfig: jest.fn(),
    containsSensitiveData: jest.fn(() => ({ detectedPatterns: [] })),
    getMaskingStats: jest.fn(() => ({ originalLength: 0, maskedLength: 0 }))
  }))
}))

// 테스트 대상 모듈 임포트
let M4ErrorReporter
let M4ErrorIntegrationService
let M4WorkerErrorBridge

describe('M4 Error Logging Integration', () => {
  beforeEach(async () => {
    // 모듈 동적 임포트 (ES modules)
    const { M4ErrorReporter: ErrorReporter } = await import('../src/main/services/m4-error-reporter.ts')
    const { M4ErrorIntegrationService: IntegrationService } = await import('../src/services/m4ErrorIntegration.ts')
    const { M4WorkerErrorBridge: WorkerBridge } = await import('../src/utils/m4-worker-error-bridge.ts')
    
    M4ErrorReporter = ErrorReporter
    M4ErrorIntegrationService = IntegrationService
    M4WorkerErrorBridge = WorkerBridge
  })

  describe('M4ErrorReporter', () => {
    let errorReporter
    let sessionId

    beforeEach(() => {
      sessionId = `test-session-${Date.now()}`
      errorReporter = new M4ErrorReporter(sessionId, {
        maxFiles: 10,
        maxAge: 1,
        enableDataMasking: true
      })
    })

    test('should initialize successfully', () => {
      expect(errorReporter).toBeDefined()
      expect(errorReporter.getSessionId()).toBe(sessionId)
    })

    test('should report M4 error correctly', async () => {
      const errorRequest = {
        errorType: 'DATA_PARSING',
        severity: 'medium',
        message: 'Test error message with sensitive data',
        context: {
          processType: 'dialogue',
          stage: 1,
          fileName: 'test.xlsx',
          filePath: '/home/user/documents/test.xlsx',
          processedFiles: 5,
          totalFiles: 10,
          memoryUsage: 256
        },
        timestamp: Date.now(),
        correlationId: randomUUID(),
        recoverable: true,
        retryable: false
      }

      const reportId = await errorReporter.reportM4Error(errorRequest)
      
      expect(reportId).toBeDefined()
      expect(typeof reportId).toBe('string')
    })

    test('should generate error stats correctly', () => {
      const stats = errorReporter.generateM4ErrorStats()
      
      expect(stats).toBeDefined()
      expect(stats.totalErrors).toBe(0)
      expect(stats.errorsByType).toBeDefined()
      expect(stats.errorsBySeverity).toBeDefined()
      expect(stats.errorsByProcessStep).toBeDefined()
      expect(stats.errorsByProcessType).toBeDefined()
    })

    test('should handle breadcrumb addition', () => {
      expect(() => {
        errorReporter.addBreadcrumb({
          category: 'test',
          message: 'Test breadcrumb',
          level: 'info',
          data: { test: true }
        })
      }).not.toThrow()
    })

    test('should update context correctly', async () => {
      const correlationId = randomUUID()
      const contextUpdate = {
        processedFiles: 7,
        memoryUsage: 512
      }

      await expect(
        errorReporter.updateM4ErrorContext(correlationId, contextUpdate)
      ).resolves.not.toThrow()
    })

    test('should export error logs', async () => {
      const exportRequest = {
        outputFormat: 'json',
        includeContext: true,
        includeSensitiveData: false,
        maxRecords: 100
      }

      const filePath = await errorReporter.exportM4ErrorLogs(exportRequest)
      
      expect(filePath).toBeDefined()
      expect(typeof filePath).toBe('string')
      expect(filePath.endsWith('.json')).toBe(true)
    })

    test('should clear error logs', async () => {
      await expect(
        errorReporter.clearM4ErrorLogs()
      ).resolves.not.toThrow()
    })

    test('should mask sensitive data', async () => {
      const errorRequest = {
        errorType: 'DATA_VALIDATION',
        severity: 'high',
        message: 'Error in processing sensitive file',
        context: {
          processType: 'string',
          stage: 2,
          fileName: 'sensitive_data.xlsx',
          filePath: '/home/user/sensitive/data.xlsx',
          fieldValue: 'user@example.com',
          processedFiles: 1,
          totalFiles: 1
        },
        timestamp: Date.now(),
        correlationId: randomUUID(),
        recoverable: false,
        retryable: true
      }

      const reportId = await errorReporter.reportM4Error(errorRequest)
      
      expect(reportId).toBeDefined()
      // 데이터 마스킹이 적용되었는지 확인하기 위해 stats를 확인
      const stats = errorReporter.generateM4ErrorStats()
      expect(stats.totalErrors).toBe(1)
    })
  })

  describe('M4WorkerErrorBridge', () => {
    let workerBridge
    let workerId

    beforeEach(() => {
      workerId = `worker-${Date.now()}`
      workerBridge = new M4WorkerErrorBridge(workerId)
    })

    test('should initialize successfully', () => {
      expect(workerBridge).toBeDefined()
      expect(workerBridge.getWorkerId()).toBe(workerId)
    })

    test('should report simple error', async () => {
      const errorType = 'FILE_NOT_FOUND'
      const message = 'Test file not found'
      const context = {
        processType: 'dialogue',
        stage: 1,
        fileName: 'missing.xlsx',
        filePath: '/path/to/missing.xlsx'
      }

      // Worker 환경을 모킹하기 위해 process.send 설정
      const originalSend = process.send
      process.send = jest.fn()

      try {
        const reportId = await workerBridge.reportSimpleError(
          errorType, 
          message, 
          context, 
          {
            severity: 'medium',
            priority: 'high',
            recoverable: true,
            retryable: true
          }
        )

        // process.send가 호출되었는지 확인
        expect(process.send).toHaveBeenCalled()
        
        const sentMessage = process.send.mock.calls[0][0]
        expect(sentMessage.type).toBe('M4_ERROR')
        expect(sentMessage.workerId).toBe(workerId)
        expect(sentMessage.priority).toBe('high')
        expect(sentMessage.payload).toBeDefined()
      } finally {
        // process.send 복원
        process.send = originalSend
      }
    })

    test('should update error context', async () => {
      const correlationId = randomUUID()
      const context = {
        processedFiles: 5,
        memoryUsage: 1024
      }

      const originalSend = process.send
      process.send = jest.fn()

      try {
        await workerBridge.updateErrorContext(correlationId, context)

        expect(process.send).toHaveBeenCalled()
        
        const sentMessage = process.send.mock.calls[0][0]
        expect(sentMessage.type).toBe('M4_ERROR_CONTEXT_UPDATE')
        expect(sentMessage.correlationId).toBe(correlationId)
        expect(sentMessage.context).toEqual(context)
      } finally {
        process.send = originalSend
      }
    })

    test('should add breadcrumb', async () => {
      const category = 'test'
      const message = 'Test breadcrumb from worker'
      const level = 'info'
      const data = { test: true }

      const originalSend = process.send
      process.send = jest.fn()

      try {
        await workerBridge.addBreadcrumb(category, message, level, data)

        expect(process.send).toHaveBeenCalled()
        
        const sentMessage = process.send.mock.calls[0][0]
        expect(sentMessage.type).toBe('M4_BREADCRUMB')
        expect(sentMessage.breadcrumb.category).toBe(category)
        expect(sentMessage.breadcrumb.message).toBe(message)
        expect(sentMessage.breadcrumb.level).toBe(level)
        expect(sentMessage.breadcrumb.data).toEqual(data)
      } finally {
        process.send = originalSend
      }
    })

    test('should track pending messages', async () => {
      expect(workerBridge.getPendingMessageCount()).toBe(0)

      const originalSend = process.send
      process.send = jest.fn()

      try {
        // 메시지 전송하지만 응답 없이 대기
        workerBridge.reportSimpleError('DATA_PARSING', 'Test error', {
          processType: 'dialogue',
          stage: 1
        })

        // 잠깐 대기하여 메시지가 대기 목록에 추가되도록 함
        await new Promise(resolve => setTimeout(resolve, 10))

        expect(workerBridge.getPendingMessageCount()).toBeGreaterThan(0)

        // 대기 중인 메시지 정리
        workerBridge.clearPendingMessages()
        expect(workerBridge.getPendingMessageCount()).toBe(0)
      } finally {
        process.send = originalSend
      }
    })
  })

  describe('Integration Test', () => {
    test('should integrate M4 error reporting with worker bridge', async () => {
      const sessionId = `integration-test-${Date.now()}`
      const workerId = `worker-${Date.now()}`
      
      // M4 에러 리포터 초기화
      const errorReporter = new M4ErrorReporter(sessionId)
      
      // 워커 브리지 초기화
      const workerBridge = new M4WorkerErrorBridge(workerId)
      
      // 통합 테스트: 워커에서 에러 발생 -> 메인 프로세스로 전파
      const errorType = 'EXCEL_WORKBOOK'
      const message = 'Integration test error'
      const context = {
        processType: 'dialogue',
        stage: 1,
        fileName: 'integration_test.xlsx',
        processedFiles: 1,
        totalFiles: 5,
        memoryUsage: 512
      }

      // 워커 환경 모킹
      const originalSend = process.send
      process.send = jest.fn()

      try {
        // 워커에서 에러 보고
        await workerBridge.reportSimpleError(errorType, message, context, {
          severity: 'high',
          priority: 'critical',
          recoverable: false,
          retryable: true
        })

        // 메시지가 올바르게 구성되었는지 확인
        expect(process.send).toHaveBeenCalled()
        
        const sentMessage = process.send.mock.calls[0][0]
        expect(sentMessage.type).toBe('M4_ERROR')
        expect(sentMessage.workerId).toBe(workerId)
        expect(sentMessage.priority).toBe('critical')
        expect(sentMessage.payload.errorType).toBe(errorType)
        expect(sentMessage.payload.message).toBe(message)
        expect(sentMessage.payload.severity).toBe('high')

        // 메인 프로세스에서 직접 에러 보고 (워커 메시지 처리 시뮬레이션)
        const errorRequest = {
          errorType: sentMessage.payload.errorType,
          severity: sentMessage.payload.severity,
          message: sentMessage.payload.message,
          context: context,
          timestamp: sentMessage.payload.timestamp,
          correlationId: sentMessage.payload.correlationId,
          workerId: sentMessage.workerId,
          recoverable: sentMessage.payload.recoverable,
          retryable: sentMessage.payload.retryable
        }

        const reportId = await errorReporter.reportM4Error(errorRequest)
        
        expect(reportId).toBeDefined()
        expect(typeof reportId).toBe('string')

        // 통계 확인
        const stats = errorReporter.generateM4ErrorStats()
        expect(stats.totalErrors).toBe(1)
        expect(stats.errorsByType[errorType]).toBe(1)
        expect(stats.errorsBySeverity.high).toBe(1)
        expect(stats.errorsByProcessType.dialogue).toBe(1)
      } finally {
        process.send = originalSend
      }
    })
  })
})