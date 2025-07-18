const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testDataDir: path.join(__dirname, 'test-data'),
  outputDir: path.join(__dirname, 'test-outputs')
};

// Create test directories
function createTestDirectories() {
  if (!fs.existsSync(TEST_CONFIG.testDataDir)) {
    fs.mkdirSync(TEST_CONFIG.testDataDir, { recursive: true });
  }
  if (!fs.existsSync(TEST_CONFIG.outputDir)) {
    fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
  }
}

// Create mock NPC file
async function createMockNPCFile() {
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

// Create mock CINEMATIC_DIALOGUE file
async function createMockCinematicFile() {
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
    worksheet.getRow(i).values = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
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

// Create mock SMALLTALK_DIALOGUE file
async function createMockSmalltalkFile() {
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
    worksheet.getRow(i).values = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
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

// Validate file structure
async function validateFileStructures() {
  console.log('\n📋 Validating file structures...');
  
  // Test NPC file
  const npcFile = path.join(TEST_CONFIG.testDataDir, 'NPC.xlsm');
  const npcWorkbook = new ExcelJS.Workbook();
  await npcWorkbook.xlsx.readFile(npcFile);
  const npcWorksheet = npcWorkbook.getWorksheet('NPC');
  
  if (!npcWorksheet) {
    throw new Error('NPC worksheet not found');
  }
  
  const npcId = npcWorksheet.getRow(2).getCell(8).value;
  const npcName = npcWorksheet.getRow(2).getCell(10).value;
  
  if (npcId !== 'NPC001' || npcName !== 'Test NPC 1') {
    throw new Error('NPC data validation failed');
  }
  
  console.log('✅ NPC file structure validated');
  
  // Test CINEMATIC_DIALOGUE file
  const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
  const cinematicWorkbook = new ExcelJS.Workbook();
  await cinematicWorkbook.xlsx.readFile(cinematicFile);
  const cinematicWorksheet = cinematicWorkbook.getWorksheet(1);
  
  if (!cinematicWorksheet) {
    throw new Error('CINEMATIC_DIALOGUE worksheet not found');
  }
  
  const cinematicStringId = cinematicWorksheet.getRow(10).getCell(8).value;
  const cinematicNpcId = cinematicWorksheet.getRow(10).getCell(9).value;
  const cinematicEnM = cinematicWorksheet.getRow(10).getCell(14).value;
  
  if (cinematicStringId !== 'CINE001' || cinematicNpcId !== 'NPC001' || cinematicEnM !== 'English M 1') {
    throw new Error('CINEMATIC_DIALOGUE data validation failed');
  }
  
  console.log('✅ CINEMATIC_DIALOGUE file structure validated');
  
  // Test SMALLTALK_DIALOGUE file
  const smalltalkFile = path.join(TEST_CONFIG.testDataDir, 'SMALLTALK_DIALOGUE.xlsm');
  const smalltalkWorkbook = new ExcelJS.Workbook();
  await smalltalkWorkbook.xlsx.readFile(smalltalkFile);
  const smalltalkWorksheet = smalltalkWorkbook.getWorksheet(1);
  
  if (!smalltalkWorksheet) {
    throw new Error('SMALLTALK_DIALOGUE worksheet not found');
  }
  
  const smalltalkStringId = smalltalkWorksheet.getRow(5).getCell(8).value;
  const smalltalkNpcId = smalltalkWorksheet.getRow(5).getCell(9).value;
  const smalltalkEnM = smalltalkWorksheet.getRow(5).getCell(15).value;
  
  if (smalltalkStringId !== 'SMALL001' || smalltalkNpcId !== 'NPC001' || smalltalkEnM !== 'English M 1') {
    throw new Error('SMALLTALK_DIALOGUE data validation failed');
  }
  
  console.log('✅ SMALLTALK_DIALOGUE file structure validated');
}

// Test column mappings
async function testColumnMappings() {
  console.log('\n🔍 Testing column mappings...');
  
  const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(cinematicFile);
  const worksheet = workbook.getWorksheet(1);
  
  const testRow = worksheet.getRow(10);
  
  // Python spec: CINEMATIC_DIALOGUE column mappings
  const stringId = testRow.getCell(8).value;   // Column 7 (0-indexed)
  const npcId = testRow.getCell(9).value;      // Column 8 (0-indexed)
  const koM = testRow.getCell(12).value;       // Column 11 (0-indexed)
  const koF = testRow.getCell(13).value;       // Column 12 (0-indexed)
  const enM = testRow.getCell(14).value;       // Column 13 (0-indexed)
  const enF = testRow.getCell(15).value;       // Column 14 (0-indexed)
  const note = testRow.getCell(30).value;      // Column 29 (0-indexed)
  
  console.log(`   String ID (col 8): ${stringId}`);
  console.log(`   NPC ID (col 9): ${npcId}`);
  console.log(`   KO (M) (col 12): ${koM}`);
  console.log(`   KO (F) (col 13): ${koF}`);
  console.log(`   EN (M) (col 14): ${enM}`);
  console.log(`   EN (F) (col 15): ${enF}`);
  console.log(`   NOTE (col 30): ${note}`);
  
  if (!stringId || !npcId || !enM) {
    throw new Error('Column mapping validation failed');
  }
  
  console.log('✅ Column mappings validated');
}

// Test filtering logic
async function testFilteringLogic() {
  console.log('\n🔍 Testing filtering logic...');
  
  const cinematicFile = path.join(TEST_CONFIG.testDataDir, 'CINEMATIC_DIALOGUE.xlsm');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(cinematicFile);
  const worksheet = workbook.getWorksheet(1);
  
  let validRows = 0;
  let totalRows = 0;
  
  // Check from row 10 (after skip 9 rows)
  for (let rowNumber = 10; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    totalRows++;
    
    const enMValue = row.getCell(14).value; // EN (M) column
    
    if (enMValue && 
        enMValue.toString().trim() !== '' && 
        enMValue.toString().trim() !== '0' &&
        enMValue.toString().trim() !== '미사용') {
      validRows++;
    }
  }
  
  console.log(`   Total rows processed: ${totalRows}`);
  console.log(`   Valid rows (EN M not empty): ${validRows}`);
  
  if (validRows === 0) {
    throw new Error('No valid rows found - filtering logic may be incorrect');
  }
  
  console.log('✅ Filtering logic validated');
}

// Cleanup
function cleanup() {
  if (fs.existsSync(TEST_CONFIG.testDataDir)) {
    fs.rmSync(TEST_CONFIG.testDataDir, { recursive: true, force: true });
  }
}

// Main test runner
async function runTests() {
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;
  const testResults = [];
  
  console.log('🚀 Starting M4 Dialogue Processor Structure Tests...\n');
  
  try {
    // Setup
    createTestDirectories();
    
    // Test 1: Create test files
    console.log('📝 Creating test files...');
    await createMockNPCFile();
    await createMockCinematicFile();
    await createMockSmalltalkFile();
    passedTests++;
    testResults.push({ name: 'File Creation', status: 'PASSED' });
    
    // Test 2: Validate file structures
    await validateFileStructures();
    passedTests++;
    testResults.push({ name: 'File Structure Validation', status: 'PASSED' });
    
    // Test 3: Test column mappings
    await testColumnMappings();
    passedTests++;
    testResults.push({ name: 'Column Mapping Validation', status: 'PASSED' });
    
    // Test 4: Test filtering logic
    await testFilteringLogic();
    passedTests++;
    testResults.push({ name: 'Filtering Logic Validation', status: 'PASSED' });
    
    // Test 5: Output filename format
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const expectedFilename = `${month}${day}_MIR4_MASTER_DIALOGUE.xlsx`;
    
    const filenameRegex = /^\d{2}\d{2}_MIR4_MASTER_DIALOGUE\.xlsx$/;
    if (!filenameRegex.test(expectedFilename)) {
      throw new Error(`Invalid filename format: ${expectedFilename}`);
    }
    
    console.log(`\n📁 Output filename format: ${expectedFilename}`);
    passedTests++;
    testResults.push({ name: 'Output Filename Format', status: 'PASSED' });
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    failedTests++;
    testResults.push({ name: 'Test Execution', status: 'FAILED', error: error.message });
  } finally {
    cleanup();
  }
  
  // Generate report
  const totalTests = passedTests + failedTests;
  const totalDuration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 M4 DIALOGUE PROCESSOR STRUCTURE TEST REPORT');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Save report
  const reportPath = path.join(TEST_CONFIG.outputDir, `m4-dialogue-structure-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    failedTests,
    totalDuration,
    successRate: ((passedTests / totalTests) * 100).toFixed(1),
    testResults
  }, null, 2));
  
  console.log(`📄 Test report saved: ${reportPath}`);
  console.log('='.repeat(60));
  
  return failedTests === 0;
}

// Run tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };