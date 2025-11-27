# Sebastian PRD - Master Document

**문서 버전**: 1.6
**최종 수정**: 2025-11-27
**상태**: Approved

---

## 1. 프로젝트 개요

### 1.1 프로젝트명

**Sebastian** - L10n팀 통합 업무 자동화 도구

### 1.2 배경

L10n(Localization) 팀은 게임 현지화 업무를 위해 여러 도구와 수작업 프로세스를 사용하고 있습니다:
- Excel 기반 일정 계산
- 수동 JIRA 일감 생성
- 수동 폴더 구조 생성
- n8n 워크플로 기반 자동화 (Daily Task, Daily Scrum, Slack MSG)
- Excel 매크로 기반 테이블 병합

이러한 분산된 도구들을 하나의 데스크톱 애플리케이션으로 통합하여 업무 효율성을 높이고자 합니다.

### 1.3 목표

**주요 목표**:
- 반복적인 수작업을 자동화하여 업무 시간 단축
- 분산된 도구를 단일 애플리케이션으로 통합
- 일관된 데이터 관리 및 설정 시스템 제공

**성공 지표**:
- 일정 계산 → JIRA 생성 → 폴더 생성 프로세스 자동화
- n8n 워크플로 100% 대체
- 테이블 병합/분할 작업 시간 50% 단축

### 1.4 범위

**포함**:
- 자동 일정 계산기 (JIRA 생성, 폴더 생성)
- 메시지 템플릿 (헤즈업, HO)
- 테이블 병합/분할 (M4/GL, NC/GL, LY/GL)
- L10N Admin 자동화 (Daily Task, Daily Scrum, Slack MSG)

**제외**:
- 번역 작업 자체
- 파일 동기화/버전 관리
- 다국어 UI (한국어 단일 지원)
- 푸터 유틸리티 (Text Previewer, srt2xlsx, 다중 키워드 검색) - 별도 구현

---

## 2. 문서 구조

Sebastian PRD는 모듈화된 구조로 작성되어 있습니다.

### 2.1 문서 목록

| 문서 | 설명 | 우선순위 |
|------|------|----------|
| **sebastian-prd-master.md** | 마스터 문서 (본 문서) | - |
| **sebastian-prd-shared.md** | 공통 컴포넌트 (UI, 설정, 데이터) | 필수 |
| **sebastian-prd-scheduler.md** | 일정 계산기, JIRA 생성, 폴더 생성 | P0 |
| **sebastian-prd-table-merge.md** | 테이블 병합/분할 | P1 |
| **sebastian-prd-messaging.md** | 메시지 템플릿 | P1 |
| **sebastian-prd-l10n-admin.md** | L10N Admin 자동화 | P2 |

### 2.2 문서 관계

```
sebastian-prd-master.md (본 문서)
    │
    ├── sebastian-prd-shared.md ←── 모든 Feature 문서가 참조
    │
    ├── sebastian-prd-scheduler.md
    │       └── 일정 계산 결과 → messaging.md에서 사용
    │
    ├── sebastian-prd-table-merge.md
    │
    ├── sebastian-prd-messaging.md
    │       └── 템플릿 변수 ← shared.md에서 정의
    │
    └── sebastian-prd-l10n-admin.md
            └── 스케줄 설정 ← shared.md의 config.json
```

### 2.3 읽기 순서

1. **sebastian-prd-master.md** - 전체 개요 파악
2. **sebastian-prd-shared.md** - 공통 요소 이해
3. 관심 Feature 문서 선택하여 상세 확인

---

## 3. 기능 요약

### 3.1 일정/메시지 탭

| 기능 | 설명 | 참조 |
|------|------|------|
| 자동 일정 계산 | 업데이트일 기준 마일스톤 일정 자동 계산 | scheduler.md 3장 |
| JIRA 일감 생성 | Epic/Task/Subtask 자동 생성 | scheduler.md 4장 |
| 폴더 생성 | NAS 폴더 구조 자동 생성 | scheduler.md 5장 |
| 헤즈업 메시지 | 업데이트 일정 사전 안내 템플릿 | messaging.md 4장 |
| HO 메시지 | 번역 자산 전달 안내 템플릿 | messaging.md 5장 |

### 3.2 테이블 병합 탭

