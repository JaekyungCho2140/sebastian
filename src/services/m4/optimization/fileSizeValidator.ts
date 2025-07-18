import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * File size limits and thresholds
 */
export interface FileSizeLimits {
  /** Warning threshold in MB */
  warningThreshold: number;
  /** Confirmation required threshold in MB */
  confirmationThreshold: number;
  /** Hard limit in MB */
  hardLimit: number;
  /** Enable size checking */
  enabled: boolean;
}

/**
 * File size validation result
 */
export interface FileSizeValidation {
  /** File path */
  filePath: string;
  /** File size in bytes */
  sizeInBytes: number;
  /** File size in MB */
  sizeInMB: number;
  /** Whether file passes validation */
  isValid: boolean;
  /** Warning level */
  warningLevel: 'none' | 'warning' | 'confirmation' | 'blocked';
  /** Warning message */
  message?: string;
  /** Estimated processing time in seconds */
  estimatedProcessingTime?: number;
  /** Recommended action */
  recommendation?: string;
}

/**
 * Folder size summary
 */
export interface FolderSizeSummary {
  /** Total size in bytes */
  totalSizeInBytes: number;
  /** Total size in MB */
  totalSizeInMB: number;
  /** Number of files */
  fileCount: number;
  /** Largest file */
  largestFile?: {
    path: string;
    sizeInMB: number;
  };
  /** Files requiring attention */
  filesRequiringAttention: FileSizeValidation[];
}

/**
 * Processing time estimation parameters
 */
interface ProcessingTimeParams {
  /** Average rows per MB for Excel files */
  rowsPerMB: number;
  /** Average processing speed (rows per second) */
  processingSpeed: number;
  /** Overhead time in seconds */
  overheadTime: number;
}

/**
 * File size validator for M4 processing
 */
export class FileSizeValidator extends EventEmitter {
  private limits: FileSizeLimits;
  private processingParams: ProcessingTimeParams;
  
  // Default limits (in MB)
  private static readonly DEFAULT_LIMITS: FileSizeLimits = {
    warningThreshold: 100,
    confirmationThreshold: 500,
    hardLimit: 1024, // 1GB
    enabled: true
  };
  
  // Default processing parameters
  private static readonly DEFAULT_PROCESSING_PARAMS: ProcessingTimeParams = {
    rowsPerMB: 10000, // Approximately 10k rows per MB for typical Excel files
    processingSpeed: 5000, // 5k rows per second with streaming
    overheadTime: 5 // 5 seconds overhead
  };

  constructor(limits?: Partial<FileSizeLimits>) {
    super();
    this.limits = { ...FileSizeValidator.DEFAULT_LIMITS, ...limits };
    this.processingParams = { ...FileSizeValidator.DEFAULT_PROCESSING_PARAMS };
  }

