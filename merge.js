/**
 * Excel 파일 병합 기능을 담당하는 모듈
 * M4 Dialogue와 M4 String 병합 로직을 구현
 */

const XLSX = require('xlsx-js-style');
const fs = require('fs');
const path = require('path');

/**
 * 진행률 추적을 위한 객체
 */
const progressTracker = {
  totalRows: 0,
  processedRows: 0,
  currentFile: '',
  currentStep: '',
  currentFileIndex: 0,
  totalFiles: 0,
  startTime: Date.now(),
  isCancelled: false,
  
  /**
   * 진행률 정보를 업데이트하고 반환
   * @returns {Object} 진행률 정보
   */
  updateProgress() {
    const percentage = this.totalRows > 0 
      ? (this.processedRows / this.totalRows) * 100 
      : 0;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const estimatedTotal = percentage > 0 
      ? (elapsed / percentage) * 100 
      : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return {
      percentage: percentage.toFixed(2),
      elapsed: elapsed.toFixed(1),
      remaining: remaining.toFixed(1),
      currentFile: this.currentFile,
      currentStep: this.currentStep,
      fileProgress: `${this.currentFileIndex}/${this.totalFiles}`
    };
  },
  
  /**
   * 진행률 추적 객체 초기화
   */
  reset() {
    this.totalRows = 0;
    this.processedRows = 0;
    this.currentFile = '';
    this.currentStep = '';
    this.currentFileIndex = 0;
    this.totalFiles = 0;
    this.startTime = Date.now();
    this.isCancelled = false;
  },
  
  /**
   * 작업 취소 설정
   */
  cancel() {
    this.isCancelled = true;
  }
};

/**
 * 입력 파일들의 존재 여부를 검증
 * @param {string} folderPath - 검증할 폴더 경로
 * @param {Array} requiredFiles - 필수 파일 목록
 * @returns {Object} 검증 결과 {valid: boolean, missingFiles: Array}
 */
function validateInputFiles(folderPath, requiredFiles) {
  const missingFiles = [];
  
  for (const fileConfig of requiredFiles) {
    const filePath = path.join(folderPath, fileConfig.fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(fileConfig.fileName);
    }
  }
  
  return {
    valid: missingFiles.length === 0,
    missingFiles: missingFiles
  };
}

/**
 * 오늘 날짜를 MMDD 형식으로 반환
 * @returns {string} MMDD 형식의 날짜
 */
