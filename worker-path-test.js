const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

console.log('=== Worker Path Test ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// 상대 경로 테스트
const relativePath = path.resolve(__dirname, 'dist', 'workers', 'm4ProcessWorker.js');
console.log('Relative path:', relativePath);
console.log('Relative path exists:', fs.existsSync(relativePath));

// 절대 경로 테스트
const absolutePath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
console.log('Absolute path:', absolutePath);
console.log('Absolute path exists:', fs.existsSync(absolutePath));

// Worker 생성 테스트
try {
  console.log('\n=== Testing Worker Creation ===');
  const worker = new Worker(absolutePath, {
    workerData: { workerId: 'path-test-worker' }
  });
  
  let messageReceived = false;
  
  worker.on('message', (message) => {
    console.log('✅ Worker message received:', message.type);
    messageReceived = true;
    worker.terminate();
    console.log('✅ Worker Thread 경로 문제 해결됨!');
    process.exit(0);
  });
  
  worker.on('error', (error) => {
    console.log('❌ Worker error:', error.message);
    console.log('❌ Worker Thread 경로 문제 미해결');
    process.exit(1);
  });
  
  worker.on('exit', (code) => {
    if (!messageReceived) {
      console.log('❌ Worker exited without message, code:', code);
      process.exit(1);
    }
  });
  
  // 3초 후 타임아웃
  setTimeout(() => {
    console.log('⏰ Timeout - Worker Thread 응답 없음');
    worker.terminate();
    process.exit(1);
  }, 3000);
  
} catch (error) {
  console.log('❌ Worker creation failed:', error.message);
  console.log('❌ Worker Thread 경로 문제 미해결');
  process.exit(1);
}