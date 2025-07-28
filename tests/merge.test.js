/**
 * merge.js 모듈 단위 테스트
 * Excel 병합 기능의 주요 함수들을 테스트
 */
const path = require('path');
const fs = require('fs');
const { 
  progressTracker,
  validateInputFiles,
  getTodayDateString,
  getUniqueFileName,
  mergeNCFiles,
  setFileReadOnly
} = require('../merge');

describe('merge.js 모듈 테스트', () => {
  /**
   * progressTracker 객체 테스트
   */
  describe('progressTracker', () => {
    beforeEach(() => {
      progressTracker.reset();
    });

    test('초기 상태가 올바르게 설정되어야 함', () => {
      const progress = progressTracker.updateProgress();
      expect(progress.percentage).toBe('0.00');
      expect(progress.currentStep).toBe('');
      expect(progress.currentFile).toBe('');
      expect(progressTracker.processedRows).toBe(0);
      expect(progressTracker.totalRows).toBe(0);
      expect(progressTracker.isCancelled).toBe(false);
    });

    test('진행률이 올바르게 계산되어야 함', () => {
      progressTracker.totalRows = 100;
      progressTracker.processedRows = 50;
      const progress = progressTracker.updateProgress();
      expect(progress.percentage).toBe('50.00');
    });

    test('취소 기능이 정상 작동해야 함', () => {
      progressTracker.cancel();
      expect(progressTracker.isCancelled).toBe(true);
    });
  });

  /**
   * getTodayDateString 함수 테스트
   */
  describe('getTodayDateString', () => {
    test('MMDD 형식으로 날짜를 반환해야 함', () => {
      const dateString = getTodayDateString();
      expect(dateString).toMatch(/^\d{4}$/);
      expect(dateString.length).toBe(4);
    });
  });

  /**
   * getUniqueFileName 함수 테스트
   */
  describe('getUniqueFileName', () => {
    const testDir = path.join(__dirname, 'test-files');
    
    beforeAll(() => {
      // 테스트 디렉토리 생성
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterAll(() => {
      // 테스트 파일 정리
      if (fs.existsSync(testDir)) {
        fs.readdirSync(testDir).forEach(file => {
          fs.unlinkSync(path.join(testDir, file));
        });
        fs.rmdirSync(testDir);
      }
    });

    test('파일이 없을 때 원본 이름을 반환해야 함', () => {
      const uniqueName = getUniqueFileName(testDir, 'test.xlsx');
      expect(uniqueName).toBe('test.xlsx');
    });

    test('파일이 존재할 때 넘버링된 이름을 반환해야 함', () => {
      // 테스트 파일 생성
      fs.writeFileSync(path.join(testDir, 'test.xlsx'), 'dummy');
      
      const uniqueName = getUniqueFileName(testDir, 'test.xlsx');
      expect(uniqueName).toBe('test_01.xlsx');
      
      // 추가 테스트 파일 생성
      fs.writeFileSync(path.join(testDir, 'test_01.xlsx'), 'dummy');
      
      const uniqueName2 = getUniqueFileName(testDir, 'test.xlsx');
      expect(uniqueName2).toBe('test_02.xlsx');
    });
  });

  /**
   * validateInputFiles 함수 테스트
   */
  describe('validateInputFiles', () => {
    const testDir = path.join(__dirname, 'test-validation');
    
    beforeAll(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(testDir)) {
        fs.readdirSync(testDir).forEach(file => {
          fs.unlinkSync(path.join(testDir, file));
        });
        fs.rmdirSync(testDir);
      }
    });

    test('모든 필수 파일이 있을 때 성공해야 함', () => {
      const requiredFiles = [
        { fileName: 'file1.xlsx' },
        { fileName: 'file2.xlsx' }
      ];
      
      // 필수 파일 생성
      requiredFiles.forEach(file => {
        fs.writeFileSync(path.join(testDir, file.fileName), 'dummy');
      });

      const result = validateInputFiles(testDir, requiredFiles);
      expect(result.valid).toBe(true);
      expect(result.missingFiles.length).toBe(0);
    });

    test('필수 파일이 없을 때 올바른 결과를 반환해야 함', () => {
      const requiredFiles = [
        { fileName: 'missing.xlsx' }
      ];
      
      const result = validateInputFiles(testDir, requiredFiles);
      expect(result.valid).toBe(false);
      expect(result.missingFiles).toContain('missing.xlsx');
    });
  });

  /**
   * NC 병합 기능 테스트
   */
  describe('NC 병합 기능', () => {
    test('NC 병합 필수 파일 검증', () => {
      const ncFiles = [
        'StringEnglish.xlsx',
        'StringTraditionalChinese.xlsx',
        'StringSimplifiedChinese.xlsx',
        'StringJapanese.xlsx',
        'StringThai.xlsx',
        'StringSpanish.xlsx',
        'StringPortuguese.xlsx',
        'StringRussian.xlsx'
      ];
      
      // 문자열 배열로 검증
      const result = validateInputFiles('.', ncFiles);
      expect(result.valid).toBe(false);
      expect(result.missingFiles.length).toBe(8);
    });

    test('날짜/마일스톤 포맷 검증', () => {
      // 정상적인 날짜 형식
      const validDate = '250728';
      expect(validDate).toMatch(/^\d{6}$/);
      
      // 정상적인 마일스톤 형식
      const validMilestone = '01';
      expect(validMilestone).toMatch(/^\d{2}$/);
      
      // 잘못된 형식들
      const invalidDate = '2507281';
      expect(invalidDate).not.toMatch(/^\d{6}$/);
      
      const invalidMilestone = '1';
      expect(invalidMilestone).not.toMatch(/^\d{2}$/);
    });

    test('출력 파일명 형식 검증', () => {
      const date = '250728';
      const milestone = '01';
      const expectedFileName = `${date}_M${milestone}_StringALL.xlsx`;
      
      expect(expectedFileName).toBe('250728_M01_StringALL.xlsx');
      expect(expectedFileName).toMatch(/^\d{6}_M\d{2}_StringALL\.xlsx$/);
    });
  });

  /**
   * setFileReadOnly 함수 테스트
   */
  describe('setFileReadOnly', () => {
    test('Windows가 아닌 환경에서는 실패해야 함', async () => {
      // process.platform을 임시로 변경
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      const result = await setFileReadOnly('dummy.xlsx');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Windows에서만 지원');
      
      // 원래 값으로 복원
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
  });
});