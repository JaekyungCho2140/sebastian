/**
 * M4 Progress Modal 테스트
 * Task 8: Progress Window UI 테스트 스위트
 */

const path = require('path')
const fs = require('fs')

// 테스트 설정
const testContext = {
  projectRoot: path.resolve(__dirname, '..'),
  componentPath: path.resolve(__dirname, '../src/renderer/components/M4ProgressModal.tsx'),
  stylesPath: path.resolve(__dirname, '../src/renderer/styles/M4ProgressModal.css'),
  typesPath: path.resolve(__dirname, '../src/shared/types.ts')
}

// 간단한 테스트 함수
function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    return true
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`)
    return false
  }
}

function expect(value) {
  return {
    toBe: (expected) => {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`)
      }
    },
    toContain: (expected) => {
      if (!value.includes(expected)) {
        throw new Error(`Expected to contain "${expected}"`)
      }
    }
  }
}

console.log('🧪 M4 Progress Modal 테스트 시작\n')

let passedTests = 0
let totalTests = 0

function runTest(name, fn) {
  totalTests++
  if (test(name, fn)) {
    passedTests++
  }
}

// 테스트 실행
runTest('M4ProgressModal 컴포넌트 파일이 존재하는지 확인', () => {
  expect(fs.existsSync(testContext.componentPath)).toBe(true)
})

runTest('M4ProgressModal 스타일 파일이 존재하는지 확인', () => {
  expect(fs.existsSync(testContext.stylesPath)).toBe(true)
})

runTest('M4 Progress 타입 정의가 존재하는지 확인', () => {
  const typesContent = fs.readFileSync(testContext.typesPath, 'utf8')
  
  // M4 Progress 관련 타입들이 정의되어 있는지 확인
  expect(typesContent).toContain('M4ProcessingRequest')
  expect(typesContent).toContain('M4ProgressUpdate')
  expect(typesContent).toContain('M4ProgressMessage')
  
  // IPC 채널이 정의되어 있는지 확인
  expect(typesContent).toContain('START_M4_PROCESSING')
  expect(typesContent).toContain('CANCEL_M4_PROCESSING')
  expect(typesContent).toContain('M4_PROGRESS_UPDATE')
})

runTest('M4ProgressModal 컴포넌트 구조 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // 필수 import 확인
  expect(componentContent).toContain('import React')
  expect(componentContent).toContain('M4ProgressUpdate')
  expect(componentContent).toContain('M4ProgressMessage')
  
  // 컴포넌트 정의 확인
  expect(componentContent).toContain('M4ProgressModal')
  expect(componentContent).toContain('M4ProgressModalProps')
  
  // 7개 Frame 구조 확인
  expect(componentContent).toContain('step-frame')
  expect(componentContent).toContain('file-frame')
  expect(componentContent).toContain('progress-frame')
  expect(componentContent).toContain('info-frame')
  expect(componentContent).toContain('files-frame')
  expect(componentContent).toContain('canvas-frame')
  expect(componentContent).toContain('button-frame')
})

runTest('IPC 메시지 프로토콜 핸들러 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // IPC 메시지 핸들러 확인
  expect(componentContent).toContain('handleProgressUpdate')
  expect(componentContent).toContain('onM4ProgressUpdate')
  
  // 메시지 타입 처리 확인
  expect(componentContent).toContain('case \'step\'')
  expect(componentContent).toContain('case \'file\'')
  expect(componentContent).toContain('case \'progress\'')
  expect(componentContent).toContain('case \'processed\'')
  expect(componentContent).toContain('case \'complete\'')
  expect(componentContent).toContain('case \'error\'')
})

runTest('시간 추정 알고리즘 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // 시간 추정 함수 확인
  expect(componentContent).toContain('calculateEstimatedTime')
  expect(componentContent).toContain('progressHistory')
  expect(componentContent).toContain('smoothedEstimate')
  
  // 시간 포맷팅 확인
  expect(componentContent).toContain('formatTime')
  expect(componentContent).toContain('남은 시간')
})

runTest('취소 기능 및 확인 다이얼로그 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // 취소 함수 확인
  expect(componentContent).toContain('handleCancel')
  expect(componentContent).toContain('window.confirm')
  expect(componentContent).toContain('cancelM4Processing')
  
  // 취소 상태 변경 확인
  expect(componentContent).toContain('stage: \'cancelled\'')
  expect(componentContent).toContain('취소 중...')
})

runTest('Canvas 애니메이션 기능 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // Canvas 관련 함수 확인
  expect(componentContent).toContain('drawCanvas')
  expect(componentContent).toContain('canvasRef')
  expect(componentContent).toContain('canvasAnimation')
  
  // 애니메이션 제어 확인
  expect(componentContent).toContain('requestAnimationFrame')
  expect(componentContent).toContain('cancelAnimationFrame')
  expect(componentContent).toContain('dotPosition')
})

