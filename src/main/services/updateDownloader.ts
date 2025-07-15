import { EventEmitter } from 'events'
import { net } from 'electron'
import { createHash } from 'crypto'
import { createWriteStream, existsSync, unlinkSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { mkdir } from 'fs/promises'
import { UpdateProgress } from '../../shared/types'

export interface DownloadOptions {
  url: string
  filePath: string
  expectedSize?: number
  checksum?: string
  checksumType?: 'md5' | 'sha1' | 'sha256'
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface DownloadResult {
  success: boolean
  filePath?: string
  error?: string
  actualSize?: number
  actualChecksum?: string
}

export class UpdateDownloader extends EventEmitter {
  private activeDownloads = new Map<string, boolean>()
  private downloadStats = new Map<string, {
    startTime: number
    bytesDownloaded: number
    lastUpdate: number
  }>()

  constructor() {
    super()
  }

  public async downloadUpdate(options: DownloadOptions): Promise<DownloadResult> {
    const { url, filePath, expectedSize, checksum, checksumType = 'sha256', timeout = 300000, retries = 3, retryDelay = 5000 } = options

    // Check if already downloading
    if (this.activeDownloads.get(url)) {
      return { success: false, error: 'Download already in progress' }
    }

    // Create directory if it doesn't exist
    try {
      await mkdir(dirname(filePath), { recursive: true })
    } catch (error) {
      return { success: false, error: `Failed to create directory: ${error}` }
    }

    let currentRetry = 0
    while (currentRetry <= retries) {
      try {
        const result = await this.attemptDownload(url, filePath, expectedSize, checksum, checksumType, timeout)
        
        if (result.success) {
          this.activeDownloads.delete(url)
          this.downloadStats.delete(url)
          return result
        }
        
        // If download failed and we have retries left, wait and retry
        if (currentRetry < retries) {
          this.emit('downloadRetry', { url, attempt: currentRetry + 1, maxRetries: retries })
          await this.delay(retryDelay)
          currentRetry++
        } else {
          this.activeDownloads.delete(url)
          this.downloadStats.delete(url)
          return result
        }
      } catch (error) {
        currentRetry++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (currentRetry <= retries) {
          this.emit('downloadRetry', { url, attempt: currentRetry, maxRetries: retries, error: errorMessage })
          await this.delay(retryDelay)
        } else {
          this.activeDownloads.delete(url)
          this.downloadStats.delete(url)
          return { success: false, error: `Download failed after ${retries} retries: ${errorMessage}` }
        }
      }
    }

    return { success: false, error: 'Download failed after maximum retries' }
  }

  private async attemptDownload(
    url: string,
    filePath: string,
    expectedSize?: number,
    checksum?: string,
    checksumType: string = 'sha256',
    timeout: number = 300000
  ): Promise<DownloadResult> {
    return new Promise((resolve, reject) => {
      this.activeDownloads.set(url, true)
      
      // Initialize download stats
      this.downloadStats.set(url, {
        startTime: Date.now(),
        bytesDownloaded: 0,
        lastUpdate: Date.now()
      })

      const request = net.request({
        method: 'GET',
        url: url
      })

      // Set headers
      request.setHeader('User-Agent', 'Sebastian-Update-Client/1.0')
      request.setHeader('Accept', 'application/octet-stream')

      // Handle timeout
      const timeoutId = setTimeout(() => {
        request.abort()
        reject(new Error('Download timeout'))
      }, timeout)

      // Clean up existing file if it exists
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath)
        } catch (error) {
          console.warn('Failed to remove existing file:', error)
        }
      }

      const writeStream = createWriteStream(filePath)
      const hash = createHash(checksumType)
      let downloadedBytes = 0
      let totalBytes = 0

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
          return
        }

        totalBytes = parseInt(response.headers['content-length'] as string) || expectedSize || 0
        
        if (expectedSize && totalBytes !== expectedSize) {
          console.warn(`Expected size ${expectedSize} but got ${totalBytes}`)
        }

        this.emitProgress(url, 0, totalBytes, 0)

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length
          hash.update(chunk)
          writeStream.write(chunk)

          // Update stats
          const stats = this.downloadStats.get(url)
          if (stats) {
            stats.bytesDownloaded = downloadedBytes
            const now = Date.now()
            
            // Emit progress every 100ms or when download completes
            if (now - stats.lastUpdate > 100 || downloadedBytes === totalBytes) {
              const speed = this.calculateSpeed(stats.startTime, downloadedBytes, now)
              this.emitProgress(url, downloadedBytes, totalBytes, speed)
              stats.lastUpdate = now
            }
          }
        })

        response.on('end', () => {
          clearTimeout(timeoutId)
          writeStream.end()
          
          // Verify file size
          let actualSize = 0
          try {
            const stat = statSync(filePath)
            actualSize = stat.size
          } catch (error) {
            reject(new Error(`Failed to verify downloaded file: ${error}`))
            return
          }

          if (expectedSize && actualSize !== expectedSize) {
            reject(new Error(`File size mismatch: expected ${expectedSize}, got ${actualSize}`))
            return
          }

          // Verify checksum if provided
          const actualChecksum = hash.digest('hex')
          if (checksum && actualChecksum !== checksum) {
            reject(new Error(`Checksum mismatch: expected ${checksum}, got ${actualChecksum}`))
            return
          }

          // Success
          this.emitProgress(url, actualSize, totalBytes, 0, 'complete')
          resolve({
            success: true,
            filePath,
            actualSize,
            actualChecksum
          })
        })

        response.on('error', (error) => {
          clearTimeout(timeoutId)
          writeStream.destroy()
          reject(error)
        })
      })

      request.on('error', (error) => {
        clearTimeout(timeoutId)
        writeStream.destroy()
        reject(error)
      })

      writeStream.on('error', (error) => {
        clearTimeout(timeoutId)
        request.abort()
        reject(error)
      })

      request.end()
    })
  }

  private calculateSpeed(startTime: number, bytesDownloaded: number, currentTime: number): number {
    const elapsedSeconds = (currentTime - startTime) / 1000
    return elapsedSeconds > 0 ? bytesDownloaded / elapsedSeconds : 0
  }

  private emitProgress(url: string, downloaded: number, total: number, speed: number, stage: 'downloading' | 'complete' = 'downloading') {
    const progress = total > 0 ? (downloaded / total) * 100 : 0
    
    const progressData: UpdateProgress = {
      stage,
      progress: Math.min(progress, 100),
      message: stage === 'downloading' ? `Downloading update... (${Math.round(progress)}%)` : 'Download completed',
      downloadSize: total,
      downloadedSize: downloaded,
      speed: speed > 0 ? speed : undefined
    }

    this.emit('progress', progressData)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public cancelDownload(url: string): void {
    this.activeDownloads.delete(url)
    this.downloadStats.delete(url)
    this.emit('downloadCancelled', { url })
  }

  public isDownloading(url: string): boolean {
    return this.activeDownloads.get(url) || false
  }

  public getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys())
  }

  public cleanup(): void {
    this.activeDownloads.clear()
    this.downloadStats.clear()
    this.removeAllListeners()
  }
}

export default UpdateDownloader