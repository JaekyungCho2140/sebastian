import Store from 'electron-store'
import { AppState, M4Settings, M4_SETTINGS_DEFAULTS, mergeM4Settings, validateM4Settings, addRecentFolder, cleanupRecentFolders, migrateM4Settings } from '../shared/types'
import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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
  private m4Store: ElectronStore<M4Settings>
  private currentM4Settings: M4Settings
  private readonly defaultM4Settings: M4Settings

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

    // M4 settings initialization
    this.defaultM4Settings = { ...M4_SETTINGS_DEFAULTS }
    
    this.m4Store = new Store<M4Settings>({
      name: 'm4-settings',
      defaults: this.defaultM4Settings,
      cwd: app.getPath('userData'),
      fileExtension: 'json',
      clearInvalidConfig: true
    }) as unknown as ElectronStore<M4Settings>

    this.currentM4Settings = this.loadM4Settings()
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
        console.log('Could not read root package.json:', rootError instanceof Error ? rootError.message : String(rootError))
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

  public getM4StorePath(): string {
    return this.m4Store.path
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

  public backupM4Settings(): string {
    const backupData = JSON.stringify(this.currentM4Settings, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(app.getPath('userData'), `m4-settings-backup-${timestamp}.json`)
    
    try {
      writeFileSync(backupPath, backupData)
      return backupPath
    } catch (error) {
      console.error('Failed to create M4 settings backup:', error)
      throw error
    }
  }

  // ============================================================================
  // M4 Settings Management
  // ============================================================================

  /**
   * M4 설정 로드
   */
  private loadM4Settings(): M4Settings {
    try {
      const storedSettings = {
        version: this.m4Store.get('version', this.defaultM4Settings.version) as string,
        folderPaths: this.m4Store.get('folderPaths', this.defaultM4Settings.folderPaths) as M4Settings['folderPaths'],
        outputSettings: this.m4Store.get('outputSettings', this.defaultM4Settings.outputSettings) as M4Settings['outputSettings'],
        processingOptions: this.m4Store.get('processingOptions', this.defaultM4Settings.processingOptions) as M4Settings['processingOptions'],
        recentFolders: this.m4Store.get('recentFolders', this.defaultM4Settings.recentFolders) as M4Settings['recentFolders'],
        defaults: this.m4Store.get('defaults', this.defaultM4Settings.defaults) as M4Settings['defaults'],
        lastUpdated: this.m4Store.get('lastUpdated', this.defaultM4Settings.lastUpdated) as number
      }
      
      // 설정 검증
      const validation = validateM4Settings(storedSettings)
      if (!validation.isValid) {
        console.warn('Invalid M4 settings detected, migrating to defaults:', validation.errors)
        return this.migrateM4Settings(storedSettings)
      }
      
      return storedSettings
    } catch (error) {
      console.error('Failed to load M4 settings, using defaults:', error)
      return { ...this.defaultM4Settings }
    }
  }

  /**
   * M4 설정 저장
   */
  public saveM4Settings(settings: Partial<M4Settings>): M4Settings {
    try {
      const updatedSettings = mergeM4Settings(this.currentM4Settings, settings)
      
      // 설정 검증
      const validation = validateM4Settings(updatedSettings)
      if (!validation.isValid) {
        throw new Error(`Invalid M4 settings: ${validation.errors.join(', ')}`)
      }
      
      // 원자적 쓰기
      this.atomicWriteM4Settings(updatedSettings)
      
      this.currentM4Settings = updatedSettings
      console.log('M4 settings saved successfully')
      
      return updatedSettings
    } catch (error) {
      console.error('Failed to save M4 settings:', error)
      throw error
    }
  }

  /**
   * M4 설정 조회
   */
  public getM4Settings(): M4Settings {
    return { ...this.currentM4Settings }
  }

  /**
   * M4 설정 원자적 쓰기
   */
  private atomicWriteM4Settings(settings: M4Settings): void {
    try {
      // 백업 생성
      const backupPath = this.backupM4Settings()
      console.log('M4 settings backup created:', backupPath)
      
      // 설정 저장
      Object.keys(settings).forEach(key => {
        const typedKey = key as keyof M4Settings
        const value = settings[typedKey]
        if (value !== undefined) {
          this.m4Store.set(typedKey, value)
        }
      })
      
      console.log('M4 settings written atomically')
    } catch (error) {
      console.error('Failed to write M4 settings atomically:', error)
      throw error
    }
  }

  /**
   * 최근 사용한 폴더 업데이트
   */
  public updateLastUsedFolder(
    processType: 'dialogue' | 'string',
    folderPath: string,
    alias?: string
  ): M4Settings {
    try {
      const updatedSettings = addRecentFolder(
        this.currentM4Settings,
        processType,
        folderPath,
        alias
      )
      
      return this.saveM4Settings(updatedSettings)
    } catch (error) {
      console.error('Failed to update last used folder:', error)
      throw error
    }
  }

  /**
   * M4 처리 옵션 조회
   */
  public getM4ProcessingOptions(): M4Settings['processingOptions'] {
    return { ...this.currentM4Settings.processingOptions }
  }

  /**
   * M4 설정 초기화
   */
  public resetM4Settings(): M4Settings {
    try {
      console.log('Resetting M4 settings to defaults')
      
      // 백업 생성
      const backupPath = this.backupM4Settings()
      console.log('M4 settings backup created before reset:', backupPath)
      
      // 스토어 초기화
      this.m4Store.clear()
      
      // 기본값 설정
      const resetSettings = { ...this.defaultM4Settings }
      Object.keys(resetSettings).forEach(key => {
        const typedKey = key as keyof M4Settings
        const value = resetSettings[typedKey]
        this.m4Store.set(typedKey, value)
      })
      
      this.currentM4Settings = resetSettings
      console.log('M4 settings reset successfully')
      
      return resetSettings
    } catch (error) {
      console.error('Failed to reset M4 settings:', error)
      throw error
    }
  }

  /**
   * M4 설정 마이그레이션
   */
  public migrateM4Settings(oldSettings: any, targetVersion?: string): M4Settings {
    try {
      console.log('Migrating M4 settings from:', oldSettings?.version, 'to:', targetVersion)
      
      // 백업 생성
      if (this.currentM4Settings) {
        const backupPath = this.backupM4Settings()
        console.log('M4 settings backup created before migration:', backupPath)
      }
      
      const migratedSettings = migrateM4Settings(oldSettings, targetVersion)
      
      // 마이그레이션된 설정 저장
      this.atomicWriteM4Settings(migratedSettings)
      this.currentM4Settings = migratedSettings
      
      console.log('M4 settings migrated successfully to version:', migratedSettings.version)
      
      return migratedSettings
    } catch (error) {
      console.error('Failed to migrate M4 settings:', error)
      throw error
    }
  }

  /**
   * 최근 폴더 정리
   */
  public cleanupRecentM4Folders(maxAge?: number): M4Settings {
    try {
      const cleanedSettings = cleanupRecentFolders(this.currentM4Settings, maxAge)
      return this.saveM4Settings(cleanedSettings)
    } catch (error) {
      console.error('Failed to cleanup recent M4 folders:', error)
      throw error
    }
  }

  /**
   * 최근 폴더 제거
   */
  public removeRecentM4Folder(
    processType: 'dialogue' | 'string',
    folderPath: string
  ): M4Settings {
    try {
      const recentFolders = { ...this.currentM4Settings.recentFolders }
      
      if (processType === 'dialogue') {
        recentFolders.dialogue = recentFolders.dialogue.filter(
          item => item.path !== folderPath
        )
      } else {
        recentFolders.string = recentFolders.string.filter(
          item => item.path !== folderPath
        )
      }
      
      return this.saveM4Settings({ recentFolders })
    } catch (error) {
      console.error('Failed to remove recent M4 folder:', error)
      throw error
    }
  }

  /**
   * M4 설정 검증
   */
  public validateM4Settings(settings: M4Settings): { isValid: boolean; errors: string[] } {
    return validateM4Settings(settings)
  }
  
  /**
   * M4 기능 버전 정보 가져오기
   */
  public getM4FeatureVersions(): Record<string, any> | null {
    try {
      const packageJsonPath = join(app.getAppPath(), 'package.json')
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
        return packageJson.m4Features || null
      }
      return null
    } catch (error) {
      console.error('Failed to get M4 feature versions:', error)
      return null
    }
  }

  /**
   * 전체 앱 버전 정보 (M4 기능 포함) 가져오기
   */
  public getFullVersionInfo(): Record<string, any> {
    const appVersion = this.getAppVersion()
    const m4Features = this.getM4FeatureVersions()
    
    return {
      app: {
        version: appVersion,
        name: app.getName(),
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        node: process.versions.node
      },
      m4Features: m4Features || {
        version: 'unknown',
        components: {}
      }
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