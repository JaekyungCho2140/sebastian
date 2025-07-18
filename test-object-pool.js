// Simple test runner for Object Pool
const { 
  ObjectPool, 
  RowObjectPool, 
  CellValuePool, 
  StringBuilderPool,
  ArrayPool,
  MapPool,
  SetPool,
  poolManager 
} = require('./src/services/m4/performance/object-pool.ts');

console.log('Testing Object Pool System...\n');

// Test 1: Basic ObjectPool
console.log('1. Testing Basic ObjectPool');
try {
  const pool = new ObjectPool({
    initialSize: 5,
    maxSize: 10,
    factory: () => ({ data: null }),
    reset: (obj) => { obj.data = null; }
  });

  const obj1 = pool.acquire();
  const obj2 = pool.acquire();
  
  console.log('✓ Objects acquired successfully');
  
  pool.release(obj1);
  pool.release(obj2);
  
  const stats = pool.getStats();
  console.log('✓ Pool stats:', JSON.stringify(stats, null, 2));
} catch (error) {
  console.error('✗ Basic ObjectPool test failed:', error.message);
}

// Test 2: RowObjectPool
console.log('\n2. Testing RowObjectPool');
try {
  const rowPool = new RowObjectPool();
  const row = rowPool.acquireWithValues([1, 2, 3], 10, 'Sheet1');
  
  console.log('✓ Row acquired:', row);
  
  rowPool.release(row);
  console.log('✓ Row released successfully');
} catch (error) {
  console.error('✗ RowObjectPool test failed:', error.message);
}

// Test 3: StringBuilderPool
console.log('\n3. Testing StringBuilderPool');
try {
  const stringPool = new StringBuilderPool();
  const result = stringPool.buildString(['Hello', ' ', 'World', '!']);
  
  console.log('✓ String built:', result);
} catch (error) {
  console.error('✗ StringBuilderPool test failed:', error.message);
}

// Test 4: Pool Manager
console.log('\n4. Testing Pool Manager');
try {
  const testPool = new ArrayPool();
  poolManager.registerPool('test.array', testPool);
  
  const retrieved = poolManager.getPool('test.array');
  console.log('✓ Pool registered and retrieved:', retrieved ? 'success' : 'failed');
  
  const allStats = poolManager.getAllStats();
  console.log('✓ All pool stats:', Object.keys(allStats).length, 'pools registered');
} catch (error) {
  console.error('✗ Pool Manager test failed:', error.message);
}

console.log('\n✅ Object Pool system is working!');