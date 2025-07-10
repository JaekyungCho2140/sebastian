# Sebastian Desktop Application

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/jkcho/sebastian/releases)
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
- Windows OS (MSI 설치 파일 지원)

### 설치 방법

#### 옵션 1: 설치 파일 사용 (권장)

1. [Releases](https://github.com/jkcho/sebastian/releases) 페이지에서 최신 MSI 파일 다운로드
2. 다운로드한 `sebastian-0.1.0.msi` 실행
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

# MSI 설치 파일 생성
npm run dist:win-msi
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
npm run dist:win-msi # Windows MSI 설치 파일 생성
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

## 📝 버전 히스토리

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
- ✨ MSI 설치 파일 빌드 시스템 구성

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