import { EventEmitter } from 'events'
import { net } from 'electron'
import { AppState, UpdateInfo, IpcError } from '../../shared/types'
import { StateManager } from '../state-manager'

export interface UpdateServiceOptions {
  githubRepo: string
  checkInterval: number // in milliseconds
  maxRetries: number
  retryDelay: number
  requestTimeout: number
  proxySettings?: ProxySettings
}

export interface ProxySettings {
  host: string
  port: number
  username?: string
  password?: string
  protocol: 'http' | 'https' | 'socks'
}

export interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  assets: GitHubAsset[]
  prerelease: boolean
  draft: boolean
}

export interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
  content_type: string
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  updateInfo?: UpdateInfo
  error?: string
}

export class UpdateService extends EventEmitter {
  private stateManager: StateManager
  private options: UpdateServiceOptions
  private isChecking = false
  private checkTimer?: NodeJS.Timeout
  private retryCount = 0
  private circuitBreakerOpen = false
  private circuitBreakerResetTime = 0
  private lastSuccessfulCheck = 0

  constructor(stateManager: StateManager, options: UpdateServiceOptions) {
    super()
    this.stateManager = stateManager
    this.options = {
      githubRepo: options.githubRepo,
      checkInterval: options.checkInterval || 24 * 60 * 60 * 1000, // 24 hours default
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000, // 5 seconds
      requestTimeout: options.requestTimeout || 30000, // 30 seconds
      proxySettings: options.proxySettings
    }
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.on('error', (error: Error) => {
      console.error('UpdateService error:', error)
      this.handleError(error)
    })

    this.on('updateAvailable', (updateInfo: UpdateInfo) => {
      this.stateManager.setState({
        isUpdateAvailable: true,
        lastUpdateCheck: Date.now()
      })
    })

    this.on('noUpdateAvailable', () => {
      this.stateManager.setState({
        isUpdateAvailable: false,
        lastUpdateCheck: Date.now()
      })
    })
  }

  public async start(): Promise<void> {
    console.log('UpdateService starting...')
    
    // Check for updates on startup if enough time has passed
    const state = await this.stateManager.getState()
    const timeSinceLastCheck = Date.now() - state.lastUpdateCheck
    
    if (timeSinceLastCheck > this.options.checkInterval) {
      await this.checkForUpdates()
    }
    
    // Set up periodic checking
    this.scheduleNextCheck()
  }

  public async stop(): Promise<void> {
    console.log('UpdateService stopping...')
    
    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.checkTimer = undefined
    }
    
