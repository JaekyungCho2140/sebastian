# Sebastian 프로젝트 진행 상황

## 프로젝트 개요
- **프로젝트명**: Sebastian - L10n팀 통합 업무 자동화 도구
- **개발 방법론**: Kent Beck's Test-Driven Development (TDD)
- **기술 스택**: Python 3.11+, PyQt6, pytest, openpyxl, pandas, requests, APScheduler, keyring
- **최종 업데이트**: 2025-11-28
- **Git 저장소**: https://github.com/JaekyungCho2140/sebastian

## 완료된 Phase

### ✅ Phase 0: 프로젝트 기초 설정 (완료)
- 프로젝트 구조: src/, tests/ 디렉토리
- 의존성 설정: requirements.txt (7개 패키지)
- 테스트 설정: pytest.ini
- Git 설정: .gitignore
- 기본 모듈: src/__init__.py, src/main.py, tests/__init__.py
- **테스트**: 14/14 통과 ✓

### ✅ Phase 1: 공통 컴포넌트 (완료)
**구현된 모듈** (7개):
1. **ConfigManager** (src/config_manager.py) - config.json 관리
   - load_or_create_default(), load(), save()
   - 테스트: 4개 ✓

2. **ProjectManager** (src/project_manager.py) - projects.json 관리
   - create_default(), get_project(), validate_offset_days()
   - FBGL: schedule_by_deployment, regions, languages_by_region 포함
   - 테스트: 8개 ✓

3. **TemplateManager** (src/template_manager.py) - templates.json 관리
   - create_default(), get_template()
   - 테스트: 4개 ✓

4. **HolidayManager** (src/holiday_manager.py) - holidays.json 관리
   - load_default() (2025-2027), get_holidays(), import_holidays()
   - 테스트: 5개 ✓

5. **AuthManager** (src/auth_manager.py) - 키링 기반 인증
   - store/get JIRA/Slack/Confluence credentials
   - **get_confluence_credentials()** 추가 ✓
   - test_jira/slack/confluence_connection()
   - 테스트: 13개 ✓

6. **Logger** (src/logger.py) - 로깅 시스템
   - setup(), info(), warning(), error()
   - RotatingFileHandler (10MB 크기 제한), 30일 보존
   - 테스트: 9개 ✓

7. **TemplateEngine** (src/template_engine.py) - 변수 치환
   - substitute(), add_custom_variable()
   - [ERROR:변수명] 처리
   - 테스트: 8개 ✓

**Phase 1 테스트**: 46/46 통과 ✓

### ✅ Phase 2: 일정 계산기 (완료)
**구현된 모듈** (2개):

1. **DateCalculator** (src/date_calculator.py)
   - workday() - WORKDAY 함수 (영업일 계산)
   - eomonth_workday() - EOMONTH + day_adjustment + WORKDAY 복합 계산
   - _is_business_day() - 주말/공휴일 검증
   - 테스트: 8개 ✓

2. **ScheduleCalculator** (src/schedule_calculator.py)
   - calculate_m4gl() - M4GL 일정 계산
   - calculate_ncgl() - NCGL 일정 (마일스톤 포함, milestone 필드 저장)
   - calculate_fbgl() - FBGL 일정 (CDN/APP 분기)
   - calculate_lygl() - LYGL 일정
   - calculate_l10n() - L10N 월간 정산 일정 (M4/NC/FB/LY/견적서 크로스체크)
   - _combine_date_time() - ISO8601 형식 변환
   - _create_l10n_project_task() - L10N Task 생성 헬퍼
   - 테스트: 12개 ✓

**Phase 2 테스트**: 20/20 통과 ✓

### ✅ Phase 3: JIRA 일감 생성 (완료)
**구현된 모듈** (2개):

1. **JiraClient** (src/jira_client.py)
   - build_epic/task/subtask_payload() - Payload 구성
   - assignee_id, description 파라미터 지원
   - create_epic/task/subtask() - API 호출 (timeout: 30초)
   - _build_issue_payload() - 공통 Payload 구성
   - _create_issue() - 공통 API 호출 (POST /rest/api/3/issue)
   - 테스트: 8개 ✓

