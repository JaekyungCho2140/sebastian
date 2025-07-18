const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testDataDir: path.join(__dirname, 'test-data'),
  outputDir: path.join(__dirname, 'test-outputs'),
  expectedColumns: [
    '#', 'Table Name', 'String ID', 'Table/ID', 'NPC ID', 'Speaker Name',
    'KO (M)', 'KO (F)', 'EN (M)', 'EN (F)', 'CT (M)', 'CT (F)',
    'CS (M)', 'CS (F)', 'JA (M)', 'JA (F)', 'TH (M)', 'TH (F)',
    'ES-LATAM (M)', 'ES-LATAM (F)', 'PT-BR (M)', 'PT-BR (F)', 'NOTE'
  ]
};

// Mock M4DialogueProcessor implementation for testing
class MockM4DialogueProcessor {
  constructor(logger) {
    this.logger = logger || ((message, level = 'info') => {
      console.log(`[MockM4DialogueProcessor:${level}] ${message}`);
    });
  }

  async processM4Dialogue(inputFolder, outputFolder, progressCallback) {
    const startTime = Date.now();
    const errors = [];
    
    try {
      this.logger('Starting M4 Dialogue processing');
      
      // 1. Load NPC mapping
      progressCallback?.(10, 'Loading NPC mapping data...');
      const npcMapping = await this.loadNPCMapping(inputFolder);
      
      // 2. Extract CINEMATIC_DIALOGUE
      progressCallback?.(30, 'Processing CINEMATIC_DIALOGUE...');
      const cinematicData = await this.extractCinematicDialogue(inputFolder, npcMapping);
      
      // 3. Extract SMALLTALK_DIALOGUE
      progressCallback?.(50, 'Processing SMALLTALK_DIALOGUE...');
      const smalltalkData = await this.extractSmalltalkDialogue(inputFolder, npcMapping);
      
      // 4. Merge data
      progressCallback?.(70, 'Merging dialogue data...');
      const mergedData = this.mergeDialogueData(cinematicData, smalltalkData);
      
      // 5. Create output Excel
      progressCallback?.(90, 'Creating output Excel file...');
      const outputFilePath = await this.createOutputExcel(mergedData, outputFolder);
      
      progressCallback?.(100, 'M4 Dialogue processing completed');
      
      return {
        success: true,
        outputFilePath,
        processedRows: mergedData.length,
        errors,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      this.logger(`M4 Dialogue processing failed: ${errorMessage}`, 'error');
      
      return {
        success: false,
        outputFilePath: '',
        processedRows: 0,
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }

  async loadNPCMapping(inputFolder) {
    const npcFilePath = path.join(inputFolder, 'NPC.xlsm');
    
    if (!fs.existsSync(npcFilePath)) {
      throw new Error(`NPC file not found: ${npcFilePath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(npcFilePath);
    
    const worksheet = workbook.getWorksheet('NPC');
    if (!worksheet) {
      throw new Error('NPC worksheet not found');
    }

    const npcMapping = {};
    
    // Read from row 2 (1 is header)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      const npcId = row.getCell(8).value; // Column 7 (0-indexed)
      const npcName = row.getCell(10).value; // Column 9 (0-indexed)
      
      if (npcId && npcName) {
        npcMapping[npcId.toString()] = npcName.toString();
      }
    }

    this.logger(`Loaded ${Object.keys(npcMapping).length} NPC mappings`);
    return npcMapping;
  }

  async extractCinematicDialogue(inputFolder, npcMapping) {
    const cinematicFilePath = path.join(inputFolder, 'CINEMATIC_DIALOGUE.xlsm');
    
    if (!fs.existsSync(cinematicFilePath)) {
      throw new Error(`CINEMATIC_DIALOGUE file not found: ${cinematicFilePath}`);
    }

    return await this.extractDialogueData(cinematicFilePath, {
      sheetName: 1,
      skipRows: 9,
      stringIdColumn: 8,
      npcIdColumn: 9,
      filterColumn: 14, // EN (M)
      languageColumns: {
        koM: 12, koF: 13, enM: 14, enF: 15,
        ctM: 16, ctF: 17, csM: 18, csF: 19,
        jaM: 20, jaF: 21, thM: 22, thF: 23,
        esLatamM: 24, esLatamF: 25,
        ptBrM: 26, ptBrF: 27, note: 30
      }
    }, npcMapping, 'CINEMATIC_DIALOGUE');
  }

  async extractSmalltalkDialogue(inputFolder, npcMapping) {
    const smalltalkFilePath = path.join(inputFolder, 'SMALLTALK_DIALOGUE.xlsm');
    
    if (!fs.existsSync(smalltalkFilePath)) {
      throw new Error(`SMALLTALK_DIALOGUE file not found: ${smalltalkFilePath}`);
    }

    return await this.extractDialogueData(smalltalkFilePath, {
      sheetName: 1,
      skipRows: 4,
      stringIdColumn: 8,
      npcIdColumn: 9,
      filterColumn: 15, // EN (M)
      languageColumns: {
        koM: 13, koF: 14, enM: 15, enF: 16,
        ctM: 17, ctF: 18, csM: 19, csF: 20,
        jaM: 21, jaF: 22, thM: 23, thF: 24,
        esLatamM: 25, esLatamF: 26,
        ptBrM: 27, ptBrF: 28, note: 31
      }
    }, npcMapping, 'SMALLTALK_DIALOGUE');
  }

  async extractDialogueData(filePath, config, npcMapping, tableName) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(config.sheetName);
    if (!worksheet) {
      throw new Error(`Worksheet not found: ${config.sheetName}`);
    }

    const dialogueData = [];
    
    // Process data rows (after skipRows)
    const startRow = config.skipRows + 1;
    
    for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Filter by EN (M) column
      const enMValue = row.getCell(config.filterColumn).value;
      if (!enMValue || 
          enMValue.toString().trim() === '' || 
          enMValue.toString().trim() === '0' ||
          enMValue.toString().trim() === '미사용') {
        continue;
      }

      const stringId = row.getCell(config.stringIdColumn).value?.toString() || '';
      const npcId = row.getCell(config.npcIdColumn).value?.toString() || '';
      
      // NPC name mapping
      const speakerName = npcMapping[npcId] || npcId;
      
      // Table/ID generation
      const tableId = `${tableName}/${stringId}`;
      
      const dialogueRow = {
        index: 0, // Set later
        tableName,
        stringId,
        tableId,
        npcId,
        speakerName,
        koM: row.getCell(config.languageColumns.koM).value?.toString() || '',
        koF: row.getCell(config.languageColumns.koF).value?.toString() || '',
        enM: row.getCell(config.languageColumns.enM).value?.toString() || '',
        enF: row.getCell(config.languageColumns.enF).value?.toString() || '',
        ctM: row.getCell(config.languageColumns.ctM).value?.toString() || '',
        ctF: row.getCell(config.languageColumns.ctF).value?.toString() || '',
        csM: row.getCell(config.languageColumns.csM).value?.toString() || '',
        csF: row.getCell(config.languageColumns.csF).value?.toString() || '',
        jaM: row.getCell(config.languageColumns.jaM).value?.toString() || '',
        jaF: row.getCell(config.languageColumns.jaF).value?.toString() || '',
        thM: row.getCell(config.languageColumns.thM).value?.toString() || '',
        thF: row.getCell(config.languageColumns.thF).value?.toString() || '',
        esLatamM: row.getCell(config.languageColumns.esLatamM).value?.toString() || '',
        esLatamF: row.getCell(config.languageColumns.esLatamF).value?.toString() || '',
        ptBrM: row.getCell(config.languageColumns.ptBrM).value?.toString() || '',
        ptBrF: row.getCell(config.languageColumns.ptBrF).value?.toString() || '',
        note: row.getCell(config.languageColumns.note).value?.toString() || ''
      };

      dialogueData.push(dialogueRow);
    }

    this.logger(`Extracted ${dialogueData.length} dialogue entries from ${tableName}`);
    return dialogueData;
  }

  mergeDialogueData(cinematicData, smalltalkData) {
    const mergedData = [...cinematicData, ...smalltalkData];
    
    // Set sequential index
    mergedData.forEach((row, index) => {
      row.index = index + 1;
    });
    
    this.logger(`Merged ${mergedData.length} dialogue entries`);
    return mergedData;
  }

  async createOutputExcel(dialogueData, outputFolder) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const filename = `${month}${day}_MIR4_MASTER_DIALOGUE.xlsx`;
    const outputPath = path.join(outputFolder, filename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dialogue Data');
    
    // Set headers
    const headers = TEST_CONFIG.expectedColumns;
    worksheet.getRow(1).values = headers;
    
    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = {
      name: '맑은 고딕',
      size: 12,
      bold: true,
      color: { argb: 'FF9C5700' }
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' }
    };
    
    // Data rows
    dialogueData.forEach((row, index) => {
      const excelRow = worksheet.getRow(index + 2);
      excelRow.values = [
        row.index, row.tableName, row.stringId, row.tableId, row.npcId, row.speakerName,
        row.koM, row.koF, row.enM, row.enF, row.ctM, row.ctF,
        row.csM, row.csF, row.jaM, row.jaF, row.thM, row.thF,
        row.esLatamM, row.esLatamF, row.ptBrM, row.ptBrF, row.note
      ];
      
      // Data styling
      excelRow.font = {
        name: '맑은 고딕',
        size: 10
      };
    });
    
    // Apply borders
    const totalRows = dialogueData.length + 1;
    const totalCols = headers.length;
    
    for (let rowNumber = 1; rowNumber <= totalRows; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      for (let colNumber = 1; colNumber <= totalCols; colNumber++) {
        const cell = row.getCell(colNumber);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
    
    // Freeze panes
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];
    
    // Column widths
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Save file
    await workbook.xlsx.writeFile(outputPath);
    
    this.logger(`Output file created: ${outputPath}`);
    return outputPath;
  }

  dispose() {
    this.logger('MockM4DialogueProcessor disposed');
  }
}

// Test utilities
class EndToEndTestUtils {
  static createTestDirectories() {
    [TEST_CONFIG.testDataDir, TEST_CONFIG.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  static async createCompleteTestData() {
    await this.createMockNPCFile();
    await this.createMockCinematicFile();
    await this.createMockSmalltalkFile();
  }

  static async createMockNPCFile() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NPC');
    
    // Headers
    worksheet.getRow(1).values = ['', '', '', '', '', '', '', 'NPC_ID', '', 'NPC_Name'];
    
    // Data
    worksheet.getRow(2).values = ['', '', '', '', '', '', '', 'NPC001', '', 'Test NPC 1'];
    worksheet.getRow(3).values = ['', '', '', '', '', '', '', 'NPC002', '', 'Test NPC 2'];
    worksheet.getRow(4).values = ['', '', '', '', '', '', '', 'NPC003', '', 'Test NPC 3'];
    
    const filePath = path.join(TEST_CONFIG.testDataDir, 'NPC.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log('✅ NPC.xlsm created');
  }

  static async createMockCinematicFile() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Headers (row 1)
    worksheet.getRow(1).values = [
      '', '', '', '', '', '', '', 'String_ID', 'NPC_ID', '', '',
      'KO_M', 'KO_F', 'EN_M', 'EN_F', 'CT_M', 'CT_F', 'CS_M', 'CS_F',
      'JA_M', 'JA_F', 'TH_M', 'TH_F', 'ES_LATAM_M', 'ES_LATAM_F',
      'PT_BR_M', 'PT_BR_F', '', '', 'NOTE'
    ];
    
    // Empty rows 2-9 (skip 9 rows)
    for (let i = 2; i <= 9; i++) {
      worksheet.getRow(i).values = Array(30).fill('');
    }
    
    // Data starting from row 10
    worksheet.getRow(10).values = [
      '', '', '', '', '', '', '', 'CINE001', 'NPC001', '', '',
      'Korean M 1', 'Korean F 1', 'English M 1', 'English F 1', 'Chinese M 1', 'Chinese F 1',
      'Czech M 1', 'Czech F 1', 'Japanese M 1', 'Japanese F 1', 'Thai M 1', 'Thai F 1',
      'Spanish M 1', 'Spanish F 1', 'Portuguese M 1', 'Portuguese F 1', '', '', 'Note 1'
    ];
    
    worksheet.getRow(11).values = [
      '', '', '', '', '', '', '', 'CINE002', 'NPC002', '', '',
      'Korean M 2', 'Korean F 2', 'English M 2', 'English F 2', 'Chinese M 2', 'Chinese F 2',
      'Czech M 2', 'Czech F 2', 'Japanese M 2', 'Japanese F 2', 'Thai M 2', 'Thai F 2',
      'Spanish M 2', 'Spanish F 2', 'Portuguese M 2', 'Portuguese F 2', '', '', 'Note 2'
    ];
    
    const filePath = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log('✅ CINEMATIC_DIALOGUE.xlsm created');
  }

  static async createMockSmalltalkFile() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Headers (row 1)
    worksheet.getRow(1).values = [
      '', '', '', '', '', '', '', 'String_ID', 'NPC_ID', '', '', '',
      'KO_M', 'KO_F', 'EN_M', 'EN_F', 'CT_M', 'CT_F', 'CS_M', 'CS_F',
      'JA_M', 'JA_F', 'TH_M', 'TH_F', 'ES_LATAM_M', 'ES_LATAM_F',
      'PT_BR_M', 'PT_BR_F', '', '', 'NOTE'
    ];
    
    // Empty rows 2-4 (skip 4 rows)
    for (let i = 2; i <= 4; i++) {
      worksheet.getRow(i).values = Array(31).fill('');
    }
    
    // Data starting from row 5
    worksheet.getRow(5).values = [
      '', '', '', '', '', '', '', 'SMALL001', 'NPC001', '', '', '',
      'Korean M 1', 'Korean F 1', 'English M 1', 'English F 1', 'Chinese M 1', 'Chinese F 1',
      'Czech M 1', 'Czech F 1', 'Japanese M 1', 'Japanese F 1', 'Thai M 1', 'Thai F 1',
      'Spanish M 1', 'Spanish F 1', 'Portuguese M 1', 'Portuguese F 1', '', '', 'Note 1'
    ];
    
    worksheet.getRow(6).values = [
      '', '', '', '', '', '', '', 'SMALL002', 'NPC002', '', '', '',
      'Korean M 2', 'Korean F 2', 'English M 2', 'English F 2', 'Chinese M 2', 'Chinese F 2',
      'Czech M 2', 'Czech F 2', 'Japanese M 2', 'Japanese F 2', 'Thai M 2', 'Thai F 2',
      'Spanish M 2', 'Spanish F 2', 'Portuguese M 2', 'Portuguese F 2', '', '', 'Note 2'
    ];
    
    const filePath = path.join(TEST_CONFIG.testDataDir, 'SMALLTALK_DIALOGUE.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log('✅ SMALLTALK_DIALOGUE.xlsm created');
  }

  static async validateOutputFile(outputPath) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output file not found: ${outputPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in output file');
    }

    // Check headers
    const headerRow = worksheet.getRow(1);
    TEST_CONFIG.expectedColumns.forEach((expectedHeader, index) => {
      const actualHeader = headerRow.getCell(index + 1).value;
      if (actualHeader !== expectedHeader) {
        throw new Error(`Header mismatch at column ${index + 1}: expected "${expectedHeader}", got "${actualHeader}"`);
      }
    });

    // Check data rows
    const dataRows = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = [];
      for (let colNumber = 1; colNumber <= TEST_CONFIG.expectedColumns.length; colNumber++) {
        rowData.push(row.getCell(colNumber).value);
      }
      dataRows.push(rowData);
    }

    // Validate data content
    if (dataRows.length < 1) {
      throw new Error('No data rows found in output file');
    }

    // Check NPC mapping
    const hasNpcMapping = dataRows.some(row => 
      row[5] && row[5].toString().includes('Test NPC')
    );
    
    if (!hasNpcMapping) {
      throw new Error('NPC mapping not applied correctly');
    }

    // Check sequential indexing
    const hasSequentialIndex = dataRows.every((row, index) => 
      row[0] === index + 1
    );
    
    if (!hasSequentialIndex) {
      throw new Error('Sequential indexing not applied correctly');
    }

    // Check Table/ID formatting
    const hasCorrectTableId = dataRows.every(row => 
      row[3] && row[3].toString().includes('/')
    );
    
    if (!hasCorrectTableId) {
      throw new Error('Table/ID formatting not applied correctly');
    }

    return {
      headers: TEST_CONFIG.expectedColumns,
      dataRows,
      rowCount: dataRows.length,
      hasNpcMapping,
      hasSequentialIndex,
      hasCorrectTableId
    };
  }

  static cleanup() {
    [TEST_CONFIG.testDataDir, TEST_CONFIG.outputDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }
}

// Test runner
class EndToEndTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runTest(testName, testFunction) {
    const testStart = Date.now();
    console.log(`\n[TEST] ${testName}`);
    
    try {
      await testFunction();
      const duration = Date.now() - testStart;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      this.testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      const duration = Date.now() - testStart;
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', duration, error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting M4 Dialogue Processor End-to-End Tests...\n');
    
    // Setup
    EndToEndTestUtils.createTestDirectories();
    await EndToEndTestUtils.createCompleteTestData();
    
    // Test 1: Full workflow execution
    await this.runTest('Full Workflow Execution', async () => {
      const processor = new MockM4DialogueProcessor();
      
      const progressSteps = [];
      const result = await processor.processM4Dialogue(
        TEST_CONFIG.testDataDir,
        TEST_CONFIG.outputDir,
        (progress, message) => {
          progressSteps.push({ progress, message });
          console.log(`     Progress: ${progress}% - ${message}`);
        }
      );
      
      if (!result.success) {
        throw new Error(`Processing failed: ${result.errors.join(', ')}`);
      }
      
      if (result.processedRows < 1) {
        throw new Error('No rows were processed');
      }
      
      if (progressSteps.length < 5) {
        throw new Error('Progress callback not called enough times');
      }
      
      console.log(`     Processed ${result.processedRows} rows in ${result.processingTime}ms`);
      processor.dispose();
    });
    
    // Test 2: Output file validation
    await this.runTest('Output File Validation', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const expectedFilename = `${month}${day}_MIR4_MASTER_DIALOGUE.xlsx`;
      const outputPath = path.join(TEST_CONFIG.outputDir, expectedFilename);
      
      const validation = await EndToEndTestUtils.validateOutputFile(outputPath);
      
      console.log(`     Validated ${validation.rowCount} data rows`);
      console.log(`     NPC mapping: ${validation.hasNpcMapping ? 'OK' : 'FAIL'}`);
      console.log(`     Sequential index: ${validation.hasSequentialIndex ? 'OK' : 'FAIL'}`);
      console.log(`     Table/ID format: ${validation.hasCorrectTableId ? 'OK' : 'FAIL'}`);
      
      if (!validation.hasNpcMapping || !validation.hasSequentialIndex || !validation.hasCorrectTableId) {
        throw new Error('Output validation failed');
      }
    });
    
    // Test 3: Excel formatting validation
    await this.runTest('Excel Formatting Validation', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const expectedFilename = `${month}${day}_MIR4_MASTER_DIALOGUE.xlsx`;
      const outputPath = path.join(TEST_CONFIG.outputDir, expectedFilename);
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(outputPath);
      
      const worksheet = workbook.getWorksheet(1);
      const headerRow = worksheet.getRow(1);
      
      // Check header formatting
      const headerCell = headerRow.getCell(1);
      const headerFont = headerCell.font;
      const headerFill = headerCell.fill;
      
      if (headerFont.name !== '맑은 고딕') {
        throw new Error('Header font not set correctly');
      }
      
      if (headerFont.size !== 12) {
        throw new Error('Header font size not set correctly');
      }
      
      if (!headerFont.bold) {
        throw new Error('Header font not bold');
      }
      
      if (headerFill.fgColor.argb !== 'FFFFEB9C') {
        throw new Error('Header fill color not set correctly');
      }
      
      // Check data formatting
      const dataRow = worksheet.getRow(2);
      const dataCell = dataRow.getCell(1);
      const dataFont = dataCell.font;
      
      if (dataFont.name !== '맑은 고딕') {
        throw new Error('Data font not set correctly');
      }
      
      if (dataFont.size !== 10) {
        throw new Error('Data font size not set correctly');
      }
      
      console.log('     Header formatting: OK');
      console.log('     Data formatting: OK');
      console.log('     Font: 맑은 고딕');
      console.log('     Header fill: #FFEB9C');
    });
    
    // Generate test report
    this.generateTestReport();
    
    // Cleanup disabled to preserve Excel files
    console.log('\n📁 Test files preserved in:', TEST_CONFIG.testDataDir);
    console.log('📁 Output files preserved in:', TEST_CONFIG.outputDir);
    // EndToEndTestUtils.cleanup();
  }

  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 M4 DIALOGUE PROCESSOR END-TO-END TEST REPORT');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => r.status === 'FAILED').forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    
    // Save test report
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }
    
    const reportPath = path.join(TEST_CONFIG.outputDir, `m4-dialogue-end-to-end-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      testResults: this.testResults
    }, null, 2));
    
    console.log(`📄 Test report saved: ${reportPath}`);
    
    // Exit with error code if tests failed
    if (failedTests > 0) {
      process.exit(1);
    }
  }
}

// Run tests
async function runTests() {
  const runner = new EndToEndTestRunner();
  await runner.runAllTests();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  EndToEndTestRunner,
  EndToEndTestUtils,
  MockM4DialogueProcessor,
  TEST_CONFIG
};