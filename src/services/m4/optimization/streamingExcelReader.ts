import * as ExcelJS from 'exceljs';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Options for streaming Excel reader
 */
export interface StreamingOptions {
  /** Number of rows to process in each batch (default: 1000) */
  batchSize?: number;
  /** Whether to emit progress events */
  emitProgress?: boolean;
  /** Starting row number (1-based) */
  startRow?: number;
  /** Ending row number (inclusive) */
  endRow?: number;
  /** Sheet name or index to read */
  sheetId?: string | number;
  /** Whether to skip empty rows */
  skipEmptyRows?: boolean;
  /** Maximum number of empty rows before stopping */
  maxEmptyRows?: number;
}

/**
 * Row data structure for streaming
 */
export interface StreamingRowData {
  /** Row number (1-based) */
  rowNumber: number;
  /** Row values as array */
  values: any[];
  /** Row values as object (if headers provided) */
  data?: Record<string, any>;
  /** Whether this is the last row in the batch */
  isLastInBatch: boolean;
}

/**
 * Progress information for streaming
 */
export interface StreamingProgress {
  /** Current row number being processed */
  currentRow: number;
  /** Total rows processed so far */
  totalProcessed: number;
  /** Current batch number */
  batchNumber: number;
  /** Estimated total rows (if available) */
  estimatedTotal?: number;
  /** Memory usage at this point */
  memoryUsage: NodeJS.MemoryUsage;
}

/**
 * Streaming Excel reader with memory-efficient processing
 */
export class StreamingExcelReader extends EventEmitter {
  private options: Required<StreamingOptions>;
  private headers: string[] | null = null;
  private rowBuffer: StreamingRowData[] = [];
  private processedCount = 0;
  private batchCount = 0;
  private emptyRowCount = 0;
  private lastGcTime = Date.now();
  private readonly GC_INTERVAL = 30000; // 30 seconds

  constructor(options: StreamingOptions = {}) {
    super();
    this.options = {
      batchSize: options.batchSize || 1000,
      emitProgress: options.emitProgress !== false,
      startRow: options.startRow || 1,
      endRow: options.endRow || Number.MAX_SAFE_INTEGER,
      sheetId: options.sheetId || 1,
      skipEmptyRows: options.skipEmptyRows !== false,
      maxEmptyRows: options.maxEmptyRows || 100
    };
  }

