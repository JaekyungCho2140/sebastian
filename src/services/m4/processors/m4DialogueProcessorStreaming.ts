import * as path from 'path';
import { M4StreamingAdapter, M4StreamingWriter } from '../optimization/m4StreamingAdapter';
import { StreamingExcelReader } from '../optimization/streamingExcelReader';
import { ProcessingMonitor, monitored } from '../optimization/processingMonitor';
import { 
  M4DialogueRow, 
  M4ProcessorResult, 
  M4ProgressInfo,
  NPCMappingRow 
} from '../../../types/m4Processing';
import { EventEmitter } from 'events';
import { 
  poolManager, 
  RowObjectPool, 
  ArrayPool, 
  MapPool,
  StringBuilderPool 
} from '../performance/object-pool';
import { BatchProcessor, BatchProcessorState, BatchProgress } from '../performance/batch-processor';

/**
 * Streaming version of M4 Dialogue Processor
 * Processes large Excel files without loading entire content into memory
 */
export class M4DialogueProcessorStreaming extends EventEmitter {
  private npcMappings: Map<string, string> = new Map();
  private processedDialogues: M4DialogueRow[] = [];
  private adapter: M4StreamingAdapter;
  private monitor: ProcessingMonitor;
  private totalRows = 0;
  private processedRows = 0;
  
  // Object pools
  private rowPool: RowObjectPool;
  private arrayPool: ArrayPool<M4DialogueRow>;
  private mapPool: MapPool<string, M4DialogueRow[]>;
  private stringBuilderPool: StringBuilderPool;
  
  // Batch processor
  private batchProcessor: BatchProcessor<any>;

  constructor() {
    super();
    this.adapter = M4StreamingAdapter.createOptimized('dialogue', {
      batchSize: 1000,
      accumulationThreshold: 5000
    });

    // Initialize processing monitor
    this.monitor = ProcessingMonitor.createForProcessor(
      (progress) => this.emit('progress', progress),
      (message, level) => this.emit('log', { message, level })
    );

    // Initialize object pools
    this.rowPool = new RowObjectPool({
      initialSize: 200,
      maxSize: 10000,
      expansionSize: 200
    });
    
    this.arrayPool = new ArrayPool<M4DialogueRow>({
      initialSize: 50,
      maxSize: 500,
      expansionSize: 50
    });
    
    this.mapPool = new MapPool<string, M4DialogueRow[]>({
      initialSize: 10,
      maxSize: 100,
      expansionSize: 10
    });
    
    this.stringBuilderPool = new StringBuilderPool({
      initialSize: 20,
      maxSize: 200,
      expansionSize: 20
    });
    
    // Register pools with manager
    poolManager.registerPool('dialogue.row', this.rowPool);
    poolManager.registerPool('dialogue.array', this.arrayPool);
    poolManager.registerPool('dialogue.map', this.mapPool);
    poolManager.registerPool('dialogue.stringBuilder', this.stringBuilderPool);
    
    // Initialize batch processor
    this.batchProcessor = BatchProcessor.createMemoryOptimized({
      initialBatchSize: 1000,
      maxBatchSize: 3000,
      minBatchSize: 500,
      memoryThreshold: 80, // 80MB
      autoAdjust: true,
      pauseBetweenBatches: 5,
      gcFrequency: 5
    });
    
    // Handle batch processor events
    this.batchProcessor.on('batchComplete', (info) => {
      this.emit('batchComplete', info);
    });
    
    this.batchProcessor.on('memoryPressure', (info) => {
      this.emit('warning', `Memory pressure detected: ${info.currentUsage}MB`);
      // Clear some pools to free memory
      this.stringBuilderPool.clear();
    });
    
    this.batchProcessor.on('gcComplete', (info) => {
      this.emit('info', `GC freed ${info.freedMemory.toFixed(2)}MB`);
    });

    // Forward adapter progress events
    this.adapter.on('progress', (progress) => {
      const progressInfo = this.createProgressInfo(progress);
      this.monitor.updateProgress(progressInfo);
    });

    // Handle memory alerts
    this.monitor.on('memoryAlert', (alert) => {
      this.emit('memoryAlert', alert);
    });

    // Handle critical memory
    this.monitor.on('criticalMemory', (alert) => {
      this.emit('warning', `Critical memory usage: ${alert.message}`);
      // Clear pools on critical memory
      this.arrayPool.clear();
      this.mapPool.clear();
    });
  }

