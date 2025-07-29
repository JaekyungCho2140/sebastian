/**
 * Electron 앱 테스트를 위한 헬퍼 함수들
 * 
 * Playwright로 Electron 앱을 테스트하기 위한 유틸리티 함수 제공
 */

const { _electron: electron } = require('playwright');
const path = require('path');

/**
 * Electron 앱을 시작하고 페이지 객체를 반환
 * 
 * @returns {Promise<{app: ElectronApplication, page: Page}>}
 */
async function launchElectronApp() {
  const app = await electron.launch({
    args: [path.join(__dirname, '../../main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  // 첫 번째 윈도우가 열릴 때까지 대기
  const page = await app.firstWindow();
  
  // 콘솔 로그 캡처
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // 페이지 에러 캡처
  page.on('pageerror', err => {
    console.error(`[Page Error]`, err);
  });

  // IPC 통신 모킹을 위한 헬퍼 함수 주입
  await page.evaluate(() => {
    // 원래 invoke 함수 저장
    if (window.api && window.api.invoke) {
      window.__originalInvoke = window.api.invoke;
      
      // invoke 함수 오버라이드
      window.api.invoke = async (channel, ...args) => {
        if (channel === 'select-folder' && window.__testFolderPath) {
          console.log(`[Test] Mocking folder selection: ${window.__testFolderPath}`);
          return window.__testFolderPath;
        }
        return window.__originalInvoke(channel, ...args);
      };
    }
  });

  return { app, page };
}

/**
 * 테스트 파일 생성을 위한 헬퍼
 * 
 * @param {string} folderPath - 테스트 폴더 경로
 * @param {Array<string>} files - 생성할 파일 목록
 */
async function createTestFiles(folderPath, files) {
  const fs = require('fs').promises;
  const XLSX = require('xlsx');

  // 폴더 생성
  await fs.mkdir(folderPath, { recursive: true });

  for (const fileName of files) {
    // 간단한 Excel 파일 생성
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Key', 'EN', 'KO', 'JP', 'TW', 'CN', 'TH', 'ID', 'VI'],
      ['test_key_1', 'Test 1', '테스트 1', 'テスト1', '測試1', '测试1', 'ทดสอบ1', 'Tes 1', 'Kiểm tra 1'],
      ['test_key_2', 'Test 2', '테스트 2', 'テスト2', '測試2', '测试2', 'ทดสอบ2', 'Tes 2', 'Kiểm tra 2']
    ]);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    await XLSX.writeFile(wb, path.join(folderPath, fileName));
  }
}

/**
 * 테스트 후 생성된 파일 정리
 * 
 * @param {string} folderPath - 정리할 폴더 경로
 */
async function cleanupTestFiles(folderPath) {
  const fs = require('fs').promises;
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Failed to cleanup ${folderPath}:`, err.message);
  }
}

/**
 * 모달이 나타날 때까지 대기
 * 
 * @param {Page} page - Playwright 페이지 객체
 * @param {number} timeout - 타임아웃 (ms)
 */
async function waitForModal(page, timeout = 10000) {
  await page.waitForSelector('#progressModal', { 
    state: 'visible',
    timeout 
  });
}

/**
 * 모달이 사라질 때까지 대기
 * 
 * @param {Page} page - Playwright 페이지 객체
 * @param {number} timeout - 타임아웃 (ms)
 */
async function waitForModalToClose(page, timeout = 120000) {
  await page.waitForSelector('#progressModal', { 
    state: 'hidden',
    timeout 
  });
}

module.exports = {
  launchElectronApp,
  createTestFiles,
  cleanupTestFiles,
  waitForModal,
  waitForModalToClose
};