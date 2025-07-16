# Sebastian Desktop Application

[![Version](https://img.shields.io/badge/version-0.1.28-blue.svg)](https://github.com/jkcho/sebastian/releases)
[![Electron](https://img.shields.io/badge/electron-37.2.0-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19.1.0-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8.3-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Sebastian은 Electron, React, TypeScript를 기반으로 한 데스크톱 애플리케이션입니다.

## ✨ 주요 기능

- 🪟 **고정 크기 윈도우** (640x480 픽셀)
- 🎯 **Success Demo 버튼** - 네이티브 다이얼로그 표시
- 📌 **실시간 버전 표시** - 애플리케이션 버전 자동 감지
- 🔄 **자동 업데이트 확인** - GitHub 릴리즈 연동
- 💾 **상태 관리 시스템** - 설정 및 상태 지속성
- 🎨 **확장 가능한 UI** - CSS Grid 기반 모듈식 디자인

## 🚀 시작하기

### 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- Windows OS (NSIS 설치 파일 지원)

### 설치 방법

#### 옵션 1: 설치 파일 사용 (권장)

1. [Releases](https://github.com/jkcho/sebastian/releases) 페이지에서 최신 설치 파일 다운로드
2. 다운로드한 `Sebastian-0.1.28-Setup.exe` 실행
3. 설치 마법사 지시에 따라 설치
4. 시작 메뉴 또는 데스크톱 바로가기에서 실행

#### 옵션 2: 소스 코드에서 빌드

```bash
# 저장소 클론
git clone https://github.com/jkcho/sebastian.git
cd sebastian

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build

# NSIS 설치 파일 생성
npm run dist:win-nsis
```

## 📦 스크립트

```bash
# 개발
npm run dev          # 개발 서버 실행 (Hot Reload)

# 빌드
npm run build        # 전체 빌드
npm run build:clean  # 클린 빌드

# 패키징
npm run pack         # 실행 파일 생성
npm run dist         # 배포 패키지 생성
npm run dist:win-nsis # Windows NSIS 설치 파일 생성
```

## 🏗️ 프로젝트 구조

```
sebastian/
├── src/
│   ├── main/           # Electron 메인 프로세스
│   │   ├── index.ts
│   │   ├── ipc-handlers.ts
│   │   ├── state-manager.ts
│   │   └── services/
│   │       └── updateService.ts
│   ├── renderer/       # React 렌더러 프로세스
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── styles/
│   ├── preload/        # Preload 스크립트
│   └── shared/         # 공유 타입 정의
├── public/             # 정적 파일
├── dist/               # 빌드 출력
└── release/            # 패키징 출력
```

## 🛠️ 기술 스택

- **Electron** (37.2.0) - 데스크톱 애플리케이션 프레임워크
- **React** (19.1.0) - UI 라이브러리
- **TypeScript** (5.8.3) - 타입 안전성
- **Vite** (7.0.3) - 빌드 도구
- **electron-builder** (26.0.12) - 패키징 도구
- **electron-store** (10.1.0) - 상태 지속성

## 🔧 설정

### 업데이트 확인 설정

애플리케이션은 기본적으로 24시간마다 자동으로 업데이트를 확인합니다. GitHub 저장소를 변경하려면 `src/main/ipc-handlers.ts`에서 설정을 수정하세요:

```typescript
updateService = new UpdateService(stateManager, {
  githubRepo: 'your-username/your-repo',
  checkInterval: 24 * 60 * 60 * 1000, // 24시간
});
```

## 🛠️ 문제 해결 (NSIS 설치 관련)

### 일반적인 설치 문제

#### 1. 설치 권한 오류
**문제**: "Administrator privileges required" 오류
**해결책**:
- 설치 파일을 우클릭하여 "관리자 권한으로 실행" 선택
- 사용자 계정 컨트롤(UAC)에서 "예" 클릭

#### 2. 설치 파일 실행 불가
**문제**: "파일이 손상되었거나 신뢰할 수 없습니다" 오류
**해결책**:
- 다시 다운로드 후 재시도
- Windows Defender 또는 백신 소프트웨어에서 예외 처리
- 파일 속성에서 "차단 해제" 선택

#### 3. 설치 경로 오류
**문제**: 설치 경로에 특수 문자가 있을 때 설치 실패
**해결책**:
- 영문 경로로 설치 (예: C:\Program Files\Sebastian)
- 공백이 없는 경로 사용 권장

#### 4. 이전 버전 제거 문제
**문제**: "이전 버전을 제거할 수 없습니다" 오류
**해결책**:
- 제어판에서 수동으로 이전 버전 제거
- 레지스트리 청소 도구 사용
- 재부팅 후 다시 설치

### 업데이트 관련 문제

#### 1. 자동 업데이트 실패
**문제**: 업데이트 다운로드 또는 설치 실패
**해결책**:
- 인터넷 연결 확인
- 방화벽 설정 확인
- 수동으로 최신 버전 다운로드

#### 2. 업데이트 후 실행 불가
**문제**: 업데이트 후 애플리케이션이 시작되지 않음
**해결책**:
- 재부팅 후 재시도
- 완전 삭제 후 재설치
- 시스템 호환성 확인

### 시스템 요구사항 확인

#### 지원 운영체제
- Windows 10 (1903) 이상
- Windows 11 (모든 버전)
- Windows Server 2019 이상

#### 필요 구성 요소
- Visual C++ Redistributable (자동 설치)
- .NET Framework 4.8 이상
- 최소 4GB RAM
- 200MB 이상 여유 공간

### 로그 및 디버깅

#### 설치 로그 확인
```bash
# 상세 설치 로그와 함께 설치 실행
Sebastian-0.1.28-Setup.exe /S /D=C:\Sebastian
```

#### 애플리케이션 로그 위치
```
%USERPROFILE%\AppData\Roaming\Sebastian\logs\
```

### 지원 요청

문제가 지속되면 다음 정보와 함께 [GitHub Issues](https://github.com/jkcho/sebastian/issues)에 문의하세요:

1. 운영체제 버전
2. 설치 시도 중 발생한 오류 메시지
3. 설치 로그 파일 (가능한 경우)
4. 재현 단계

## 📝 버전 히스토리

### v0.1.28 (2025-07-16)

#### 새로운 기능
- ✨ NSIS 설치 시스템으로 완전 전환 (MSI 대체)
- ✨ 향상된 자동 업데이트 시스템 구현
- ✨ 개선된 설치 및 업데이트 UI
- ✨ 통합 테스트 시스템 구축 (8/8 테스트 통과)

#### 기술적 개선
- 🔧 NSIS 기반 설치 패키지 생성 시스템
- 🔧 설치 진행률 모니터링 시스템 강화
- 🔧 오류 처리 및 복구 메커니즘 개선
- 🔧 Windows 호환성 테스트 및 검증

### v0.1.0 (2025-07-10)

#### 새로운 기능
- ✨ Electron + React + TypeScript 기반 구조 구축
- ✨ 640x480 고정 크기 윈도우 구현
- ✨ Success Demo 버튼 기능 추가
- ✨ 실시간 버전 표시 시스템 구현
- ✨ IPC 기반 타입 안전 통신 시스템 구축
- ✨ 애플리케이션 상태 관리 시스템 (electron-store 통합)
- ✨ GitHub API 기반 자동 업데이트 확인 기능
- ✨ CSS Grid 기반 확장 가능한 UI 시스템
- ✨ NSIS 설치 파일 빌드 시스템 구성

#### 기술적 개선
- 🔧 TypeScript 전체 적용으로 타입 안전성 확보
- 🔧 모듈식 스타일시트 아키텍처 구현
- 🔧 보안 강화 (Context Isolation, Node Integration 비활성화)
- 🔧 싱글 인스턴스 강제 및 프로세스 관리
- 🔧 오프라인 동작 및 에러 처리 시스템

## 🤝 기여하기

기여를 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📧 연락처

프로젝트 관련 문의사항이 있으시면 [Issues](https://github.com/jkcho/sebastian/issues) 페이지를 이용해주세요.

---

Made with ❤️ using Electron, React, and TypeScript