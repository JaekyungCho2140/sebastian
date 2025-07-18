const { describe, it, beforeEach, afterEach, expect } = require('@jest/globals')
const { app } = require('electron')
const { join } = require('path')
const { promises: fs } = require('fs')
const { tmpdir } = require('os')

// Mock electron-store
const mockStore = {
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  path: '/mock/path/m4-settings.json'
}

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => mockStore)
})

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      if (name === 'userData') return join(tmpdir(), 'sebastian-test')
      return join(tmpdir(), 'sebastian-test', name)
    })
  }
}))

describe('M4 Settings Integration Tests', () => {
  let StateManager
  let stateManager
  let testDataPath

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Set up test data path
    testDataPath = join(tmpdir(), 'sebastian-test-' + Date.now())
    await fs.mkdir(testDataPath, { recursive: true })
    
    // Mock app.getPath to return our test directory
    app.getPath.mockReturnValue(testDataPath)
    
    // Import StateManager after mocking
    const { StateManager: SM } = require('../src/main/state-manager')
    StateManager = SM
    
    // Reset mock store
    mockStore.get.mockImplementation((key, defaultValue) => defaultValue)
    mockStore.set.mockImplementation(() => {})
    mockStore.clear.mockImplementation(() => {})
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to clean up test data:', error)
    }
  })

  describe('StateManager M4 Settings', () => {
    it('should initialize with default M4 settings', () => {
      stateManager = new StateManager()
      
      const settings = stateManager.getM4Settings()
      
      expect(settings).toBeDefined()
      expect(settings.version).toBe('1.0.0')
      expect(settings.folderPaths).toBeDefined()
      expect(settings.outputSettings).toBeDefined()
      expect(settings.processingOptions).toBeDefined()
      expect(settings.recentFolders).toBeDefined()
      expect(settings.defaults).toBeDefined()
      expect(typeof settings.lastUpdated).toBe('number')
    })

    it('should save and retrieve M4 settings', () => {
      stateManager = new StateManager()
      
      const newSettings = {
        folderPaths: {
          dialogue: {
            inputFolder: '/test/dialogue/input',
            outputFolder: '/test/dialogue/output'
          },
          string: {
            inputFolder: '/test/string/input',
            outputFolder: '/test/string/output'
          },
          commonOutputDirectory: '/test/common/output'
        }
      }
      
      const savedSettings = stateManager.saveM4Settings(newSettings)
      
      expect(savedSettings.folderPaths.dialogue.inputFolder).toBe('/test/dialogue/input')
      expect(savedSettings.folderPaths.string.inputFolder).toBe('/test/string/input')
      expect(savedSettings.folderPaths.commonOutputDirectory).toBe('/test/common/output')
      
      const retrievedSettings = stateManager.getM4Settings()
      expect(retrievedSettings.folderPaths.dialogue.inputFolder).toBe('/test/dialogue/input')
    })

    it('should update recent folders correctly', () => {
      stateManager = new StateManager()
      
      const folderPath = '/test/recent/folder'
      const alias = 'Test Folder'
      
      const updatedSettings = stateManager.updateLastUsedFolder('dialogue', folderPath, alias)
      
      expect(updatedSettings.recentFolders.dialogue).toHaveLength(1)
      expect(updatedSettings.recentFolders.dialogue[0].path).toBe(folderPath)
      expect(updatedSettings.recentFolders.dialogue[0].alias).toBe(alias)
      expect(updatedSettings.recentFolders.dialogue[0].usageCount).toBe(1)
    })

    it('should remove recent folders correctly', () => {
      stateManager = new StateManager()
      
      const folderPath = '/test/recent/folder'
      
      // Add folder first
      stateManager.updateLastUsedFolder('dialogue', folderPath)
      
      // Remove folder
      const updatedSettings = stateManager.removeRecentM4Folder('dialogue', folderPath)
      
      expect(updatedSettings.recentFolders.dialogue).toHaveLength(0)
    })

    it('should reset M4 settings to defaults', () => {
      stateManager = new StateManager()
      
      // Modify settings first
      stateManager.saveM4Settings({
        folderPaths: {
          dialogue: {
            inputFolder: '/modified/path',
            outputFolder: '/modified/output'
          }
        }
      })
      
      // Reset settings
      const resetSettings = stateManager.resetM4Settings()
      
      expect(resetSettings.folderPaths.dialogue.inputFolder).toBe('')
      expect(resetSettings.folderPaths.dialogue.outputFolder).toBe('')
      expect(mockStore.clear).toHaveBeenCalled()
    })

    it('should validate M4 settings correctly', () => {
      stateManager = new StateManager()
      
      const validSettings = stateManager.getM4Settings()
      const validation = stateManager.validateM4Settings(validSettings)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should handle invalid M4 settings', () => {
      stateManager = new StateManager()
      
      const invalidSettings = {
        version: '1.0.0',
        // Missing required fields
      }
      
      const validation = stateManager.validateM4Settings(invalidSettings)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should migrate M4 settings correctly', () => {
      stateManager = new StateManager()
      
      const oldSettings = {
        version: '0.9.0',
        folderPaths: {
          dialogue: {
            inputFolder: '/old/path',
            outputFolder: '/old/output'
          }
        }
      }
      
      const migratedSettings = stateManager.migrateM4Settings(oldSettings)
      
      expect(migratedSettings.version).toBe('1.0.0')
      expect(migratedSettings.folderPaths).toBeDefined()
      expect(migratedSettings.outputSettings).toBeDefined()
      expect(migratedSettings.processingOptions).toBeDefined()
    })

    it('should cleanup old recent folders', () => {
      stateManager = new StateManager()
      
      const now = Date.now()
      const oldTime = now - (31 * 24 * 60 * 60 * 1000) // 31 days ago
      
      // Mock settings with old folder
      const settingsWithOldFolder = {
        recentFolders: {
          dialogue: [{
            path: '/old/folder',
            lastUsed: oldTime,
            usageCount: 1,
            isFavorite: false,
            validationStatus: 'unknown'
          }],
          string: [],
          maxItems: 10,
          autoCleanup: true
        }
      }
      
      stateManager.saveM4Settings(settingsWithOldFolder)
      
      const cleanedSettings = stateManager.cleanupRecentM4Folders()
      
      expect(cleanedSettings.recentFolders.dialogue).toHaveLength(0)
    })

    it('should preserve favorite folders during cleanup', () => {
      stateManager = new StateManager()
      
      const now = Date.now()
      const oldTime = now - (31 * 24 * 60 * 60 * 1000) // 31 days ago
      
      // Mock settings with old favorite folder
      const settingsWithFavoriteFolder = {
        recentFolders: {
          dialogue: [{
            path: '/favorite/folder',
            lastUsed: oldTime,
            usageCount: 1,
            isFavorite: true,
            validationStatus: 'unknown'
          }],
          string: [],
          maxItems: 10,
          autoCleanup: true
        }
      }
      
      stateManager.saveM4Settings(settingsWithFavoriteFolder)
      
      const cleanedSettings = stateManager.cleanupRecentM4Folders()
      
      expect(cleanedSettings.recentFolders.dialogue).toHaveLength(1)
      expect(cleanedSettings.recentFolders.dialogue[0].isFavorite).toBe(true)
    })
  })

  describe('M4 Settings Error Handling', () => {
    it('should handle store errors gracefully', () => {
      mockStore.set.mockImplementation(() => {
        throw new Error('Store error')
      })
      
      stateManager = new StateManager()
      
      expect(() => {
        stateManager.saveM4Settings({ version: '1.0.0' })
      }).toThrow('Store error')
    })

    it('should handle validation errors', () => {
      stateManager = new StateManager()
      
      const invalidSettings = {
        version: 'invalid-version',
        folderPaths: null
      }
      
      expect(() => {
        stateManager.saveM4Settings(invalidSettings)
      }).toThrow()
    })

    it('should provide default settings when load fails', () => {
      mockStore.get.mockImplementation(() => {
        throw new Error('Load error')
      })
      
      stateManager = new StateManager()
      
      const settings = stateManager.getM4Settings()
      
      expect(settings.version).toBe('1.0.0')
      expect(settings.folderPaths).toBeDefined()
    })
  })

  describe('M4 Settings Backup and Recovery', () => {
    it('should create backup when saving settings', () => {
      stateManager = new StateManager()
      
      const backupPath = stateManager.backupM4Settings()
      
      expect(backupPath).toContain('m4-settings-backup-')
      expect(backupPath).toContain('.json')
    })

    it('should handle backup errors', () => {
      stateManager = new StateManager()
      
      // Mock fs.writeFileSync to throw error
      const originalWriteFileSync = require('fs').writeFileSync
      require('fs').writeFileSync = jest.fn(() => {
        throw new Error('Backup error')
      })
      
      expect(() => {
        stateManager.backupM4Settings()
      }).toThrow('Backup error')
      
      // Restore original function
      require('fs').writeFileSync = originalWriteFileSync
    })
  })
})