| 기능 | 설명 | 참조 |
|------|------|------|
| M4/GL 병합 | DIALOGUE + STRING + 통합 테이블 병합 | table-merge.md 3장 |
| NC/GL 병합 | 8개 언어 테이블 병합 | table-merge.md 4장 |
| LY/GL 병합/분할 | 테이블 병합 및 언어별 분할 | table-merge.md 5장 |

### 3.3 관리 탭

| 기능 | 설명 | 참조 |
|------|------|------|
| Daily Task | Confluence 월간 템플릿 자동 생성 | l10n-admin.md 3장 |
| Daily Scrum | Confluence 일일 업데이트 | l10n-admin.md 4장 |
| Slack MSG | 평일 출근 알림 메시지 | l10n-admin.md 5장 |

---

## 4. 기술 아키텍처

### 4.1 기술 스택

| 구분 | 기술 | 용도 |
|------|------|------|
| 언어 | Python 3.11+ | 메인 언어 |
| GUI | PyQt6 | 데스크톱 UI |
| HTTP | requests | API 통신 |
| Excel | openpyxl, pandas | 엑셀 처리 |
| 스케줄링 | APScheduler | 백그라운드 작업 |
| 암호화 | keyring | 인증 정보 보호 |

### 4.2 데이터 구조

```
%APPDATA%/Sebastian/
├── config.json          # 공통 설정 (인증, 스케줄, L10N Admin 채널)
├── projects.json        # 프로젝트별 설정 (메시지 채널 포함)
├── templates.json       # 메시지 템플릿
├── holidays.json        # 공휴일 데이터
└── logs/
    └── sebastian.log    # 실행 로그
```

### 4.3 외부 연동

| 서비스 | API | 용도 |
|--------|-----|------|
| JIRA | REST API v3 | 일감 생성/조회 |
| Confluence | REST API v2 | 페이지 업데이트 |
| Slack | Web API | 메시지 발송 |
| date.nager.at | Public API | 공휴일 조회 |

---

## 5. 비기능 요구사항

### 5.1 성능

**성능 기준**: 아래 수치는 **권장 목표**이며, 하드 리밋이 아닙니다. 목표 미달성 시 경고를 표시하되 작업은 계속 진행합니다.

| 항목 | 권장 목표 | 초과 시 동작 |
|------|----------|-------------|
| 일정 계산 | < 1초 | 경고 없음 (빠름) |
| JIRA 일감 생성 (최대 11개) | < 15초 | 순차 생성 방식 유지, 초과 시 완료까지 대기 |
| 테이블 병합 (10만 행) | < 30초 | 경고 표시: "병합 시간이 예상보다 오래 걸립니다. 파일 크기를 확인하세요." |
| 앱 시작 | < 3초 | 경고 없음 (시스템 환경 의존) |

**구현 가이드**:
- **일정 계산**: Python 기본 datetime 연산 사용
- **JIRA 일감 생성**: 순차 API 호출 (병렬 처리 안 함)
- **테이블 병합**: pandas 기본 함수 사용, 청크 처리나 멀티스레딩 불필요
- **앱 시작**: PyQt6 최적화, 설정 파일 로드 최소화

### 5.2 사용성

| 항목 | 요구사항 |
|------|----------|
| 학습 시간 | 30분 이내 기능 파악 |
| 주요 작업 | 3클릭 이내 완료 |
| 에러 메시지 | 명확한 원인 및 해결 방법 제시 |
| 로그 | 모든 작업 결과 기록 |

### 5.3 보안

| 항목 | 요구사항 |
|------|----------|
| 인증 정보 | Windows Credential Manager 저장 |
| PIN 보호 | 민감한 설정 변경 시 4자리 PIN 요구 |
| 네트워크 | HTTPS 통신 |

### 5.4 안정성

| 항목 | 요구사항 |
|------|----------|
| 에러 복구 | 재시도 정책 (최대 3회, 5초 간격) |
| 데이터 백업 | 수동 내보내기/가져오기 |
| 로그 보존 | 최근 30일 |

---

## 6. 제약사항 및 가정

### 6.1 제약사항

- **플랫폼**: Windows 10+ 전용
- **네트워크**: 사내 네트워크 접속 필요 (JIRA, Confluence, Slack)
- **NAS**: 네트워크 드라이브 마운트 필요
- **언어**: 한국어 UI 단일 지원

### 6.2 가정

- 사용자는 JIRA, Confluence, Slack 계정 보유
- NAS 폴더 생성 권한 보유
- 프로젝트별 Index Excel 시트 존재
- 공휴일 API (date.nager.at) 가용성 유지

