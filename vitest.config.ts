import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    
    // Jest 호환성
    setupFiles: ['./tests/setup.ts'],
    
    // 타임아웃 설정
    testTimeout: 120000,
    hookTimeout: 60000,
    
    // 병렬 실행 설정
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{ts,js}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,js}',
        'src/**/*.spec.{ts,js}',
        'src/renderer/components/**/*.tsx',
        'dist/**',
        'node_modules/**',
        'tests/**',
        'coverage/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    
    // 리포터 설정
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-report.json',
    },
    
    // 모듈 리졸빙
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@main': resolve(__dirname, 'src/main'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@services': resolve(__dirname, 'src/services'),
        '@workers': resolve(__dirname, 'src/workers'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@types': resolve(__dirname, 'src/types'),
      },
    },
    
    // Electron 모킹
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
  
  // TypeScript 설정
  esbuild: {
    target: 'node18',
  },
});