  /**
   * Process M4_Dialogue.xlsx file using streaming
   */
  async processFile(
    inputPath: string,
    outputPath: string,
    onProgress?: (info: M4ProgressInfo) => void
  ): Promise<M4ProcessorResult> {
    // Start monitoring
    this.monitor.startMonitoring('M4 Dialogue Processing');
    const startTime = Date.now();

    try {
      // Step 1: Load NPC mappings (small dataset, can load fully)
      this.monitor.startPhase('Loading NPC Mappings');
      await this.loadNPCMappings(inputPath);
      this.monitor.endPhase();
      
      // Step 2: Process dialogues in streaming mode
      this.monitor.startPhase('Processing Dialogues');
      const dialogueResults = await this.processDialogues(inputPath);
      this.monitor.endPhase();
      
      // Step 3: Write output file in streaming mode
      this.monitor.startPhase('Writing Output');
      await this.writeOutputFile(outputPath, dialogueResults);
      this.monitor.endPhase();

      // Stop monitoring and get metrics
      const metrics = this.monitor.stopMonitoring();
      const endTime = Date.now();

      const result: M4ProcessorResult = {
        success: true,
        rowsProcessed: this.processedRows,
        outputPath,
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
        rowsProcessed: this.processedRows,
        outputPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        memoryUsed: metrics ? (metrics.endMemory?.heapUsed || 0) - metrics.startMemory.heapUsed : 0
      };

      this.emit('error', error);
      return errorResult;
    }
  }

  /**
   * Load NPC mappings (small dataset)
   */
  private async loadNPCMappings(filePath: string): Promise<void> {
    const reader = new StreamingExcelReader({
      sheetId: 'NPC_Name',
      startRow: 2,
      batchSize: 100
    });

    for await (const batch of reader.readFile(filePath)) {
      for (const row of batch) {
        const npcName = row.values[0];
        const npcLocalKey = row.values[1];
        
        if (npcName && npcLocalKey) {
          this.npcMappings.set(String(npcName), String(npcLocalKey));
        }
      }
    }

    this.emit('step', 'NPC mappings loaded');
  }

  /**
   * Process dialogue sheets in streaming mode
   */
  private async processDialogues(filePath: string): Promise<M4DialogueRow[]> {
    const allDialogues: M4DialogueRow[] = [];
    
    // Process CINEMATIC_DIALOGUE sheet
    const cinematicDialogues = await this.processDialogueSheet(
      filePath,
      'CINEMATIC_DIALOGUE',
      'cinematic'
    );
    allDialogues.push(...cinematicDialogues);

    // Process SMALLTALK_DIALOGUE sheet
    const smalltalkDialogues = await this.processDialogueSheet(
      filePath,
      'SMALLTALK_DIALOGUE',
      'smalltalk'
    );
    allDialogues.push(...smalltalkDialogues);

    // Sort by dlgID and stringID
    allDialogues.sort((a, b) => {
      const dlgCompare = a.dlgID.localeCompare(b.dlgID);
      if (dlgCompare !== 0) return dlgCompare;
      return a.stringID.localeCompare(b.stringID);
    });

    return allDialogues;
  }

  /**
   * Process a single dialogue sheet
   */
  private async processDialogueSheet(
    filePath: string,
    sheetName: string,
    type: 'cinematic' | 'smalltalk'
  ): Promise<M4DialogueRow[]> {
    const dialogues = this.arrayPool.acquire();
    const reader = new StreamingExcelReader({
      sheetId: sheetName,
      startRow: 3,
      batchSize: this.batchProcessor.getCurrentBatchSize(),
      skipEmptyRows: true
    });

    const prefix = type === 'cinematic' ? 'CI' : 'ST';
    const dlgGroups = this.mapPool.acquire();
    
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

    try {
      // Process rows using batch processor
      const processedBatches = await this.batchProcessor.processBatches(
        rowIterable,
        async (batch, batchIndex) => {
          const batchDialogues: M4DialogueRow[] = [];
          
          for (const row of batch) {
            const dialogue = this.parseDialogueRow(row, prefix);
            if (dialogue) {
              // Group by dlgID for efficient processing
              let group = dlgGroups.get(dialogue.dlgID);
              if (!group) {
                group = this.arrayPool.acquire();
                dlgGroups.set(dialogue.dlgID, group);
              }
              group.push(dialogue);
              
              this.processedRows++;
            }
          }
          
          // Process complete dialogue groups to free memory
          if (dlgGroups.size > 100) {
            for (const [dlgID, group] of dlgGroups) {
              batchDialogues.push(...group);
              this.arrayPool.release(group);
            }
            dlgGroups.clear();
          }
          
          return batchDialogues;
        },
        {
          onProgress: (progress) => {
            this.emit('batchProgress', {
              sheet: sheetName,
              ...progress
            });
          },
          onBatchComplete: (batchIndex, results) => {
            dialogues.push(...results);
          }
        }
      );

      // Process remaining groups
      for (const [dlgID, group] of dlgGroups) {
        dialogues.push(...group);
        this.arrayPool.release(group);
      }

      this.emit('step', `${sheetName} processed: ${dialogues.length} dialogues`);
      
      // Return a copy and release the pool array
      const result = [...dialogues];
      this.arrayPool.release(dialogues);
      return result;
      
    } finally {
      // Always release the map pool
      this.mapPool.release(dlgGroups);
      // Reset batch processor state
      this.batchProcessor.reset();
    }
  }

