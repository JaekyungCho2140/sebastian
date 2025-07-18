import { M4DialogueProcessor } from '../../m4DialogueProcessor';
import { M4StringProcessor } from '../../m4StringProcessor';
import { M4DialogueProcessorStreaming } from './m4DialogueProcessorStreaming';
import { M4StringProcessorStreaming } from './m4StringProcessorStreaming';
import { M4ProcessorResult, M4ProgressInfo, ProcessStep } from '../../../types/m4Processing';
import { FileSizeValidator, FileSizeValidation } from '../optimization/fileSizeValidator';
import { PerformanceProfiler, globalProfiler } from '../performance/profiler';
import * as fs from 'fs';

/**
 * Processor options
 */
export interface ProcessorOptions {
  /** Use streaming mode for large files */
  useStreaming?: boolean;
  /** File size threshold for auto-streaming (bytes) */
  streamingThreshold?: number;
  /** Progress callback */
  onProgress?: (info: M4ProgressInfo) => void;
  /** Enable file size validation */
  validateFileSize?: boolean;
  /** File size validator instance */
  fileSizeValidator?: FileSizeValidator;
  /** Callback for file size warnings */
  onFileSizeWarning?: (validation: FileSizeValidation) => void;
  /** Performance profiler instance */
  profiler?: PerformanceProfiler;
  /** Enable profiling */
  enableProfiling?: boolean;
}

/**
 * Factory for creating M4 processors with streaming support
 */
export class M4ProcessorFactory {
  // Default threshold: 50MB
  private static readonly DEFAULT_STREAMING_THRESHOLD = 50 * 1024 * 1024;

  /**
   * Create dialogue processor with automatic streaming detection
   */
  static createDialogueProcessor(options: ProcessorOptions = {}): {
    process: (inputPath: string, outputPath: string) => Promise<M4ProcessorResult>;
    isStreaming: boolean;
  } {
    const useStreaming = this.shouldUseStreaming(options);
    const profiler = options.profiler || (options.enableProfiling ? globalProfiler : null);

    if (useStreaming) {
      return {
        process: async (inputPath: string, outputPath: string) => {
          const measurementId = profiler?.begin('M4DialogueProcessorStreaming.process', {
            inputPath,
            outputPath
          });
          
          try {
            const processor = new M4DialogueProcessorStreaming(profiler || undefined);
            if (options.onProgress) {
              processor.on('progress', options.onProgress);
            }
            return await processor.processFile(inputPath, outputPath);
          } finally {
            if (measurementId) profiler?.end(measurementId);
          }
        },
        isStreaming: true
      };
    } else {
      return {
        process: async (inputPath: string, outputPath: string) => {
          const measurementId = profiler?.begin('M4DialogueProcessor.process', {
            inputPath,
            outputPath
          });
          
          try {
            const processor = new M4DialogueProcessor();
            return await processor.processFile(inputPath, outputPath, options.onProgress);
          } finally {
            if (measurementId) profiler?.end(measurementId);
          }
        },
        isStreaming: false
      };
    }
  }

  /**
   * Create string processor with automatic streaming detection
   */
  static createStringProcessor(options: ProcessorOptions = {}): {
    process: (inputFolder: string, outputPath: string) => Promise<M4ProcessorResult>;
    isStreaming: boolean;
  } {
    const useStreaming = this.shouldUseStreaming(options);
    const profiler = options.profiler || (options.enableProfiling ? globalProfiler : null);

    if (useStreaming) {
      return {
        process: async (inputFolder: string, outputPath: string) => {
          const measurementId = profiler?.begin('M4StringProcessorStreaming.process', {
            inputFolder,
            outputPath
          });
          
          try {
            const processor = new M4StringProcessorStreaming(profiler || undefined);
            if (options.onProgress) {
              processor.on('progress', options.onProgress);
            }
            return await processor.processFolder(inputFolder, outputPath);
          } finally {
            if (measurementId) profiler?.end(measurementId);
          }
        },
        isStreaming: true
      };
    } else {
      return {
        process: async (inputFolder: string, outputPath: string) => {
          const measurementId = profiler?.begin('M4StringProcessor.process', {
            inputFolder,
            outputPath
          });
          
          try {
            const processor = new M4StringProcessor();
            return await processor.processFolder(inputFolder, outputPath, options.onProgress);
          } finally {
            if (measurementId) profiler?.end(measurementId);
          }
        },
        isStreaming: false
      };
    }
  }

