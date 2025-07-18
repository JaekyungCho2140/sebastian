import { EventEmitter } from 'events'
import { net } from 'electron'
import { 
  AppState, 
  UpdateInfo, 
  IpcError, 
  UpdateProgress, 
  TimeoutUserAction, 
  InstallationTimeoutStatus,
  RecoveryActionRequest,
  RecoveryActionResult,
  RecoveryOption,
  SystemSnapshot,
  ErrorLogExportRequest
} from '../../shared/types'
import { StateManager } from '../state-manager'
import { UpdateDownloader, DownloadOptions } from './updateDownloader'
import { UpdateInstaller, InstallOptions } from './updateInstaller'
import { join } from 'path'
import { app } from 'electron'

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
  private downloader: UpdateDownloader
  private installer: UpdateInstaller
  private downloadPath: string
  private currentDownloadInfo?: UpdateInfo
  private currentInstallPath?: string

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
    
    this.downloader = new UpdateDownloader()
    this.installer = new UpdateInstaller()
    this.downloadPath = join(app.getPath('temp'), 'sebastian-updates')
    
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

    // Download event listeners
    this.downloader.on('progress', (progress: UpdateProgress) => {
      this.emit('downloadProgress', progress)
    })

    this.downloader.on('downloadRetry', (retryInfo: any) => {
      console.log('Download retry:', retryInfo)
      this.emit('downloadRetry', retryInfo)
    })

    this.downloader.on('downloadCancelled', (cancelInfo: any) => {
      console.log('Download cancelled:', cancelInfo)
      this.emit('downloadCancelled', cancelInfo)
    })

    // Install event listeners
    this.installer.on('progress', (progress: UpdateProgress) => {
      this.emit('installProgress', progress)
    })

    this.installer.on('installationCancelled', () => {
      console.log('Installation cancelled')
      this.emit('installationCancelled')
    })
    
    this.installer.on('installationLog', (logEntry) => {
      this.emit('installationLog', logEntry)
    })
    
    this.installer.on('timeout', (timeoutNotification) => {
      this.emit('timeout', timeoutNotification)
    })
    
    this.installer.on('userActionRequired', (actionRequest) => {
      this.emit('userActionRequired', actionRequest)
    })
  }

  public async start(): Promise<void> {
    console.log('UpdateService starting...')
    
    try {
      // Check for updates on startup if enough time has passed
      const state = await this.stateManager.getState()
      const timeSinceLastCheck = Date.now() - state.lastUpdateCheck
      
      console.log('=== UPDATE SERVICE DEBUG ===')
      console.log('Current version:', state.version)
      console.log('Last update check:', new Date(state.lastUpdateCheck))
      console.log('Time since last check (ms):', timeSinceLastCheck)
      console.log('Check interval (ms):', this.options.checkInterval)
      console.log('Should check for updates:', timeSinceLastCheck > this.options.checkInterval)
      console.log('Circuit breaker status:', {
        isOpen: this.circuitBreakerOpen,
        resetTime: this.circuitBreakerResetTime ? new Date(this.circuitBreakerResetTime) : 'N/A',
        retryCount: this.retryCount
      })
      console.log('GitHub repo:', this.options.githubRepo)
      console.log('Request timeout:', this.options.requestTimeout)
      
      // Check ignore until timestamp
      const isIgnored = state.ignoreUntil && Date.now() < state.ignoreUntil
      console.log('Ignore until:', state.ignoreUntil ? new Date(state.ignoreUntil) : 'Not set')
      console.log('Is currently ignored:', isIgnored)
      
      // Skip update check if we're in ignore period
      if (isIgnored) {
        console.log('Skipping update check - in ignore period')
        return
      }
      
      // Check if enough time has passed since last check
      const shouldCheck = timeSinceLastCheck > this.options.checkInterval
      console.log('Should check for updates:', shouldCheck)
      
      // Force update check for debugging in development mode
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev) {
        console.log('Forcing update check for debugging (development mode)...')
        
        // Reset circuit breaker if it's open for development
        if (this.circuitBreakerOpen) {
          console.log('Circuit breaker is open, resetting for development...')
          this.resetCircuitBreaker()
        }
      }
      
      // Check for updates if conditions are met
      let result: UpdateCheckResult = { hasUpdate: false }
      if (shouldCheck || isDev) {
        result = await this.checkForUpdates()
        console.log('Update check result:', result)
      } else {
        console.log('Skipping update check - not enough time passed')
      }
      console.log('Initial update check result:', result)
      
      // Set up periodic checking
      this.scheduleNextCheck()
      console.log('UpdateService started successfully')
    } catch (error) {
      console.error('UpdateService start failed:', error)
      throw error
    }
  }

  public async stop(): Promise<void> {
    console.log('UpdateService stopping...')
    
    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.checkTimer = undefined
    }
    
    this.downloader.cleanup()
    this.installer.cleanup()
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
      const downloadAsset = this.getDownloadAsset(latestRelease)
      
      // Get M4 feature versions
      const m4Features = this.stateManager.getM4FeatureVersions()
      
      const updateInfo: UpdateInfo = {
        version: latestRelease.tag_name,
        releaseDate: latestRelease.published_at,
        downloadUrl: this.getDownloadUrl(latestRelease),
        changelog: latestRelease.body,
        downloadSize: downloadAsset?.size,
        m4Features: m4Features || undefined // Include M4 feature versions only if available
      }
      
      // Store the update info for later download
      this.currentDownloadInfo = updateInfo
      
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
      
      console.log('=== GITHUB API DEBUG ===')
      console.log('Fetching from URL:', url)
      
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
            
            console.log('Parsed release:', {
              tag_name: release.tag_name,
              name: release.name,
              published_at: release.published_at,
              draft: release.draft,
              prerelease: release.prerelease
            })
            
            // Filter out draft and pre-release versions
            if (release.draft || release.prerelease) {
              console.log('Skipping draft/prerelease version')
              resolve(null)
            } else {
              resolve(release)
            }
          } catch (parseError) {
            console.error('JSON parse error:', parseError)
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
    console.log('=== VERSION COMPARISON DEBUG ===')
    console.log('Current version (raw):', current)
    console.log('Latest version (raw):', latest)
    
    // Remove 'v' prefix if present
    const currentClean = current.replace(/^v/, '')
    const latestClean = latest.replace(/^v/, '')
    
    console.log('Current version (clean):', currentClean)
    console.log('Latest version (clean):', latestClean)
    
    const currentParts = currentClean.split('.').map(Number)
    const latestParts = latestClean.split('.').map(Number)
    
    console.log('Current parts:', currentParts)
    console.log('Latest parts:', latestParts)
    
    // Ensure both arrays have the same length
    const maxLength = Math.max(currentParts.length, latestParts.length)
    while (currentParts.length < maxLength) currentParts.push(0)
    while (latestParts.length < maxLength) latestParts.push(0)
    
    console.log('Normalized current parts:', currentParts)
    console.log('Normalized latest parts:', latestParts)
    
    for (let i = 0; i < maxLength; i++) {
      console.log(`Comparing part ${i}: ${latestParts[i]} > ${currentParts[i]}`)
      if (latestParts[i] > currentParts[i]) {
        console.log('Update available: true')
        return true
      }
      if (latestParts[i] < currentParts[i]) {
        console.log('Update available: false (latest is older)')
        return false
      }
    }
    
    console.log('Update available: false (versions are equal)')
    return false // Versions are equal
  }

  private getDownloadAsset(release: GitHubRelease): GitHubAsset | undefined {
    // Look for EXE installer file first, then any Windows asset
    const windowsAssets = release.assets.filter(asset => 
      asset.name.toLowerCase().includes('win') ||
      asset.name.toLowerCase().includes('exe') ||
      asset.name.toLowerCase().includes('setup')
    )
    
    if (windowsAssets.length > 0) {
      // Prefer EXE installer files
      const exeAsset = windowsAssets.find(asset => asset.name.toLowerCase().includes('exe'))
      return exeAsset || windowsAssets[0]
    }
    
    // Fallback to first asset
    return release.assets[0]
  }

  private getDownloadUrl(release: GitHubRelease): string {
    const asset = this.getDownloadAsset(release)
    return asset?.browser_download_url || ''
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

  public async downloadUpdate(updateInfo: UpdateInfo): Promise<string> {
    if (!updateInfo.downloadUrl) {
      throw new Error('No download URL available')
    }

    this.currentDownloadInfo = updateInfo
    
    // Extract filename from URL
    const url = new URL(updateInfo.downloadUrl)
    const filename = url.pathname.split('/').pop() || `sebastian-${updateInfo.version}-Setup.exe`
    const filePath = join(this.downloadPath, filename)

    const downloadOptions: DownloadOptions = {
      url: updateInfo.downloadUrl,
      filePath,
      expectedSize: updateInfo.downloadSize,
      timeout: 10 * 60 * 1000, // 10 minutes
      retries: 3,
      retryDelay: 5000
    }

    try {
      const result = await this.downloader.downloadUpdate(downloadOptions)
      
      if (result.success) {
        this.currentInstallPath = result.filePath!
        this.emit('downloadComplete', { 
          updateInfo, 
          filePath: result.filePath,
          fileSize: result.actualSize 
        })
        return result.filePath!
      } else {
        throw new Error(result.error || 'Download failed')
      }
    } catch (error) {
      this.emit('downloadError', { 
        updateInfo, 
        error: error instanceof Error ? error.message : 'Download failed' 
      })
      throw error
    }
  }

  public cancelDownload(): void {
    if (this.currentDownloadInfo?.downloadUrl) {
      this.downloader.cancelDownload(this.currentDownloadInfo.downloadUrl)
      this.currentDownloadInfo = undefined
    }
  }

  public isDownloading(): boolean {
    return this.currentDownloadInfo ? 
      this.downloader.isDownloading(this.currentDownloadInfo.downloadUrl) : 
      false
  }

  public getCurrentDownloadInfo(): UpdateInfo | undefined {
    return this.currentDownloadInfo
  }

  public async installUpdate(installerPath: string, options?: Partial<InstallOptions>): Promise<void> {
    if (!installerPath) {
      throw new Error('No installer file path provided')
    }

    this.currentInstallPath = installerPath

    const installOptions: InstallOptions = {
      installerPath,
      silentInstall: true,
      elevatePermissions: true,
      timeout: 10 * 60 * 1000, // 10 minutes
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      ...options
    }

    try {
      const result = await this.installer.installUpdate(installOptions)
      
      if (result.success) {
        this.emit('installComplete', { 
          installerPath, 
          installPath: result.installPath,
          duration: result.duration,
          exitCode: result.exitCode 
        })
      } else {
        throw new Error(result.error || 'Installation failed')
      }
    } catch (error) {
      this.emit('installError', { 
        installerPath, 
        error: error instanceof Error ? error.message : 'Installation failed' 
      })
      throw error
    } finally {
      this.currentInstallPath = undefined
    }
  }

  public cancelInstallation(): void {
    this.installer.cancelInstallation()
    this.currentInstallPath = undefined
  }
  
  public forceCancelInstallation(): void {
    // Force cancel with immediate termination
    this.installer.cancelInstallation()
    this.installer.cleanup()
    this.currentInstallPath = undefined
  }
  
  public handleTimeoutUserAction(action: TimeoutUserAction): void {
    this.installer.handleUserAction(action)
  }
  
  public getTimeoutStatus(): InstallationTimeoutStatus {
    return this.installer.getTimeoutStatus()
  }
  
  public async executeRecoveryAction(request: RecoveryActionRequest): Promise<RecoveryActionResult> {
    return this.installer.executeRecoveryAction(request)
  }
  
  public getRecoveryOptions(correlationId: string): RecoveryOption[] {
    return this.installer.getRecoveryOptionsForCorrelation(correlationId)
  }
  
  public async getSystemSnapshot(): Promise<SystemSnapshot> {
    return this.installer.captureSystemSnapshot()
  }
  
  public async exportErrorLogs(request: ErrorLogExportRequest): Promise<string> {
    return this.installer.exportErrorLogs(request)
  }

  public getSupportInfo() {
    return this.installer.getSupportInfo()
  }

  public performSelfDiagnostics() {
    return this.installer.performSelfDiagnostics()
  }

  public getHelpTopics() {
    return this.installer.getHelpTopics()
  }

  public searchHelp(query: string) {
    return this.installer.searchHelp(query)
  }

  public exportDetailedErrorAnalysis(): string {
    return this.installer.exportDetailedErrorAnalysis()
  }

  public compressLogs(): void {
    this.installer.compressLogs()
  }

  public isInstalling(): boolean {
    return this.installer.isInstalling()
  }

  public getCurrentInstallPath(): string | undefined {
    return this.currentInstallPath
  }

  public async openInstallationLog(): Promise<void> {
    await this.installer.openInstallationLog()
  }

  public async downloadAndInstall(updateInfo: UpdateInfo): Promise<void> {
    try {
      // First download the update
      const downloadedFilePath = await this.downloadUpdate(updateInfo)
      
      // Then install it
      await this.installUpdate(downloadedFilePath)
      
      this.emit('updateComplete', { updateInfo, filePath: downloadedFilePath })
    } catch (error) {
      this.emit('updateError', { 
        updateInfo, 
        error: error instanceof Error ? error.message : 'Update failed' 
      })
      throw error
    }
  }

  // Reset circuit breaker manually (for development/debugging)
  public resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false
    this.circuitBreakerResetTime = 0
    this.retryCount = 0
    console.log('Circuit breaker manually reset')
  }

  // Get circuit breaker status
  public getCircuitBreakerStatus(): { isOpen: boolean, resetTime: number, retryCount: number } {
    return {
      isOpen: this.circuitBreakerOpen,
      resetTime: this.circuitBreakerResetTime,
      retryCount: this.retryCount
    }
  }

  // Force update check (bypasses circuit breaker for testing)
  public async forceUpdateCheck(): Promise<UpdateCheckResult> {
    console.log('Force update check requested - bypassing circuit breaker')
    const wasOpen = this.circuitBreakerOpen
    this.resetCircuitBreaker()
    
    try {
      const result = await this.checkForUpdates()
      return result
    } catch (error) {
      // Restore circuit breaker state if it was open before
      if (wasOpen) {
        this.circuitBreakerOpen = true
        this.circuitBreakerResetTime = Date.now() + (30 * 60 * 1000)
      }
      throw error
    }
  }
}