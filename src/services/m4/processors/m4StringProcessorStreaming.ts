import * as path from 'path';
import * as fs from 'fs/promises';
import { M4StreamingAdapter, M4StreamingWriter } from '../optimization/m4StreamingAdapter';
import { StreamingExcelReader } from '../optimization/streamingExcelReader';
import { ProcessingMonitor } from '../optimization/processingMonitor';
import { 
  M4StringRow, 
  M4ProcessorResult, 
  M4ProgressInfo 
} from '../../../types/m4Processing';
import { EventEmitter } from 'events';
import { 
  poolManager, 
  RowObjectPool, 
  ArrayPool, 
  MapPool,
  SetPool,
  StringBuilderPool 
} from '../performance/object-pool';
import { PerformanceProfiler, globalProfiler } from '../performance/profiler';
import { BatchProcessor, BatchProcessorState, BatchProgress } from '../performance/batch-processor';

/**
 * File configuration for M4 String processing
 */
interface FileConfig {
  startRow: number;
  columns: Array<{
    index: number;
    field: string;
  }>;
}

/**
 * Streaming version of M4 String Processor
 * Processes multiple large Excel files without loading entire content into memory
 */
export class M4StringProcessorStreaming extends EventEmitter {
  private processedStrings: Map<string, M4StringRow> = new Map();
  private adapter: M4StreamingAdapter;
  private monitor: ProcessingMonitor;
  private profiler?: PerformanceProfiler;
  private totalFiles = 8;
  private processedFiles = 0;
  private totalRows = 0;
  private currentFile = '';
  
  // Object pools
  private rowPool: RowObjectPool;
  private arrayPool: ArrayPool<any>;
  private mapPool: MapPool<string, M4StringRow>;
  private setPool: SetPool<string>;
  private stringBuilderPool: StringBuilderPool;
  
  // Batch processor
  private batchProcessor: BatchProcessor<any>;

  // File configurations
  private readonly FILE_CONFIGS: Record<string, FileConfig> = {
    '01_Item.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '02_NPCs&Mobs.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '03_Quest.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '04_Skill.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '05_UI.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '06_System.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '07_Tutorial.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    },
    '08_CashShop.xlsx': {
      startRow: 2,
      columns: [
        { index: 0, field: 'assetID' },
        { index: 1, field: 'stringID' },
        { index: 2, field: 'text_en' }
      ]
    }
  };

