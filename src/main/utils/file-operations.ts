import { promises as fs, constants } from 'fs'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'
import log from 'electron-log'

export interface FileOperationResult {
  success: boolean
  error?: string
  data?: any
}

export interface FileLockInfo {
  id: string
  filepath: string
  timestamp: number
  processId: number
}

export class FileOperations {
  private static activeLocks = new Map<string, FileLockInfo>()
  private static readonly LOCK_TIMEOUT = 30000 // 30 seconds
  private static readonly TEMP_PREFIX = '.tmp_'

  /**
   * Check if file exists and is accessible
   */
  public static async exists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if file is readable
   */
  public static async isReadable(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath, constants.R_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if file is writable
   */
  public static async isWritable(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath, constants.W_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Ensure directory exists
   */
  public static async ensureDirectory(dirPath: string): Promise<FileOperationResult> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      log.debug(`Directory ensured: ${dirPath}`)
      return { success: true }
    } catch (error) {
      const message = `Failed to ensure directory ${dirPath}: ${error}`
      log.error(message)
      return { success: false, error: message }
    }
  }

  /**
   * Get file lock to prevent concurrent access
   */
  private static async acquireLock(filepath: string): Promise<string | null> {
    const lockId = randomUUID()
    const now = Date.now()

    // Clean up expired locks
    for (const [path, lockInfo] of this.activeLocks.entries()) {
      if (now - lockInfo.timestamp > this.LOCK_TIMEOUT) {
        this.activeLocks.delete(path)
        log.warn(`Cleaned up expired lock for: ${path}`)
      }
    }

    // Check if file is already locked
    if (this.activeLocks.has(filepath)) {
      log.debug(`File is locked: ${filepath}`)
      return null
    }

    // Acquire lock
    this.activeLocks.set(filepath, {
      id: lockId,
      filepath,
      timestamp: now,
      processId: process.pid
    })

    log.debug(`Lock acquired for: ${filepath} (${lockId})`)
    return lockId
  }

  /**
   * Release file lock
   */
  private static releaseLock(filepath: string, lockId: string): boolean {
    const lockInfo = this.activeLocks.get(filepath)
    
    if (!lockInfo || lockInfo.id !== lockId) {
      log.warn(`Invalid lock release attempt: ${filepath} (${lockId})`)
      return false
    }

    this.activeLocks.delete(filepath)
    log.debug(`Lock released for: ${filepath} (${lockId})`)
    return true
  }

  /**
   * Atomic write operation using temporary file
   */
  public static async writeFileAtomic(
    filepath: string,
    content: string | Buffer,
    encoding: BufferEncoding = 'utf8'
  ): Promise<FileOperationResult> {
    const lockId = await this.acquireLock(filepath)
    if (!lockId) {
      return { 
        success: false, 
        error: 'File is locked by another operation' 
      }
    }

    const tempFilepath = join(dirname(filepath), `${this.TEMP_PREFIX}${randomUUID()}`)

    try {
      // Ensure directory exists
      const dirResult = await this.ensureDirectory(dirname(filepath))
      if (!dirResult.success) {
        return dirResult
      }

      // Write to temporary file first
      if (typeof content === 'string') {
        await fs.writeFile(tempFilepath, content, encoding)
      } else {
        await fs.writeFile(tempFilepath, content)
      }

      // Verify the temporary file was written correctly
      const stats = await fs.stat(tempFilepath)
      if (stats.size === 0 && content.length > 0) {
        throw new Error('Temporary file is empty after write')
      }

      // Atomic move to final location
      await fs.rename(tempFilepath, filepath)
      
      log.debug(`File written atomically: ${filepath}`)
      return { success: true }

    } catch (error) {
      // Clean up temporary file if it exists
      try {
        if (await this.exists(tempFilepath)) {
          await fs.unlink(tempFilepath)
        }
      } catch (cleanupError) {
        log.warn(`Failed to clean up temp file: ${tempFilepath}`)
      }

      const message = `Failed to write file ${filepath}: ${error}`
      log.error(message)
      return { success: false, error: message }

    } finally {
      this.releaseLock(filepath, lockId)
    }
  }

