/**
 * Test Fixtures Creator for M4 Worker Integration Tests
 * 
 * 이 스크립트는 M4 Worker Thread 통합 테스트를 위한 Excel 파일 픽스처를 생성합니다.
 * 다양한 크기와 시나리오의 테스트 데이터를 생성하여 테스트 커버리지를 높입니다.
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// 테스트 데이터 디렉토리
const TEST_DATA_DIR = path.join(__dirname, 'test-data');

// 테스트 픽스처 생성 함수
class TestFixtureCreator {
  constructor() {
    this.ensureTestDataDir();
  }

  // 테스트 데이터 디렉토리 생성
  ensureTestDataDir() {
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  }

  // 기본 CINEMATIC_DIALOGUE.xlsm 픽스처 생성
  async createCinematicDialogueFixture() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CINEMATIC_DIALOGUE');
    
    // 헤더 설정 (9행 스킵 후 실제 헤더)
    const headers = [
      'ID', 'Scene', 'Character', 'Dialogue_KR', 'Dialogue_EN', 'Dialogue_JP', 
      'Dialogue_CN', 'NPC_ID', 'NPC_Name', 'Voice_File', 'Animation',
      'EN (M)', 'JP (M)', 'CN (M)', 'TW (M)', 'TH (M)', 'ID (M)', 'VI (M)',
      'DE (M)', 'FR (M)', 'ES (M)', 'PT (M)', 'RU (M)', 'TR (M)', 'PL (M)', 'IT (M)', 'HI (M)'
    ];
    
    // 처음 9행은 빈 행으로 설정 (Python 명세에 따라)
    for (let i = 1; i <= 9; i++) {
      worksheet.addRow([]);
    }
    
    // 10행에 헤더 추가
    worksheet.addRow(headers);
    
    // 테스트 데이터 추가 (100개 행)
    for (let i = 1; i <= 100; i++) {
      const rowData = [
        i, // ID
        `Scene_${i}`, // Scene
        `Character_${i}`, // Character
        `한국어 대사 ${i}`, // Dialogue_KR
        `English dialogue ${i}`, // Dialogue_EN
        `日本語セリフ ${i}`, // Dialogue_JP
        `中文对话 ${i}`, // Dialogue_CN
        i * 10, // NPC_ID
        '', // NPC_Name (빈 칸, NPC 매핑에서 채워짐)
        `voice_${i}.wav`, // Voice_File
        `anim_${i}`, // Animation
        i % 2 === 0 ? i : '', // EN (M) - 필터링 테스트용
        i % 3 === 0 ? i : '', // JP (M)
        i % 4 === 0 ? i : '', // CN (M)
        i % 5 === 0 ? i : '', // TW (M)
        i % 6 === 0 ? i : '', // TH (M)
        i % 7 === 0 ? i : '', // ID (M)
        i % 8 === 0 ? i : '', // VI (M)
        i % 9 === 0 ? i : '', // DE (M)
        i % 10 === 0 ? i : '', // FR (M)
        i % 11 === 0 ? i : '', // ES (M)
        i % 12 === 0 ? i : '', // PT (M)
        i % 13 === 0 ? i : '', // RU (M)
        i % 14 === 0 ? i : '', // TR (M)
        i % 15 === 0 ? i : '', // PL (M)
        i % 16 === 0 ? i : '', // IT (M)
        i % 17 === 0 ? i : ''  // HI (M)
      ];
      worksheet.addRow(rowData);
    }
    
    const filePath = path.join(TEST_DATA_DIR, 'CINEMATIC_DIALOGUE.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ Created: ${filePath}`);
    
    return filePath;
  }

  // 기본 SMALLTALK_DIALOGUE.xlsm 픽스처 생성
  async createSmalltalkDialogueFixture() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SMALLTALK_DIALOGUE');
    
    // 헤더 설정 (4행 스킵 후 실제 헤더)
    const headers = [
      'ID', 'Category', 'NPC_Type', 'Dialogue_KR', 'Dialogue_EN', 'Dialogue_JP', 
      'Dialogue_CN', 'NPC_ID', 'NPC_Name', 'Condition', 'Trigger',
      'EN (M)', 'JP (M)', 'CN (M)', 'TW (M)', 'TH (M)', 'ID (M)', 'VI (M)',
      'DE (M)', 'FR (M)', 'ES (M)', 'PT (M)', 'RU (M)', 'TR (M)', 'PL (M)', 'IT (M)', 'HI (M)'
    ];
    
    // 처음 4행은 빈 행으로 설정 (Python 명세에 따라)
    for (let i = 1; i <= 4; i++) {
      worksheet.addRow([]);
    }
    
    // 5행에 헤더 추가
    worksheet.addRow(headers);
    
    // 테스트 데이터 추가 (50개 행)
    for (let i = 1; i <= 50; i++) {
      const rowData = [
        i, // ID
        `Category_${i}`, // Category
        `NPC_Type_${i}`, // NPC_Type
        `한국어 잡담 ${i}`, // Dialogue_KR
        `English smalltalk ${i}`, // Dialogue_EN
        `日本語雑談 ${i}`, // Dialogue_JP
        `中文闲聊 ${i}`, // Dialogue_CN
        i * 20, // NPC_ID
        '', // NPC_Name (빈 칸, NPC 매핑에서 채워짐)
        `condition_${i}`, // Condition
        `trigger_${i}`, // Trigger
        i % 2 === 0 ? i : '', // EN (M) - 필터링 테스트용
        i % 3 === 0 ? i : '', // JP (M)
        i % 4 === 0 ? i : '', // CN (M)
        i % 5 === 0 ? i : '', // TW (M)
        i % 6 === 0 ? i : '', // TH (M)
        i % 7 === 0 ? i : '', // ID (M)
        i % 8 === 0 ? i : '', // VI (M)
        i % 9 === 0 ? i : '', // DE (M)
        i % 10 === 0 ? i : '', // FR (M)
        i % 11 === 0 ? i : '', // ES (M)
        i % 12 === 0 ? i : '', // PT (M)
        i % 13 === 0 ? i : '', // RU (M)
        i % 14 === 0 ? i : '', // TR (M)
        i % 15 === 0 ? i : '', // PL (M)
        i % 16 === 0 ? i : '', // IT (M)
        i % 17 === 0 ? i : ''  // HI (M)
      ];
      worksheet.addRow(rowData);
    }
    
    const filePath = path.join(TEST_DATA_DIR, 'SMALLTALK_DIALOGUE.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ Created: ${filePath}`);
    
    return filePath;
  }

  // 기본 NPC.xlsm 픽스처 생성
  async createNPCFixture() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NPC');
    
    // 헤더 설정
    const headers = [
      'ID', 'Name_KR', 'Name_EN', 'Name_JP', 'Name_CN', 'Type', 'Level',
      'NPC_ID', 'Location', 'NPC_Name', 'Description', 'Model', 'Texture'
    ];
    
    // 헤더 추가
    worksheet.addRow(headers);
    
    // NPC 데이터 추가 (ID 매핑용)
    const npcData = [
      // CINEMATIC_DIALOGUE용 NPC (ID * 10)
      ...Array.from({ length: 100 }, (_, i) => [
        (i + 1) * 10, // ID
        `NPC_${i + 1}`, // Name_KR
        `NPC_${i + 1}`, // Name_EN
        `NPC_${i + 1}`, // Name_JP
        `NPC_${i + 1}`, // Name_CN
        'Cinematic', // Type
        i + 1, // Level
        (i + 1) * 10, // NPC_ID
        `Location_${i + 1}`, // Location
        `NPC_${i + 1}`, // NPC_Name
        `Description ${i + 1}`, // Description
        `model_${i + 1}`, // Model
        `texture_${i + 1}` // Texture
      ]),
      // SMALLTALK_DIALOGUE용 NPC (ID * 20)
      ...Array.from({ length: 50 }, (_, i) => [
        (i + 1) * 20, // ID
        `Smalltalk_NPC_${i + 1}`, // Name_KR
        `Smalltalk_NPC_${i + 1}`, // Name_EN
        `Smalltalk_NPC_${i + 1}`, // Name_JP
        `Smalltalk_NPC_${i + 1}`, // Name_CN
        'Smalltalk', // Type
        i + 1, // Level
        (i + 1) * 20, // NPC_ID
        `ST_Location_${i + 1}`, // Location
        `Smalltalk_NPC_${i + 1}`, // NPC_Name
        `Smalltalk Description ${i + 1}`, // Description
        `st_model_${i + 1}`, // Model
        `st_texture_${i + 1}` // Texture
      ])
    ];
    
    // 데이터 추가
    npcData.forEach(row => worksheet.addRow(row));
    
    const filePath = path.join(TEST_DATA_DIR, 'NPC.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ Created: ${filePath}`);
    
    return filePath;
  }

  // 대용량 CINEMATIC_DIALOGUE.xlsm 픽스처 생성 (성능 테스트용)
  async createLargeCinematicDialogueFixture() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CINEMATIC_DIALOGUE');
    
    // 헤더 설정
    const headers = [
      'ID', 'Scene', 'Character', 'Dialogue_KR', 'Dialogue_EN', 'Dialogue_JP', 
      'Dialogue_CN', 'NPC_ID', 'NPC_Name', 'Voice_File', 'Animation',
      'EN (M)', 'JP (M)', 'CN (M)', 'TW (M)', 'TH (M)', 'ID (M)', 'VI (M)',
      'DE (M)', 'FR (M)', 'ES (M)', 'PT (M)', 'RU (M)', 'TR (M)', 'PL (M)', 'IT (M)', 'HI (M)'
    ];
    
    // 처음 9행은 빈 행으로 설정
    for (let i = 1; i <= 9; i++) {
      worksheet.addRow([]);
    }
    
    // 10행에 헤더 추가
    worksheet.addRow(headers);
    
    // 대용량 테스트 데이터 추가 (5000개 행)
    console.log('Creating large dataset with 5000 rows...');
    for (let i = 1; i <= 5000; i++) {
      const rowData = [
        i, // ID
        `Scene_${i}`, // Scene
        `Character_${i}`, // Character
        `한국어 대사 ${i} - 대용량 테스트를 위한 긴 텍스트 데이터입니다. 이 데이터는 메모리 사용량과 처리 성능을 테스트하기 위해 생성되었습니다.`, // Dialogue_KR
        `English dialogue ${i} - Large text data for performance testing. This data is created to test memory usage and processing performance.`, // Dialogue_EN
        `日本語セリフ ${i} - パフォーマンステストのための大きなテキストデータです。このデータはメモリ使用量と処理性能をテストするために作成されました。`, // Dialogue_JP
        `中文对话 ${i} - 用于性能测试的大文本数据。此数据用于测试内存使用量和处理性能。`, // Dialogue_CN
        i * 10, // NPC_ID
        '', // NPC_Name
        `voice_${i}.wav`, // Voice_File
        `anim_${i}`, // Animation
        i % 2 === 0 ? i : '', // EN (M)
        i % 3 === 0 ? i : '', // JP (M)
        i % 4 === 0 ? i : '', // CN (M)
        i % 5 === 0 ? i : '', // TW (M)
        i % 6 === 0 ? i : '', // TH (M)
        i % 7 === 0 ? i : '', // ID (M)
        i % 8 === 0 ? i : '', // VI (M)
        i % 9 === 0 ? i : '', // DE (M)
        i % 10 === 0 ? i : '', // FR (M)
        i % 11 === 0 ? i : '', // ES (M)
        i % 12 === 0 ? i : '', // PT (M)
        i % 13 === 0 ? i : '', // RU (M)
        i % 14 === 0 ? i : '', // TR (M)
        i % 15 === 0 ? i : '', // PL (M)
        i % 16 === 0 ? i : '', // IT (M)
        i % 17 === 0 ? i : ''  // HI (M)
      ];
      worksheet.addRow(rowData);
      
      // 진행 상황 표시
      if (i % 500 === 0) {
        console.log(`Progress: ${i}/5000 rows (${(i/5000*100).toFixed(1)}%)`);
      }
    }
    
    const filePath = path.join(TEST_DATA_DIR, 'CINEMATIC_DIALOGUE_LARGE.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ Created: ${filePath}`);
    
    return filePath;
  }

  // 손상된 파일 픽스처 생성 (에러 테스트용)
  async createCorruptedFileFixture() {
    const filePath = path.join(TEST_DATA_DIR, 'CORRUPTED_DIALOGUE.xlsm');
    
    // 잘못된 Excel 파일 생성 (텍스트 파일로 생성)
    const corruptedContent = `
      This is not a valid Excel file.
      This file is created to test error handling.
      It should cause an error when trying to parse as Excel.
    `;
    
    fs.writeFileSync(filePath, corruptedContent);
    console.log(`✅ Created corrupted file: ${filePath}`);
    
    return filePath;
  }

  // 빈 파일 픽스처 생성 (에러 테스트용)
  async createEmptyFileFixture() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('EMPTY_DIALOGUE');
    
    // 헤더만 있고 데이터가 없는 파일
    const headers = [
      'ID', 'Scene', 'Character', 'Dialogue_KR', 'Dialogue_EN', 'Dialogue_JP', 
      'Dialogue_CN', 'NPC_ID', 'NPC_Name', 'Voice_File', 'Animation',
      'EN (M)', 'JP (M)', 'CN (M)', 'TW (M)', 'TH (M)', 'ID (M)', 'VI (M)',
      'DE (M)', 'FR (M)', 'ES (M)', 'PT (M)', 'RU (M)', 'TR (M)', 'PL (M)', 'IT (M)', 'HI (M)'
    ];
    
    // 처음 9행은 빈 행
    for (let i = 1; i <= 9; i++) {
      worksheet.addRow([]);
    }
    
    // 10행에 헤더만 추가 (데이터 없음)
    worksheet.addRow(headers);
    
    const filePath = path.join(TEST_DATA_DIR, 'EMPTY_DIALOGUE.xlsm');
    await workbook.xlsx.writeFile(filePath);
    console.log(`✅ Created empty file: ${filePath}`);
    
    return filePath;
  }

  // 모든 픽스처 생성
  async createAllFixtures() {
    console.log('🔧 Creating test fixtures for M4 Worker integration tests...\n');
    
    try {
      // 기본 파일들
      await this.createCinematicDialogueFixture();
      await this.createSmalltalkDialogueFixture();
      await this.createNPCFixture();
      
      // 성능 테스트용 대용량 파일
      await this.createLargeCinematicDialogueFixture();
      
      // 에러 테스트용 파일들
      await this.createCorruptedFileFixture();
      await this.createEmptyFileFixture();
      
      console.log('\n✅ All test fixtures created successfully!');
      console.log(`📁 Test data directory: ${TEST_DATA_DIR}`);
      
      // 생성된 파일 목록 출력
      const files = fs.readdirSync(TEST_DATA_DIR);
      console.log('\n📄 Generated files:');
      files.forEach(file => {
        const filePath = path.join(TEST_DATA_DIR, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
      
    } catch (error) {
      console.error('❌ Error creating test fixtures:', error);
      process.exit(1);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const creator = new TestFixtureCreator();
  creator.createAllFixtures().catch(console.error);
}

module.exports = TestFixtureCreator;