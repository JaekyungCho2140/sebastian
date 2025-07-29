/**
 * M4 Dialogue 병합 기능 E2E 테스트
 * 
 * M4 Dialogue 기능의 전체 워크플로우를 테스트
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs').promises;
const { 
  launchElectronApp, 
  createTestFiles, 
  cleanupTestFiles,
  waitForModal,
  waitForModalToClose 
} = require('./electron-helpers');

test.describe('M4 Dialogue 병합 기능', () => {
  let app;
  let page;
  const testDataPath = path.join(__dirname, '../../test-data/m4-dialogue');
  
  test.beforeAll(async () => {
    // 테스트 파일 생성
    await createTestFiles(testDataPath, [
      'CINEMATIC_DIALOGUE.xlsm',
      'SMALLTALK_DIALOGUE.xlsm',
      'NPC.xlsm'
    ]);
  });

  test.beforeEach(async () => {
    // Electron 앱 시작
    const result = await launchElectronApp();
    app = result.app;
    page = result.page;
  });

  test.afterEach(async () => {
    // 앱 종료
    if (app) {
      await app.close();
    }
  });

  test.afterAll(async () => {
    // 테스트 데이터 정리
    await cleanupTestFiles(testDataPath);
  });

  test('M4 Dialogue 버튼이 표시되고 클릭 가능해야 함', async () => {
    // M4 Dialogue 버튼 찾기
    const button = await page.locator('button:has-text("M4 Dialogue")');
    
    // 버튼이 표시되는지 확인
    await expect(button).toBeVisible();
    
    // 버튼이 활성화되어 있는지 확인
    await expect(button).toBeEnabled();
    
    // 버튼 클래스 확인
    await expect(button).toHaveClass(/feature-btn/);
  });

  test('폴더 선택 후 파일을 성공적으로 병합해야 함', async () => {
    // M4 Dialogue 버튼 클릭
    await page.click('button:has-text("M4 Dialogue")');
    
    // 테스트 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달이 나타나는지 확인
    await waitForModal(page);
    
    // 진행률 모달의 제목 확인
    const modalTitle = await page.locator('#progressModal h2').textContent();
    expect(modalTitle).toBe('M4 Dialogue 병합 중...');
    
    // 모달이 사라질 때까지 대기 (병합 완료)
    await waitForModalToClose(page);
    
    // 성공 메시지 확인
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('병합이 완료되었습니다');
    await dialog.accept();
    
    // 출력 파일 확인
    const files = await fs.readdir(testDataPath);
    const outputFile = files.find(f => f.includes('M4_DialogueALL.xlsx'));
    expect(outputFile).toBeTruthy();
  });

  test('필수 파일이 없을 때 에러를 표시해야 함', async () => {
    // 불완전한 파일 세트로 테스트 폴더 재생성
    const incompletePath = path.join(__dirname, '../../test-data/m4-dialogue-incomplete');
    await createTestFiles(incompletePath, [
      'CINEMATIC_DIALOGUE.xlsm',
      'NPC.xlsm'
      // SMALLTALK_DIALOGUE.xlsm 누락
    ]);

    // M4 Dialogue 버튼 클릭
    await page.click('button:has-text("M4 Dialogue")');
    
    // 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, incompletePath);
    
    // 에러 다이얼로그 확인
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('필수 파일이 없습니다');
    await dialog.accept();
    
    // 정리
    await cleanupTestFiles(incompletePath);
  });

  test('취소 버튼이 작동해야 함', async () => {
    // M4 Dialogue 버튼 클릭
    await page.click('button:has-text("M4 Dialogue")');
    
    // 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달이 나타날 때까지 대기
    await waitForModal(page);
    
    // 취소 버튼 클릭
    await page.click('#cancelButton');
    
    // 모달이 사라지는지 확인
    await page.waitForSelector('#progressModal', { state: 'hidden' });
    
    // 취소 확인 다이얼로그 처리
    const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 }).catch(() => null);
    const dialog = await dialogPromise;
    if (dialog) {
      expect(dialog.message()).toContain('작업이 취소되었습니다');
      await dialog.accept();
    }
  });

  test('ESC 키로 모달을 닫을 수 없어야 함', async () => {
    // M4 Dialogue 버튼 클릭
    await page.click('button:has-text("M4 Dialogue")');
    
    // 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달이 나타날 때까지 대기
    await waitForModal(page);
    
    // ESC 키 누르기
    await page.keyboard.press('Escape');
    
    // 모달이 여전히 표시되는지 확인 (작업 중에는 ESC로 닫을 수 없음)
    await expect(page.locator('#progressModal')).toBeVisible();
    
    // 취소 버튼으로 모달 닫기
    await page.click('#cancelButton');
  });
});