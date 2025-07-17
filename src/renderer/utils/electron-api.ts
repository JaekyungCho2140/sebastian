import { AppState, UpdateInfo } from '@shared/types'

// Check if Electron API is available
export function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.electronAPI !== 'undefined' && 
         window.electronAPI.isAvailable()
}

// Wrapper class for Electron API with error handling and retries
export class ElectronAPI {
  private static instance: ElectronAPI | null = null
  
  private constructor() {
    if (!isElectronAvailable()) {
      console.warn('Electron API is not available. Running in browser mode.')
    }
  }
  
  static getInstance(): ElectronAPI {
    if (!ElectronAPI.instance) {
      ElectronAPI.instance = new ElectronAPI()
    }
    return ElectronAPI.instance
  }
  
  // Retry wrapper for API calls
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`API call failed (attempt ${attempt}/${maxRetries}):`, lastError.message)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Unknown error in API call')
  }
  
  // System information
  async getVersion(): Promise<string> {
    if (!isElectronAvailable()) {
      return '1.0.0' // Fallback for browser mode
    }
    
    return this.withRetry(() => window.electronAPI.getVersion())
  }
  
  // Dialog methods
  async showSuccessDialog(): Promise<void> {
    if (!isElectronAvailable()) {
      // Fallback for browser mode
      alert('Success! (Browser mode)')
      return
    }
    
    return this.withRetry(() => window.electronAPI.showSuccessDialog())
  }
  
  // Update checking
  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (!isElectronAvailable()) {
      console.log('Update check not available in browser mode')
      return null
    }
    
    return this.withRetry(() => window.electronAPI.checkForUpdates())
  }
  
  // Application state management
  async getAppState(): Promise<AppState> {
    if (!isElectronAvailable()) {
      // Return default state for browser mode
      return {
        version: '1.0.0',
        isUpdateAvailable: false,
        lastUpdateCheck: 0,
        userPreferences: {
          theme: 'light',
          language: 'ko'
        }
      }
    }
    
    return this.withRetry(() => window.electronAPI.getAppState())
  }
  
  async setAppState(state: Partial<AppState>): Promise<void> {
    if (!isElectronAvailable()) {
      console.log('State update not available in browser mode:', state)
      return
    }
    
    return this.withRetry(() => window.electronAPI.setAppState(state))
  }
  
  // Window management
  async minimizeWindow(): Promise<void> {
    if (!isElectronAvailable()) {
      console.log('Window minimize not available in browser mode')
      return
    }
    
    return this.withRetry(() => window.electronAPI.minimizeWindow())
  }
  
  async closeWindow(): Promise<void> {
    if (!isElectronAvailable()) {
      console.log('Window close not available in browser mode')
      return
    }
    
    return this.withRetry(() => window.electronAPI.closeWindow())
  }
  
  // Event listeners
  onUpdateAvailable(callback: (updateInfo: UpdateInfo) => void): void {
    if (!isElectronAvailable()) {
      console.log('Update events not available in browser mode')
      return
    }
    
    window.electronAPI.onUpdateAvailable(callback)
  }
  
  onUpdateDownloaded(callback: () => void): void {
    if (!isElectronAvailable()) {
      console.log('Update events not available in browser mode')
      return
    }
    
    window.electronAPI.onUpdateDownloaded(callback)
  }
  
  // Clean up event listeners
  removeAllListeners(channel: string): void {
    if (!isElectronAvailable()) {
      return
    }
    
    window.electronAPI.removeAllListeners(channel)
  }
  
  // Development/debugging methods
  async resetCircuitBreaker(): Promise<any> {
    if (!isElectronAvailable()) {
      console.log('Circuit breaker reset not available in browser mode')
      return { success: false, message: 'Not available in browser mode' }
    }
    
    return this.withRetry(() => window.electronAPI.resetCircuitBreaker())
  }
  
  async getCircuitBreakerStatus(): Promise<any> {
    if (!isElectronAvailable()) {
      console.log('Circuit breaker status not available in browser mode')
      return { isOpen: false, message: 'Not available in browser mode' }
    }
    
    return this.withRetry(() => window.electronAPI.getCircuitBreakerStatus())
  }
  
  async forceUpdateCheck(): Promise<UpdateInfo | null> {
    if (!isElectronAvailable()) {
      console.log('Force update check not available in browser mode')
      return null
    }
    
    return this.withRetry(() => window.electronAPI.forceUpdateCheck())
  }
  
  async mockUpdateAvailable(): Promise<UpdateInfo | null> {
    if (!isElectronAvailable()) {
      console.log('Mock update not available in browser mode')
      return null
    }
    
    return this.withRetry(() => window.electronAPI.mockUpdateAvailable())
  }
  
  // Development mode detection
  isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev'
  }
}

// Export singleton instance
export const electronAPI = ElectronAPI.getInstance()