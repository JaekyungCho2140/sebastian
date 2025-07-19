import { StreamingExcelReader, StreamingRowData, StreamingOptions } from './streamingExcelReader';
import { M4DialogueRow, M4StringRow } from '../../../types/m4Processing';
import { EventEmitter } from 'events';
import * as path from 'path';

/**
 * Streaming adapter configuration
 */
export interface M4StreamingConfig extends StreamingOptions {
  /** Type of M4 processor */
  processorType: 'dialogue' | 'string';
  /** Maximum rows to accumulate before processing */
  accumulationThreshold?: number;
  /** Whether to use streaming for output as well */
  streamOutput?: boolean;
}

/**
 * Batch processing result
 */
export interface BatchResult<T> {
  /** Processed data */
  data: T[];
  /** Number of rows processed */
  rowsProcessed: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Memory delta during processing */
  memoryDelta: number;
}

/**
 * Adapter to integrate streaming with M4 processors
 */
export class M4StreamingAdapter extends EventEmitter {
  private config: Required<M4StreamingConfig>;
  private accumulator: any[] = [];
  private startMemory: number = 0;
  private startTime: number = 0;

  constructor(config: M4StreamingConfig) {
    super();
    this.config = {
      ...config,
      accumulationThreshold: config.accumulationThreshold || 5000,
      streamOutput: config.streamOutput !== false
    } as Required<M4StreamingConfig>;
  }

  /**
   * Process M4 Dialogue file with streaming
   */
  async processDialogueFile(
    filePath: string,
    type: 'npc' | 'cinematic' | 'smalltalk',
    processor: (rows: any[]) => M4DialogueRow[]
  ): Promise<BatchResult<M4DialogueRow>[]> {
    const results: BatchResult<M4DialogueRow>[] = [];
    const reader = new StreamingExcelReader({
      ...this.config,
      startRow: this.getDialogueStartRow(type),
      batchSize: this.config.batchSize || 1000
    });

    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;

    reader.on('progress', (progress) => {
      this.emit('progress', {
        ...progress,
        fileType: 'dialogue',
        subType: type
      });
    });

    for await (const batch of reader.readFile(filePath)) {
      // Convert streaming rows to dialogue format
      const dialogueRows = this.convertToDialogueRows(batch, type);
      this.accumulator.push(...dialogueRows);

      // Process accumulated data if threshold reached
      if (this.accumulator.length >= this.config.accumulationThreshold) {
        const result = await this.processBatch(processor);
        results.push(result);
        this.accumulator = [];
      }
    }

    // Process remaining data
    if (this.accumulator.length > 0) {
      const result = await this.processBatch(processor);
      results.push(result);
      this.accumulator = [];
    }

    return results;
  }

  /**
   * Process M4 String files with streaming
   */
  async processStringFiles(
    folderPath: string,
    fileConfigs: Record<string, any>,
    processor: (data: Map<string, any[]>) => M4StringRow[]
  ): Promise<BatchResult<M4StringRow>> {
    const allData = new Map<string, any[]>();
    let totalRowsProcessed = 0;
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Process each file with streaming
    for (const [filename, config] of Object.entries(fileConfigs)) {
      const filePath = path.join(folderPath, filename);
      const fileData: any[] = [];

      const reader = new StreamingExcelReader({
        ...this.config,
        startRow: config.startRow || 2,
        batchSize: this.config.batchSize || 1000
      });

      reader.on('progress', (progress) => {
        this.emit('progress', {
          ...progress,
          fileType: 'string',
          fileName: filename
        });
      });

      // Read file in streaming mode
      for await (const batch of reader.readFile(filePath)) {
        const stringRows = this.convertToStringRows(batch, config);
        fileData.push(...stringRows);
        totalRowsProcessed += batch.length;

        // For very large files, process in chunks
        if (fileData.length >= this.config.accumulationThreshold) {
          if (this.config.streamOutput) {
            // Emit partial results for streaming output
            this.emit('partialData', {
              filename,
              data: [...fileData]
            });
          }
          // Clear processed data to free memory
          fileData.length = Math.floor(fileData.length * 0.1); // Keep 10% for context
        }
      }

      allData.set(filename, fileData);
    }

    // Process all accumulated data
    const processedData = processor(allData);
    const endMemory = process.memoryUsage().heapUsed;

    return {
      data: processedData,
      rowsProcessed: totalRowsProcessed,
      processingTime: Date.now() - startTime,
      memoryDelta: endMemory - startMemory
    };
  }

  /**
   * Convert streaming rows to dialogue format
   */
  private convertToDialogueRows(
    rows: StreamingRowData[],
    type: 'npc' | 'cinematic' | 'smalltalk'
  ): any[] {
    return rows.map(row => {
      const values = row.values;
      
      switch (type) {
        case 'npc':
          return {
            npcName: values[0],
            npcLocalKey: values[1],
            rowNumber: row.rowNumber
          };
        
        case 'cinematic':
        case 'smalltalk':
          return {
            comment: values[0],
            assetID: values[1],
            dlgID: values[2],
            stringID: values[3],
            speakerID: values[4],
            line: values[5],
            emotion: values[6],
            text_en: values[7],
            rowNumber: row.rowNumber
          };
        
        default:
          return values;
      }
    });
  }