  /**
   * Read Excel file using streaming approach
   */
  async *readFile(filePath: string): AsyncGenerator<StreamingRowData[], void, unknown> {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats for progress estimation
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Create read stream
    const stream = fs.createReadStream(filePath);
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      styles: 'ignore',
      worksheets: 'emit',
      entries: 'emit'
    });

    let worksheetFound = false;

    for await (const worksheetReader of workbookReader) {
      // Check if this is the worksheet we want
      const sheetMatch = typeof this.options.sheetId === 'string'
        ? (worksheetReader as any).name === this.options.sheetId
        : (worksheetReader as any).id === this.options.sheetId;

      if (!sheetMatch) {
        continue;
      }

      worksheetFound = true;
      
      // Process worksheet rows
      yield* this.processWorksheet(worksheetReader, fileSize);

      break; // Only process one worksheet
    }

    if (!worksheetFound) {
      throw new Error(`Worksheet ${this.options.sheetId} not found`);
    }

    // Final cleanup
    this.performGarbageCollection();
    this.emit('complete', {
      totalProcessed: this.processedCount,
      totalBatches: this.batchCount
    });
  }

  /**
   * Process a single worksheet using streaming
   */
  private async *processWorksheet(
    worksheetReader: any,
    fileSize: number
  ): AsyncGenerator<StreamingRowData[], void, unknown> {
    let currentRow = 0;

    for await (const row of worksheetReader) {
      currentRow++;

      // Skip rows before startRow
      if (currentRow < this.options.startRow) {
        continue;
      }

      // Stop if we've reached endRow
      if (currentRow > this.options.endRow) {
        break;
      }

      // Extract row values
      const values = row.values as any[];
      
      // Handle headers (first row by default)
      if (currentRow === this.options.startRow && !this.headers) {
        this.headers = values.slice(1).map(v => String(v || ''));
        continue;
      }

      // Check for empty row
      const isEmpty = this.isEmptyRow(values);
      if (isEmpty) {
        this.emptyRowCount++;
        if (this.options.skipEmptyRows) {
          continue;
        }
        if (this.emptyRowCount >= this.options.maxEmptyRows) {
          this.emit('warning', `Stopped after ${this.emptyRowCount} empty rows`);
          break;
        }
      } else {
        this.emptyRowCount = 0;
      }

      // Create row data
      const rowData: StreamingRowData = {
        rowNumber: currentRow,
        values: values.slice(1), // Remove first empty element
        isLastInBatch: false
      };

      // Add data object if headers are available
      if (this.headers) {
        rowData.data = this.createDataObject(rowData.values);
      }

      // Add to buffer
      this.rowBuffer.push(rowData);
      this.processedCount++;

      // Check if batch is full
      if (this.rowBuffer.length >= this.options.batchSize) {
        this.rowBuffer[this.rowBuffer.length - 1].isLastInBatch = true;
        yield [...this.rowBuffer];
        this.rowBuffer = [];
        this.batchCount++;

        // Emit progress
        if (this.options.emitProgress) {
          this.emitProgress(currentRow, fileSize);
        }

        // Periodic garbage collection
        this.checkGarbageCollection();
      }
    }
    
    // Yield remaining rows in buffer
    if (this.rowBuffer.length > 0) {
      this.rowBuffer[this.rowBuffer.length - 1].isLastInBatch = true;
      yield [...this.rowBuffer];
      this.rowBuffer = [];
    }
  }

  /**
   * Check if a row is empty
   */
  private isEmptyRow(values: any[]): boolean {
    return !values || values.length <= 1 || 
           values.slice(1).every(v => v === null || v === undefined || v === '');
  }

  /**
   * Create data object from values using headers
   */
  private createDataObject(values: any[]): Record<string, any> {
    const data: Record<string, any> = {};
    if (this.headers) {
      this.headers.forEach((header, index) => {
        if (header) {
          data[header] = values[index];
        }
      });
    }
    return data;
  }

  /**
   * Emit progress event
   */
  private emitProgress(currentRow: number, fileSize: number): void {
    const progress: StreamingProgress = {
      currentRow,
      totalProcessed: this.processedCount,
      batchNumber: this.batchCount,
      memoryUsage: process.memoryUsage()
    };

    // Rough estimation based on file size and current position
    if (fileSize > 0) {
      const avgRowSize = fileSize / currentRow;
      progress.estimatedTotal = Math.round(fileSize / avgRowSize);
    }

    this.emit('progress', progress);
  }

  /**
   * Check if garbage collection should be performed
   */
  private checkGarbageCollection(): void {
    const now = Date.now();
    if (now - this.lastGcTime > this.GC_INTERVAL) {
      this.performGarbageCollection();
      this.lastGcTime = now;
    }
  }

  /**
   * Perform garbage collection if available
   */
  private performGarbageCollection(): void {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      
      if (freed > 0) {
        this.emit('gc', {
          freed,
          heapUsed: after,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Create async iterator for row-by-row processing
   */
  async *readRows(filePath: string): AsyncGenerator<StreamingRowData, void, unknown> {
    for await (const batch of this.readFile(filePath)) {
      for (const row of batch) {
        yield row;
      }
    }
  }

  /**
   * Static method to read file with callback pattern
   */
  static async processFile(
    filePath: string,
    processor: (batch: StreamingRowData[]) => Promise<void>,
    options?: StreamingOptions
  ): Promise<void> {
    const reader = new StreamingExcelReader(options);
    
    reader.on('progress', (progress) => {
      console.log(`Processing row ${progress.currentRow}, batch ${progress.batchNumber}`);
    });

    for await (const batch of reader.readFile(filePath)) {
      await processor(batch);
    }
  }

  /**
   * Utility method to count total rows without loading entire file
   */
  static async countRows(
    filePath: string,
    sheetId?: string | number
  ): Promise<number> {
    const reader = new StreamingExcelReader({
      batchSize: 10000,
      emitProgress: false,
      sheetId
    });

    let count = 0;
    for await (const batch of reader.readFile(filePath)) {
      count += batch.length;
    }

    return count;
  }
}

/**
 * Helper function to create a streaming reader with common defaults
 */
export function createStreamingReader(options?: StreamingOptions): StreamingExcelReader {
  return new StreamingExcelReader(options);
}

/**
 * Stream transformer for Excel rows
 */
export class ExcelRowTransformer extends Readable {
  private reader: StreamingExcelReader;
  private rowIterator?: AsyncGenerator<StreamingRowData, void, unknown>;
  private filePath: string;

  constructor(filePath: string, options?: StreamingOptions) {
    super({ objectMode: true });
    this.filePath = filePath;
    this.reader = new StreamingExcelReader(options);
  }

  async _read(): Promise<void> {
    if (!this.rowIterator) {
      this.rowIterator = this.reader.readRows(this.filePath);
    }

    try {
      const { value, done } = await this.rowIterator.next();
      if (done) {
        this.push(null);
      } else {
        this.push(value);
      }
    } catch (error) {
      this.destroy(error as Error);
    }
  }
}