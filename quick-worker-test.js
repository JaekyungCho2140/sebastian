const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

console.log('=== Quick Worker Integration Test ===');

// 테스트 데이터 디렉토리 확인
const testDataDir = path.join(__dirname, 'tests', 'test-data');
console.log('Test data dir:', testDataDir);
console.log('Test data exists:', fs.existsSync(testDataDir));

// 필수 파일 확인
const requiredFiles = ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm'];
requiredFiles.forEach(file => {
  const filePath = path.join(testDataDir, file);
  console.log(`${file} exists:`, fs.existsSync(filePath));
});

// 출력 디렉토리 생성
const outputDir = path.join(__dirname, 'tests', 'test-outputs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const workerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
console.log('Worker path:', workerPath);

try {
  const worker = new Worker(workerPath, {
    workerData: { workerId: 'quick-test-worker' }
  });
  
  let messageCount = 0;
  let processingStarted = false;
  
  worker.on('message', (message) => {
    messageCount++;
    console.log(`[${messageCount}] Message:`, message.type);
    
    if (message.type === 'initialized' && !processingStarted) {
      processingStarted = true;
      console.log('Starting M4 Dialogue processing...');
      
      worker.postMessage({
        type: 'start_processing',
        messageId: 'quick-test-msg',
        timestamp: Date.now(),
        data: {
          taskId: 'quick-test-task',
          config: {
            type: 'dialogue',
            inputFolder: testDataDir,
            outputFolder: outputDir,
            outputFileName: 'quick-test-output.xlsx',
            requiredFiles: ['CINEMATIC_DIALOGUE.xlsm', 'SMALLTALK_DIALOGUE.xlsm', 'NPC.xlsm']
          }
        }
      });
    } else if (message.type === 'progress_update') {
      console.log('Progress:', message.data.progress + '%', message.data.statusMessage);
    } else if (message.type === 'processing_complete') {
      console.log('✅ Processing complete!');
      console.log('Success:', message.data.result.success);
      console.log('Error:', message.data.result.error);
      console.log('Output path:', message.data.result.outputPath);
      console.log('Total messages:', messageCount);
      worker.terminate();
      console.log('✅ Worker Thread 통합 테스트 성공!');
      process.exit(0);
    }
  });
  
  worker.on('error', (error) => {
    console.log('❌ Worker error:', error.message);
    process.exit(1);
  });
  
  worker.on('exit', (code) => {
    console.log('Worker exited with code:', code);
    process.exit(code);
  });
  
  // 30초 후 타임아웃
  setTimeout(() => {
    console.log('⏰ Timeout - terminating worker');
    console.log('Total messages received:', messageCount);
    worker.terminate();
    process.exit(1);
  }, 30000);
  
} catch (error) {
  console.log('❌ Worker creation failed:', error.message);
  process.exit(1);
}