  constructor(profiler?: PerformanceProfiler) {
    super();
    this.profiler = profiler || globalProfiler;
    this.adapter = M4StreamingAdapter.createOptimized('string', {
      batchSize: 2000,
      accumulationThreshold: 10000
    });

    // Initialize processing monitor
    this.monitor = ProcessingMonitor.createForProcessor(
      (progress) => this.emit('progress', progress),
      (message, level) => this.emit('log', { message, level })
    );

    // Initialize object pools
    this.rowPool = new RowObjectPool({
      initialSize: 500,
      maxSize: 20000,
      expansionSize: 500
    });
    
    this.arrayPool = new ArrayPool<any>({
      initialSize: 100,
      maxSize: 1000,
      expansionSize: 100
    });
    
    this.mapPool = new MapPool<string, M4StringRow>({
      initialSize: 5,
      maxSize: 50,
      expansionSize: 5
    });
    
    this.setPool = new SetPool<string>({
      initialSize: 10,
      maxSize: 100,
      expansionSize: 10
    });
    
    this.stringBuilderPool = new StringBuilderPool({
      initialSize: 50,
      maxSize: 500,
      expansionSize: 50
    });
    
    // Register pools with manager
    poolManager.registerPool('string.row', this.rowPool);
    poolManager.registerPool('string.array', this.arrayPool);
    poolManager.registerPool('string.map', this.mapPool);
    poolManager.registerPool('string.set', this.setPool);
    poolManager.registerPool('string.stringBuilder', this.stringBuilderPool);
    
    // Initialize batch processor for string processing
    this.batchProcessor = BatchProcessor.createMemoryOptimized({
      initialBatchSize: 2000,
      maxBatchSize: 5000,
      minBatchSize: 500,
      memoryThreshold: 100, // 100MB
      autoAdjust: true,
      pauseBetweenBatches: 10,
      gcFrequency: 3 // More frequent GC due to multiple files
    });
    
    // Handle batch processor events
    this.batchProcessor.on('batchComplete', (info) => {
      this.emit('batchComplete', info);
    });
    
    this.batchProcessor.on('memoryPressure', (info) => {
      this.emit('warning', `Memory pressure in string processor: ${info.currentUsage}MB`);
      // Clear some pools to free memory
      this.setPool.clear();
      this.stringBuilderPool.clear();
    });
    
    this.batchProcessor.on('gcComplete', (info) => {
      this.emit('info', `String processor GC freed ${info.freedMemory.toFixed(2)}MB`);
    });
    
    this.batchProcessor.on('batchSizeAdjusted', (info) => {
      this.emit('info', `Batch size adjusted from ${info.oldSize} to ${info.newSize} due to ${info.reason}`);
    });

    // Handle memory alerts
    this.monitor.on('memoryAlert', (alert) => {
      this.emit('memoryAlert', alert);
    });

    // Handle critical memory
    this.monitor.on('criticalMemory', (alert) => {
      this.emit('warning', `Critical memory usage: ${alert.message}`);
      // Consider reducing batch size or clearing cache
      if (this.processedStrings.size > 30000) {
        this.emit('info', 'Clearing partial cache due to memory pressure');
        // Keep only recent entries using object pool
        const tempArray = this.arrayPool.acquire();
        for (const [key, value] of this.processedStrings.entries()) {
          tempArray.push([key, value]);
        }
        this.processedStrings.clear();
        tempArray.slice(-20000).forEach(([key, value]: [string, M4StringRow]) => {
          this.processedStrings.set(key, value);
        });
        this.arrayPool.release(tempArray);
      }
      // Clear pools on critical memory
      this.arrayPool.clear();
      this.setPool.clear();
    });
  }

  /**
   * Process all M4 String files using streaming
   */
  async processFolder(
    inputFolder: string,
    outputPath: string,
    onProgress?: (info: M4ProgressInfo) => void
  ): Promise<M4ProcessorResult> {
    // Start profiling
    const profileId = this.profiler?.begin('M4StringProcessorStreaming.processFolder', {
      inputFolder,
      outputPath
    });
    
    // Start monitoring
    this.monitor.startMonitoring('M4 String Processing');
    const startTime = Date.now();

    try {
      // Validate input folder
      this.monitor.startPhase('Validating Input');
      const validateProfileId = this.profiler?.begin('validateInputFolder', { inputFolder });
      await this.validateInputFolder(inputFolder);
      if (validateProfileId) this.profiler?.end(validateProfileId);
      this.monitor.endPhase();

      // Process each file in streaming mode
      this.monitor.startPhase('Processing String Files');
      for (const [filename, config] of Object.entries(this.FILE_CONFIGS)) {
        this.currentFile = filename;
        const fileProfileId = this.profiler?.begin('processStringFile', { filename });
        await this.processStringFile(inputFolder, filename, config);
        if (fileProfileId) this.profiler?.end(fileProfileId);
        this.processedFiles++;
        
        // Emit file progress
        this.emit('fileComplete', {
          fileName: filename,
          processedFiles: this.processedFiles,
          totalFiles: this.totalFiles
        });

        // Update monitor progress
        this.monitor.updateProgress({
          current: this.processedFiles,
          total: this.totalFiles,
          percentage: Math.round((this.processedFiles / this.totalFiles) * 100),
          currentFile: filename,
          currentStep: `Processed ${filename}`
        });
      }
      this.monitor.endPhase();

      // Write output file in streaming mode
      this.monitor.startPhase('Writing Output');
      const writeProfileId = this.profiler?.begin('writeOutputFile', {
        outputPath,
        rowCount: this.processedStrings.size
      });
      await this.writeOutputFile(outputPath);
      if (writeProfileId) this.profiler?.end(writeProfileId);
      this.monitor.endPhase();

      // Stop monitoring and get metrics
      const metrics = this.monitor.stopMonitoring();
      const endTime = Date.now();

      const result: M4ProcessorResult = {
        success: true,
        rowsProcessed: this.totalRows,
        outputPath,
        filesProcessed: this.processedFiles,
        processingTime: endTime - startTime,
        memoryUsed: metrics ? (metrics.endMemory?.heapUsed || 0) - metrics.startMemory.heapUsed : 0
      };

      this.emit('complete', result);
      return result;

    } catch (error) {
      // Stop monitoring on error
      const metrics = this.monitor.stopMonitoring();
      
      const errorResult: M4ProcessorResult = {
        success: false,
        rowsProcessed: this.totalRows,
        outputPath,
        filesProcessed: this.processedFiles,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        memoryUsed: metrics ? (metrics.endMemory?.heapUsed || 0) - metrics.startMemory.heapUsed : 0
      };

      this.emit('error', error);
      return errorResult;
    } finally {
      if (profileId) this.profiler?.end(profileId);
    }
  }

