// Performance test for Object Pool
const { 
  ObjectPool, 
  RowObjectPool, 
  ArrayPool,
  poolManager 
} = require('./src/services/m4/performance/object-pool.ts');

console.log('Object Pool Performance Test\n');
console.log('================================\n');

// Test configuration
const ITERATIONS = 100000;
const BATCH_SIZE = 1000;

// Test 1: Compare with and without Object Pool
console.log('Test 1: Object Creation Performance');
console.log('-----------------------------------');

// Without Object Pool
console.log('Without Object Pool:');
const startWithout = process.hrtime.bigint();
const objectsWithout = [];

for (let i = 0; i < ITERATIONS; i++) {
  const obj = {
    values: [],
    rowNumber: i,
    sheetId: 'Sheet1'
  };
  objectsWithout.push(obj);
  
  // Simulate usage and discard
  if (i % BATCH_SIZE === 0) {
    objectsWithout.length = 0;
  }
}

const endWithout = process.hrtime.bigint();
const timeWithout = Number(endWithout - startWithout) / 1000000; // Convert to ms

// Force GC if available
if (global.gc) {
  global.gc();
}

// With Object Pool
console.log('\nWith Object Pool:');
const pool = new RowObjectPool({
  initialSize: 100,
  maxSize: 1000,
  expansionSize: 100
});

const startWith = process.hrtime.bigint();

for (let i = 0; i < ITERATIONS; i++) {
  const obj = pool.acquire();
  obj.values = [];
  obj.rowNumber = i;
  obj.sheetId = 'Sheet1';
  
  // Simulate usage and release
  if (i % BATCH_SIZE === 0) {
    pool.release(obj);
  }
}

const endWith = process.hrtime.bigint();
const timeWith = Number(endWith - startWith) / 1000000; // Convert to ms

// Results
console.log('\nResults:');
console.log(`Without Pool: ${timeWithout.toFixed(2)}ms`);
console.log(`With Pool: ${timeWith.toFixed(2)}ms`);
console.log(`Performance Improvement: ${((timeWithout - timeWith) / timeWithout * 100).toFixed(2)}%`);

const poolStats = pool.getStats();
console.log('\nPool Statistics:');
console.log(`Objects Created: ${poolStats.created}`);
console.log(`Objects Reused: ${poolStats.acquired - poolStats.created}`);
console.log(`Hit Rate: ${(poolStats.hitRate * 100).toFixed(2)}%`);
console.log(`Reuse Ratio: ${((poolStats.acquired - poolStats.created) / poolStats.acquired * 100).toFixed(2)}%`);

// Test 2: Memory Usage Pattern
console.log('\n\nTest 2: Memory Usage Pattern');
console.log('----------------------------');

// Reset for memory test
poolManager.clearAll();

const memBefore = process.memoryUsage();
console.log('Memory Before:');
console.log(`Heap Used: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);

// Create many objects with pool
const arrayPool = new ArrayPool({
  initialSize: 50,
  maxSize: 500
});

const arrays = [];
for (let i = 0; i < 10000; i++) {
  const arr = arrayPool.acquire();
  arr.push(...Array(100).fill(i));
  arrays.push(arr);
  
  if (arrays.length > 100) {
    // Release old arrays
    const old = arrays.shift();
    arrayPool.release(old);
  }
}

const memAfter = process.memoryUsage();
console.log('\nMemory After:');
console.log(`Heap Used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Memory Delta: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

const arrayStats = arrayPool.getStats();
console.log('\nArray Pool Statistics:');
console.log(`Arrays Created: ${arrayStats.created}`);
console.log(`Arrays Reused: ${arrayStats.acquired - arrayStats.created}`);
console.log(`Current Pool Size: ${arrayStats.currentSize}`);
console.log(`Peak Pool Size: ${arrayStats.peakSize}`);

// Test 3: Concurrent Usage Simulation
console.log('\n\nTest 3: Concurrent Usage Simulation');
console.log('-----------------------------------');

const concurrentPool = new RowObjectPool({
  initialSize: 10,
  maxSize: 100
});

let concurrentAcquires = 0;
let concurrentReleases = 0;

// Simulate multiple "threads" using the pool
const promises = [];
for (let thread = 0; thread < 10; thread++) {
  promises.push(
    new Promise((resolve) => {
      setTimeout(() => {
        for (let i = 0; i < 1000; i++) {
          const obj = concurrentPool.acquire();
          concurrentAcquires++;
          
          // Simulate work
          obj.values = Array(10).fill(i);
          
          setTimeout(() => {
            concurrentPool.release(obj);
            concurrentReleases++;
          }, Math.random() * 10);
        }
        resolve();
      }, thread * 10);
    })
  );
}

Promise.all(promises).then(() => {
  setTimeout(() => {
    const concurrentStats = concurrentPool.getStats();
    console.log('\nConcurrent Usage Results:');
    console.log(`Total Acquires: ${concurrentAcquires}`);
    console.log(`Total Releases: ${concurrentReleases}`);
    console.log(`Objects Created: ${concurrentStats.created}`);
    console.log(`Hit Rate: ${(concurrentStats.hitRate * 100).toFixed(2)}%`);
    console.log(`Pool Expansions: ${concurrentStats.expansions}`);
    
    console.log('\n✅ Performance tests completed!');
    
    // Cleanup
    process.removeAllListeners();
    process.exit(0);
  }, 1000);
});

// Clean up test file
const fs = require('fs');
setTimeout(() => {
  fs.unlinkSync('./test-object-pool.js');
  fs.unlinkSync('./test-object-pool-performance.js');
}, 2000);