  /**
   * Safe read operation with lock
   */
  public static async readFileAtomic(
    filepath: string,
    encoding: BufferEncoding = 'utf8'
  ): Promise<FileOperationResult> {
    const lockId = await this.acquireLock(filepath)
    if (!lockId) {
      return { 
        success: false, 
        error: 'File is locked by another operation' 
      }
    }

    try {
      // Check if file exists and is readable
      if (!await this.exists(filepath)) {
        return { success: false, error: 'File does not exist' }
      }

      if (!await this.isReadable(filepath)) {
        return { success: false, error: 'File is not readable' }
      }

      const content = await fs.readFile(filepath, encoding)
      
      log.debug(`File read: ${filepath}`)
      return { success: true, data: content }

    } catch (error) {
      const message = `Failed to read file ${filepath}: ${error}`
      log.error(message)
      return { success: false, error: message }

    } finally {
      this.releaseLock(filepath, lockId)
    }
  }

  /**
   * Safe delete operation
   */
  public static async deleteFile(filepath: string): Promise<FileOperationResult> {
    const lockId = await this.acquireLock(filepath)
    if (!lockId) {
      return { 
        success: false, 
        error: 'File is locked by another operation' 
      }
    }

    try {
      if (!await this.exists(filepath)) {
        log.debug(`File does not exist, nothing to delete: ${filepath}`)
        return { success: true }
      }

      await fs.unlink(filepath)
      
      log.debug(`File deleted: ${filepath}`)
      return { success: true }

    } catch (error) {
      const message = `Failed to delete file ${filepath}: ${error}`
      log.error(message)
      return { success: false, error: message }

    } finally {
      this.releaseLock(filepath, lockId)
    }
  }

