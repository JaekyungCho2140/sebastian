const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

console.log('=== Worker Message Test ===');

const workerPath = '/home/jkcho/repository/sebastian/dist/workers/m4ProcessWorker.js';
console.log('Worker path:', workerPath);
console.log('File exists:', fs.existsSync(workerPath));

try {
  const worker = new Worker(workerPath, {
    workerData: { workerId: 'message-test-worker' }
  });
  
  let messageCount = 0;
  let processingStarted = false;
  
  worker.on('message', (message) => {
    messageCount++;
    console.log(`[${messageCount}] Message received:`, message.type);
    
    if (message.type === 'initialized' && !processingStarted) {
      processingStarted = true;
      console.log('Sending start_processing message...');
      
      // 올바른 메시지 구조로 전송
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
      console.log('✅ Processing complete received');
      console.log('Success:', message.data.result.success);
      console.log('Error:', message.data.result.error);
      worker.terminate();
      console.log('✅ Worker Thread 메시지 처리 정상!');
      process.exit(0);
    } else if (messageCount > 10) {
      console.log('❌ Too many messages received, possible infinite loop');
      worker.terminate();
      process.exit(1);
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
  
  // 10초 후 타임아웃
  setTimeout(() => {
    console.log('⏰ Timeout - terminating worker');
    console.log('Total messages received:', messageCount);
    worker.terminate();
    process.exit(1);
  }, 10000);
  
} catch (error) {
  console.log('❌ Worker creation failed:', error.message);
  process.exit(1);
}