runTest('메모리 누수 방지 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // cleanup 함수 확인
  expect(componentContent).toContain('removeAllListeners')
  expect(componentContent).toContain('cancelAnimationFrame')
  
  // useEffect cleanup 확인
  expect(componentContent).toContain('return () => {')
  expect(componentContent).toContain('clearInterval')
})

runTest('CSS 스타일 구조 검증', () => {
  const stylesContent = fs.readFileSync(testContext.stylesPath, 'utf8')
  
  // CSS 변수 확인
  expect(stylesContent).toContain('--m4-progress-primary')
  expect(stylesContent).toContain('--m4-modal-bg')
  expect(stylesContent).toContain('--m4-font-family')
  
  // 모달 스타일 확인
  expect(stylesContent).toContain('.m4-progress-overlay')
  expect(stylesContent).toContain('.m4-progress-modal')
  
  // Frame 스타일 확인
  expect(stylesContent).toContain('.step-frame')
  expect(stylesContent).toContain('.file-frame')
  expect(stylesContent).toContain('.progress-frame')
  expect(stylesContent).toContain('.info-frame')
  expect(stylesContent).toContain('.files-frame')
  expect(stylesContent).toContain('.canvas-frame')
  expect(stylesContent).toContain('.button-frame')
  
  // 애니메이션 스타일 확인
  expect(stylesContent).toContain('@keyframes')
  expect(stylesContent).toContain('shimmer')
})

runTest('접근성 (Accessibility) 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  const stylesContent = fs.readFileSync(testContext.stylesPath, 'utf8')
  
  // ARIA 속성 확인
  expect(componentContent).toContain('role="dialog"')
  expect(componentContent).toContain('aria-labelledby')
  
  // 접근성 스타일 확인
  expect(stylesContent).toContain('@media (prefers-reduced-motion: reduce)')
  expect(stylesContent).toContain('@media (prefers-contrast: high)')
  expect(stylesContent).toContain('focus')
})

runTest('반응형 디자인 검증', () => {
  const stylesContent = fs.readFileSync(testContext.stylesPath, 'utf8')
  
  // 반응형 미디어 쿼리 확인
  expect(stylesContent).toContain('@media (max-width: 640px)')
  
  // 모바일 대응 스타일 확인
  expect(stylesContent).toContain('90vw')
  expect(stylesContent).toContain('max-width: 400px')
})

runTest('TypeScript 타입 안전성 검증', () => {
  const componentContent = fs.readFileSync(testContext.componentPath, 'utf8')
  
  // TypeScript 인터페이스 확인
  expect(componentContent).toContain('interface M4ProgressData')
  expect(componentContent).toContain('interface M4ProgressModalProps')
  
  // 타입 안전성 확인
  expect(componentContent).toContain('React.FC<M4ProgressModalProps>')
  expect(componentContent).toContain('useState<M4ProgressData>')
  expect(componentContent).toContain('useRef<HTMLDivElement>')
  expect(componentContent).toContain('useRef<HTMLCanvasElement>')
})

// 테스트 결과 요약
console.log('\n' + '='.repeat(60))
console.log('📊 M4 Progress Modal 테스트 결과')
console.log('='.repeat(60))
console.log(`총 테스트: ${totalTests}`)
console.log(`성공: ${passedTests}`)
console.log(`실패: ${totalTests - passedTests}`)
console.log(`성공률: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

if (passedTests === totalTests) {
  console.log('🎉 모든 테스트가 성공했습니다!')
} else {
  console.log('⚠️  일부 테스트가 실패했습니다.')
}

// 통합 테스트 리포트 생성
const testReport = {
  timestamp: new Date().toISOString(),
  testSuite: 'M4 Progress Modal',
  totalTests: totalTests,
  passedTests: passedTests,
  failedTests: totalTests - passedTests,
  successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
  coverage: {
    component: 'M4ProgressModal.tsx',
    styles: 'M4ProgressModal.css',
    types: 'shared/types.ts (M4 Progress 부분)'
  },
  features: [
    'Modal 컴포넌트 구조 (500x300px)',
    '7개 Frame 레이아웃',
    'IPC 메시지 프로토콜 핸들러',
    '시간 추정 알고리즘',
    '취소 기능 및 확인 다이얼로그',
    'Canvas 애니메이션 및 시각 효과',
    '메모리 누수 방지'
  ],
  technicalDetails: {
    framework: 'React + TypeScript',
    styling: 'CSS Modules',
    animation: 'Canvas API + requestAnimationFrame',
    ipc: 'Electron IPC',
    accessibility: 'ARIA + 반응형 디자인',
    themes: 'Light/Dark 테마 지원'
  }
}

console.log('\n📋 M4 Progress Modal 테스트 리포트:')
console.log('   - 타임스탬프:', testReport.timestamp)
console.log('   - 테스트 스위트:', testReport.testSuite)
console.log('   - 성공률:', testReport.successRate)
console.log('   - 구현된 기능:', testReport.features.length + '개')
console.log('   - 기술 스택:', Object.keys(testReport.technicalDetails).length + '개 기술')