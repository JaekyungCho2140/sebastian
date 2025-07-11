import Store from 'electron-store'
import { AppState } from '../shared/types'
import { app } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'

// Type assertion for electron-store
interface ElectronStore<T extends Record<string, any>> extends Store<T> {
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K]
  set<K extends keyof T>(key: K, value: T[K]): void
  clear(): void
  path: string
}

export class StateManager {
  private store: ElectronStore<AppState>
  private currentState: AppState
  private readonly defaultState: AppState

  constructor() {
    this.defaultState = {
      version: this.getAppVersion(),
      isUpdateAvailable: false,
      lastUpdateCheck: 0,
      userPreferences: {
        theme: 'light',
        language: 'ko'
      }
    }

    this.store = new Store<AppState>({
      name: 'app-state',
      defaults: this.defaultState,
      cwd: app.getPath('userData'),
      fileExtension: 'json',
      clearInvalidConfig: true
    }) as unknown as ElectronStore<AppState>

    this.currentState = this.loadState()
  }

  private getAppVersion(): string {
    try {
      // 먼저 Electron의 app.getVersion()을 사용 (package.json에서 자동으로 읽음)
      const electronVersion = app.getVersion()
      if (electronVersion && electronVersion !== '1.0.0') {
        return electronVersion
      }

      // 폴백: 직접 package.json 읽기
      // 개발 환경에서는 process.cwd(), 패키징된 앱에서는 app.getAppPath() 사용
      const appPath = app.isPackaged ? app.getAppPath() : process.cwd()
      const packageJsonPath = join(appPath, 'package.json')
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      return packageJson.version || '1.0.0'
    } catch (error) {
      console.error('Failed to read version from package.json:', error)
      console.error('App path:', app.isPackaged ? app.getAppPath() : process.cwd())
      return '1.0.0'
    }
  }

  private loadState(): AppState {
    try {
      const storedState = {
        version: this.store.get('version', this.defaultState.version) as string,
        isUpdateAvailable: this.store.get('isUpdateAvailable', this.defaultState.isUpdateAvailable) as boolean,
        lastUpdateCheck: this.store.get('lastUpdateCheck', this.defaultState.lastUpdateCheck) as number,
        userPreferences: this.store.get('userPreferences', this.defaultState.userPreferences) as AppState['userPreferences']
      }
      
      // Update version if it has changed
      if (storedState.version !== this.defaultState.version) {
        storedState.version = this.defaultState.version
        this.store.set('version', this.defaultState.version)
      }

      return storedState
    } catch (error) {
      console.error('Failed to load state, using defaults:', error)
      return { ...this.defaultState }
    }
  }

  public getState(): AppState {
    return { ...this.currentState }
  }

  public setState(newState: Partial<AppState>): void {
    this.currentState = { ...this.currentState, ...newState }
    
    // Save to persistent storage
    Object.keys(newState).forEach(key => {
      const typedKey = key as keyof AppState
      const value = newState[typedKey]
      if (value !== undefined) {
        this.store.set(typedKey, value)
      }
    })
  }

  public updateUserPreferences(preferences: Partial<AppState['userPreferences']>): void {
    const updatedPreferences = { ...this.currentState.userPreferences, ...preferences }
    this.setState({ userPreferences: updatedPreferences })
  }

  public markUpdateAvailable(available: boolean): void {
    this.setState({ isUpdateAvailable: available })
  }

  public updateLastUpdateCheck(): void {
    this.setState({ lastUpdateCheck: Date.now() })
  }

  public reset(): void {
    this.store.clear()
    this.currentState = { ...this.defaultState }
    // Set default values
    Object.keys(this.defaultState).forEach(key => {
      const typedKey = key as keyof AppState
      const value = this.defaultState[typedKey]
      this.store.set(typedKey, value)
    })
  }

  public getStorePath(): string {
    return this.store.path
  }

  public backup(): string {
    const backupData = JSON.stringify(this.currentState, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(app.getPath('userData'), `app-state-backup-${timestamp}.json`)
    
    try {
      require('fs').writeFileSync(backupPath, backupData)
      return backupPath
    } catch (error) {
      console.error('Failed to create backup:', error)
      throw error
    }
  }
}

// Singleton instance
let stateManager: StateManager | null = null

export function getStateManager(): StateManager {
  if (!stateManager) {
    stateManager = new StateManager()
  }
  return stateManager
}

export function initializeStateManager(): StateManager {
  stateManager = new StateManager()
  return stateManager
}