### 6.3 의존성

- JIRA Cloud API 가용성
- Confluence Cloud API 가용성
- Slack API 가용성
- 한국 공휴일 API (date.nager.at)

---

## 7. 지원 프로젝트

| 프로젝트 | 코드 | JIRA Key | 지원 기능 | 비고 |
|----------|------|----------|-----------|------|
| MIR4 Global | M4GL | L10NM4 | 일정, 테이블 병합, 메시지 | - |
| NC Global | NCGL | L10NNC | 일정, 테이블 병합, 메시지 | - |
| FB Global | FBGL | L10NFB | 일정, 메시지 | - |
| LY Global | LYGL | L10NLY | 일정, 테이블 병합/분할, 메시지 | - |
| L10N 월간 정산 | L10N | L10N | 일정 (월간 정산용) | 기준일: 정산 마감일 |
| L10N 공통 | L10N | L10N | L10N Admin | Daily Task/Scrum/Slack MSG |

---

## 8. 마일스톤

### Phase 1: 핵심 기능 (P0)
- [ ] 공통 컴포넌트 (UI 프레임워크, 설정 시스템)
- [ ] 자동 일정 계산기
- [ ] JIRA 일감 생성
- [ ] 폴더 생성

### Phase 2: 부가 기능 (P1)
- [ ] 테이블 병합 (M4/GL, NC/GL, LY/GL)
- [ ] 메시지 템플릿 (헤즈업, HO)

### Phase 3: 안정화 (P2)
- [ ] 에러 처리 강화
- [ ] 성능 최적화
- [ ] 사용자 피드백 반영

### Phase 4: L10N Admin (P3)
- [ ] L10N Admin (Daily Task, Daily Scrum, Slack MSG)
- [ ] 스케줄 시스템


---

## 9. 배포 및 설치

### 9.1 기술 스택

| 영역 | 기술 | 버전 | 비고 |
|------|------|------|------|
| **언어** | Python | 3.11+ | - |
| **UI 프레임워크** | PyQt6 | 6.x | - |
| **Excel 처리** | openpyxl | - | .xlsx 파일 처리 |
| **HTTP 클라이언트** | requests | - | API 호출 |
| **스케줄링** | APScheduler | - | L10N Admin 백그라운드 작업 |
| **암호화** | keyring | - | 인증 정보 안전 저장 |
| **패키징** | PyInstaller | - | 단일 실행 파일 생성 |

### 9.2 패키징 방법

**PyInstaller 사용**:

```bash
# 기본 빌드
pyinstaller --name Sebastian \
  --windowed \
  --onefile \
  --icon=assets/icon.ico \
  src/main.py

# 옵션 설명:
# --windowed: 콘솔 창 숨기기 (GUI 앱)
# --onefile: 단일 .exe 파일로 생성
# --icon: 앱 아이콘 지정
# --add-data: 추가 리소스 번들 (holidays.json 등)
```

**리소스 번들링**:
```bash
pyinstaller --name Sebastian \
  --windowed \
  --onefile \
  --icon=assets/icon.ico \
  --add-data="data/holidays.json;data" \
  --add-data="assets/icon.png;assets" \
  src/main.py
```

### 9.3 설치 폴더 구조

**배포 파일 구조**:
```
Sebastian_v1.0/
├── Sebastian.exe           # 실행 파일
├── README.txt              # 설치 안내
└── data/
    └── holidays.json       # 기본 공휴일 데이터 (2025~2027)
```

**설치 후 폴더 구조**:
```
%APPDATA%/Sebastian/
├── config.json             # 사용자 설정
├── projects.json           # 프로젝트 설정
├── templates.json          # 메시지 템플릿
├── holidays.json           # 공휴일 데이터
└── logs/
    └── sebastian.log       # 실행 로그
```

### 9.4 설치 방법

