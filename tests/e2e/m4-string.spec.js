/**
 * M4 String 병합 기능 E2E 테스트
 * 
 * M4 String 기능의 전체 워크플로우를 테스트
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

test.describe('M4 String 병합 기능', () => {
  let app;
  let page;
  const testDataPath = path.join(__dirname, '../../test-data/m4-string');
  
  test.beforeAll(async () => {
    // 테스트 파일 생성 (8개 파일)
    await createTestFiles(testDataPath, [
      'SEQUENCE.xlsm',
      'BUILTIN.xlsm',
      'MAIL.xlsm',
      'MESSAGE.xlsm',
      'NPC.xlsm',
      'QUESTTEMPLATE.xlsm',
      'TEMPLATE.xlsm',
      'TOOLTIP.xlsm'
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

  test('M4 String 버튼이 표시되고 클릭 가능해야 함', async () => {
    // M4 String 버튼 찾기
    const button = await page.locator('button:has-text("M4 String")');
    
    // 버튼이 표시되는지 확인
    await expect(button).toBeVisible();
    
    // 버튼이 활성화되어 있는지 확인
    await expect(button).toBeEnabled();
    
    // 버튼 클래스 확인
    await expect(button).toHaveClass(/feature-btn/);
  });

  test('폴더 선택 후 파일을 성공적으로 병합해야 함', async () => {
    // M4 String 버튼 클릭
    await page.click('button:has-text("M4 String")');
    
    // 테스트 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달이 나타나는지 확인
    await waitForModal(page);
    
    // 진행률 모달의 제목 확인
    const modalTitle = await page.locator('#progressModal h2').textContent();
    expect(modalTitle).toBe('M4 String 병합 중...');
    
    // 모달이 사라질 때까지 대기 (병합 완료) - M4 String은 시간이 더 걸림
    await waitForModalToClose(page, 180000);
    
    // 성공 메시지 확인
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('병합이 완료되었습니다');
    await dialog.accept();
    
    // 출력 파일 확인
    const files = await fs.readdir(testDataPath);
    const outputFile = files.find(f => f.includes('M4_StringALL.xlsx'));
    expect(outputFile).toBeTruthy();
  });

  test('필수 파일이 없을 때 에러를 표시해야 함', async () => {
    // 불완전한 파일 세트로 테스트 폴더 재생성 (MESSAGE.xlsm 누락)
    const incompletePath = path.join(__dirname, '../../test-data/m4-string-incomplete');
    await createTestFiles(incompletePath, [
      'SEQUENCE.xlsm',
      'BUILTIN.xlsm',
      'MAIL.xlsm',
      // MESSAGE.xlsm 누락
      'NPC.xlsm',
      'QUESTTEMPLATE.xlsm',
      'TEMPLATE.xlsm',
      'TOOLTIP.xlsm'
    ]);

    // M4 String 버튼 클릭
    await page.click('button:has-text("M4 String")');
    
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

  test('진행률이 올바르게 업데이트되어야 함', async () => {
    // M4 String 버튼 클릭
    await page.click('button:has-text("M4 String")');
    
    // 테스트 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달이 나타날 때까지 대기
    await waitForModal(page);
    
    // 진행률 요소들 확인
    const progressElements = {
      currentFile: await page.locator('#currentFile'),
      currentStep: await page.locator('#currentStep'),
      progressBar: await page.locator('#progressBar'),
      progressPercent: await page.locator('#progressPercent'),
      estimatedTime: await page.locator('#estimatedTime')
    };
    
    // 모든 진행률 요소가 표시되는지 확인
    for (const element of Object.values(progressElements)) {
      await expect(element).toBeVisible();
    }
    
    // 진행률이 업데이트되는지 확인 (몇 초 대기 후)
    await page.waitForTimeout(2000);
    
    const progressText = await progressElements.progressPercent.textContent();
    const progressValue = parseInt(progressText);
    expect(progressValue).toBeGreaterThan(0);
    
    // 취소 버튼으로 모달 닫기
    await page.click('#cancelButton');
  });

  test('큰 데이터셋 처리 중 UI가 응답해야 함', async () => {
    // M4 String 버튼 클릭
    await page.click('button:has-text("M4 String")');
    
    // 테스트 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달이 나타날 때까지 대기
    await waitForModal(page);
    
    // UI가 응답하는지 확인 - 취소 버튼이 클릭 가능한지
    const cancelButton = await page.locator('#cancelButton');
    await expect(cancelButton).toBeEnabled();
    
    // 진행률이 업데이트되는지 확인
    let previousProgress = 0;
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1000);
      const progressText = await page.locator('#progressPercent').textContent();
      const currentProgress = parseInt(progressText);
      expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
      previousProgress = currentProgress;
    }
    
    // 취소 버튼 클릭
    await page.click('#cancelButton');
  });
});