describe('M4 Settings Service Integration Tests', () => {
  let M4SettingsService
  let settingsService
  let testDataPath

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Set up test data path
    testDataPath = join(tmpdir(), 'sebastian-test-' + Date.now())
    await fs.mkdir(testDataPath, { recursive: true })
    
    // Mock app.getPath to return our test directory
    app.getPath.mockReturnValue(testDataPath)
    
    // Import M4SettingsService after mocking
    const { M4SettingsService: MSS } = require('../src/services/m4SettingsService')
    M4SettingsService = MSS
    
    settingsService = new M4SettingsService()
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to clean up test data:', error)
    }
  })

  describe('M4 Settings Recovery', () => {
    it('should detect when settings file does not exist', async () => {
      const exists = await settingsService.settingsFileExists()
      expect(exists).toBe(false)
    })

    it('should recover settings when file is missing', async () => {
      const recoveredSettings = await settingsService.recoverSettings()
      
      expect(recoveredSettings).toBeDefined()
      expect(recoveredSettings.version).toBe('1.0.0')
      expect(recoveredSettings.folderPaths).toBeDefined()
    })

    it('should perform health check correctly', async () => {
      const healthCheck = await settingsService.performHealthCheck()
      
      expect(healthCheck).toBeDefined()
      expect(typeof healthCheck.isHealthy).toBe('boolean')
      expect(Array.isArray(healthCheck.issues)).toBe(true)
      expect(Array.isArray(healthCheck.recommendations)).toBe(true)
    })

    it('should get recovery stats', async () => {
      const stats = await settingsService.getRecoveryStats()
      
      expect(stats).toBeDefined()
      expect(typeof stats.totalBackups).toBe('number')
      expect(stats.lastBackupDate === null || stats.lastBackupDate instanceof Date).toBe(true)
    })

    it('should ensure backup directory exists', async () => {
      await settingsService.ensureBackupDirectory()
      
      // Check if backup directory was created
      const backupPath = join(testDataPath, 'backups', 'm4-settings')
      const exists = await fs.access(backupPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })
  })

  describe('M4 Settings Backup Management', () => {
    it('should cleanup old backups', async () => {
      await settingsService.ensureBackupDirectory()
      
      // Create some mock backup files
      const backupPath = join(testDataPath, 'backups', 'm4-settings')
      const oldBackupFile = join(backupPath, 'm4-settings-backup-2023-01-01T00-00-00.json')
      
      await fs.writeFile(oldBackupFile, JSON.stringify({ version: '1.0.0' }))
      
      // Set the file's modification time to be old
      const oldTime = new Date(Date.now() - (31 * 24 * 60 * 60 * 1000))
      await fs.utimes(oldBackupFile, oldTime, oldTime)
      
      await settingsService.cleanupOldBackups(30)
      
      // Check if old backup was removed
      const exists = await fs.access(oldBackupFile).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    })
  })
})