  /**
   * Parse a dialogue row
   */
  private parseDialogueRow(row: any, prefix: string): M4DialogueRow | null {
    const values = row.values;
    
    // Skip empty rows
    if (!values[7]) return null;

    const comment = values[0] || '';
    const assetID = values[1] || '';
    const dlgID = values[2] || '';
    const stringID = values[3] || '';
    const speakerID = values[4] || '';
    const line = values[5] || '';
    const emotion = values[6] || '';
    const text_en = values[7] || '';

    // Apply NPC mapping
    const mappedSpeaker = this.npcMappings.get(speakerID) || speakerID;

    return {
      comment,
      assetID: `${prefix}_${assetID}`,
      dlgID: `${prefix}_${dlgID}`,
      stringID: `${prefix}_${stringID}`,
      speakerID: mappedSpeaker,
      line,
      emotion,
      text_en,
      text_ko: '',
      text_ja: '',
      text_zh_CN: '',
      text_zh_TW: ''
    };
  }

  /**
   * Write output file using streaming
   */
  private async writeOutputFile(
    outputPath: string,
    dialogues: M4DialogueRow[]
  ): Promise<void> {
    const writer = new M4StreamingWriter(outputPath, 'M4_Dialogue', {
      batchSize: this.batchProcessor.getCurrentBatchSize()
    });

    await writer.initialize();

    // Write headers
    const headers = [
      'comment', 'assetID', 'dlgID', 'stringID', 'speakerID',
      'line', 'emotion', 'text_en', 'text_ko', 'text_ja',
      'text_zh-CN', 'text_zh-TW'
    ];
    await writer.writeHeaders(headers);

    // Process dialogues in batches using batch processor
    await this.batchProcessor.processBatches(
      dialogues,
      async (batch, batchIndex) => {
        const rows = this.arrayPool.acquire();
        
        try {
          for (const dialogue of batch) {
            const row = this.arrayPool.acquire();
            row.push(
              dialogue.comment,
              dialogue.assetID,
              dialogue.dlgID,
              dialogue.stringID,
              dialogue.speakerID,
              dialogue.line,
              dialogue.emotion,
              dialogue.text_en,
              dialogue.text_ko,
              dialogue.text_ja,
              dialogue.text_zh_CN,
              dialogue.text_zh_TW
            );
            
            rows.push(row);
          }
          
          await writer.writeRows(rows);
          
          // Release row arrays back to pool
          for (const rowArray of rows) {
            this.arrayPool.release(rowArray as any[]);
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

    await writer.finalize();
    this.emit('step', 'Output file written');
    
    // Reset batch processor state
    this.batchProcessor.reset();
  }

  /**
   * Create progress info
   */
  private createProgressInfo(progress: any): M4ProgressInfo {
    return {
      current: progress.currentRow,
      total: progress.estimatedTotal || 0,
      percentage: progress.estimatedTotal 
        ? Math.round((progress.currentRow / progress.estimatedTotal) * 100)
        : 0,
      currentFile: progress.fileType || '',
      currentStep: `Processing ${progress.subType || 'data'}`
    };
  }

  /**
   * Static method for one-shot processing
   */
  static async process(
    inputPath: string,
    outputPath: string,
    onProgress?: (info: M4ProgressInfo) => void
  ): Promise<M4ProcessorResult> {
    const processor = new M4DialogueProcessorStreaming();
    
    if (onProgress) {
      processor.on('progress', onProgress);
    }

    return processor.processFile(inputPath, outputPath, onProgress);
  }
}