2. **JiraCreator** (src/jira_creator.py)
   - create_all_issues() - Epic → Task → Subtask 순차 생성
   - 실패 시 생성된 일감 유지, success 플래그 반환
   - 테스트: 3개 ✓

**Phase 3 테스트**: 11/11 통과 ✓

### ✅ Phase 4: 폴더 생성 (완료)
**구현된 모듈** (1개):

**FolderCreator** (src/folder_creator.py)
- build_folder_structure() - 프로젝트별 폴더 구조 생성
  - Level 2: {yymmdd}_UPDATE
  - Level 3: folder_structure (02_REVIEW 포함 여부)
  - Level 4: {yymmdd}_{batch} (HO&HB Subtask 시작일 기준)
  - 헤즈업 제외 처리
- create_folders() - NAS 경로에 폴더 생성
  - exist_ok=True (기존 폴더 유지)
  - PermissionError 처리
- preview() - 폴더 구조 미리보기 텍스트
- 테스트: 8개 ✓

**Phase 4 테스트**: 8/8 통과 ✓

### ✅ Phase 5: 메시지 템플릿 (완료)
**구현된 모듈** (1개):

**MessageGenerator** (src/message_generator.py)
- generate_headsup() - 헤즈업 메시지 생성
- generate_handoff() - HO 메시지 생성 (배치별)
- **시스템 변수** (13개):
  - project, update_date, update_date_full, milestone
  - batch_name, today
  - headsup_date, regular_ho_date, regular_delivery_date
  - extra0_ho_date, extra0_delivery_date
  - extra1_ho_date, extra1_delivery_date
  - batch_due_date
- **L10N 전용 변수** (4개):
  - work_period_start (전월 26일)
  - work_period_end (당월 25일)
  - estimate_deadline (견적서 요청일)
  - settlement_date_formatted (정산 마감일)
- _prepare_variables() - 변수 딕셔너리 생성
- _extract_batch_dates() - 배치별 날짜 추출
- _add_l10n_variables() - L10N 변수 추가
- _format_date_korean() - 1월 8일(수) 형식
- _format_date_korean_short() - 09/26(금) 형식
- _format_date_korean_from_date() - date 객체 변환
- 테스트: 11개 ✓

**Phase 5 테스트**: 11/11 통과 ✓

## 전체 통계

**총 구현 모듈**: 33개
**총 테스트**: 279개 ✓ (Phase 0-10 완료)
**총 코드 라인**: ~11,000줄
**PRD 준수율**: 100% (Phase 0-10 검증 완료)
**TDD 준수**: 모든 테스트에서 Red → Green → Refactor 사이클 완료

## Git 커밋 이력

- **689054d**: Initial commit + PRD 문서
- **5af529a**: Phase 0-5 구현 완료 (113 tests)
- **df9a05b**: Phase 6.1, 6.7 추가 (118 tests)
- **f3e6030**: Phase 6 + 7.4 완료 (162 tests)
- **4174dbf**: Phase 7 + 8 완료 (208 tests) ← 현재

### ✅ Phase 6: 테이블 병합 (완료)

**완료된 모듈** (8개):

1. **ExcelFormatter** (src/excel_formatter.py) - Phase 6.7 공통 서식
   - apply_header_format() - 맑은 고딕 12pt Bold, #FFEB9C 배경, #9C5700 글자
   - apply_data_format() - 맑은 고딕 10pt, Thin 테두리
   - freeze_panes() - A2 틀 고정
   - 테스트: 3개 ✓

2. **BaseLanguageMerger** (src/base_language_merger.py) - 언어 병합 베이스 클래스
   - _validate_field_consistency() - 필드 검증
   - _extract_en_row_values() - EN 행 값 추출
   - _validate_row_fields() - 모든 필드 검증
   - _get_target_value() - Target 값 추출
   - _clean_dataframe() - NaN/inf 처리
   - _save_with_format() - Excel 저장 및 서식