  /**
   * Get file stats safely
   */
  public static async getFileStats(filepath: string): Promise<FileOperationResult> {
    try {
      if (!await this.exists(filepath)) {
        return { success: false, error: 'File does not exist' }
      }

      const stats = await fs.stat(filepath)
      
      return { 
        success: true, 
        data: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        }
      }

    } catch (error) {
      const message = `Failed to get file stats ${filepath}: ${error}`
      log.error(message)
      return { success: false, error: message }
    }
  }

  /**
   * List files in directory with filtering
   */
  public static async listFiles(
    dirPath: string,
    filter?: {
      extension?: string
      pattern?: RegExp
      maxAge?: number // milliseconds
      maxSize?: number // bytes
    }
  ): Promise<FileOperationResult> {
    try {
      if (!await this.exists(dirPath)) {
        return { success: false, error: 'Directory does not exist' }
      }

      const files = await fs.readdir(dirPath)
      const filteredFiles: Array<{
        name: string
        path: string
        size: number
        modified: Date
      }> = []

      for (const file of files) {
        const filepath = join(dirPath, file)
        const statsResult = await this.getFileStats(filepath)
        
        if (!statsResult.success || !statsResult.data?.isFile) {
          continue
        }

        const stats = statsResult.data

        // Apply filters
        if (filter) {
          if (filter.extension && !file.endsWith(filter.extension)) {
            continue
          }

          if (filter.pattern && !filter.pattern.test(file)) {
            continue
          }

          if (filter.maxAge) {
            const age = Date.now() - stats.modified.getTime()
            if (age > filter.maxAge) {
              continue
            }
          }

          if (filter.maxSize && stats.size > filter.maxSize) {
            continue
          }
        }

        filteredFiles.push({
          name: file,
          path: filepath,
          size: stats.size,
          modified: stats.modified
        })
      }

      return { success: true, data: filteredFiles }

    } catch (error) {
      const message = `Failed to list files in ${dirPath}: ${error}`
      log.error(message)
      return { success: false, error: message }
    }
  }

  /**
   * Copy file safely
   */
  public static async copyFile(
    sourcePath: string,
    destPath: string
  ): Promise<FileOperationResult> {
    try {
      if (!await this.exists(sourcePath)) {
        return { success: false, error: 'Source file does not exist' }
      }

      if (!await this.isReadable(sourcePath)) {
        return { success: false, error: 'Source file is not readable' }
      }

      // Ensure destination directory exists
      const dirResult = await this.ensureDirectory(dirname(destPath))
      if (!dirResult.success) {
        return dirResult
      }

      await fs.copyFile(sourcePath, destPath)
      
      log.debug(`File copied: ${sourcePath} -> ${destPath}`)
      return { success: true }

    } catch (error) {
      const message = `Failed to copy file ${sourcePath} to ${destPath}: ${error}`
      log.error(message)
      return { success: false, error: message }
    }
  }

  /**
   * Move file safely (atomic rename if possible)
   */
  public static async moveFile(
    sourcePath: string,
    destPath: string
  ): Promise<FileOperationResult> {
    try {
      if (!await this.exists(sourcePath)) {
        return { success: false, error: 'Source file does not exist' }
      }

      // Ensure destination directory exists
      const dirResult = await this.ensureDirectory(dirname(destPath))
      if (!dirResult.success) {
        return dirResult
      }

      await fs.rename(sourcePath, destPath)
      
      log.debug(`File moved: ${sourcePath} -> ${destPath}`)
      return { success: true }

    } catch (error) {
      // If rename fails (e.g., cross-device), try copy + delete
      try {
        const copyResult = await this.copyFile(sourcePath, destPath)
        if (!copyResult.success) {
          return copyResult
        }

        const deleteResult = await this.deleteFile(sourcePath)
        if (!deleteResult.success) {
          // Clean up copied file
          await this.deleteFile(destPath)
          return deleteResult
        }

        log.debug(`File moved via copy+delete: ${sourcePath} -> ${destPath}`)
        return { success: true }

      } catch (fallbackError) {
        const message = `Failed to move file ${sourcePath} to ${destPath}: ${fallbackError}`
        log.error(message)
        return { success: false, error: message }
      }
    }
  }

  /**
   * Clean up temporary files
   */
  public static async cleanupTempFiles(dirPath: string): Promise<FileOperationResult> {
    try {
      const listResult = await this.listFiles(dirPath, {
        pattern: new RegExp(`^${this.TEMP_PREFIX}`)
      })

      if (!listResult.success) {
        return listResult
      }

      const tempFiles = listResult.data || []
      let deletedCount = 0

      for (const file of tempFiles) {
        const deleteResult = await this.deleteFile(file.path)
        if (deleteResult.success) {
          deletedCount++
        }
      }

      log.debug(`Cleaned up ${deletedCount} temporary files in ${dirPath}`)
      return { success: true, data: { deletedCount } }

    } catch (error) {
      const message = `Failed to cleanup temp files in ${dirPath}: ${error}`
      log.error(message)
      return { success: false, error: message }
    }
  }

  /**
   * Get directory size
   */
  public static async getDirectorySize(dirPath: string): Promise<FileOperationResult> {
    try {
      if (!await this.exists(dirPath)) {
        return { success: false, error: 'Directory does not exist' }
      }

      let totalSize = 0
      const files = await fs.readdir(dirPath)

      for (const file of files) {
        const filepath = join(dirPath, file)
        const statsResult = await this.getFileStats(filepath)
        
        if (statsResult.success && statsResult.data?.isFile) {
          totalSize += statsResult.data.size
        }
      }

      return { success: true, data: { totalSize, fileCount: files.length } }

    } catch (error) {
      const message = `Failed to get directory size ${dirPath}: ${error}`
      log.error(message)
      return { success: false, error: message }
    }
  }
}