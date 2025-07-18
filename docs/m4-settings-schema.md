# M4 Settings Schema Design

## 개요

Sebastian 애플리케이션의 M4 Excel 처리 기능을 위한 설정 스키마를 설계했습니다. 기존 AppState 인터페이스를 확장하여 M4 처리 관련 설정을 관리할 수 있도록 구성했습니다.

## 주요 구성 요소

### 1. 확장된 AppState 인터페이스

```typescript
export interface AppState {
  version: string
  isUpdateAvailable: boolean
  lastUpdateCheck: number
  ignoredVersion?: string
  ignoreUntil?: number
  userPreferences: {
    theme: 'light' | 'dark'
    language: 'ko' | 'en'
  }
  m4Settings?: M4Settings // 새로 추가된 M4 설정
}
```

### 2. M4Settings 메인 인터페이스

```typescript
export interface M4Settings {
  version: string                    // 설정 버전 (마이그레이션 용)
  folderPaths: M4FolderPaths        // 폴더 경로 설정
  outputSettings: M4OutputSettings   // 출력 설정
  processingOptions: M4ProcessingOptions // 처리 옵션
  recentFolders: M4RecentFolders    // 최근 사용한 폴더 목록
  defaults: M4DefaultSettings       // 기본 설정
  lastUpdated: number               // 마지막 업데이트 시간
}
```

### 3. 폴더 경로 관리 (M4FolderPaths)

```typescript
export interface M4FolderPaths {
  dialogue: {
    inputFolder: string    // Dialogue 처리 입력 폴더
    outputFolder: string   // Dialogue 처리 출력 폴더
  }
  string: {
    inputFolder: string    // String 처리 입력 폴더
    outputFolder: string   // String 처리 출력 폴더
  }
  commonOutputDirectory: string // 공통 출력 디렉토리
}
```

### 4. 출력 설정 (M4OutputSettings)

```typescript
export interface M4OutputSettings {
  defaultOutputDirectory: string    // 출력 디렉토리 기본값
  outputFileNaming: M4OutputFileNaming // 출력 파일명 규칙
  createBackup: boolean             // 백업 파일 생성 여부
  backupRetentionDays: number       // 백업 파일 보관 기간
  compressOutput: boolean           // 출력 파일 압축 여부
  outputFormat: 'xlsx' | 'xlsm' | 'csv' // 출력 파일 형식
}
```

### 5. 처리 옵션 (M4ProcessingOptions)

```typescript
export interface M4ProcessingOptions {
  autoOpenOutput: boolean           // 자동 출력 열기
  preserveOriginalFiles: boolean    // 원본 파일 보존
  stopOnError: boolean              // 오류 시 처리 중단
  enableVerboseLogging: boolean     // 상세 로그 활성화
  enableParallelProcessing: boolean // 병렬 처리 활성화
  maxWorkerThreads: number          // 최대 워커 스레드 수
  memoryLimit: number               // 메모리 제한 (MB)
  processingTimeout: number         // 처리 타임아웃 (초)
  notificationSettings: M4NotificationSettings // 알림 설정
  validationSettings: M4ValidationSettings     // 검증 설정
}
```

### 6. 최근 사용한 폴더 관리 (M4RecentFolders)

```typescript
export interface M4RecentFolders {
  dialogue: M4RecentFolderItem[]    // Dialogue 최근 폴더 목록
  string: M4RecentFolderItem[]      // String 최근 폴더 목록
  maxItems: number                  // 최대 보관 개수
  autoCleanup: boolean              // 자동 정리 활성화
}

export interface M4RecentFolderItem {
  path: string                      // 폴더 경로
  lastUsed: number                  // 마지막 사용 시간
  usageCount: number                // 사용 빈도
  alias?: string                    // 폴더 별명
  isFavorite: boolean               // 즐겨찾기 여부
  validationStatus: 'valid' | 'invalid' | 'unknown' // 검증 상태
}
```

## 기본값 설정

