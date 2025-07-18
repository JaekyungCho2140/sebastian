import { 
  M4Settings, 
  M4_SETTINGS_DEFAULTS, 
  mergeM4Settings, 
  validateM4Settings, 
  migrateM4Settings 
} from '../shared/types'
import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * M4 설정 관리를 위한 서비스 클래스
 * StateManager의 보조 역할을 하며, 고급 설정 관리 기능을 제공
 */
export class M4SettingsService {
  private readonly settingsPath: string
  private readonly backupPath: string
  private recoveryInProgress = false

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsPath = join(userDataPath, 'm4-settings.json')
    this.backupPath = join(userDataPath, 'backups', 'm4-settings')
  }

  /**
   * 설정 파일 존재 여부 확인
   */
  async settingsFileExists(): Promise<boolean> {
    try {
      await fs.access(this.settingsPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 설정 파일 복구
   */
  async recoverSettings(): Promise<M4Settings> {
    if (this.recoveryInProgress) {
      throw new Error('Recovery already in progress')
    }

    this.recoveryInProgress = true
    
    try {
      console.log('Starting M4 settings recovery...')
      
      // 1. 백업 파일에서 복구 시도
      const backupSettings = await this.tryRestoreFromBackup()
      if (backupSettings) {
        console.log('Successfully recovered from backup')
        return backupSettings
      }

      // 2. 손상된 설정 파일 복구 시도
      const corruptedSettings = await this.tryRepairCorruptedSettings()
      if (corruptedSettings) {
        console.log('Successfully repaired corrupted settings')
        return corruptedSettings
      }

      // 3. 기본 설정으로 초기화
      console.log('Initializing with default settings')
      return this.initializeDefaultSettings()
      
    } catch (error) {
      console.error('Failed to recover M4 settings:', error)
      throw error
    } finally {
      this.recoveryInProgress = false
    }
  }

  /**
   * 백업에서 복구 시도
   */
  private async tryRestoreFromBackup(): Promise<M4Settings | null> {
    try {
      const backupFiles = await this.getBackupFiles()
      
      for (const backupFile of backupFiles) {
        try {
          const backupData = await fs.readFile(backupFile, 'utf8')
          const settings = JSON.parse(backupData)
          
          const validation = validateM4Settings(settings)
          if (validation.isValid) {
            // 복구된 설정을 현재 설정으로 저장
            await this.saveSettingsToFile(settings)
            return settings
          }
        } catch (error) {
          console.warn(`Failed to restore from backup ${backupFile}:`, error)
          continue
        }
      }
      
      return null
    } catch (error) {
      console.warn('Failed to restore from backup:', error)
      return null
    }
  }

  /**
   * 손상된 설정 파일 복구 시도
   */
  private async tryRepairCorruptedSettings(): Promise<M4Settings | null> {
    try {
      const settingsData = await fs.readFile(this.settingsPath, 'utf8')
      
      // JSON 파싱 시도
      let parsedSettings: any
      try {
        parsedSettings = JSON.parse(settingsData)
      } catch (parseError) {
        // JSON 파싱 실패 시 부분 복구 시도
        return this.attemptPartialRecovery(settingsData)
      }

      // 파싱은 성공했지만 유효하지 않은 설정인 경우
      const validation = validateM4Settings(parsedSettings)
      if (!validation.isValid) {
        // 마이그레이션 시도
        const migratedSettings = migrateM4Settings(parsedSettings)
        const migratedValidation = validateM4Settings(migratedSettings)
        
        if (migratedValidation.isValid) {
          await this.saveSettingsToFile(migratedSettings)
          return migratedSettings
        }
      }

      return null
    } catch (error) {
      console.warn('Failed to repair corrupted settings:', error)
      return null
    }
  }

  /**
   * 부분 복구 시도 (JSON 파싱 실패 시)
   */
  private async attemptPartialRecovery(corruptedData: string): Promise<M4Settings | null> {
    try {
      // 간단한 JSON 수정 시도
      let repairedData = corruptedData
      
      // 흔한 JSON 오류 수정
      repairedData = repairedData.replace(/,\s*}/g, '}') // 마지막 콤마 제거
      repairedData = repairedData.replace(/,\s*]/g, ']') // 배열 마지막 콤마 제거
      
      const parsedSettings = JSON.parse(repairedData)
      const validation = validateM4Settings(parsedSettings)
      
      if (validation.isValid) {
        await this.saveSettingsToFile(parsedSettings)
        return parsedSettings
      }

      return null
    } catch (error) {
      console.warn('Failed to partially recover settings:', error)
      return null
    }
  }

  /**
   * 기본 설정 초기화
   */
  private async initializeDefaultSettings(): Promise<M4Settings> {
    const defaultSettings = { ...M4_SETTINGS_DEFAULTS }
    await this.saveSettingsToFile(defaultSettings)
    return defaultSettings
  }

  /**
   * 설정을 파일에 저장
   */
  private async saveSettingsToFile(settings: M4Settings): Promise<void> {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2))
    } catch (error) {
      console.error('Failed to save settings to file:', error)
      throw error
    }
  }

  /**
   * 백업 파일 목록 조회 (최신 순)
   */
  private async getBackupFiles(): Promise<string[]> {
    try {
      const backupFiles = await fs.readdir(this.backupPath)
      
      // 백업 파일만 필터링하고 시간순으로 정렬
      const m4BackupFiles = backupFiles
        .filter(file => file.startsWith('m4-settings-backup-') && file.endsWith('.json'))
        .map(file => ({
          path: join(this.backupPath, file),
          name: file
        }))
        .sort((a, b) => {
          // 파일명에서 타임스탬프 추출하여 정렬
          const timestampA = a.name.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
          const timestampB = b.name.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
          
          if (timestampA && timestampB) {
            return timestampB[0].localeCompare(timestampA[0])
          }
          
          return b.name.localeCompare(a.name)
        })

      return m4BackupFiles.map(file => file.path)
    } catch (error) {
      console.warn('Failed to get backup files:', error)
      return []
    }
  }

  /**
   * 백업 디렉토리 생성
   */
  async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupPath, { recursive: true })
    } catch (error) {
      console.warn('Failed to create backup directory:', error)
    }
  }

  /**
   * 오래된 백업 파일 정리
   */
  async cleanupOldBackups(maxAge: number = 30): Promise<void> {
    try {
      const backupFiles = await this.getBackupFiles()
      const now = Date.now()
      const maxAgeMs = maxAge * 24 * 60 * 60 * 1000

      for (const backupFile of backupFiles) {
        try {
          const stats = await fs.stat(backupFile)
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(backupFile)
            console.log(`Removed old backup: ${backupFile}`)
          }
        } catch (error) {
          console.warn(`Failed to check/remove backup file ${backupFile}:`, error)
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error)
    }
  }

  /**
   * 설정 건강성 검사
   */
  async performHealthCheck(): Promise<{
    isHealthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // 1. 설정 파일 존재 확인
      if (!await this.settingsFileExists()) {
        issues.push('Settings file does not exist')
        recommendations.push('Initialize settings with default values')
      }

      // 2. 백업 디렉토리 확인
      try {
        await fs.access(this.backupPath)
      } catch {
        issues.push('Backup directory does not exist')
        recommendations.push('Create backup directory')
      }

      // 3. 백업 파일 개수 확인
      const backupFiles = await this.getBackupFiles()
      if (backupFiles.length === 0) {
        issues.push('No backup files found')
        recommendations.push('Create initial backup')
      } else if (backupFiles.length > 50) {
        issues.push('Too many backup files')
        recommendations.push('Cleanup old backup files')
      }

      // 4. 설정 파일 유효성 확인
      if (await this.settingsFileExists()) {
        try {
          const settingsData = await fs.readFile(this.settingsPath, 'utf8')
          const settings = JSON.parse(settingsData)
          const validation = validateM4Settings(settings)
          
          if (!validation.isValid) {
            issues.push(`Invalid settings: ${validation.errors.join(', ')}`)
            recommendations.push('Migrate or repair settings')
          }
        } catch (error) {
          issues.push('Settings file is corrupted')
          recommendations.push('Restore from backup or reset to defaults')
        }
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        recommendations
      }
    } catch (error) {
      console.error('Failed to perform health check:', error)
      return {
        isHealthy: false,
        issues: ['Failed to perform health check'],
        recommendations: ['Check system permissions and disk space']
      }
    }
  }

  /**
   * 복구 통계 조회
   */
  async getRecoveryStats(): Promise<{
    totalBackups: number
    lastBackupDate: Date | null
    settingsVersion: string | null
    lastRecoveryDate: Date | null
  }> {
    try {
      const backupFiles = await this.getBackupFiles()
      let lastBackupDate: Date | null = null
      let settingsVersion: string | null = null
      let lastRecoveryDate: Date | null = null

      // 최신 백업 파일 정보 조회
      if (backupFiles.length > 0) {
        try {
          const latestBackup = backupFiles[0]
          const stats = await fs.stat(latestBackup)
          lastBackupDate = stats.mtime
          
          const backupData = await fs.readFile(latestBackup, 'utf8')
          const settings = JSON.parse(backupData)
          settingsVersion = settings.version
        } catch (error) {
          console.warn('Failed to get latest backup info:', error)
        }
      }

      // 복구 로그 확인 (향후 구현)
      // lastRecoveryDate = await this.getLastRecoveryDate()

      return {
        totalBackups: backupFiles.length,
        lastBackupDate,
        settingsVersion,
        lastRecoveryDate
      }
    } catch (error) {
      console.error('Failed to get recovery stats:', error)
      return {
        totalBackups: 0,
        lastBackupDate: null,
        settingsVersion: null,
        lastRecoveryDate: null
      }
    }
  }
}