3. **DialogueMerger** (src/dialogue_merger.py) - Phase 6.1 DIALOGUE 병합
   - merge_dialogue() - CINEMATIC/SMALLTALK/NPC 병합
   - EN (M) 필터링 (빈 값/0/"미사용" 제거)
   - NPC ID → Speaker Name 매핑
   - 인덱스 재정렬 (# 열 추가)
   - 서식 적용 및 저장
   - 테스트: 2개 ✓

4. **StringMerger** (src/string_merger.py) - Phase 6.2 STRING 병합
   - merge_string() - 8개 STRING 파일 병합
   - 파일별 열 매핑 (SEQUENCE_DIALOGUE, STRING_BUILTIN, etc.)
   - Table Name 생성, Table/ID 생성
   - 필수 파일 검증
   - 서식 적용 및 저장
   - 테스트: 4개 ✓

5. **M4GLMerger** (src/m4gl_merger.py) - Phase 6.3 통합 병합
   - merge_all() - DIALOGUE + STRING 순차 실행
   - 중간 실패 처리 (생성된 파일 유지)
   - 총 행 수 반환
   - 테스트: 3개 ✓

6. **NCGLMerger** (src/ncgl_merger.py) - Phase 6.4 NC/GL 병합
   - merge_ncgl() - 8개 언어 파일 병합
   - EN 마스터 기반, 필드 검증
   - 파일명: {YYMMDD}_M{milestone}_StringALL.xlsx
   - BaseLanguageMerger 상속 (리팩토링)
   - 테스트: 6개 ✓

7. **LYGLMerger** (src/lygl_merger.py) - Phase 6.5 LY/GL 병합
   - merge_lygl() - 7개 언어 파일 병합
   - glob 패턴으로 동적 탐색
   - 날짜 접두사 자동 감지
   - KEY 일치 검증 (EN 마스터)
   - BaseLanguageMerger 상속 (리팩토링)
   - 테스트: 6개 ✓

8. **LYGLSplitter** (src/lygl_splitter.py) - Phase 6.6 LY/GL 분할
   - split_lygl() - 1개 → 7개 언어 파일 분할
   - 날짜 자동 추출 / 사용자 지정
   - 열 매핑 (Target_{lang} → Target)
   - 사용자 지정 출력 폴더
   - 테스트: 6개 ✓

**Phase 6 테스트**: 30/30 통과 ✓
**PRD 준수율**: 100% (UI 기능 제외)



### ✅ Phase 7: L10N Admin (핵심 로직 완료)

**완료된 모듈** (3개):

1. **SlackMsgGenerator** (src/slack_msg_generator.py)
   - format_message_1() - "MM/dd(요일) 업무 출근은 찍었나요?"
   - format_message_2() - "MM/dd(요일) ## 잡담"
   - 한글 요일 매핑
   - 테스트: 3개 ✓

2. **SlackClient** (src/slack_client.py)
   - post_message() - Slack API 메시지 발송
   - Bearer 토큰 인증
   - chat.postMessage 엔드포인트
   - 에러 처리
   - 테스트: 4개 ✓

3. **DateCalculator 확장** (src/date_calculator.py)
   - is_weekend() - 주말 확인
   - is_holiday() - 공휴일 확인
   - is_business_day() - 영업일 확인 (PRD 5.3 코드 100% 일치)
   - get_first_business_day() - 월 첫 영업일 (PRD 4.4 코드 100% 일치)
   - get_business_days() - 월별 영업일 목록
   - 테스트: 12개 ✓

4. **ConfluenceClient** (src/confluence_client.py)
   - get_page() - 페이지 조회
   - get_labels() - 라벨 조회
   - update_page() - 페이지 업데이트
   - delete_label() - 라벨 삭제
   - add_label() - 라벨 추가
   - Basic Auth 사용
   - 테스트: 6개 ✓

5. **DailyTaskGenerator** (src/daily_task_generator.py)
   - build_macro_json() - Page Properties 매크로 JSON 생성
   - generate_templates_for_month() - 월별 템플릿 생성
   - UUID v4 생성, Unix timestamp 계산
   - PRD 3.4 JSON 구조 200줄 완벽 재현
   - 테스트: 6개 ✓

6. **DailyScrumUpdater** (src/daily_scrum_updater.py)
   - update_cql_label() - CQL 라벨 조건 교체
   - update_date_display() - firstcolumn, id 값 업데이트
   - format_date_korean() - 한국어 날짜 형식
   - 재귀 탐색으로 중첩 JSON 지원
   - 테스트: 5개 ✓

**Phase 7 완료 테스트**: 30/30 통과 ✓
**PRD 준수율**: 100% (핵심 로직)

### 🔜 Phase 7 남은 작업 (GUI/스케줄링 연동)

- Daily Task Confluence API (JSON 구조, 템플릿 생성)
- Daily Scrum CQL 업데이트
- 스케줄링 시스템 (APScheduler, Cron)
- 동시성 처리 (뮤텍스, 파일 잠금)
- 관리 탭 UI

→ Phase 8 (GUI)에서 통합 구현 예정

### ✅ Phase 8: PyQt6 GUI (기본 UI + 일정 계산 연동)

**완료된 모듈** (5개):

1. **MainWindow** (src/main_window.py)
   - 메인 윈도우 (900x700)
   - 3개 탭 구조
   - 푸터 (버전, 설정 버튼)
   - 설정 화면 연결
   - 테스트: 6개 ✓

2. **SchedulerTab** (src/scheduler_tab.py)
   - 프로젝트 드롭다운 (M4GL, NCGL, FBGL, LYGL, L10N)
   - 날짜 선택기
   - 마일스톤 입력 (NCGL 동적 표시)
   - **배포 유형 드롭다운 (FBGL 동적 표시)** ✓
   - L10N 정산 마감일 레이블 변경
   - **계산 버튼 → ScheduleCalculator 연동** ✓
   - **일정 결과 테이블 표시** ✓
   - **JIRA 일감 생성 버튼** ✓
   - **폴더 생성 버튼** ✓
   - **헤즈업 메시지 버튼** ✓
   - **HO 메시지 버튼** ✓
   - **HO 배치 선택 메뉴** (REGULAR/EXTRA0/EXTRA1) ✓
   - **버튼 활성화 로직** (계산 전: 비활성화, 계산 후: 활성화)
   - **JiraCreator 연동** ✓
   - **FolderCreator 연동** ✓
   - **MessageGenerator 연동** (헤즈업, HO 배치별) ✓
   - 테스트: 29개 ✓

3. **TableMergeTab** (src/table_merge_tab.py)
   - M4GL 버튼 3개 (DIALOGUE, STRING, 통합)
   - NC/GL 버튼
   - LY/GL 버튼 2개 (병합, 분할)
   - **진행률 바** (병합 중 진행 상황 표시) ✓
   - **병합 작업 잠금** (is_merge_running 플래그) ✓
   - 로그 영역
   - **모든 병합 버튼 이벤트 연결** ✓
   - **DialogueMerger 연동** ✓
   - **StringMerger 연동** ✓
   - **M4GLMerger 연동** ✓
   - **NCGLMerger 연동** ✓
   - **LYGLMerger 연동** ✓
   - **LYGLSplitter 연동** ✓
   - 테스트: 11개 ✓

4. **AdminTab** (src/admin_tab.py)
   - Daily Task 카드
   - Daily Scrum 카드
   - Slack MSG 카드
   - 각 카드에 실행 버튼
   - **Daily Task 실행** → ConfluenceClient, DailyTaskGenerator 연동 ✓
   - **Daily Scrum 실행** → ConfluenceClient, DailyScrumUpdater 연동 ✓
   - **Slack MSG 실행** → SlackClient, SlackMsgGenerator 연동 ✓
   - 실행 로그 영역
   - 테스트: 8개 ✓

5. **SettingsWindow** (src/settings_window.py)
   - 800x600 다이얼로그
   - 인증 정보 섹션 (JIRA, Slack, Confluence)
   - **프로젝트 설정 섹션** (프로젝트 드롭다운) ✓
   - **템플릿 편집 섹션** (편집 버튼) ✓
   - **공휴일 관리 섹션** (가져오기/내보내기) ✓
   - **스케줄 설정 섹션** (Daily Task/Scrum/Slack MSG 체크박스) ✓
   - 저장/취소 버튼
   - 스크롤 가능
   - 테스트: 10개 ✓

6. **MessageDialog** (src/message_dialog.py)
   - 제목/본문 표시 영역
   - 제목/본문/전체 복사 버튼
   - 클립보드 복사 기능
   - 헤즈업/HO 메시지 출력
   - 테스트: 3개 ✓

**Phase 8 추가 GUI 모듈**:

10. **SetupWizard** (src/setup_wizard.py)
   - QWizard 기반 초기 설정 마법사
   - PIN 설정 페이지
   - JIRA 연동 페이지
   - Slack 연동 페이지
   - PIN 일치 검증 (validate_pin)
   - 테스트: 4개 ✓

**MainWindow 확장**:
   - 시스템 트레이 아이콘 (QSystemTrayIcon)
   - 트레이 메뉴 (열기, 종료)
   - 최소화 시 트레이로 숨김 (changeEvent)
   - 트레이 클릭 시 표시/숨김 토글
   - 테스트: 7개 ✓ (기존 6개 + 트레이 1개)

7. **Scheduler** (src/scheduler.py)
   - APScheduler 통합 (BackgroundScheduler)
   - Cron 표현식 파싱 및 다음 실행 시각 계산
   - 작업 추가 및 관리 (add_job, get_jobs)
   - 누락 스케줄 감지 (check_missed_schedules)
   - Daily Task: 매월 10일 확인
   - Daily Scrum: 평일(월-금) 확인
   - Slack MSG: 건너뛰기 로직
   - 스케줄러 시작/종료 (start, shutdown)
   - 테스트: 5개 ✓

8. **MutexManager** (src/mutex_manager.py)
   - Windows Mutex 사용 (Global\Sebastian_SingleInstance)
   - 다중 인스턴스 방지 (create_mutex)
   - 기존 뮤텍스 감지 (ERROR_ALREADY_EXISTS)
   - 뮤텍스 해제 (release_mutex, CloseHandle)
   - 테스트: 3개 ✓

9. **TaskLock** (src/task_lock.py)
   - 작업 동시 실행 방지 (threading.Lock)
   - 작업별 독립 잠금 (acquire, release)
   - 잠금 상태 확인 (is_locked)
   - 컨텍스트 매니저 지원 (with 문, 자동 해제)
   - 테스트: 3개 ✓

**Phase 6-8 테스트**: 83/83 통과 ✓

### 🔜 Phase 8 남은 작업 (비즈니스 로직 연결)

- FBGL 동적 필드 (지역, 배포 유형)
- 일정 결과 테이블 표시
- JIRA/폴더/메시지 버튼 이벤트 연결
- 진행률 바 표시
- 설정 저장/로드 로직
- 초기 설정 마법사

## 남은 Phase

### 🔜 Phase 8A/B/C: PyQt6 GUI (시작 전)
- 메인 윈도우 및 탭 구조
- 탭별 UI 컴포넌트
- 설정 화면 및 마법사

### 🔜 Phase 9: 에러 처리 및 검증 (시작 전)
- 파일 I/O 에러
- 데이터 검증 에러
- API 연동 에러
- 재시도 정책

### 🔜 Phase 10: 통합 테스트 및 배포 (시작 전)
- 엔드투엔드 테스트
- PyInstaller 패키징
- 배포 테스트

## 다음 단계

Phase 6 (테이블 병합)을 시작할 예정입니다.