```typescript
export const M4_SETTINGS_DEFAULTS: M4Settings = {
  version: '1.0.0',
  folderPaths: {
    dialogue: { inputFolder: '', outputFolder: '' },
    string: { inputFolder: '', outputFolder: '' },
    commonOutputDirectory: ''
  },
  outputSettings: {
    defaultOutputDirectory: '',
    outputFileNaming: {
      pattern: '{processType}_{timestamp}',
      includeTimestamp: true,
      timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
      includeProcessType: true,
      customPrefix: ''
    },
    createBackup: true,
    backupRetentionDays: 30,
    compressOutput: false,
    outputFormat: 'xlsx'
  },
  processingOptions: {
    autoOpenOutput: true,
    preserveOriginalFiles: true,
    stopOnError: false,
    enableVerboseLogging: false,
    enableParallelProcessing: true,
    maxWorkerThreads: 4,
    memoryLimit: 1024,
    processingTimeout: 300,
    notificationSettings: {
      notifyOnStart: true,
      notifyOnComplete: true,
      notifyOnError: true,
      soundNotification: true,
      systemNotification: true
    },
    validationSettings: {
      enableFileValidation: true,
      enableDataValidation: true,
      strictValidation: false,
      warningOnValidationFailure: false,
      customValidationRules: []
    }
  },
  recentFolders: {
    dialogue: [],
    string: [],
    maxItems: 10,
    autoCleanup: true
  },
  defaults: {
    defaultProcessType: 'dialogue',
    defaultInputFolder: '',
    defaultOutputFolder: '',
    defaultProcessingOptions: {},
    customDefaults: {}
  },
  lastUpdated: Date.now()
}
```

## 타입 가드 함수

### 주요 타입 가드

- `isM4Settings(value: any): value is M4Settings`
- `isM4FolderPaths(value: any): value is M4FolderPaths`
- `isM4RecentFolderItem(value: any): value is M4RecentFolderItem`
- `isM4ProcessingOptions(value: any): value is M4ProcessingOptions`

## 유틸리티 함수

### 설정 관리 함수

```typescript
// 설정 초기화
function initializeM4Settings(customDefaults?: Partial<M4Settings>): M4Settings

// 설정 병합
function mergeM4Settings(
  currentSettings: Partial<M4Settings>,
  newSettings: Partial<M4Settings>
): M4Settings

// 설정 검증
function validateM4Settings(settings: any): { isValid: boolean; errors: string[] }

// 설정 마이그레이션
function migrateM4Settings(
  oldSettings: any,
  targetVersion?: string
): M4Settings
```

### 최근 폴더 관리 함수

```typescript
// 최근 폴더 추가
function addRecentFolder(
  settings: M4Settings,
  processType: 'dialogue' | 'string',
  folderPath: string,
  alias?: string
): M4Settings

// 최근 폴더 정리
function cleanupRecentFolders(
  settings: M4Settings,
  maxAge?: number
): M4Settings
```

## IPC 채널 및 통신

### 새로 추가된 IPC 채널

```typescript
// M4 설정 채널
GET_M4_SETTINGS: 'get-m4-settings'
SET_M4_SETTINGS: 'set-m4-settings'
RESET_M4_SETTINGS: 'reset-m4-settings'
MIGRATE_M4_SETTINGS: 'migrate-m4-settings'
VALIDATE_M4_SETTINGS: 'validate-m4-settings'
ADD_RECENT_M4_FOLDER: 'add-recent-m4-folder'
REMOVE_RECENT_M4_FOLDER: 'remove-recent-m4-folder'
CLEANUP_RECENT_M4_FOLDERS: 'cleanup-recent-m4-folders'
```

### electronAPI 확장

```typescript
// M4 설정 함수 추가
getM4Settings: () => Promise<M4Settings>
setM4Settings: (settings: Partial<M4Settings>) => Promise<void>
resetM4Settings: () => Promise<M4Settings>
migrateM4Settings: (oldSettings: any, targetVersion?: string) => Promise<M4Settings>
validateM4Settings: (settings: M4Settings) => Promise<{ isValid: boolean; errors: string[] }>
addRecentM4Folder: (processType: 'dialogue' | 'string', folderPath: string, alias?: string) => Promise<M4Settings>
removeRecentM4Folder: (processType: 'dialogue' | 'string', folderPath: string) => Promise<M4Settings>
cleanupRecentM4Folders: (maxAge?: number) => Promise<M4Settings>
```

## 파일명 규칙 템플릿

```typescript
export const M4_FILENAME_PATTERNS = {
  SIMPLE: '{processType}',
  WITH_TIMESTAMP: '{processType}_{timestamp}',
  WITH_DATE: '{processType}_{date}',
  WITH_PREFIX: '{prefix}_{processType}',
  FULL: '{prefix}_{processType}_{timestamp}',
  CUSTOM: '{custom}'
} as const
```