  /**
   * Determine if streaming should be used
   */
  private static shouldUseStreaming(options: ProcessorOptions): boolean {
    // Explicit streaming option takes precedence
    if (options.useStreaming !== undefined) {
      return options.useStreaming;
    }

    // Default to streaming for better memory efficiency
    return true;
  }

  /**
   * Check file size to determine streaming mode
   */
  static async checkFileSize(filePath: string, threshold?: number): Promise<boolean> {
    const profiler = globalProfiler.isEnabled() ? globalProfiler : null;
    const measurementId = profiler?.begin('M4ProcessorFactory.checkFileSize', { filePath });
    
    try {
      const stats = fs.statSync(filePath);
      const sizeThreshold = threshold || this.DEFAULT_STREAMING_THRESHOLD;
      const result = stats.size > sizeThreshold;
      
      if (profiler && measurementId) {
        profiler.end(measurementId);
      }
      
      return result;
    } catch (error) {
      if (profiler && measurementId) {
        profiler.end(measurementId);
      }
      // If we can't check size, default to streaming
      return true;
    }
  }

  /**
   * Create optimized processor based on file analysis
   */
  static async createOptimizedDialogueProcessor(
    inputPath: string,
    options: ProcessorOptions = {}
  ): Promise<{
    process: (outputPath: string) => Promise<M4ProcessorResult>;
    isStreaming: boolean;
    fileSize: number;
    fileSizeValidation?: FileSizeValidation;
  }> {
    // File size validation
    let fileSizeValidation: FileSizeValidation | undefined;
    
    if (options.validateFileSize !== false) {
      const validator = options.fileSizeValidator || FileSizeValidator.createDefault();
      fileSizeValidation = await validator.validateFile(inputPath);
      
      if (!fileSizeValidation.isValid) {
        throw new Error(fileSizeValidation.message || 'File size validation failed');
      }
      
      if (options.onFileSizeWarning && fileSizeValidation.warningLevel !== 'none') {
        options.onFileSizeWarning(fileSizeValidation);
      }
    }
    
    const stats = fs.statSync(inputPath);
    const shouldStream = options.useStreaming ?? 
                        (stats.size > (options.streamingThreshold || this.DEFAULT_STREAMING_THRESHOLD));

    const processor = this.createDialogueProcessor({
      ...options,
      useStreaming: shouldStream
    });

    return {
      process: (outputPath: string) => processor.process(inputPath, outputPath),
      isStreaming: processor.isStreaming,
      fileSize: stats.size,
      fileSizeValidation
    };
  }

  /**
   * Create optimized string processor based on folder analysis
   */
  static async createOptimizedStringProcessor(
    inputFolder: string,
    options: ProcessorOptions = {}
  ): Promise<{
    process: (outputPath: string) => Promise<M4ProcessorResult>;
    isStreaming: boolean;
    totalSize: number;
    folderValidation?: any;
  }> {
    // File size validation
    let folderValidation: any;
    
    if (options.validateFileSize !== false) {
      const validator = options.fileSizeValidator || FileSizeValidator.createDefault();
      folderValidation = await validator.validateStringFolder(inputFolder);
      
      // Check if any files require attention
      const blockedFiles = folderValidation.filesRequiringAttention.filter(
        (f: FileSizeValidation) => f.warningLevel === 'blocked'
      );
      
      if (blockedFiles.length > 0) {
        throw new Error(`Some files exceed size limits: ${blockedFiles.map((f: any) => f.filePath).join(', ')}`);
      }
      
      if (options.onFileSizeWarning && folderValidation.filesRequiringAttention.length > 0) {
        folderValidation.filesRequiringAttention.forEach((validation: FileSizeValidation) => {
          if (options.onFileSizeWarning) {
            options.onFileSizeWarning(validation);
          }
        });
      }
    }
    
    // Calculate total size of all files
    let totalSize = 0;
    const files = [
      '01_Item.xlsx', '02_NPCs&Mobs.xlsx', '03_Quest.xlsx', '04_Skill.xlsx',
      '05_UI.xlsx', '06_System.xlsx', '07_Tutorial.xlsx', '08_CashShop.xlsx'
    ];

    for (const file of files) {
      try {
        const filePath = `${inputFolder}/${file}`;
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      } catch (error) {
        // Ignore missing files
      }
    }

    const shouldStream = options.useStreaming ?? 
                        (totalSize > (options.streamingThreshold || this.DEFAULT_STREAMING_THRESHOLD));

    const processor = this.createStringProcessor({
      ...options,
      useStreaming: shouldStream
    });

    return {
      process: (outputPath: string) => processor.process(inputFolder, outputPath),
      isStreaming: processor.isStreaming,
      totalSize,
      folderValidation
    };
  }
}