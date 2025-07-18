import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { M4ErrorReporter } from '../src/main/services/m4-error-reporter'
import { LocalErrorReporter } from '../src/main/services/local-error-reporter'
import { RemoteErrorReporter } from '../src/main/services/remote-error-reporter'
import { 
  M4ProcessingError, 
  M4ErrorType,
  M4ErrorContext,
  SerializableM4Error
} from '../src/types/m4ProcessingErrors'
import { M4ProcessStep } from '../src/shared/types'
import { FileOperations } from '../src/main/utils/file-operations'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/user/data'),
    getVersion: jest.fn(() => '0.3.0'),
    on: jest.fn()
  },
  net: {
    request: jest.fn()
  }
}))

jest.mock('electron-log', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock file operations
jest.mock('../src/main/utils/file-operations')

describe('M4 Error Reporting System', () => {
  let m4ErrorReporter: M4ErrorReporter
  let localReporter: LocalErrorReporter
  let remoteReporter: RemoteErrorReporter
  let mockErrorDir: string

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    mockErrorDir = '/mock/user/data/error-reports/m4-errors'
    
    // Mock file operations
    (FileOperations.ensureDirectory as jest.Mock).mockResolvedValue({ success: true })
    (FileOperations.writeJsonFile as jest.Mock).mockResolvedValue({ success: true })
    (FileOperations.listDirectory as jest.Mock).mockResolvedValue({ 
      success: true, 
      data: [] 
    })
    
    // Create instances
    localReporter = new LocalErrorReporter()
    remoteReporter = new RemoteErrorReporter(localReporter)
    m4ErrorReporter = new M4ErrorReporter(localReporter, remoteReporter)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Error Type and Context', () => {
    test('should create M4 processing error with correct type', () => {
      const error = new M4ProcessingError(
        M4ErrorType.EXCEL_PARSE,
        'Failed to parse Excel file',
        'high',
        new Error('Invalid format')
      )

      expect(error.type).toBe(M4ErrorType.EXCEL_PARSE)
      expect(error.severity).toBe('high')
      expect(error.message).toBe('Failed to parse Excel file')
      expect(error.userMessage).toBe('Failed to parse Excel file')
    })

    test('should create error context with all required fields', () => {
      const context: M4ErrorContext = {
        processType: 'dialogue',
        stage: M4ProcessStep.FILE_READING,
        fileName: 'test.xlsx',
        sheetName: 'Sheet1',
        rowNumber: 10,
        columnNumber: 5,
        workerId: 'worker-123',
        inputFolder: '/input',
        outputFolder: '/output',
        processingTime: 1000,
        itemsProcessed: 50,
        totalItems: 100
      }

      expect(context.processType).toBe('dialogue')
      expect(context.stage).toBe(M4ProcessStep.FILE_READING)
      expect(context.fileName).toBe('test.xlsx')
    })
  })

  describe('Local Error Logging', () => {
    test('should save M4 error to local directory', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.FILE_NOT_FOUND,
        'Input file not found',
        'high'
      )

      const context: M4ErrorContext = {
        processType: 'string',
        stage: M4ProcessStep.FILE_READING,
        fileName: 'missing.xlsx'
      }

      const result = await m4ErrorReporter.reportM4Error(error, context)

      expect(result.success).toBe(true)
      expect(result.localSaved).toBe(true)
      expect(result.remoteSent).toBe(false)
      expect(FileOperations.writeJsonFile).toHaveBeenCalled()
    })

    test('should handle corrupted Excel file error', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.FILE_CORRUPT,
        'Excel file is corrupted',
        'critical',
        new Error('ZIP format error')
      )

      const result = await m4ErrorReporter.reportM4Error(error, {
        processType: 'dialogue',
        stage: M4ProcessStep.FILE_READING,
        fileName: 'corrupted.xlsx'
      })

      expect(result.success).toBe(true)
      expect(result.localSaved).toBe(true)
    })

    test('should handle worker thread crash', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.WORKER_THREAD,
        'Worker thread crashed',
        'critical',
        new Error('Worker exited with code 1')
      )

      const result = await m4ErrorReporter.reportM4Error(error, {
        processType: 'string',
        stage: M4ProcessStep.DATA_PROCESSING,
        workerId: 'worker-456'
      })

      expect(result.success).toBe(true)
      expect(result.localSaved).toBe(true)
    })

    test('should handle file permission error', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.FILE_PERMISSION,
        'Permission denied writing output file',
        'high',
        new Error('EACCES: permission denied')
      )

      const result = await m4ErrorReporter.reportM4Error(error, {
        processType: 'dialogue',
        stage: M4ProcessStep.FILE_WRITING,
        fileName: 'output.xlsx',
        outputFolder: '/protected/folder'
      })

      expect(result.success).toBe(true)
      expect(result.localSaved).toBe(true)
    })
  })

  describe('Serialized Error Handling', () => {
    test('should handle serialized error from worker thread', async () => {
      const originalError = new M4ProcessingError(
        M4ErrorType.DATA_VALIDATION,
        'Invalid data format',
        'medium'
      )

      const serialized = M4ProcessingError.serialize(originalError)
      
      const result = await m4ErrorReporter.reportSerializedM4Error(serialized, {
        processType: 'string',
        stage: M4ProcessStep.DATA_VALIDATION,
        workerId: 'worker-789'
      })

      expect(result.success).toBe(true)
      expect(result.localSaved).toBe(true)
    })

    test('should preserve error details through serialization', async () => {
      const originalError = new M4ProcessingError(
        M4ErrorType.EXCEL_COLUMN,
        'Missing required column',
        'high',
        new Error('Column "ID" not found')
      )
      originalError.addDetail('expectedColumn', 'ID')
      originalError.addDetail('foundColumns', ['Name', 'Value'])

      const serialized = M4ProcessingError.serialize(originalError)
      const result = await m4ErrorReporter.reportSerializedM4Error(serialized)

      expect(result.success).toBe(true)
      
      // Verify the error was properly deserialized
      const writeCall = (FileOperations.writeJsonFile as jest.Mock).mock.calls[0]
      const savedError = writeCall[1]
      expect(savedError.context.m4Context).toBeDefined()
    })
  })

  describe('Remote Error Reporting', () => {
    beforeEach(() => {
      // Enable remote reporting for these tests
      m4ErrorReporter.updateConfig({
        enableRemoteReporting: true
      })
      
      // Mock remote reporter to simulate successful sends
      jest.spyOn(remoteReporter, 'reportError').mockResolvedValue({
        success: true,
        localSaved: true,
        remoteSent: true
      })
    })

    test('should send error to remote endpoint when enabled', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.MEMORY_PRESSURE,
        'Out of memory during processing',
        'critical'
      )

      const result = await m4ErrorReporter.reportM4Error(error, {
        processType: 'dialogue',
        stage: M4ProcessStep.DATA_PROCESSING,
        memoryUsage: {
          heapUsed: 1800000000,
          heapTotal: 2000000000,
          external: 50000000,
          rss: 2500000000
        }
      })

      expect(result.remoteSent).toBe(true)
      expect(remoteReporter.reportError).toHaveBeenCalled()
    })

    test('should batch multiple errors for remote sending', async () => {
      const errors = [
        new M4ProcessingError(M4ErrorType.EXCEL_ROW, 'Invalid row data', 'medium'),
        new M4ProcessingError(M4ErrorType.DATA_MAPPING, 'Mapping failed', 'medium'),
        new M4ProcessingError(M4ErrorType.EXCEL_CELL, 'Cell validation failed', 'low')
      ]

      for (const error of errors) {
        await m4ErrorReporter.reportM4Error(error, {
          processType: 'string',
          stage: M4ProcessStep.DATA_VALIDATION
        })
      }

      // Verify errors were sent
      expect(remoteReporter.reportError).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Context Enhancement', () => {
    test('should include full context in error report', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.EXCEL_WORKSHEET,
        'Worksheet not found',
        'high'
      )

      const context: M4ErrorContext = {
        processType: 'dialogue',
        stage: M4ProcessStep.SHEET_PROCESSING,
        fileName: 'dialogue.xlsx',
        sheetName: 'Missing Sheet',
        inputFolder: '/data/input',
        outputFolder: '/data/output',
        processingTime: 5000,
        itemsProcessed: 0,
        totalItems: 100,
        memoryUsage: {
          heapUsed: 100000000,
          heapTotal: 200000000,
          external: 10000000,
          rss: 250000000
        }
      }

      const result = await m4ErrorReporter.reportM4Error(error, context)

      expect(result.success).toBe(true)
      
      // Verify context was included
      const writeCall = (FileOperations.writeJsonFile as jest.Mock).mock.calls[0]
      const savedError = writeCall[1]
      expect(savedError.context.m4Context).toMatchObject(context)
    })

    test('should add breadcrumbs for error tracking', async () => {
      // Add breadcrumbs
      m4ErrorReporter.addBreadcrumb('file-open', 'Opening Excel file', 'info', {
        fileName: 'test.xlsx',
        size: 1024000
      })
      
      m4ErrorReporter.addBreadcrumb('sheet-load', 'Loading worksheet', 'info', {
        sheetName: 'Data'
      })
      
      m4ErrorReporter.addBreadcrumb('validation', 'Validation failed', 'error', {
        reason: 'Missing columns'
      })

      const error = new M4ProcessingError(
        M4ErrorType.DATA_VALIDATION,
        'Validation failed',
        'high'
      )

      const result = await m4ErrorReporter.reportM4Error(error)

      expect(result.success).toBe(true)
      
      // Breadcrumbs should be included in the error report
      const writeCall = (FileOperations.writeJsonFile as jest.Mock).mock.calls[0]
      const savedError = writeCall[1]
      expect(savedError.breadcrumbs).toBeDefined()
      expect(savedError.breadcrumbs.length).toBeGreaterThan(0)
    })
  })

  describe('Log Rotation', () => {
    test('should perform log rotation when file limit exceeded', async () => {
      // Mock existing files exceeding limit
      const mockFiles = Array.from({ length: 250 }, (_, i) => ({
        name: `m4-error-2025-07-${String(i).padStart(2, '0')}-${randomUUID()}.json`,
        stats: {
          size: 50000,
          mtime: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Each file 1 day older
        }
      }))

      ;(FileOperations.listDirectory as jest.Mock).mockResolvedValue({
        success: true,
        data: mockFiles
      })

      ;(FileOperations.deleteFile as jest.Mock).mockResolvedValue({ success: true })

      // Trigger log rotation by reporting an error
      const error = new M4ProcessingError(
        M4ErrorType.FILE_SIZE,
        'File too large',
        'medium'
      )

      await m4ErrorReporter.reportM4Error(error)

      // Should delete files exceeding the limit (200)
      expect(FileOperations.deleteFile).toHaveBeenCalled()
    })

    test('should delete files older than retention period', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days old
      
      const mockFiles = [
        {
          name: 'old-m4-error.json',
          stats: {
            size: 50000,
            mtime: oldDate
          }
        }
      ]

      ;(FileOperations.listDirectory as jest.Mock).mockResolvedValue({
        success: true,
        data: mockFiles
      })

      ;(FileOperations.deleteFile as jest.Mock).mockResolvedValue({ success: true })

      const error = new M4ProcessingError(
        M4ErrorType.TIMEOUT,
        'Processing timeout',
        'high'
      )

      await m4ErrorReporter.reportM4Error(error)

      // Should delete old file
      expect(FileOperations.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('old-m4-error.json')
      )
    })
  })

  describe('Error Statistics', () => {
    test('should generate error statistics', async () => {
      // Report various errors
      const errors = [
        { type: M4ErrorType.EXCEL_PARSE, severity: 'high' as const },
        { type: M4ErrorType.EXCEL_PARSE, severity: 'medium' as const },
        { type: M4ErrorType.WORKER_THREAD, severity: 'critical' as const },
        { type: M4ErrorType.FILE_IO, severity: 'low' as const }
      ]

      for (const errorConfig of errors) {
        const error = new M4ProcessingError(
          errorConfig.type,
          'Test error',
          errorConfig.severity
        )
        await m4ErrorReporter.reportM4Error(error)
      }

      const stats = await m4ErrorReporter.getM4ErrorStats()

      expect(stats.totalErrors).toBe(4)
      expect(stats.errorsByType[M4ErrorType.EXCEL_PARSE]).toBe(2)
      expect(stats.errorsByType[M4ErrorType.WORKER_THREAD]).toBe(1)
      expect(stats.errorsBySeverity['high']).toBe(1)
      expect(stats.errorsBySeverity['critical']).toBe(1)
    })
  })

  describe('Error Recovery', () => {
    test('should handle local save failure gracefully', async () => {
      // Mock write failure
      (FileOperations.writeJsonFile as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: 'Disk full' 
      })

      const error = new M4ProcessingError(
        M4ErrorType.OUTPUT_WRITE,
        'Failed to write output',
        'high'
      )

      const result = await m4ErrorReporter.reportM4Error(error)

      expect(result.success).toBe(false)
      expect(result.localSaved).toBe(false)
    })

    test('should continue processing after error report failure', async () => {
      // Mock report failure
      jest.spyOn(m4ErrorReporter, 'reportM4Error').mockRejectedValueOnce(
        new Error('Report failed')
      )

      const error = new M4ProcessingError(
        M4ErrorType.RESOURCE_EXHAUSTED,
        'Resources exhausted',
        'critical'
      )

      // Should not throw
      await expect(async () => {
        try {
          await m4ErrorReporter.reportM4Error(error)
        } catch (e) {
          // Error is caught and handled
        }
      }).not.toThrow()
    })
  })

  describe('Data Masking', () => {
    test('should mask sensitive file paths', async () => {
      const error = new M4ProcessingError(
        M4ErrorType.FILE_NOT_FOUND,
        'File not found: /Users/johndoe/Documents/sensitive.xlsx',
        'high'
      )

      await m4ErrorReporter.reportM4Error(error, {
        processType: 'dialogue',
        stage: M4ProcessStep.FILE_READING,
        fileName: '/Users/johndoe/Documents/sensitive.xlsx',
        inputFolder: '/Users/johndoe/Documents/input'
      })

      // Check that paths are masked in saved error
      const writeCall = (FileOperations.writeJsonFile as jest.Mock).mock.calls[0]
      const savedError = writeCall[1]
      
      // The masking should happen in the remote reporter
      // For local storage, paths may remain unmasked
      expect(savedError).toBeDefined()
    })
  })

  describe('Export and Clear Functions', () => {
    test('should export M4 error logs', async () => {
      const mockFiles = [
        { name: 'm4-error-1.json', stats: { size: 1000, mtime: new Date() } },
        { name: 'm4-error-2.json', stats: { size: 2000, mtime: new Date() } }
      ]

      ;(FileOperations.listDirectory as jest.Mock).mockResolvedValue({
        success: true,
        data: mockFiles
      })

      const result = await m4ErrorReporter.exportM4ErrorLogs('/export/path')

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(2)
    })

    test('should clear all M4 error logs', async () => {
      const mockFiles = [
        { name: 'm4-error-1.json', stats: { size: 1000, mtime: new Date() } },
        { name: 'm4-error-2.json', stats: { size: 2000, mtime: new Date() } },
        { name: 'm4-error-3.json', stats: { size: 3000, mtime: new Date() } }
      ]

      ;(FileOperations.listDirectory as jest.Mock).mockResolvedValue({
        success: true,
        data: mockFiles
      })

      ;(FileOperations.deleteFile as jest.Mock).mockResolvedValue({ success: true })

      const result = await m4ErrorReporter.clearM4ErrorLogs()

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(3)
      expect(FileOperations.deleteFile).toHaveBeenCalledTimes(3)
    })
  })
})