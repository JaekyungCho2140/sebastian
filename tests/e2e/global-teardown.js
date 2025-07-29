/**
 * Playwright 전역 정리 스크립트
 * 
 * 모든 테스트 실행 후 정리 작업 수행
 */

const path = require('path');
const fs = require('fs').promises;

async function globalTeardown() {
  console.log('\n🧹 테스트 정리 작업 시작...');
  
  // 테스트 폴더 정리
  const testDataPath = path.join(__dirname, '../../test-data');
  try {
    await fs.rm(testDataPath, { recursive: true, force: true });
    console.log('✅ 테스트 데이터 폴더 정리 완료');
  } catch (err) {
    // 폴더가 없어도 에러 무시
  }

  // 테스트 로그 정리
  const testLogsPath = path.join(process.env.APPDATA || '', 'Sebastian', 'logs', 'test-*.log');
  try {
    const logsDir = path.dirname(testLogsPath);
    const files = await fs.readdir(logsDir);
    for (const file of files) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join(logsDir, file));
      }
    }
    console.log('✅ 테스트 로그 정리 완료');
  } catch (err) {
    // 로그가 없어도 에러 무시
  }

  console.log('🎉 테스트 정리 완료\n');
}

module.exports = globalTeardown;