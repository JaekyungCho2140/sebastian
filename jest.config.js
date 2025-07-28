/**
 * Jest 설정 파일
 * Electron 앱 테스트를 위한 Jest 구성
 */
module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'node',
  
  // 테스트 파일 패턴
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // E2E 테스트 제외
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'
  ],
  
  // 모듈 파일 확장자
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // 커버리지 설정
  collectCoverage: true,
  collectCoverageFrom: [
    'merge.js',
    'renderer.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  coverageDirectory: 'coverage',
  
  // 변환 설정
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ]
    }]
  },
  
  // 테스트 타임아웃
  testTimeout: 30000,
  
  // 전역 설정
  globals: {
    __DEV__: true
  }
};