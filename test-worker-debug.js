const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// 절대 경로로 Worker 실행
const workerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
console.log('Worker path:', workerPath);
console.log('File exists:', fs.existsSync(workerPath));

// 현재 작업 디렉토리 확인
console.log('Current directory:', process.cwd());

try {
  const worker = new Worker(workerPath, {
    workerData: { workerId: 'test-absolute-path' }
  });
  
  let workerReady = false;
  
  worker.on('message', (message) => {
    console.log('Message received:', message.type);
    
    if (message.type === 'initialized' && !workerReady) {
      workerReady = true;
      console.log('Worker initialized successfully');
      
      // 테스트 메시지 전송
      worker.postMessage({
        type: 'start_processing',
        messageId: 'test-msg-001',
        timestamp: Date.now(),
        data: {
          taskId: 'test-task',
          config: {
            type: 'dialogue',
            inputFolder: '/tmp/test',
            outputFolder: '/tmp/test',
            outputFileName: 'test.xlsx',
            requiredFiles: ['test.xlsx']
          }
        }
      });
    } else if (message.type === 'processing_complete') {
      console.log('Processing complete:', message.data.result.success);
      console.log('Error:', message.data.result.error);
      worker.terminate();
      process.exit(0);
    }
  });
  
  worker.on('error', (error) => {
    console.error('Worker error:', error);
    process.exit(1);
  });
  
  worker.on('exit', (code) => {
    console.log('Worker exited with code:', code);
    process.exit(code);
  });
  
  // 5초 후 강제 종료
  setTimeout(() => {
    console.log('Timeout - terminating worker');
    worker.terminate();
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.error('Failed to create worker:', error);
  process.exit(1);
}