const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class UpdateSimulator {
  constructor() {
    this.projectRoot = path.join(__dirname, '..')
    this.packageJsonPath = path.join(this.projectRoot, 'package.json')
  }

  // 현재 버전 가져오기
  getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'))
    return packageJson.version
  }

  // 버전 증가 (patch 버전만)
  incrementVersion(version) {
    const parts = version.split('.')
    parts[2] = String(parseInt(parts[2]) + 1)
    return parts.join('.')
  }

  // 새 버전으로 package.json 업데이트
  updatePackageVersion(newVersion) {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'))
    const oldVersion = packageJson.version
    packageJson.version = newVersion
    
    // 백업 생성
    fs.writeFileSync(
      `${this.packageJsonPath}.backup`, 
      JSON.stringify({ version: oldVersion }, null, 2)
    )
    
    // 새 버전 저장
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2))
    
    console.log(`✓ Version updated: ${oldVersion} → ${newVersion}`)
    return { oldVersion, newVersion }
  }

  // 버전 복원
  restoreVersion() {
    const backupPath = `${this.packageJsonPath}.backup`
    if (fs.existsSync(backupPath)) {
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'))
      packageJson.version = backup.version
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2))
      fs.unlinkSync(backupPath)
      console.log(`✓ Version restored to: ${backup.version}`)
    }
  }

  // GitHub 릴리스 생성을 위한 정보 출력
  generateReleaseInfo(version) {
    const releaseInfo = {
      tagName: `v${version}`,
      releaseName: `Sebastian v${version}`,
      releaseBody: `## 🚀 Sebastian v${version} - Auto Update Test Release

### 📋 Changes
- Test release for NSIS auto-update functionality
- No functional changes from previous version

### 🧪 Testing
This release is created specifically to test the auto-update mechanism.

### 📦 Assets
- \`Sebastian-${version}-Setup.exe\` - Windows NSIS installer

---
**Note**: This is a test release for validating the auto-update system.`,
      fileName: `Sebastian-${version}-Setup.exe`
    }

    // 릴리스 정보를 파일로 저장
    const releaseInfoPath = path.join(this.projectRoot, 'test-outputs', 'release-info.json')
    fs.mkdirSync(path.dirname(releaseInfoPath), { recursive: true })
    fs.writeFileSync(releaseInfoPath, JSON.stringify(releaseInfo, null, 2))

    console.log('\n📋 Release Information:')
    console.log('========================')
    console.log(`Tag: ${releaseInfo.tagName}`)
    console.log(`Title: ${releaseInfo.releaseName}`)
    console.log(`Installer: ${releaseInfo.fileName}`)
    console.log(`\nRelease info saved to: ${releaseInfoPath}`)
    
    return releaseInfo
  }

  // 빌드 명령 생성
  generateBuildCommands(version) {
    const commands = [
      'npm run build',
      'npm run dist:win-nsis'
    ]

    console.log('\n🔨 Build Commands:')
    console.log('==================')
    commands.forEach(cmd => console.log(`$ ${cmd}`))
    
    return commands
  }

  // 업데이트 시뮬레이션 준비
  prepareUpdateSimulation() {
    console.log('🚀 Update Simulation Preparation')
    console.log('================================\n')

    const currentVersion = this.getCurrentVersion()
    const newVersion = this.incrementVersion(currentVersion)

    console.log(`Current version: ${currentVersion}`)
    console.log(`New version: ${newVersion}`)
    console.log('')

    // 사용자 확인
    console.log('⚠️  This will:')
    console.log(`1. Update package.json version to ${newVersion}`)
    console.log('2. Generate release information')
    console.log('3. Provide build commands')
    console.log('')
    console.log('After testing, run with --restore to revert version')
    console.log('')

    return { currentVersion, newVersion }
  }

  // 메인 실행
  run(args) {
    if (args.includes('--restore')) {
      this.restoreVersion()
      return
    }

    const { currentVersion, newVersion } = this.prepareUpdateSimulation()
    
    if (args.includes('--execute')) {
      // 실제로 버전 업데이트
      this.updatePackageVersion(newVersion)
      this.generateReleaseInfo(newVersion)
      this.generateBuildCommands(newVersion)
      
      console.log('\n✅ Update simulation prepared!')
      console.log('\nNext steps:')
      console.log('1. Run the build commands above')
      console.log('2. Create a GitHub release with the generated info')
      console.log('3. Upload the installer from release/ directory')
      console.log('4. Test auto-update in the installed v' + currentVersion)
      console.log('5. Run "node tests/simulate-update.js --restore" when done')
    } else {
      console.log('To proceed, run:')
      console.log('$ node tests/simulate-update.js --execute')
    }
  }
}

// 실행
if (require.main === module) {
  const simulator = new UpdateSimulator()
  simulator.run(process.argv.slice(2))
}

module.exports = UpdateSimulator