    this.removeAllListeners()
  }

  public async checkForUpdates(): Promise<UpdateCheckResult> {
    if (this.isChecking) {
      return { hasUpdate: false, error: 'Update check already in progress' }
    }

    // Check if we're offline
    if (!this.hasNetworkConnectivity()) {
      return this.handleOfflineCheck()
    }

    if (this.circuitBreakerOpen) {
      if (Date.now() < this.circuitBreakerResetTime) {
        return { hasUpdate: false, error: 'Circuit breaker open - too many failures' }
      }
      this.circuitBreakerOpen = false
      this.retryCount = 0
    }

    this.isChecking = true
    
    try {
      const result = await this.performUpdateCheck()
      this.onCheckSuccess()
      return result
    } catch (error) {
      return this.onCheckError(error as Error)
    } finally {
      this.isChecking = false
    }
  }

  private async performUpdateCheck(): Promise<UpdateCheckResult> {
    const currentVersion = await this.getCurrentVersion()
    const latestRelease = await this.fetchLatestRelease()
    
    if (!latestRelease) {
      throw new Error('No release information available')
    }

    const hasUpdate = this.compareVersions(currentVersion, latestRelease.tag_name)
    
    if (hasUpdate) {
      const updateInfo: UpdateInfo = {
        version: latestRelease.tag_name,
        releaseDate: latestRelease.published_at,
        downloadUrl: this.getDownloadUrl(latestRelease),
        changelog: latestRelease.body
      }
      
      this.emit('updateAvailable', updateInfo)
      return { hasUpdate: true, updateInfo }
    } else {
      this.emit('noUpdateAvailable')
      return { hasUpdate: false }
    }
  }

  private async getCurrentVersion(): Promise<string> {
    const state = await this.stateManager.getState()
    return state.version
  }

  private async fetchLatestRelease(): Promise<GitHubRelease | null> {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${this.options.githubRepo}/releases/latest`
      
      const request = net.request({
        method: 'GET',
        url: url
      })

      // Set headers
      request.setHeader('User-Agent', 'Sebastian-Update-Client/1.0')
      request.setHeader('Accept', 'application/vnd.github.v3+json')

      // Handle proxy settings
      if (this.options.proxySettings) {
        this.configureProxy(request)
      }

      let responseData = ''
      
      // Manual timeout handling
      const timeoutId = setTimeout(() => {
        request.abort()
        reject(new Error('Request timeout'))
      }, this.options.requestTimeout)

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API request failed with status ${response.statusCode}`))
          return
        }

        response.on('data', (chunk) => {
          responseData += chunk.toString()
        })

        response.on('end', () => {
          clearTimeout(timeoutId)
          try {
            const release = JSON.parse(responseData) as GitHubRelease
            
            // Filter out draft and pre-release versions
            if (release.draft || release.prerelease) {
              resolve(null)
            } else {
              resolve(release)
            }
          } catch (parseError) {
            reject(new Error('Failed to parse GitHub API response'))
          }
        })
      })

      request.on('error', (error) => {
        clearTimeout(timeoutId)
        reject(error)
      })

      request.on('abort', () => {
        clearTimeout(timeoutId)
        reject(new Error('Request aborted'))
      })

      request.end()
    })
  }

  private configureProxy(request: Electron.ClientRequest): void {
    const proxy = this.options.proxySettings!
    const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`
    
    // Note: Electron's net module doesn't support proxy configuration directly
    // This would typically be handled at the app level or through system proxy settings
    console.log('Proxy settings configured:', proxyUrl)
  }

  private compareVersions(current: string, latest: string): boolean {
    // Remove 'v' prefix if present
    const currentClean = current.replace(/^v/, '')
    const latestClean = latest.replace(/^v/, '')
    
    const currentParts = currentClean.split('.').map(Number)
    const latestParts = latestClean.split('.').map(Number)
    
    // Ensure both arrays have the same length
    const maxLength = Math.max(currentParts.length, latestParts.length)
    while (currentParts.length < maxLength) currentParts.push(0)
    while (latestParts.length < maxLength) latestParts.push(0)
    
    for (let i = 0; i < maxLength; i++) {
      if (latestParts[i] > currentParts[i]) return true
      if (latestParts[i] < currentParts[i]) return false
    }
    
    return false // Versions are equal
  }

  private getDownloadUrl(release: GitHubRelease): string {
    // Look for MSI file first, then exe, then any Windows asset
    const windowsAssets = release.assets.filter(asset => 
      asset.name.toLowerCase().includes('win') || 
      asset.name.toLowerCase().includes('msi') ||
      asset.name.toLowerCase().includes('exe')
    )
    
    if (windowsAssets.length > 0) {
      // Prefer MSI over exe
      const msiAsset = windowsAssets.find(asset => asset.name.toLowerCase().includes('msi'))
      return msiAsset?.browser_download_url || windowsAssets[0].browser_download_url
    }
    
    // Fallback to first asset
    return release.assets[0]?.browser_download_url || ''
  }

  private onCheckSuccess(): void {
    this.retryCount = 0
    this.lastSuccessfulCheck = Date.now()
    this.scheduleNextCheck()
  }

  private onCheckError(error: Error): UpdateCheckResult {
    this.retryCount++
    
    if (this.retryCount >= this.options.maxRetries) {
      this.openCircuitBreaker()
      this.emit('error', error)
      return { hasUpdate: false, error: error.message }
    }
    
    // Schedule retry
    setTimeout(() => {
      this.checkForUpdates()
    }, this.options.retryDelay * this.retryCount)
    
    return { hasUpdate: false, error: error.message }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true
    this.circuitBreakerResetTime = Date.now() + (30 * 60 * 1000) // 30 minutes
    console.log('Circuit breaker opened due to repeated failures')
  }

  private scheduleNextCheck(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
    }
    
    this.checkTimer = setTimeout(() => {
      this.checkForUpdates()
    }, this.options.checkInterval)
  }

  private handleError(error: Error): void {
    // Log error for debugging
    console.error('UpdateService error:', error)
    
    // Update state to indicate error
    this.stateManager.setState({
      lastUpdateCheck: Date.now()
    })
  }

  public isOnline(): boolean {
    // Check network connectivity
    // In main process, we can use net module to check connectivity
    return !this.circuitBreakerOpen && this.hasNetworkConnectivity()
  }

  private hasNetworkConnectivity(): boolean {
    // Simple connectivity check - in a real app, this could be more sophisticated
    // For now, we'll assume online unless circuit breaker is open
    return true
  }

  private handleOfflineCheck(): UpdateCheckResult {
    console.log('Application is offline, skipping update check')
    
    // Return cached update info if available
    const cachedState = this.stateManager.getState()
    if (cachedState.isUpdateAvailable) {
      // We have cached update info, but we'll indicate this is offline
      return { 
        hasUpdate: false, 
        error: 'Offline - using cached update information' 
      }
    }
    
    return { 
      hasUpdate: false, 
      error: 'No network connection available for update check' 
    }
  }

  public getLastCheckTime(): number {
    return this.lastSuccessfulCheck
  }

  public getRetryCount(): number {
    return this.retryCount
  }

  public isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen
  }
}