  /**
   * Validate input folder and files
   */
  private async validateInputFolder(folderPath: string): Promise<void> {
    try {
      const stats = await fs.stat(folderPath);
      if (!stats.isDirectory()) {
        throw new Error(`${folderPath} is not a directory`);
      }

      // Check if all required files exist
      const missingFiles: string[] = [];
      for (const filename of Object.keys(this.FILE_CONFIGS)) {
        const filePath = path.join(folderPath, filename);
        try {
          await fs.access(filePath);
        } catch {
          missingFiles.push(filename);
        }
      }

      if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${missingFiles.join(', ')}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process a single string file
   */
  private async processStringFile(
    folderPath: string,
    filename: string,
    config: FileConfig
  ): Promise<void> {
    const filePath = path.join(folderPath, filename);
    const reader = new StreamingExcelReader({
      startRow: config.startRow,
      batchSize: this.batchProcessor.getCurrentBatchSize(),
      skipEmptyRows: true,
      emitProgress: true
    });

    // Track progress for this file
    reader.on('progress', (progress) => {
      this.emit('progress', this.createProgressInfo(progress));
    });

    const category = this.getCategoryFromFilename(filename);
    let fileRowCount = 0;
    
    // Create an async iterable from the reader
    const rowIterable = {
      [Symbol.asyncIterator]: async function* () {
        for await (const batch of reader.readFile(filePath)) {
          for (const row of batch) {
            yield row;
          }
        }
      }
    };
    
    // Process rows using batch processor
    await this.batchProcessor.processBatches(
      rowIterable,
      async (batch, batchIndex) => {
        const processedRows: M4StringRow[] = [];
        
        for (const row of batch) {
          const stringRow = this.parseStringRow(row, config, category);
          if (stringRow) {
            // Use composite key for deduplication
            const key = `${stringRow.assetID}|${stringRow.stringID}`;
            
            // Only keep the first occurrence
            if (!this.processedStrings.has(key)) {
              this.processedStrings.set(key, stringRow);
              processedRows.push(stringRow);
              fileRowCount++;
              this.totalRows++;
            }
          }
        }
        
        // Check memory usage and clear if needed
        if (this.processedStrings.size > 50000 && batchIndex % 5 === 0) {
          this.emit('info', `Processed ${this.processedStrings.size} strings, memory check`);
        }
        
        return processedRows;
      },
      {
        onProgress: (progress) => {
          this.emit('fileBatchProgress', {
            file: filename,
            ...progress
          });
        }
      }
    );

    this.emit('step', `${filename} processed: ${fileRowCount} strings`);
    
    // Reset batch processor for next file
    this.batchProcessor.reset();
  }

  /**
   * Parse a string row
   */
  private parseStringRow(
    row: any,
    config: FileConfig,
    category: string
  ): M4StringRow | null {
    const values = row.values;
    const data: any = {};

    // Map columns based on configuration
    for (const col of config.columns) {
      if (values[col.index] !== undefined && values[col.index] !== null) {
        data[col.field] = String(values[col.index]);
      }
    }

    // Skip if required fields are missing
    if (!data.assetID || !data.stringID || !data.text_en) {
      return null;
    }

    return {
      assetID: data.assetID,
      stringID: data.stringID,
      text_en: data.text_en,
      text_ko: '',
      text_ja: '',
      text_zh_CN: '',
      text_zh_TW: '',
      category
    };
  }

  /**
   * Get category from filename
   */
  private getCategoryFromFilename(filename: string): string {
    const categoryMap: Record<string, string> = {
      '01_Item.xlsx': 'Item',
      '02_NPCs&Mobs.xlsx': 'NPC',
      '03_Quest.xlsx': 'Quest',
      '04_Skill.xlsx': 'Skill',
      '05_UI.xlsx': 'UI',
      '06_System.xlsx': 'System',
      '07_Tutorial.xlsx': 'Tutorial',
      '08_CashShop.xlsx': 'CashShop'
    };

    return categoryMap[filename] || 'Unknown';
  }

  /**
   * Write output file using streaming
   */
  private async writeOutputFile(outputPath: string): Promise<void> {
    const writer = new M4StreamingWriter(outputPath, 'M4_String', {
      batchSize: this.batchProcessor.getCurrentBatchSize()
    });

    await writer.initialize();

    // Write headers
    const headers = [
      'assetID', 'stringID', 'text_en', 'text_ko', 
      'text_ja', 'text_zh-CN', 'text_zh-TW', 'category'
    ];
    await writer.writeHeaders(headers);

    // Convert Map to sorted array using object pool
    const sortedArray = this.arrayPool.acquire();
    for (const value of this.processedStrings.values()) {
      sortedArray.push(value);
    }
    
    sortedArray.sort((a: M4StringRow, b: M4StringRow) => {
      const assetCompare = a.assetID.localeCompare(b.assetID);
      if (assetCompare !== 0) return assetCompare;
      return a.stringID.localeCompare(b.stringID);
    });

    try {
      // Process sorted strings in batches using batch processor
      await this.batchProcessor.processBatches(
        sortedArray,
        async (batch, batchIndex) => {
          const rows = this.arrayPool.acquire();
          
          try {
            for (const stringRow of batch) {
              const row = this.arrayPool.acquire();
              row.push(
                stringRow.assetID,
                stringRow.stringID,
                stringRow.text_en,
                stringRow.text_ko,
                stringRow.text_ja,
                stringRow.text_zh_CN,
                stringRow.text_zh_TW,
                stringRow.category
              );
              
              rows.push(row);
            }
            
            await writer.writeRows(rows);
            
            // Release row arrays back to pool
            for (const rowArray of rows) {
              this.arrayPool.release(rowArray);
            }
            
            return []; // No results needed for writing
          } finally {
            this.arrayPool.release(rows);
          }
        },
        {
          onProgress: (progress) => {
            this.emit('writeProgress', progress);
          }
        }
      );
    } finally {
      this.arrayPool.release(sortedArray);
    }

    await writer.finalize();
    this.emit('step', `Output file written: ${this.processedStrings.size} unique strings`);
    
    // Reset batch processor state
    this.batchProcessor.reset();
  }

  /**
   * Create progress info
   */
  private createProgressInfo(progress: any): M4ProgressInfo {
    const fileProgress = (this.processedFiles / this.totalFiles) * 100;
    const currentFileProgress = progress.estimatedTotal 
      ? (progress.currentRow / progress.estimatedTotal) * 100
      : 0;

    const overallProgress = fileProgress + (currentFileProgress / this.totalFiles);

    return {
      current: progress.currentRow,
      total: progress.estimatedTotal || 0,
      percentage: Math.round(overallProgress),
      currentFile: this.currentFile,
      currentStep: `Processing ${this.currentFile} (${this.processedFiles + 1}/${this.totalFiles})`,
      memoryUsage: progress.memoryUsage.heapUsed
    };
  }

  /**
   * Static method for one-shot processing
   */
  static async process(
    inputFolder: string,
    outputPath: string,
    onProgress?: (info: M4ProgressInfo) => void
  ): Promise<M4ProcessorResult> {
    const processor = new M4StringProcessorStreaming();
    
    if (onProgress) {
      processor.on('progress', onProgress);
    }

    return processor.processFolder(inputFolder, outputPath, onProgress);
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Clear processed data to free memory
   */
  clearProcessedData(): void {
    this.processedStrings.clear();
    this.totalRows = 0;
    this.processedFiles = 0;
    
    if (global.gc) {
      global.gc();
    }
  }
}