  /**
   * Convert streaming rows to string format
   */
  private convertToStringRows(
    rows: StreamingRowData[],
    config: any
  ): any[] {
    return rows.map(row => {
      const obj: any = { rowNumber: row.rowNumber };
      
      // Map columns based on config
      if (config.columns) {
        config.columns.forEach((col: any, index: number) => {
          if (row.values[index] !== undefined) {
            obj[col.field] = row.values[index];
          }
        });
      } else {
        // Default mapping for common fields
        obj.assetID = row.values[0];
        obj.stringID = row.values[1];
        obj.text_en = row.values[2];
      }
      
      return obj;
    });
  }

  /**
   * Process a batch of accumulated data
   */
  private async processBatch<T>(
    processor: (rows: any[]) => T[]
  ): Promise<BatchResult<T>> {
    const batchStartTime = Date.now();
    const batchStartMemory = process.memoryUsage().heapUsed;
    
    // Process the batch
    const processedData = processor([...this.accumulator]);
    
    const batchEndMemory = process.memoryUsage().heapUsed;
    
    return {
      data: processedData,
      rowsProcessed: this.accumulator.length,
      processingTime: Date.now() - batchStartTime,
      memoryDelta: batchEndMemory - batchStartMemory
    };
  }

  /**
   * Get starting row for dialogue types
   */
  private getDialogueStartRow(type: 'npc' | 'cinematic' | 'smalltalk'): number {
    switch (type) {
      case 'npc':
        return 2; // NPC mapping starts at row 2
      case 'cinematic':
      case 'smalltalk':
        return 3; // Dialogue data starts at row 3
      default:
        return 1;
    }
  }

  /**
   * Create a streaming pipeline for continuous processing
   */
  async *createProcessingPipeline<T>(
    filePath: string,
    transformer: (row: StreamingRowData) => T | null
  ): AsyncGenerator<T[], void, unknown> {
    const reader = new StreamingExcelReader(this.config);
    const buffer: T[] = [];
    
    for await (const batch of reader.readFile(filePath)) {
      for (const row of batch) {
        const transformed = transformer(row);
        if (transformed !== null) {
          buffer.push(transformed);
        }
      }
      
      if (buffer.length > 0) {
        yield [...buffer];
        buffer.length = 0;
      }
    }
  }

  /**
   * Static helper to create adapter with optimized settings
   */
  static createOptimized(
    processorType: 'dialogue' | 'string',
    options?: Partial<M4StreamingConfig>
  ): M4StreamingAdapter {
    return new M4StreamingAdapter({
      processorType,
      batchSize: 1000,
      accumulationThreshold: 5000,
      skipEmptyRows: true,
      maxEmptyRows: 50,
      emitProgress: true,
      streamOutput: true,
      ...options
    });
  }
}

/**
 * Streaming writer for output files
 */
export class M4StreamingWriter {
  private workbook: any;
  private worksheet: any;
  private currentRow: number = 1;
  private batchBuffer: any[] = [];
  private batchSize: number;

  constructor(
    private outputPath: string,
    private sheetName: string,
    options: { batchSize?: number } = {}
  ) {
    this.batchSize = options.batchSize || 1000;
  }

  /**
   * Initialize the workbook for streaming write
   */
  async initialize(): Promise<void> {
    const ExcelJS = await import('exceljs');
    this.workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: this.outputPath,
      useStyles: true,
      useSharedStrings: true
    });
    
    this.worksheet = this.workbook.addWorksheet(this.sheetName);
  }

  /**
   * Write headers to the worksheet
   */
  async writeHeaders(headers: string[]): Promise<void> {
    const headerRow = this.worksheet.getRow(this.currentRow++);
    headers.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });
    headerRow.commit();
  }

  /**
   * Write data rows in batches
   */
  async writeRows(rows: any[][]): Promise<void> {
    this.batchBuffer.push(...rows);
    
    if (this.batchBuffer.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  /**
   * Flush buffered rows to file
   */
  private async flushBatch(): Promise<void> {
    for (const rowData of this.batchBuffer) {
      const row = this.worksheet.getRow(this.currentRow++);
      rowData.forEach((value: any, index: number) => {
        row.getCell(index + 1).value = value;
      });
      row.commit();
    }
    
    this.batchBuffer = [];
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Finalize the file
   */
  async finalize(): Promise<void> {
    // Flush any remaining data
    if (this.batchBuffer.length > 0) {
      await this.flushBatch();
    }
    
    // Commit the workbook
    await this.workbook.commit();
  }
}