  /**
   * Validate a single file
   */
  async validateFile(filePath: string): Promise<FileSizeValidation> {
    try {
      const stats = await fs.promises.stat(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      const validation: FileSizeValidation = {
        filePath,
        sizeInBytes,
        sizeInMB,
        isValid: true,
        warningLevel: 'none'
      };
      
      if (!this.limits.enabled) {
        return validation;
      }
      
      // Check size limits
      if (sizeInMB > this.limits.hardLimit) {
        validation.isValid = false;
        validation.warningLevel = 'blocked';
        validation.message = `File size (${sizeInMB.toFixed(2)} MB) exceeds hard limit of ${this.limits.hardLimit} MB`;
        validation.recommendation = 'Split the file into smaller chunks or use a different processing approach';
      } else if (sizeInMB > this.limits.confirmationThreshold) {
        validation.warningLevel = 'confirmation';
        validation.message = `File size (${sizeInMB.toFixed(2)} MB) is very large. Processing may take significant time and memory`;
        validation.recommendation = 'Consider processing during off-peak hours or on a machine with more resources';
      } else if (sizeInMB > this.limits.warningThreshold) {
        validation.warningLevel = 'warning';
        validation.message = `File size (${sizeInMB.toFixed(2)} MB) is large. Processing may take some time`;
      }
      
      // Estimate processing time
      validation.estimatedProcessingTime = this.estimateProcessingTime(sizeInMB);
      
      this.emit('fileValidated', validation);
      return validation;
      
    } catch (error) {
      const errorValidation: FileSizeValidation = {
        filePath,
        sizeInBytes: 0,
        sizeInMB: 0,
        isValid: false,
        warningLevel: 'blocked',
        message: `Failed to check file size: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      this.emit('error', error);
      return errorValidation;
    }
  }

  /**
   * Validate multiple files
   */
  async validateFiles(filePaths: string[]): Promise<FileSizeValidation[]> {
    const validations = await Promise.all(
      filePaths.map(filePath => this.validateFile(filePath))
    );
    
    return validations;
  }

  /**
   * Validate M4 Dialogue file
   */
  async validateDialogueFile(folderPath: string): Promise<FileSizeValidation> {
    const dialogueFile = path.join(folderPath, 'M4_Dialogue.xlsx');
    return this.validateFile(dialogueFile);
  }

  /**
   * Validate M4 String folder
   */
  async validateStringFolder(folderPath: string): Promise<FolderSizeSummary> {
    const stringFiles = [
      '01_Item.xlsx',
      '02_NPCs&Mobs.xlsx',
      '03_Quest.xlsx',
      '04_Skill.xlsx',
      '05_UI.xlsx',
      '06_System.xlsx',
      '07_Tutorial.xlsx',
      '08_CashShop.xlsx'
    ];
    
    let totalSizeInBytes = 0;
    let largestFile: { path: string; sizeInMB: number } | undefined;
    const filesRequiringAttention: FileSizeValidation[] = [];
    const validFiles: string[] = [];
    
    for (const fileName of stringFiles) {
      const filePath = path.join(folderPath, fileName);
      
      try {
        const validation = await this.validateFile(filePath);
        
        if (validation.isValid) {
          totalSizeInBytes += validation.sizeInBytes;
          validFiles.push(filePath);
          
          // Track largest file
          if (!largestFile || validation.sizeInMB > largestFile.sizeInMB) {
            largestFile = {
              path: filePath,
              sizeInMB: validation.sizeInMB
            };
          }
          
          // Collect files requiring attention
          if (validation.warningLevel !== 'none') {
            filesRequiringAttention.push(validation);
          }
        } else {
          filesRequiringAttention.push(validation);
        }
      } catch (error) {
        // File might not exist
        this.emit('warning', `File not found: ${filePath}`);
      }
    }
    
    const summary: FolderSizeSummary = {
      totalSizeInBytes,
      totalSizeInMB: totalSizeInBytes / (1024 * 1024),
      fileCount: validFiles.length,
      largestFile,
      filesRequiringAttention
    };
    
    this.emit('folderValidated', summary);
    return summary;
  }

  /**
   * Estimate processing time based on file size
   */
  estimateProcessingTime(sizeInMB: number): number {
    const estimatedRows = sizeInMB * this.processingParams.rowsPerMB;
    const processingTime = estimatedRows / this.processingParams.processingSpeed;
    return processingTime + this.processingParams.overheadTime;
  }

  /**
   * Format time duration for display
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes} minutes ${remainingSeconds} seconds`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hours ${minutes} minutes`;
    }
  }

  /**
   * Get size recommendation based on file size
   */
  getSizeRecommendation(sizeInMB: number): string {
    if (sizeInMB < 10) {
      return 'File size is optimal for quick processing';
    } else if (sizeInMB < 50) {
      return 'File size is good for standard processing';
    } else if (sizeInMB < 100) {
      return 'Consider monitoring memory usage during processing';
    } else if (sizeInMB < 500) {
      return 'Streaming mode will be used automatically. Ensure sufficient memory is available';
    } else {
      return 'Very large file. Consider splitting into smaller files or processing on a dedicated machine';
    }
  }

  /**
   * Check if user confirmation is required
   */
  requiresConfirmation(validation: FileSizeValidation): boolean {
    return validation.warningLevel === 'confirmation';
  }

  /**
   * Update limits
   */
  updateLimits(limits: Partial<FileSizeLimits>): void {
    this.limits = { ...this.limits, ...limits };
    this.emit('limitsUpdated', this.limits);
  }

  /**
   * Update processing parameters
   */
  updateProcessingParams(params: Partial<ProcessingTimeParams>): void {
    this.processingParams = { ...this.processingParams, ...params };
  }

  /**
   * Get current limits
   */
  getLimits(): FileSizeLimits {
    return { ...this.limits };
  }

  /**
   * Create preset validators
   */
  static createDefault(): FileSizeValidator {
    return new FileSizeValidator();
  }

  static createStrict(): FileSizeValidator {
    return new FileSizeValidator({
      warningThreshold: 50,
      confirmationThreshold: 200,
      hardLimit: 500
    });
  }

  static createRelaxed(): FileSizeValidator {
    return new FileSizeValidator({
      warningThreshold: 200,
      confirmationThreshold: 1000,
      hardLimit: 2048
    });
  }

  static createDisabled(): FileSizeValidator {
    return new FileSizeValidator({
      enabled: false
    });
  }
}

/**
 * Middleware for file size validation
 */
export function validateFileSize(validator: FileSizeValidator) {
  return async function(filePath: string): Promise<void> {
    const validation = await validator.validateFile(filePath);
    
    if (!validation.isValid) {
      throw new Error(validation.message || 'File size validation failed');
    }
    
    if (validation.warningLevel === 'confirmation') {
      // In a real application, this would prompt the user
      console.warn(`WARNING: ${validation.message}`);
      console.warn(`Estimated processing time: ${validator.formatDuration(validation.estimatedProcessingTime || 0)}`);
      console.warn(validation.recommendation || '');
    }
  };
}