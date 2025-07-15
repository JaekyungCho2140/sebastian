import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { existsSync, statSync } from 'fs'
import { UpdateProgress } from '../../shared/types'
import { shell } from 'electron'

export interface InstallOptions {
  msiPath: string
  silentInstall?: boolean
  elevatePermissions?: boolean
  installPath?: string
  timeout?: number
  createDesktopShortcut?: boolean
  createStartMenuShortcut?: boolean
}

export interface InstallResult {
  success: boolean
  exitCode?: number
  error?: string
  installPath?: string
  duration?: number
}

export class UpdateInstaller extends EventEmitter {
  private activeInstallation?: ChildProcess
  private installStartTime?: number

  constructor() {
    super()
  }

  public async installUpdate(options: InstallOptions): Promise<InstallResult> {
    const {
      msiPath,
      silentInstall = true,
      elevatePermissions = true,
      installPath,
      timeout = 10 * 60 * 1000, // 10 minutes
      createDesktopShortcut = true,
      createStartMenuShortcut = true
    } = options

    // Validate MSI file exists
    if (!existsSync(msiPath)) {
      return { success: false, error: 'MSI file not found' }
    }

    // Validate MSI file size
    try {
      const stat = statSync(msiPath)
      if (stat.size === 0) {
        return { success: false, error: 'MSI file is empty' }
      }
    } catch (error) {
      return { success: false, error: 'Failed to verify MSI file' }
    }

    this.installStartTime = Date.now()
    
    try {
      this.emitProgress('installing', 0, 'Preparing installation...')
      
      const result = await this.runMsiInstaller(msiPath, {
        silentInstall,
        elevatePermissions,
        installPath,
        timeout,
        createDesktopShortcut,
        createStartMenuShortcut
      })

      const duration = Date.now() - this.installStartTime

      if (result.success) {
        this.emitProgress('complete', 100, 'Installation completed successfully!')
        return { ...result, duration }
      } else {
        this.emitProgress('installing', 0, `Installation failed: ${result.error}`)
        return { ...result, duration }
      }
    } catch (error) {
      const duration = Date.now() - this.installStartTime
      const errorMessage = error instanceof Error ? error.message : 'Installation failed'
      this.emitProgress('installing', 0, `Installation error: ${errorMessage}`)
      return { success: false, error: errorMessage, duration }
    }
  }

  private async runMsiInstaller(msiPath: string, options: {
    silentInstall: boolean
    elevatePermissions: boolean
    installPath?: string
    timeout: number
    createDesktopShortcut: boolean
    createStartMenuShortcut: boolean
  }): Promise<InstallResult> {
    return new Promise((resolve, reject) => {
      const args = this.buildMsiArguments(msiPath, options)
      
      // Use msiexec for MSI installation
      const command = 'msiexec'
      
      console.log(`Running MSI installer: ${command} ${args.join(' ')}`)
      
      this.activeInstallation = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        windowsHide: true
      })

      let stdout = ''
      let stderr = ''

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (this.activeInstallation) {
          this.activeInstallation.kill('SIGTERM')
          reject(new Error('Installation timeout'))
        }
      }, options.timeout)

      this.activeInstallation.stdout?.on('data', (data) => {
        stdout += data.toString()
        this.parseInstallationProgress(data.toString())
      })

      this.activeInstallation.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.warn('MSI installer stderr:', data.toString())
      })

      this.activeInstallation.on('error', (error) => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to start installer: ${error.message}`))
      })

      this.activeInstallation.on('exit', (code, signal) => {
        clearTimeout(timeoutId)
        this.activeInstallation = undefined

        if (signal) {
          reject(new Error(`Installation was terminated by signal: ${signal}`))
          return
        }

        // MSI exit codes:
        // 0 = Success
        // 1602 = User cancelled
        // 1603 = Fatal error during installation
        // 1618 = Another installation is already in progress
        // 1619 = Invalid package
        // 1633 = Platform not supported
        // 3010 = Restart required
        
        const exitCode = code || 0
        
        if (exitCode === 0 || exitCode === 3010) {
          resolve({
            success: true,
            exitCode,
            installPath: options.installPath
          })
        } else {
          const errorMessage = this.getMsiErrorMessage(exitCode)
          resolve({
            success: false,
            exitCode,
            error: `Installation failed with exit code ${exitCode}: ${errorMessage}`
          })
        }
      })

      // Start with initial progress
      this.emitProgress('installing', 10, 'Starting installation...')
    })
  }

  private buildMsiArguments(msiPath: string, options: {
    silentInstall: boolean
    elevatePermissions: boolean
    installPath?: string
    createDesktopShortcut: boolean
    createStartMenuShortcut: boolean
  }): string[] {
    const args: string[] = []

    // Install command
    args.push('/i')
    args.push(`"${msiPath}"`)

    // Silent installation
    if (options.silentInstall) {
      args.push('/quiet')
      args.push('/norestart')
    }

    // Installation path
    if (options.installPath) {
      args.push(`INSTALLDIR="${options.installPath}"`)
    }

    // Desktop shortcut
    if (options.createDesktopShortcut) {
      args.push('DESKTOP_SHORTCUT=1')
    } else {
      args.push('DESKTOP_SHORTCUT=0')
    }

    // Start menu shortcut
    if (options.createStartMenuShortcut) {
      args.push('START_MENU_SHORTCUT=1')
    } else {
      args.push('START_MENU_SHORTCUT=0')
    }

    // Logging (for debugging)
    args.push('/l*v')
    args.push(`"${process.env.TEMP}\\sebastian-install.log"`)

    return args
  }

  private parseInstallationProgress(output: string): void {
    // MSI doesn't provide detailed progress information in silent mode
    // We'll simulate progress based on time elapsed
    if (this.installStartTime) {
      const elapsed = Date.now() - this.installStartTime
      const estimatedDuration = 60000 // 1 minute estimated
      const progress = Math.min((elapsed / estimatedDuration) * 90, 90) // Max 90% until complete
      
      this.emitProgress('installing', progress, 'Installing Sebastian...')
    }
  }

  private getMsiErrorMessage(exitCode: number): string {
    switch (exitCode) {
      case 1602:
        return 'User cancelled the installation'
      case 1603:
        return 'Fatal error during installation'
      case 1618:
        return 'Another installation is already in progress'
      case 1619:
        return 'Invalid installation package'
      case 1633:
        return 'This installation package is not supported on this platform'
      case 1638:
        return 'Another version of this product is already installed'
      case 1639:
        return 'Invalid command line argument'
      case 1641:
        return 'Installation completed successfully but restart is required'
      default:
        return 'Unknown installation error'
    }
  }

  private emitProgress(stage: 'installing' | 'complete', progress: number, message: string): void {
    const progressData: UpdateProgress = {
      stage,
      progress: Math.min(Math.max(progress, 0), 100),
      message
    }

    this.emit('progress', progressData)
  }

  public cancelInstallation(): void {
    if (this.activeInstallation) {
      this.activeInstallation.kill('SIGTERM')
      this.activeInstallation = undefined
      this.emit('installationCancelled')
    }
  }

  public isInstalling(): boolean {
    return this.activeInstallation !== undefined
  }

  public async openInstallationLog(): Promise<void> {
    const logPath = `${process.env.TEMP}\\sebastian-install.log`
    if (existsSync(logPath)) {
      await shell.openPath(logPath)
    }
  }

  public cleanup(): void {
    if (this.activeInstallation) {
      this.activeInstallation.kill('SIGTERM')
      this.activeInstallation = undefined
    }
    this.removeAllListeners()
  }
}

export default UpdateInstaller