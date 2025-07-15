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
      console.log('Electron version from app.getVersion():', electronVersion)
      
      if (electronVersion && electronVersion.trim() !== '' && electronVersion !== '1.0.0') {
        return electronVersion
      }

      // 폴백 1: 여러 경로에서 package.json 찾기
      const possiblePaths = [
        // 개발 환경
        join(process.cwd(), 'package.json'),
        // 패키징된 앱 - 다양한 경로 시도
        join(app.getAppPath(), 'package.json'),
        join(app.getAppPath(), '..', 'package.json'),
        join(app.getAppPath(), '..', '..', 'package.json'),
        // 리소스 경로
        join(process.resourcesPath, 'package.json'),
        join(process.resourcesPath, '..', 'package.json')
      ]

      for (const packageJsonPath of possiblePaths) {
        try {
          console.log('Trying to read package.json from:', packageJsonPath)
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
          if (packageJson.version && packageJson.version !== '1.0.0') {
            console.log('Found version in package.json:', packageJson.version)
            return packageJson.version
          }
        } catch (pathError) {
          console.log('Path not found:', packageJsonPath)
          continue
        }
      }

      // 폴백 2: 현재 디렉토리의 package.json에서 직접 읽기 (최후의 수단)
      try {
        const rootPackageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'))
        if (rootPackageJson.version) {
          console.log('Found version in root package.json:', rootPackageJson.version)
          return rootPackageJson.version
        }
      } catch (rootError) {
        console.log('Could not read root package.json:', rootError.message)
      }

      // 폴백 3: 절대 최후의 수단 - 동적으로 현재 package.json에서 읽기
      console.warn('Could not find version from any source, attempting to use default')
      
      // 빌드 시점의 package.json 버전을 사용하도록 개선
      // 이는 빌드 프로세스에서 자동으로 설정되어야 함
      const buildTimeVersion = process.env.SEBASTIAN_VERSION || '0.1.21'
      console.log('Using build-time version from env:', buildTimeVersion)
      return buildTimeVersion
    } catch (error) {
      console.error('Failed to read version:', error)
      console.error('App path:', app.isPackaged ? app.getAppPath() : process.cwd())
      console.error('Is packaged:', app.isPackaged)
      
      // 오류 시에도 동적으로 처리
      try {
        const rootPackageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'))
        return rootPackageJson.version || '0.1.0'
      } catch {
        return '0.1.0'
      }
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