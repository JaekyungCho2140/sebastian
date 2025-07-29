/**
 * NC 테이블 병합 기능 E2E 테스트
 * 
 * NC 테이블 병합 기능의 전체 워크플로우를 테스트
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

test.describe('NC 테이블 병합 기능', () => {
  let app;
  let page;
  const testDataPath = path.join(__dirname, '../../test-data/nc-merge');
  
  test.beforeAll(async () => {
    // 테스트 파일 생성 (8개 언어 파일)
    await createTestFiles(testDataPath, [
      'String-Table-KR.xlsx',
      'String-Table-EN.xlsx',
      'String-Table-JP.xlsx',
      'String-Table-TW.xlsx',
      'String-Table-CN.xlsx',
      'String-Table-TH.xlsx',
      'String-Table-ID.xlsx',
      'String-Table-VN.xlsx'
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

  test('NC 테이블 병합 버튼이 표시되고 클릭 가능해야 함', async () => {
    // NC 테이블 병합 버튼 찾기
    const button = await page.locator('button:has-text("NC 테이블 병합")');
    
    // 버튼이 표시되는지 확인
    await expect(button).toBeVisible();
    
    // 버튼이 활성화되어 있는지 확인
    await expect(button).toBeEnabled();
    
    // 버튼 클래스 확인
    await expect(button).toHaveClass(/feature-btn/);
  });

  test('날짜와 마일스톤 입력 모달이 표시되어야 함', async () => {
    // NC 테이블 병합 버튼 클릭
    await page.click('button:has-text("NC 테이블 병합")');
    
    // 입력 모달이 나타나는지 확인
    await page.waitForSelector('#ncInputModal', { state: 'visible' });
    
    // 모달 제목 확인
    const modalTitle = await page.locator('#ncInputModal h2').textContent();
    expect(modalTitle).toBe('NC 테이블 병합 설정');
    
    // 날짜 입력 필드 확인
    const dateInput = await page.locator('#ncDate');
    await expect(dateInput).toBeVisible();
    const today = new Date();
    const expectedDate = today.toISOString().split('T')[0];
    await expect(dateInput).toHaveValue(expectedDate);
    
    // 마일스톤 입력 필드 확인
    const milestoneInput = await page.locator('#ncMilestone');
    await expect(milestoneInput).toBeVisible();
    await expect(milestoneInput).toHaveValue('M01');
    
    // 확인/취소 버튼 확인
    await expect(page.locator('#ncConfirmButton')).toBeVisible();
    await expect(page.locator('#ncCancelButton')).toBeVisible();
  });

  test('날짜와 마일스톤 입력 후 병합이 성공해야 함', async () => {
    // NC 테이블 병합 버튼 클릭
    await page.click('button:has-text("NC 테이블 병합")');
    
    // 입력 모달 대기
    await page.waitForSelector('#ncInputModal', { state: 'visible' });
    
    // 날짜 변경 (테스트용)
    await page.fill('#ncDate', '2025-01-15');
    
    // 마일스톤 변경
    await page.fill('#ncMilestone', 'M02');
    
    // 확인 버튼 클릭
    await page.click('#ncConfirmButton');
    
    // 폴더 선택 다이얼로그 모킹
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
      
      const originalInvoke = window.api.invoke;
      window.api.invoke = async (channel, ...args) => {
        if (channel === 'select-folder') {
          return window.__testFolderPath;
        }
        return originalInvoke(channel, ...args);
      };
    }, testDataPath);
    
    // 진행률 모달이 나타나는지 확인
    await waitForModal(page);
    
    // 진행률 모달의 제목 확인
    const modalTitle = await page.locator('#progressModal h2').textContent();
    expect(modalTitle).toBe('NC 테이블 병합 중...');
    
    // 모달이 사라질 때까지 대기 (병합 완료) - NC는 시간이 많이 걸림
    await waitForModalToClose(page, 240000);
    
    // 성공 메시지 확인
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('병합이 완료되었습니다');
    await dialog.accept();
    
    // 출력 파일 확인 (날짜와 마일스톤이 포함된 파일명)
    const files = await fs.readdir(testDataPath);
    const outputFile = files.find(f => f.includes('250115_M02_StringALL.xlsx'));
    expect(outputFile).toBeTruthy();
  });

  test('입력 모달에서 취소 버튼이 작동해야 함', async () => {
    // NC 테이블 병합 버튼 클릭
    await page.click('button:has-text("NC 테이블 병합")');
    
    // 입력 모달 대기
    await page.waitForSelector('#ncInputModal', { state: 'visible' });
    
    // 취소 버튼 클릭
    await page.click('#ncCancelButton');
    
    // 모달이 사라지는지 확인
    await page.waitForSelector('#ncInputModal', { state: 'hidden' });
    
    // 진행률 모달이 나타나지 않는지 확인
    await page.waitForTimeout(1000);
    const progressModal = await page.locator('#progressModal');
    await expect(progressModal).not.toBeVisible();
  });

  test('잘못된 마일스톤 형식 입력 시 검증되어야 함', async () => {
    // NC 테이블 병합 버튼 클릭
    await page.click('button:has-text("NC 테이블 병합")');
    
    // 입력 모달 대기
    await page.waitForSelector('#ncInputModal', { state: 'visible' });
    
    // 잘못된 마일스톤 형식 입력
    await page.fill('#ncMilestone', 'ABC123');
    
    // 확인 버튼 클릭
    await page.click('#ncConfirmButton');
    
    // 경고 메시지 확인
    const warningText = await page.locator('.nc-input-warning').textContent();
    expect(warningText).toContain('MXX 형식');
    
    // 올바른 형식으로 수정
    await page.fill('#ncMilestone', 'M99');
    
    // 경고 메시지가 사라지는지 확인
    await expect(page.locator('.nc-input-warning')).not.toBeVisible();
  });

  test('필수 파일이 없을 때 에러를 표시해야 함', async () => {
    // 불완전한 파일 세트로 테스트 폴더 재생성 (EN 파일 누락)
    const incompletePath = path.join(__dirname, '../../test-data/nc-merge-incomplete');
    await createTestFiles(incompletePath, [
      'String-Table-KR.xlsx',
      // 'String-Table-EN.xlsx', // 누락
      'String-Table-JP.xlsx',
      'String-Table-TW.xlsx',
      'String-Table-CN.xlsx',
      'String-Table-TH.xlsx',
      'String-Table-ID.xlsx',
      'String-Table-VN.xlsx'
    ]);

    // NC 테이블 병합 버튼 클릭
    await page.click('button:has-text("NC 테이블 병합")');
    
    // 입력 모달에서 확인 클릭
    await page.waitForSelector('#ncInputModal', { state: 'visible' });
    await page.click('#ncConfirmButton');
    
    // 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, incompletePath);
    
    // 약간의 대기
    await page.waitForTimeout(500);
    
    // 에러 다이얼로그 확인
    const dialogPromise = page.waitForEvent('dialog');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('필수 파일이 없습니다');
    expect(dialog.message()).toContain('String-Table-EN.xlsx');
    await dialog.accept();
    
    // 정리
    await cleanupTestFiles(incompletePath);
  });

  test('대용량 데이터 처리 중에도 진행률이 업데이트되어야 함', async () => {
    // NC 테이블 병합 버튼 클릭
    await page.click('button:has-text("NC 테이블 병합")');
    
    // 입력 모달에서 확인 클릭
    await page.waitForSelector('#ncInputModal', { state: 'visible' });
    await page.click('#ncConfirmButton');
    
    // 폴더 경로 설정
    await page.evaluate((testPath) => {
      window.__testFolderPath = testPath;
    }, testDataPath);
    
    // 진행률 모달 대기
    await waitForModal(page);
    
    // 진행률 업데이트 확인 (여러 번 체크)
    const progressChecks = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000);
      const progressText = await page.locator('#progressPercent').textContent();
      const progressValue = parseInt(progressText);
      progressChecks.push(progressValue);
    }
    
    // 진행률이 증가하는지 확인
    for (let i = 1; i < progressChecks.length; i++) {
      expect(progressChecks[i]).toBeGreaterThanOrEqual(progressChecks[i-1]);
    }
    
    // 현재 파일 정보가 업데이트되는지 확인
    const currentFile = await page.locator('#currentFile').textContent();
    expect(currentFile).toBeTruthy();
    
    // 취소 버튼으로 종료
    await page.click('#cancelButton');
  });
});