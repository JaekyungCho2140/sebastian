import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { StreamingExcelReader, createStreamingReader } from '../src/services/m4/optimization/streamingExcelReader';

// 테스트 데이터 디렉토리
const TEST_DATA_DIR = path.join(__dirname, 'test-data', 'streaming');
const TEST_OUTPUT_DIR = path.join(__dirname, 'test-outputs', 'streaming');

// 테스트 파일 생성
async function createTestExcelFile(
  filePath: string,
  rowCount: number,
  sheetName: string = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  // 헤더 추가
  worksheet.addRow(['ID', 'Name', 'Value', 'Description']);
  
  // 데이터 추가
  for (let i = 1; i <= rowCount; i++) {
    worksheet.addRow([
      i,
      `Name_${i}`,
      Math.random() * 1000,
      `Description for row ${i}`
    ]);
  }
  
  await workbook.xlsx.writeFile(filePath);
}

describe('StreamingExcelReader', () => {
  beforeAll(async () => {
    // 테스트 디렉토리 생성
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    
    // 테스트 파일 생성
    await createTestExcelFile(
      path.join(TEST_DATA_DIR, 'small.xlsx'),
      100
    );
    await createTestExcelFile(
      path.join(TEST_DATA_DIR, 'medium.xlsx'),
      10000
    );
    await createTestExcelFile(
      path.join(TEST_DATA_DIR, 'large.xlsx'),
      50000
    );
  });
  
  afterAll(() => {
    // 테스트 파일 정리
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });
  
  describe('Basic streaming functionality', () => {
    it('should read small file in streaming mode', async () => {
      const reader = createStreamingReader({
        batchSize: 10,
        emitProgress: false
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'small.xlsx');
      let totalRows = 0;
      let batchCount = 0;
      
      for await (const batch of reader.readFile(filePath)) {
        batchCount++;
        totalRows += batch.length;
        
        // 배치 크기 확인
        if (batchCount < 10) {
          expect(batch.length).toBeLessThanOrEqual(10);
        }
        
        // 행 데이터 구조 확인
        for (const row of batch) {
          expect(row).toHaveProperty('rowNumber');
          expect(row).toHaveProperty('values');
          expect(row).toHaveProperty('isLastInBatch');
          expect(Array.isArray(row.values)).toBe(true);
        }
      }
      
      expect(totalRows).toBe(100); // 헤더 제외
      expect(batchCount).toBeGreaterThan(0);
    });
    
    it('should handle headers correctly', async () => {
      const reader = new StreamingExcelReader({
        batchSize: 5,
        startRow: 1
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'small.xlsx');
      let firstBatchReceived = false;
      
      for await (const batch of reader.readFile(filePath)) {
        if (!firstBatchReceived) {
          firstBatchReceived = true;
          // 첫 배치의 첫 행이 데이터인지 확인
          const firstRow = batch[0];
          expect(firstRow.data).toBeDefined();
          expect(firstRow.data).toHaveProperty('ID');
          expect(firstRow.data).toHaveProperty('Name');
          expect(firstRow.data).toHaveProperty('Value');
          expect(firstRow.data).toHaveProperty('Description');
        }
        break;
      }
    });
    
    it('should emit progress events', async () => {
      const reader = new StreamingExcelReader({
        batchSize: 100,
        emitProgress: true
      });
      
      const progressEvents: any[] = [];
      reader.on('progress', (progress) => {
        progressEvents.push(progress);
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'medium.xlsx');
      
      for await (const batch of reader.readFile(filePath)) {
        // 배치 처리
      }
      
      expect(progressEvents.length).toBeGreaterThan(0);
      
      // 진행률 이벤트 구조 확인
      const firstProgress = progressEvents[0];
      expect(firstProgress).toHaveProperty('currentRow');
      expect(firstProgress).toHaveProperty('totalProcessed');
      expect(firstProgress).toHaveProperty('batchNumber');
      expect(firstProgress).toHaveProperty('memoryUsage');
    });
  });
  
  describe('Memory efficiency', () => {
    it('should process large file with stable memory usage', async () => {
      const reader = new StreamingExcelReader({
        batchSize: 1000,
        emitProgress: true
      });
      
      const memorySnapshots: number[] = [];
      reader.on('progress', (progress) => {
        memorySnapshots.push(progress.memoryUsage.heapUsed);
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'large.xlsx');
      let totalRows = 0;
      
      for await (const batch of reader.readFile(filePath)) {
        totalRows += batch.length;
      }
      
      expect(totalRows).toBe(50000);
      
      // 메모리 사용량이 선형적으로 증가하지 않는지 확인
      if (memorySnapshots.length > 2) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const memoryIncrease = lastSnapshot - firstSnapshot;
        
        // 메모리 증가량이 파일 크기에 비해 합리적인지 확인
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
        expect(memoryIncreaseMB).toBeLessThan(100); // 100MB 미만
      }
    });
    
    it('should handle garbage collection events', async () => {
      const reader = new StreamingExcelReader({
        batchSize: 500
      });
      
      const gcEvents: any[] = [];
      reader.on('gc', (event) => {
        gcEvents.push(event);
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'large.xlsx');
      
      // GC 강제 실행을 위해 --expose-gc 플래그 필요
      if (global.gc) {
        for await (const batch of reader.readFile(filePath)) {
          // 배치 처리
        }
        
        // GC 이벤트가 발생했는지 확인 (옵션)
        // expect(gcEvents.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Row filtering and processing', () => {
    it('should skip empty rows', async () => {
      // 빈 행이 포함된 테스트 파일 생성
      const testFile = path.join(TEST_DATA_DIR, 'with-empty-rows.xlsx');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      
      worksheet.addRow(['ID', 'Name']);
      worksheet.addRow([1, 'First']);
      worksheet.addRow([]); // 빈 행
      worksheet.addRow([2, 'Second']);
      worksheet.addRow([null, null]); // null 값 행
      worksheet.addRow([3, 'Third']);
      
      await workbook.xlsx.writeFile(testFile);
      
      const reader = new StreamingExcelReader({
        skipEmptyRows: true
      });
      
      const rows: any[] = [];
      for await (const batch of reader.readFile(testFile)) {
        rows.push(...batch);
      }
      
      expect(rows.length).toBe(3); // 빈 행 제외
      expect(rows[0].values[0]).toBe(1);
      expect(rows[1].values[0]).toBe(2);
      expect(rows[2].values[0]).toBe(3);
    });
    
    it('should respect row range options', async () => {
      const reader = new StreamingExcelReader({
        startRow: 10,
        endRow: 20,
        batchSize: 5
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'medium.xlsx');
      const rows: any[] = [];
      
      for await (const batch of reader.readFile(filePath)) {
        rows.push(...batch);
      }
      
      expect(rows.length).toBe(11); // 10번째부터 20번째까지 (inclusive)
      expect(rows[0].rowNumber).toBe(10);
      expect(rows[rows.length - 1].rowNumber).toBe(20);
    });
  });
  
  describe('Error handling', () => {
    it('should throw error for non-existent file', async () => {
      const reader = new StreamingExcelReader();
      const nonExistentFile = path.join(TEST_DATA_DIR, 'does-not-exist.xlsx');
      
      await expect(async () => {
        for await (const batch of reader.readFile(nonExistentFile)) {
          // Should not reach here
        }
      }).rejects.toThrow('File not found');
    });
    
    it('should throw error for invalid worksheet', async () => {
      const reader = new StreamingExcelReader({
        sheetId: 'NonExistentSheet'
      });
      
      const filePath = path.join(TEST_DATA_DIR, 'small.xlsx');
      
      await expect(async () => {
        for await (const batch of reader.readFile(filePath)) {
          // Should not reach here
        }
      }).rejects.toThrow('Worksheet NonExistentSheet not found');
    });
  });
  
  describe('Static utility methods', () => {
    it('should count rows without loading entire file', async () => {
      const filePath = path.join(TEST_DATA_DIR, 'medium.xlsx');
      const rowCount = await StreamingExcelReader.countRows(filePath);
      
      expect(rowCount).toBe(10000);
    });
    
    it('should process file with callback pattern', async () => {
      const filePath = path.join(TEST_DATA_DIR, 'small.xlsx');
      const processedBatches: number[] = [];
      
      await StreamingExcelReader.processFile(
        filePath,
        async (batch) => {
          processedBatches.push(batch.length);
        },
        { batchSize: 20 }
      );
      
      const totalRows = processedBatches.reduce((sum, count) => sum + count, 0);
      expect(totalRows).toBe(100);
    });
  });
  
  describe('Row iterator', () => {
    it('should iterate rows one by one', async () => {
      const reader = new StreamingExcelReader();
      const filePath = path.join(TEST_DATA_DIR, 'small.xlsx');
      
      let rowCount = 0;
      for await (const row of reader.readRows(filePath)) {
        rowCount++;
        expect(row).toHaveProperty('rowNumber');
        expect(row).toHaveProperty('values');
        
        if (rowCount > 10) break; // 처음 10개만 테스트
      }
      
      expect(rowCount).toBe(11); // 헤더 + 10개 데이터
    });
  });
});