function getTodayDateString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${month}${day}`;
}

/**
 * 파일명 중복 시 넘버링을 추가하여 고유한 파일명 생성
 * @param {string} folderPath - 파일이 저장될 폴더 경로
 * @param {string} baseFileName - 기본 파일명 (확장자 포함)
 * @returns {string} 고유한 파일명
 */
function getUniqueFileName(folderPath, baseFileName) {
  let finalPath = path.join(folderPath, baseFileName);
  
  // 파일이 존재하지 않으면 원래 파일명 그대로 반환
  if (!fs.existsSync(finalPath)) {
    return baseFileName;
  }
  
  // 파일명과 확장자 분리
  const ext = path.extname(baseFileName);
  const nameWithoutExt = path.basename(baseFileName, ext);
  
  // 넘버링 추가하여 고유한 파일명 찾기
  let counter = 1;
  let newFileName;
  do {
    newFileName = `${nameWithoutExt}_${String(counter).padStart(2, '0')}${ext}`;
    finalPath = path.join(folderPath, newFileName);
    counter++;
  } while (fs.existsSync(finalPath));
  
  return newFileName;
}

/**
 * 취소 여부를 체크하고 취소되었으면 에러를 던짐
 * @throws {Error} 취소되었을 때
 */
function checkCancellation() {
  if (progressTracker.isCancelled) {
    throw new Error('CANCELLED:사용자가 작업을 취소했습니다.');
  }
}

/**
 * M4 Dialogue 파일들을 병합
 * @param {string} folderPath - 입력 파일들이 있는 폴더 경로
 * @param {Function} progressCallback - 진행률 업데이트 콜백
 * @returns {Promise<Object>} 병합 결과
 */
async function mergeDialogueFiles(folderPath, progressCallback) {
  progressTracker.reset();
  let outputPath = null;
  
  try {
    // 매핑 정보 로드
    const mapping = require('./mappings/m4-dialogue-mapping.json');
    
    // 파일 검증
    progressTracker.currentStep = '파일 검증';
    const validation = validateInputFiles(folderPath, mapping.inputFiles);
    if (!validation.valid) {
      throw new Error(`다음 파일이 없습니다:\n${validation.missingFiles.join('\n')}`);
    }
    
    checkCancellation();
    
    // NPC 매핑 정보 먼저 로드
    progressTracker.currentStep = 'NPC 정보 로드';
    const npcFile = mapping.inputFiles.find(f => f.fileName === 'NPC.xlsm');
    const npcMapping = {};
    
    if (npcFile) {
      const npcPath = path.join(folderPath, npcFile.fileName);
      const npcWorkbook = XLSX.readFile(npcPath, { dense: true });
      const npcSheet = npcWorkbook.Sheets[npcWorkbook.SheetNames[npcFile.sheetIndex - 1]];
      const npcData = XLSX.utils.sheet_to_json(npcSheet, {
        header: 1,
        range: npcFile.dataStartRow - 1
      });
      
      // NPC ID to Name 매핑 생성
      for (const row of npcData) {
        const npcId = row[npcFile.keyColumn];
        const npcName = row[npcFile.valueColumn];
        if (npcId && npcName) {
          npcMapping[npcId] = npcName;
        }
      }
    }
    
    // 모든 대화 파일의 행 수 계산
    progressTracker.currentStep = '파일 분석';
    const dialogueFiles = mapping.inputFiles.filter(f => f.purpose !== 'NPC ID to Name mapping');
    progressTracker.totalFiles = dialogueFiles.length;
    
    checkCancellation();
    
    let totalRowCount = 0;
    for (const fileConfig of dialogueFiles) {
      const filePath = path.join(folderPath, fileConfig.fileName);
      console.log(`\n=== ${fileConfig.fileName} 디버깅 ===`);
      console.log(`파일 경로: ${filePath}`);
      console.log(`매핑 설정:`, {
        sheetIndex: fileConfig.sheetIndex,
        headerRow: fileConfig.headerRow,
        dataStartRow: fileConfig.dataStartRow
      });
      
      const workbook = XLSX.readFile(filePath, { dense: true });
      console.log(`시트 이름들:`, workbook.SheetNames);
      
      const sheetIndex = fileConfig.sheetIndex - 1;
      console.log(`선택된 시트 인덱스: ${sheetIndex}`);
      console.log(`선택된 시트 이름: "${workbook.SheetNames[sheetIndex]}"`);
      
      const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
      console.log(`시트 범위:`, sheet['!ref'] || '범위 없음');
      
      // 전체 데이터를 먼저 읽어보기
      const allData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`전체 데이터 행 수: ${allData.length}`);
      if (allData.length > 0) {
        console.log(`첫 번째 행 (헤더):`, allData[0].slice(0, 5));
        if (allData.length > 1) {
          console.log(`두 번째 행 (데이터):`, allData[1].slice(0, 5));
        }
      }
      
      // range 옵션으로 데이터 읽기
      console.log(`\nsheet_to_json 호출 - range: ${fileConfig.dataStartRow - 1}`);
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: fileConfig.dataStartRow - 1
      });
      
      console.log(`range 옵션으로 읽은 행 수: ${data.length}`);
      if (data.length > 0) {
        console.log(`첫 번째 데이터 행:`, data[0].slice(0, 5));
      }
      
      totalRowCount += data.length;
      checkCancellation();
    }
    
    progressTracker.totalRows = totalRowCount;
    
    // 데이터 병합
    progressTracker.currentStep = '데이터 병합';
    const mergedData = [];
    let outputIndex = 1; // 1부터 시작 (# 컬럼용)
    
    for (let fileIndex = 0; fileIndex < dialogueFiles.length; fileIndex++) {
      const fileConfig = dialogueFiles[fileIndex];
      progressTracker.currentFile = fileConfig.fileName;
      progressTracker.currentFileIndex = fileIndex + 1;
      
      const filePath = path.join(folderPath, fileConfig.fileName);
      const workbook = XLSX.readFile(filePath, { dense: true });
      const sheet = workbook.Sheets[workbook.SheetNames[fileConfig.sheetIndex - 1]];
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: fileConfig.dataStartRow - 1
      });
      
      // 각 행 처리
      let processedInFile = 0;
      let filteredInFile = 0;
      
      /**
       * EN (M) 컬럼 인덱스를 찾습니다.
       * columnMapping에서 EN (M)으로 매핑된 소스 컬럼을 찾아 인덱스를 저장합니다.
       */
      let enMColumn = null;
      for (const [sourceCol, mapping] of Object.entries(fileConfig.columnMapping)) {
        if (mapping.to === 'EN (M)') {
          enMColumn = parseInt(sourceCol);
          console.log(`\nEN (M) 컬럼 인덱스: ${enMColumn}`);
          break;
        }
      }
      
      /**
       * 디버깅을 위해 처음 10개 행의 EN (M) 값을 확인합니다.
       * 필터링이 제대로 작동하는지 검증하기 위한 로그입니다.
       */
      console.log(`\n처음 10개 행 분석:`);
      for (let debugIdx = 0; debugIdx < Math.min(10, data.length); debugIdx++) {
        const debugRow = data[debugIdx];
        if (debugRow && enMColumn !== null) {
          const enMValue = debugRow[enMColumn];
          console.log(`  행 ${debugIdx}: EN (M) = "${enMValue}" (유효: ${enMValue && enMValue !== '0' && enMValue !== '미사용'})`);
        }
      }
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        progressTracker.processedRows++;
        processedInFile++;
        
        // 100행마다 진행률 업데이트 및 취소 체크
        if (i % 100 === 0) {
          checkCancellation();
          if (progressCallback) {
            progressCallback(progressTracker.updateProgress());
          }
        }
        
        // EN (M) 필터링
        if (enMColumn !== null) {
          const enMValue = row[enMColumn];
          if (!enMValue || enMValue === '0' || enMValue === '미사용') {
            filteredInFile++;
            continue;
          }
        }
        
        // 출력 행 생성
        const outputRow = new Array(mapping.outputFile.columns.length);
        
        // 고정 컬럼 설정
        outputRow[0] = outputIndex++; // #
        outputRow[1] = fileConfig.sheetName || fileConfig.fileName.replace('.xlsm', ''); // Table Name
        
        // 매핑된 컬럼 복사
        for (const [sourceCol, targetInfo] of Object.entries(fileConfig.columnMapping)) {
          const sourceIndex = parseInt(sourceCol);
          const targetCol = targetInfo.to;
          const targetIndex = mapping.outputFile.columns.indexOf(targetCol);
          
          if (targetIndex !== -1 && row[sourceIndex] !== undefined) {
            outputRow[targetIndex] = row[sourceIndex];
          }
        }
        
        // Table/ID 생성
        const tableIdIndex = mapping.outputFile.columns.indexOf('Table/ID');
        if (tableIdIndex !== -1) {
          outputRow[tableIdIndex] = `${outputRow[1]}/${outputRow[2]}`; // Table Name / String ID
        }
        
        // NPC ID로 Speaker Name 설정
        const npcIdIndex = mapping.outputFile.columns.indexOf('NPC ID');
        const speakerNameIndex = mapping.outputFile.columns.indexOf('Speaker Name');
        if (npcIdIndex !== -1 && speakerNameIndex !== -1 && outputRow[npcIdIndex]) {
          outputRow[speakerNameIndex] = npcMapping[outputRow[npcIdIndex]] || '';
        }
        
        mergedData.push(outputRow);
      }
      
      console.log(`\n${fileConfig.fileName} 처리 완료:`);
      console.log(`  - 전체 행: ${processedInFile}`);
      console.log(`  - 필터링된 행: ${filteredInFile}`);
      console.log(`  - 병합된 행: ${processedInFile - filteredInFile}`);
    }
    
    console.log(`\n=== 전체 병합 결과 ===`);
    console.log(`총 병합된 행 수: ${mergedData.length}`);
    
    // Excel 파일 생성
    progressTracker.currentStep = '파일 저장';
    const outputWorkbook = XLSX.utils.book_new();
    const outputSheet = XLSX.utils.aoa_to_sheet([mapping.outputFile.columns, ...mergedData]);
    
    // 서식 적용
    applyDialogueFormatting(outputSheet, mapping.outputFile.formatting, mapping.outputFile.columns.length, mergedData.length);
    
    XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, 'DIALOGUE');
    
    // 파일 저장
    const dateString = getTodayDateString();
    const baseFileName = mapping.outputFile.namePattern.replace('{date}', dateString);
    const uniqueFileName = getUniqueFileName(folderPath, baseFileName);
    outputPath = path.join(folderPath, uniqueFileName);
    
    XLSX.writeFile(outputWorkbook, outputPath);
    
    // 완료
    const finalProgress = progressTracker.updateProgress();
    
    return {
      success: true,
      outputPath: outputPath,
      rowCount: mergedData.length,
      elapsed: finalProgress.elapsed
    };
    
  } catch (error) {
    // 취소된 경우 부분적으로 생성된 파일 삭제
    if (error.message.startsWith('CANCELLED:') && outputPath && fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (deleteError) {
        console.error('파일 삭제 실패:', deleteError);
      }
    }
    
    return {
      success: false,
      error: error.message.replace('CANCELLED:', '')
    };
  }
}

/**
 * M4 String 파일들을 병합
 * @param {string} folderPath - 입력 파일들이 있는 폴더 경로
 * @param {Function} progressCallback - 진행률 업데이트 콜백
 * @returns {Promise<Object>} 병합 결과
 */
async function mergeStringFiles(folderPath, progressCallback) {
  progressTracker.reset();
  let outputPath = null;
  
  try {
    // 매핑 정보 로드
    const mapping = require('./mappings/m4-string-mapping.json');
    
    // 파일 검증
    progressTracker.currentStep = '파일 검증';
    const validation = validateInputFiles(folderPath, mapping.inputFiles);
    if (!validation.valid) {
      throw new Error(`다음 파일이 없습니다:\n${validation.missingFiles.join('\n')}`);
    }
    
    checkCancellation();
    
    // 모든 파일의 행 수 계산
    progressTracker.currentStep = '파일 분석';
    progressTracker.totalFiles = mapping.inputFiles.length;
    
    let totalRowCount = 0;
    for (const fileConfig of mapping.inputFiles) {
      const filePath = path.join(folderPath, fileConfig.fileName);
      const workbook = XLSX.readFile(filePath, { dense: true });
      const sheet = workbook.Sheets[workbook.SheetNames[fileConfig.sheetIndex - 1]];
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: fileConfig.dataStartRow - 1
      });
      totalRowCount += data.length;
      checkCancellation();
    }
    
    progressTracker.totalRows = totalRowCount;
    
    // 데이터 병합
    progressTracker.currentStep = '데이터 병합';
    const mergedData = [];
    let outputIndex = 1; // 1부터 시작 (# 컬럼용)
    
    for (let fileIndex = 0; fileIndex < mapping.inputFiles.length; fileIndex++) {
      const fileConfig = mapping.inputFiles[fileIndex];
      progressTracker.currentFile = fileConfig.fileName;
      progressTracker.currentFileIndex = fileIndex + 1;
      
      const filePath = path.join(folderPath, fileConfig.fileName);
      const workbook = XLSX.readFile(filePath, { dense: true });
      const sheet = workbook.Sheets[workbook.SheetNames[fileConfig.sheetIndex - 1]];
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: fileConfig.dataStartRow - 1
      });
      
      // 각 행 처리
      let processedInFile = 0;
      let filteredInFile = 0;
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        progressTracker.processedRows++;
        processedInFile++;
        
        // 100행마다 진행률 업데이트 및 취소 체크
        if (i % 100 === 0) {
          checkCancellation();
          if (progressCallback) {
            progressCallback(progressTracker.updateProgress());
          }
        }
        
        // EN 필터링
        const enColumn = Object.keys(fileConfig.columnMapping).find(
          key => fileConfig.columnMapping[key].to === 'EN'
        );
        const enValue = row[parseInt(enColumn)];
        
        if (!enValue || enValue === '0' || enValue === '미사용') {
          filteredInFile++;
          continue;
        }
        
        // 출력 행 생성
        const outputRow = new Array(mapping.outputFile.columns.length);
        
        // 고정 컬럼 설정
        outputRow[0] = outputIndex++; // #
        outputRow[1] = fileConfig.fileName.replace('.xlsm', ''); // Table Name
        
        // 매핑된 컬럼 복사
        for (const [sourceCol, targetInfo] of Object.entries(fileConfig.columnMapping)) {
          const sourceIndex = parseInt(sourceCol);
          const targetCol = targetInfo.to;
          const targetIndex = mapping.outputFile.columns.indexOf(targetCol);
          
          if (targetIndex !== -1 && row[sourceIndex] !== undefined) {
            outputRow[targetIndex] = row[sourceIndex];
          }
        }
        
        // Table/ID 생성
        const tableIdIndex = mapping.outputFile.columns.indexOf('Table/ID');
        if (tableIdIndex !== -1) {
          outputRow[tableIdIndex] = `${outputRow[1]}/${outputRow[2]}`; // Table Name / String ID
        }
        
        mergedData.push(outputRow);
      }
      
      console.log(`\n${fileConfig.fileName} 처리 완료:`);
      console.log(`  - 전체 행: ${processedInFile}`);
      console.log(`  - 필터링된 행: ${filteredInFile}`);
      console.log(`  - 병합된 행: ${processedInFile - filteredInFile}`);
    }
    
    console.log(`\n=== 전체 병합 결과 ===`);
    console.log(`총 병합된 행 수: ${mergedData.length}`);
    
    // Excel 파일 생성
    progressTracker.currentStep = '파일 저장';
    const outputWorkbook = XLSX.utils.book_new();
    const outputSheet = XLSX.utils.aoa_to_sheet([mapping.outputFile.columns, ...mergedData]);
    
    // 서식 적용
    applyStringFormatting(outputSheet, mapping.outputFile.formatting, mapping.outputFile.columns.length, mergedData.length);
    
    XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, 'STRING');
    
    // 파일 저장
    const dateString = getTodayDateString();
    const baseFileName = mapping.outputFile.namePattern.replace('{date}', dateString);
    const uniqueFileName = getUniqueFileName(folderPath, baseFileName);
    outputPath = path.join(folderPath, uniqueFileName);
    
    XLSX.writeFile(outputWorkbook, outputPath);
    
    // 완료
    const finalProgress = progressTracker.updateProgress();
    
    return {
      success: true,
      outputPath: outputPath,
      rowCount: mergedData.length,
      elapsed: finalProgress.elapsed
    };
    
  } catch (error) {
    // 취소된 경우 부분적으로 생성된 파일 삭제
    if (error.message.startsWith('CANCELLED:') && outputPath && fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (deleteError) {
        console.error('파일 삭제 실패:', deleteError);
      }
    }
    
    return {
      success: false,
      error: error.message.replace('CANCELLED:', '')
    };
  }
}

/**
 * M4 Dialogue용 Excel 시트에 서식을 적용
 * @param {Object} sheet - XLSX 시트 객체
 * @param {Object} formatting - 서식 설정
 * @param {number} columnCount - 컬럼 수
 * @param {number} rowCount - 데이터 행 수
 */
function applyDialogueFormatting(sheet, formatting, columnCount, rowCount) {
  if (!sheet['!ref']) return;
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // 열 너비 설정 - 모든 컬럼을 MS Excel 기본값으로 통일
  sheet['!cols'] = [];
  for (let i = 0; i < columnCount; i++) {
    sheet['!cols'].push({ wch: 8.38 }); // MS Excel 기본 열 너비
  }
  
  // 첫 번째 행(헤더) 고정
  if (formatting.freezePane === 'A2') {
    sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };
  }
  
  // 자동 필터 추가
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  
  // 헤더 스타일 정의
  const headerStyle = {
    font: {
      name: formatting.headerFont.name || '맑은 고딕',
      sz: formatting.headerFont.size || 12,
      bold: formatting.headerFont.bold || true,
      color: { rgb: formatting.headerFont.color ? formatting.headerFont.color.replace('#', '') : '9C5700' }
    },
    fill: {
      fgColor: { rgb: formatting.headerBgColor ? formatting.headerBgColor.replace('#', '') : 'FFEB9C' }
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: false // 자동 줄바꿈 해제
    }
  };
  
  // 본문 스타일 정의
  const bodyStyle = {
    font: {
      name: formatting.bodyFont.name || '맑은 고딕',
      sz: formatting.bodyFont.size || 10
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },    // 검정색 일반 선
      bottom: { style: 'thin', color: { rgb: '000000' } }, // 검정색 일반 선
      left: { style: 'thin', color: { rgb: '000000' } },   // 검정색 일반 선
      right: { style: 'thin', color: { rgb: '000000' } }   // 검정색 일반 선
    },
    alignment: {
      vertical: 'center',
      wrapText: false // 자동 줄바꿈 해제
    }
  };
  
  // 숫자 스타일 정의 (가운데 정렬)
  const numberStyle = {
    font: {
      name: formatting.bodyFont.name || '맑은 고딕',
      sz: formatting.bodyFont.size || 10
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: false // 자동 줄바꿈 해제
    },
    numFmt: '0' // 숫자 포맷
  };
  
  // 헤더 행에 스타일 적용
  for (let c = 0; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: c });
    if (!sheet[cellAddr]) continue;
    sheet[cellAddr].s = headerStyle;
  }
  
  // 본문 셀에 스타일 적용
  // 실제 데이터가 있는 모든 셀에 스타일 적용 (빈 셀도 포함하여 테두리 완성)
  for (let r = 1; r <= rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {  // range.e.c 대신 columnCount 사용
      const cellAddr = XLSX.utils.encode_cell({ r: r, c: c });
      
      // 셀이 없으면 빈 셀 생성 (테두리를 위해)
      if (!sheet[cellAddr]) {
        sheet[cellAddr] = { t: 's', v: '' };
      }
      
      // 숫자 컬럼인지 확인 (#, String ID, NPC ID)
      if (c === 0 || c === 2 || c === 4) {
        sheet[cellAddr].s = numberStyle;
        if (sheet[cellAddr].v !== '') {
          sheet[cellAddr].t = 'n'; // 숫자 타입으로 설정
        }
      } else {
        sheet[cellAddr].s = bodyStyle;
      }
    }
  }
}

/**
 * M4 String용 Excel 시트에 서식을 적용
 * @param {Object} sheet - XLSX 시트 객체
 * @param {Object} formatting - 서식 설정
 * @param {number} columnCount - 컬럼 수
 * @param {number} rowCount - 데이터 행 수
 */
function applyStringFormatting(sheet, formatting, columnCount, rowCount) {
  if (!sheet['!ref']) return;
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // 열 너비 설정 - 모든 컬럼을 MS Excel 기본값으로 통일
  sheet['!cols'] = [];
  for (let i = 0; i < columnCount; i++) {
    sheet['!cols'].push({ wch: 8.38 }); // MS Excel 기본 열 너비
  }
  
  // 첫 번째 행(헤더) 고정
  if (formatting.freezePane === 'A2') {
    sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };
  }
  
  // 자동 필터 추가
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  
  // 헤더 스타일 정의
  const headerStyle = {
    font: {
      name: formatting.headerFont.name || '맑은 고딕',
      sz: formatting.headerFont.size || 12,
      bold: formatting.headerFont.bold || true,
      color: { rgb: formatting.headerFont.color ? formatting.headerFont.color.replace('#', '') : '9C5700' }
    },
    fill: {
      fgColor: { rgb: formatting.headerBgColor ? formatting.headerBgColor.replace('#', '') : 'FFEB9C' }
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: false // 자동 줄바꿈 해제
    }
  };
  
  // 본문 스타일 정의
  const bodyStyle = {
    font: {
      name: formatting.bodyFont.name || '맑은 고딕',
      sz: formatting.bodyFont.size || 10
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },    // 검정색 일반 선
      bottom: { style: 'thin', color: { rgb: '000000' } }, // 검정색 일반 선
      left: { style: 'thin', color: { rgb: '000000' } },   // 검정색 일반 선
      right: { style: 'thin', color: { rgb: '000000' } }   // 검정색 일반 선
    },
    alignment: {
      vertical: 'center',
      wrapText: false // 자동 줄바꿈 해제
    }
  };
  
  // 숫자 스타일 정의 (가운데 정렬) - M4 String에서는 # 컬럼만 숫자
  const numberStyle = {
    font: {
      name: formatting.bodyFont.name || '맑은 고딕',
      sz: formatting.bodyFont.size || 10
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: false // 자동 줄바꿈 해제
    },
    numFmt: '0' // 숫자 포맷
  };
  
  // 헤더 행에 스타일 적용
  for (let c = 0; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: c });
    if (!sheet[cellAddr]) continue;
    sheet[cellAddr].s = headerStyle;
  }
  
  // 본문 셀에 스타일 적용
  // 실제 데이터가 있는 모든 셀에 스타일 적용 (빈 셀도 포함하여 테두리 완성)
  for (let r = 1; r <= rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {  // range.e.c 대신 columnCount 사용
      const cellAddr = XLSX.utils.encode_cell({ r: r, c: c });
      
      // 셀이 없으면 빈 셀 생성 (테두리를 위해)
      if (!sheet[cellAddr]) {
        sheet[cellAddr] = { t: 's', v: '' };
      }
      
      // M4 String의 숫자 컬럼은 # 컬럼(인덱스 0)만
      if (c === 0) {
        sheet[cellAddr].s = numberStyle;
        if (sheet[cellAddr].v !== '') {
          sheet[cellAddr].t = 'n'; // 숫자 타입으로 설정
        }
      } else {
        sheet[cellAddr].s = bodyStyle;
      }
    }
  }
}

module.exports = {
  mergeDialogueFiles,
  mergeStringFiles,
  progressTracker,
  validateInputFiles,
  getTodayDateString,
  getUniqueFileName
};