**사용자 설치 절차**:
1. `Sebastian.exe` 다운로드
2. 원하는 위치에 복사 (예: `C:\Program Files\Sebastian\`)
3. `Sebastian.exe` 실행
4. 초기 설정 마법사 진행 (12장 참조)
5. 완료 후 메인 화면 표시

**시스템 요구사항**:
- Windows 10 이상
- 디스크 공간: 100MB 이상
- 네트워크: JIRA/Slack/Confluence 연동 시 필요

### 9.5 업데이트 정책

**수동 업데이트** (v1.0):
1. 새 버전 `Sebastian.exe` 다운로드
2. 기존 실행 파일 덮어쓰기
3. 설정 파일은 `%APPDATA%/Sebastian/`에 유지 (자동 보존)
4. 재실행 시 기존 설정으로 동작

**자동 업데이트** (v2.0 이후 고려):
- GitHub Releases API 확인
- 새 버전 감지 시 알림
- 사용자 승인 후 다운로드 및 설치
- 현재는 미구현 (수동 업데이트만 지원)

### 9.6 제거 방법

**언인스톨 절차**:
1. `Sebastian.exe` 파일 삭제
2. (선택) `%APPDATA%/Sebastian/` 폴더 삭제 (설정 완전 제거)
3. (선택) Windows Credential Manager에서 Sebastian 관련 항목 삭제

**설정 유지 제거**:
- `Sebastian.exe`만 삭제
- `%APPDATA%/Sebastian/` 유지
- 재설치 시 기존 설정 재사용 가능

### 9.7 개발 환경 설정

**개발자용** (소스 코드 실행):

```bash
# 저장소 클론
git clone <repository_url>
cd sebastian

# 가상환경 생성
python -m venv venv
venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 개발 모드 실행
python src/main.py

# 테스트 실행
pytest tests/

# 빌드
pyinstaller sebastian.spec
```

**requirements.txt** (예시):
```
PyQt6>=6.4.0
openpyxl>=3.0.0
requests>=2.28.0
APScheduler>=3.10.0
keyring>=23.0.0
pytest>=7.0.0
```

---

## 11. 용어집

| 용어 | 정의 |
|------|------|
| L10n | Localization의 약자, 현지화 |
| HO | Handoff, 번역 자산 전달 |
| 헤즈업 | Heads-up, 사전 안내 메시지 |
| 테이블 | 게임 내 텍스트 데이터를 담은 스프레드시트 |
| M4GL | MIR4 글로벌 |
| NCGL | 나이트크로우 글로벌 |
| LYGL | 레전드 오브 이미르 글로벌 |
| FBGL | 파이널 블레이드 글로벌 |
| Epic | JIRA 일감 유형 - 최상위 |
| Task | JIRA 일감 유형 - 중간 |
| Subtask | JIRA 일감 유형 - 최하위 |

---

## 12. 외부 시스템 ID 검증 체크리스트

개발 시작 전 실제 환경에서 모든 외부 시스템 ID의 유효성을 검증해야 합니다.

### 12.1 JIRA Custom Field ID

**위치**: scheduler.md 3.6절, 4.3절

| Custom Field | ID | 용도 | 검증 방법 | 상태 |
|--------------|-----|------|----------|------|
| Start Date | `customfield_10569` | Epic/Task/Subtask 시작일 | JIRA REST API `/rest/api/3/field` 조회 | ⚠️ 검증 필요 |
| Due Date | `customfield_10570` | Epic/Task/Subtask 종료일 | JIRA REST API `/rest/api/3/field` 조회 | ⚠️ 검증 필요 |

**검증 커맨드**:
```bash
curl -u email:api_token \
  https://wemade.atlassian.net/rest/api/3/field \
  | grep "customfield_10569\|customfield_10570"
```

### 12.2 JIRA Issue Type ID

**위치**: scheduler.md 3.6절

| Issue Type | ID | 검증 방법 | 상태 |
|------------|-----|----------|------|
| Epic | `10000` | JIRA REST API `/rest/api/3/issuetype` 조회 | ⚠️ 검증 필요 |
| Task | `10637` | JIRA REST API `/rest/api/3/issuetype` 조회 | ⚠️ 검증 필요 |
| Subtask | `10638` | JIRA REST API `/rest/api/3/issuetype` 조회 | ⚠️ 검증 필요 |

**검증 커맨드**:
```bash
curl -u email:api_token \
  https://wemade.atlassian.net/rest/api/3/issuetype \
  | grep "10000\|10637\|10638"
```

### 12.3 JIRA Account ID

**위치**: shared.md projects.json

| 담당자 | Account ID | 사용 프로젝트 | 검증 방법 | 상태 |
|--------|-----------|--------------|----------|------|
| 담당자 A | `712020:1a1a9943-9787-44e1-b2da-d4f558df471e` | M4GL, NCGL, FBGL, L10N (M4/NC/FB/Epic) | JIRA REST API `/rest/api/3/user?accountId=...` 조회 | ⚠️ 검증 필요 |
| 담당자 B | `62b57632f38b4dcf73daedb2` | LYGL, L10N (LY) | JIRA REST API `/rest/api/3/user?accountId=...` 조회 | ⚠️ 검증 필요 |
| 담당자 C | `617f7523f485cd0068077192` | L10N (견적서 크로스체크) | JIRA REST API `/rest/api/3/user?accountId=...` 조회 | ⚠️ 검증 필요 |

**검증 커맨드**:
```bash
curl -u email:api_token \
  "https://wemade.atlassian.net/rest/api/3/user?accountId=712020:1a1a9943-9787-44e1-b2da-d4f558df471e"
```

### 12.4 Confluence Page ID

**위치**: l10n-admin.md 3.3절, 4.3절

| 페이지 | ID | 용도 | 검증 방법 | 상태 |
|--------|-----|------|----------|------|
| Daily Task | `190906620` | 월간 템플릿 생성 | Confluence REST API `/rest/api/content/190906620` 조회 | ⚠️ 검증 필요 |
| Daily Scrum | `191332855` | 일일 업데이트 | Confluence REST API `/rest/api/content/191332855` 조회 | ⚠️ 검증 필요 |

**검증 커맨드**:
```bash
curl -u email:api_token \
  https://wemade.atlassian.net/wiki/rest/api/content/190906620

curl -u email:api_token \
  https://wemade.atlassian.net/wiki/rest/api/content/191332855
```

### 12.5 Slack Channel ID

**위치**: shared.md config.json, projects.json, l10n-admin.md 5.3절

| 채널 | ID | 용도 | 검증 방법 | 상태 |
|------|-----|------|----------|------|
| Admin 공통 | `C06BZA056E4` | Daily Task/Scrum/Slack MSG | Slack API `conversations.info` 조회 | ⚠️ 검증 필요 |
| M4GL | `C07BZA056M4` | M4GL 헤즈업/HO 메시지 | Slack API `conversations.info` 조회 | ⚠️ 검증 필요 |
| NCGL | `C06BZA056E5` | NCGL 헤즈업/HO 메시지 | Slack API `conversations.info` 조회 | ⚠️ 검증 필요 |
| FBGL | `C06BZA056E6` | FBGL 헤즈업/HO 메시지 | Slack API `conversations.info` 조회 | ⚠️ 검증 필요 |
| LYGL | `C06BZA056E7` | LYGL 헤즈업/HO 메시지 | Slack API `conversations.info` 조회 | ⚠️ 검증 필요 |

**검증 커맨드**:
```bash
curl -H "Authorization: Bearer xoxb-your-token" \
  "https://slack.com/api/conversations.info?channel=C06BZA056E4"
```

### 12.6 NAS 경로

**위치**: shared.md projects.json

| 프로젝트 | NAS 경로 | 검증 방법 | 상태 |
|---------|----------|----------|------|
| M4GL | `\\nas\m4gl\l10n\` | Windows 탐색기 또는 PowerShell `Test-Path` | ⚠️ 검증 필요 |
| NCGL | `\\nas\ncgl\l10n\` | Windows 탐색기 또는 PowerShell `Test-Path` | ⚠️ 검증 필요 |
| FBGL | `\\nas\fbgl\l10n\` | Windows 탐색기 또는 PowerShell `Test-Path` | ⚠️ 검증 필요 |
| LYGL | `\\nas\lygl\l10n\` | Windows 탐색기 또는 PowerShell `Test-Path` | ⚠️ 검증 필요 |

**검증 커맨드**:
```powershell
Test-Path "\\nas\m4gl\l10n\"
```

### 12.7 검증 타이밍

| 단계 | 검증 항목 | 실패 시 조치 |
|------|----------|-------------|
| **개발 시작 전** | 모든 JIRA/Confluence/Slack ID | ID 업데이트 후 PRD 수정 |
| **테스트 환경 구축** | NAS 경로 접근성 | 네트워크 설정 또는 경로 수정 |
| **통합 테스트** | 실제 API 호출 성공 여부 | 권한 확인 및 ID 재검증 |
| **프로덕션 배포 전** | 전체 재검증 | 모든 ID가 프로덕션 환경에서 유효한지 확인 |

---

## 13. 참조 문서

### 13.1 Feature PRD

- `sebastian-prd-shared.md` - 공통 컴포넌트
- `sebastian-prd-scheduler.md` - 일정 계산기
- `sebastian-prd-table-merge.md` - 테이블 병합
- `sebastian-prd-messaging.md` - 메시지 기능
- `sebastian-prd-l10n-admin.md` - L10N Admin

### 13.2 레거시 참조

> 레거시 코드는 `roomofPRD/legacy/` 폴더에 위치합니다.

| 레거시 폴더 | Sebastian 기능 | 설명 |
|-------------|----------------|------|
| `legacy/Bulk Jira Task Creator/` | scheduler.md 4장 | Apps Script 기반 JIRA 생성 |
| `legacy/Folder Creator/` | scheduler.md 5장 | Python 기반 폴더 생성 |
| `legacy/Merged_M4/` | table-merge.md 3장 | M4GL 테이블 병합 |
| `legacy/Merged_NC/` | table-merge.md 4장 | NCGL 테이블 병합 |
| `legacy/Merged_LY/` | table-merge.md 5장 | LYGL 테이블 병합/분할 |

### 13.3 와이어프레임

> 와이어프레임 시안은 `prd/wireframes/` 폴더에 위치합니다.

| 폴더 | 화면명 | 관련 PRD | 섹션 |
|------|--------|----------|------|
| `1_메인_윈도우/` | 메인 윈도우 | shared.md | 4.1 |
| `2_설정_화면/` | 설정 | shared.md | 6장 |
| `3.1_스케줄러_기본/` | 스케줄러 기본 | scheduler.md | 3.1 |
| `3.2_일정_계산_결과/` | 일정 계산 결과 | scheduler.md | 3.5 |
| `3.3_JIRA_일감_생성_진행/` | JIRA 생성 진행 | scheduler.md | 4.4 |
| `3.4_JIRA_생성_완료/` | JIRA 생성 완료 | scheduler.md | 4.5 |
| `3.5_폴더_생성_미리보기/` | 폴더 미리보기 | scheduler.md | 5.3 |
| `3.6_폴더_생성_완료/` | 폴더 생성 완료 | scheduler.md | 5.4 |
| `3.7_메시지_템플릿_편집/` | 템플릿 편집 | messaging.md | 3.3 |
| `3.8_메시지_미리보기/` | 메시지 미리보기 | messaging.md | 3.4 |
| `4.1_M4GL_DIALOGUE_병합/` | DIALOGUE 병합 | table-merge.md | 3.3 |
| `4.2_M4GL_STRING_병합/` | STRING 병합 | table-merge.md | 3.4 |
| `4.3_NCGL_병합/` | NC/GL 병합 | table-merge.md | 4.3 |
| `4.4_LYGL_병합_분할/` | LY/GL 병합/분할 | table-merge.md | 5.3 |
| `4.5_병합_완료/` | 병합 완료 | table-merge.md | 3.5 |
| `5.1_관리_대시보드/` | 관리 대시보드 | l10n-admin.md | 2.2 |
| `5.2_Daily_Task_설정/` | Daily Task 설정 | l10n-admin.md | 3.3 |
| `5.3_Daily_Scrum_설정/` | Daily Scrum 설정 | l10n-admin.md | 4.3 |
| `5.4_Slack_MSG_설정/` | Slack MSG 설정 | l10n-admin.md | 5.3 |

각 폴더 내 파일:
- `code.html` - 와이어프레임 HTML 소스
- `screen.png` - 렌더링된 스크린샷

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 0.1 | 2025-11-19 | 초안 작성 - 라운드 1 답변 반영 |
| 1.0 | 2025-11-20 | 전면 재작성 - 라운드 1-4 답변 및 Feature PRD 통합 |
| 1.1 | 2025-11-25 | 검증 완료, 승인 상태로 변경, 와이어프레임/레거시 매핑 추가 |
| 1.2 | 2025-11-26 | Draft로 재전환, 외부 시스템 ID 검증 체크리스트 추가 |
| 1.3 | 2025-11-27 | 라운드 6 답변 반영: Assignee 규칙, Description 정책, 출력 경로, 건너뛰기 후 UI 동작 명확화 |
| 1.4 | 2025-11-27 | PRD 정제 라운드 1: 성능 요구사항 권장 기준 명시 |
| 1.5 | 2025-11-27 | Wireframes 문서 보완 완료, UI 시안 참조 체계 확립 |
| 1.6 | 2025-11-27 | 최종 승인: 모든 Feature 문서 v1.6 통일, Approved 상태로 전환 |