## 타임스탬프 형식 옵션

```typescript
export const M4_TIMESTAMP_FORMATS = {
  DATETIME: 'YYYY-MM-DD_HH-mm-ss',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH-mm-ss',
  COMPACT: 'YYYYMMDDHHmmss',
  ISO: 'YYYY-MM-DDTHH:mm:ss'
} as const
```

## 호환성 및 마이그레이션

### 버전 관리

- 현재 버전: `1.0.0`
- 설정 버전을 통한 마이그레이션 지원
- 이전 버전 설정 자동 변환

### 마이그레이션 전략

1. **기존 설정 감지**: 이전 버전 설정 파일 존재 여부 확인
2. **버전 비교**: 현재 버전과 기존 설정 버전 비교
3. **단계별 마이그레이션**: 버전별 마이그레이션 로직 적용
4. **검증 및 백업**: 마이그레이션 후 설정 검증 및 백업 생성

### 기본값 보장

- 누락된 설정 항목 자동 추가
- 타입 안전성 보장
- 깊은 객체 병합 지원

## 사용 예제

### 기본 사용법

```typescript
// 설정 초기화
const settings = initializeM4Settings();

// 설정 업데이트
const updatedSettings = mergeM4Settings(settings, {
  folderPaths: {
    dialogue: {
      inputFolder: '/path/to/dialogue/input',
      outputFolder: '/path/to/dialogue/output'
    }
  }
});

// 최근 폴더 추가
const withRecentFolder = addRecentFolder(
  updatedSettings,
  'dialogue',
  '/path/to/dialogue/input',
  'My Dialogue Folder'
);
```

### 설정 검증

```typescript
const validation = validateM4Settings(settings);
if (!validation.isValid) {
  console.error('설정 검증 실패:', validation.errors);
}
```

### 설정 마이그레이션

```typescript
const oldSettings = loadOldSettings();
const migratedSettings = migrateM4Settings(oldSettings, '1.0.0');
```

## 테스트 커버리지

- 타입 정의 테스트: `tests/m4-settings-types.test.ts`
- 스키마 검증 테스트: `tests/m4-settings-schema-validation.js`
- 완전한 기능 테스트 포함
- 타입 가드 함수 테스트
- 유틸리티 함수 테스트
- 엣지 케이스 및 오류 처리 테스트
- npm 스크립트: `npm run test:m4-settings`

### 테스트 결과

```
✅ 21/21 tests passed (100% success rate)
📋 Test results saved to: test-outputs/m4-settings-schema-test-results.json
```

### 테스트 항목

1. TypeScript 타입 파일 존재 확인
2. M4Settings 인터페이스 정의 확인
3. M4FolderPaths 인터페이스 정의 확인
4. M4OutputSettings 인터페이스 정의 확인
5. M4ProcessingOptions 인터페이스 정의 확인
6. M4RecentFolders 인터페이스 정의 확인
7. M4RecentFolderItem 인터페이스 정의 확인
8. M4_SETTINGS_DEFAULTS 상수 확인
9. M4_FILENAME_PATTERNS 상수 확인
10. M4_TIMESTAMP_FORMATS 상수 확인
11. 타입 가드 함수 존재 확인
12. 유틸리티 함수 존재 확인
13. M4 설정 IPC 채널 확인
14. M4 설정 IPC 요청 타입 확인
15. M4 설정 IPC 응답 타입 확인
16. electronAPI M4 설정 함수 확인
17. AppState 인터페이스 M4Settings 포함 확인
18. M4NotificationSettings 인터페이스 확인
19. M4ValidationSettings 인터페이스 확인
20. M4OutputFileNaming 인터페이스 확인
21. M4DefaultSettings 인터페이스 확인

## 확장성 고려사항

### 미래 기능 추가

- 새로운 처리 타입 추가 지원
- 사용자 정의 설정 항목 확장
- 플러그인 시스템 호환성

### 성능 최적화

- 설정 캐싱 메커니즘
- 부분 업데이트 지원
- 메모리 사용량 최적화

이 설계를 통해 M4 Excel 처리 기능의 모든 설정을 체계적이고 안전하게 관리할 수 있으며, 향후 확장성과 호환성을 보장합니다.