import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { Worker } from 'worker_threads'
import { join } from 'path'
import { 
  M4ProcessingError, 
  M4ErrorType 
} from '../src/types/m4ProcessingErrors'
import { M4ProcessStep } from '../src/shared/types'

// Integration test for M4 error reporting across worker threads
describe('M4 Error Reporting Integration', () => {
  let testWorkerPath: string

  beforeAll(() => {
    // Create a test worker script
    testWorkerPath = join(__dirname, 'test-worker.js')
  })

  test('should propagate error from worker thread to main thread', async () => {
    // Create a simple worker that generates an M4 error
    const workerCode = `
      const { parentPort, threadId } = require('worker_threads');
      const { M4ProcessingError, M4ErrorType } = require('../src/types/m4ProcessingErrors');
      
      // Simulate processing error
      const error = new M4ProcessingError(
        M4ErrorType.EXCEL_PARSE,
        'Test error from worker',
        'high'
      );
      
      // Send serialized error to main thread
      parentPort.postMessage({
        type: 'm4-error',
        error: M4ProcessingError.serialize(error),
        context: {
          workerId: threadId,
          stage: 'FILE_READING'
        }
      });
    `

    const worker = new Worker(workerCode, { eval: true })

    const errorReceived = await new Promise<boolean>((resolve) => {
      worker.on('message', (message) => {
        if (message.type === 'm4-error') {
          expect(message.error).toBeDefined()
          expect(message.context.workerId).toBeDefined()
          resolve(true)
        }
      })

      worker.on('error', () => resolve(false))
    })

    expect(errorReceived).toBe(true)
    await worker.terminate()
  })

  test('should handle multiple concurrent worker errors', async () => {
    const workerCount = 3
    const workers: Worker[] = []
    const errors: any[] = []

    // Create multiple workers that generate errors
    for (let i = 0; i < workerCount; i++) {
      const workerCode = `
        const { parentPort, threadId } = require('worker_threads');
        const { M4ProcessingError, M4ErrorType } = require('../src/types/m4ProcessingErrors');
        
        setTimeout(() => {
          const error = new M4ProcessingError(
            M4ErrorType.WORKER_THREAD,
            'Worker ${i} error',
            'medium'
          );
          
          parentPort.postMessage({
            type: 'm4-error',
            error: M4ProcessingError.serialize(error),
            context: {
              workerId: threadId,
              workerIndex: ${i}
            }
          });
        }, ${i * 100}); // Stagger errors
      `

      const worker = new Worker(workerCode, { eval: true })
      workers.push(worker)

      worker.on('message', (message) => {
        if (message.type === 'm4-error') {
          errors.push(message)
        }
      })
    }

    // Wait for all errors
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(errors.length).toBe(workerCount)
    
    // Verify each error has unique worker context
    const workerIndices = errors.map(e => e.context.workerIndex)
    expect(new Set(workerIndices).size).toBe(workerCount)

    // Cleanup
    await Promise.all(workers.map(w => w.terminate()))
  })

  test('should maintain error context through serialization', async () => {
    const originalError = new M4ProcessingError(
      M4ErrorType.DATA_VALIDATION,
      'Validation failed',
      'high',
      new Error('Invalid data format')
    )

    // Add complex context
    originalError.addDetail('fileName', 'test.xlsx')
    originalError.addDetail('sheetName', 'Data')
    originalError.addDetail('invalidRows', [10, 15, 20])
    originalError.addDetail('validationRules', {
      requiredColumns: ['ID', 'Name'],
      dataTypes: { ID: 'number', Name: 'string' }
    })

    const serialized = M4ProcessingError.serialize(originalError)
    const deserialized = M4ProcessingError.deserialize(serialized)

    expect(deserialized.type).toBe(originalError.type)
    expect(deserialized.message).toBe(originalError.message)
    expect(deserialized.severity).toBe(originalError.severity)
    expect(deserialized.details).toEqual(originalError.details)
    expect(deserialized.errorId).toBe(originalError.errorId)
    expect(deserialized.timestamp).toBe(originalError.timestamp)
  })

  test('should handle error scenarios in M4 processing', async () => {
    const errorScenarios = [
      {
        type: M4ErrorType.FILE_NOT_FOUND,
        message: 'Input file not found',
        context: { fileName: 'missing.xlsx', stage: M4ProcessStep.FILE_READING }
      },
      {
        type: M4ErrorType.EXCEL_WORKSHEET,
        message: 'Required worksheet missing',
        context: { sheetName: 'RequiredSheet', stage: M4ProcessStep.SHEET_PROCESSING }
      },
      {
        type: M4ErrorType.DATA_MAPPING,
        message: 'Column mapping failed',
        context: { columnName: 'ID', stage: M4ProcessStep.DATA_MAPPING }
      },
      {
        type: M4ErrorType.MEMORY_PRESSURE,
        message: 'Out of memory',
        context: { heapUsed: 1800000000, stage: M4ProcessStep.DATA_PROCESSING }
      },
      {
        type: M4ErrorType.OUTPUT_PERMISSION,
        message: 'Cannot write output file',
        context: { outputPath: '/protected/output.xlsx', stage: M4ProcessStep.FILE_WRITING }
      }
    ]

    for (const scenario of errorScenarios) {
      const error = new M4ProcessingError(
        scenario.type,
        scenario.message,
        'high'
      )

      // Verify error can be created and serialized
      expect(error.type).toBe(scenario.type)
      expect(error.message).toBe(scenario.message)
      
      const serialized = M4ProcessingError.serialize(error)
      expect(serialized).toBeDefined()
      expect(typeof serialized).toBe('string')
      
      const deserialized = M4ProcessingError.deserialize(serialized)
      expect(deserialized.type).toBe(scenario.type)
    }
  })

  test('should handle error recovery workflow', async () => {
    // Simulate a recoverable error scenario
    const error = new M4ProcessingError(
      M4ErrorType.EXCEL_CELL,
      'Invalid cell value',
      'medium'
    )
    error.addDetail('cellAddress', 'A10')
    error.addDetail('expectedType', 'number')
    error.addDetail('actualValue', 'N/A')
    error.addDetail('recoveryAction', 'skip')

    // Error should be recoverable
    expect(error.severity).toBe('medium')
    expect(error.details.recoveryAction).toBe('skip')

    // Simulate recovery by continuing processing
    const canRecover = error.severity !== 'critical'
    expect(canRecover).toBe(true)
  })

  test('should aggregate errors by type and severity', () => {
    const errors = [
      new M4ProcessingError(M4ErrorType.EXCEL_PARSE, 'Parse error 1', 'high'),
      new M4ProcessingError(M4ErrorType.EXCEL_PARSE, 'Parse error 2', 'medium'),
      new M4ProcessingError(M4ErrorType.WORKER_THREAD, 'Worker error', 'critical'),
      new M4ProcessingError(M4ErrorType.DATA_VALIDATION, 'Validation error', 'low'),
      new M4ProcessingError(M4ErrorType.DATA_VALIDATION, 'Another validation', 'medium')
    ]

    // Aggregate by type
    const byType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    expect(byType[M4ErrorType.EXCEL_PARSE]).toBe(2)
    expect(byType[M4ErrorType.DATA_VALIDATION]).toBe(2)
    expect(byType[M4ErrorType.WORKER_THREAD]).toBe(1)

    // Aggregate by severity
    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    expect(bySeverity['medium']).toBe(2)
    expect(bySeverity['high']).toBe(1)
    expect(bySeverity['critical']).toBe(1)
    expect(bySeverity['low']).toBe(1)
  })
})