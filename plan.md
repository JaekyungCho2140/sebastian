# Sebastian 개발 계획 (Test-Driven Development)

**프로젝트**: Sebastian - L10n팀 통합 업무 자동화 도구
**개발 방법론**: Kent Beck의 Test-Driven Development (TDD)
**문서 버전**: 1.0
**최종 수정**: 2025-11-27

---

## 개발 원칙

1. **Red → Green → Refactor** 사이클 준수
2. 한 번에 하나의 테스트만 작성 및 구현
3. 테스트가 통과한 후에만 리팩토링
4. 최소한의 코드로 테스트 통과
5. 모든 테스트는 실행 가능하고 반복 가능해야 함

---

## Phase 의존성

아래 의존성에 따라 Phase를 순차적으로 완료해야 합니다:

```
Phase 0 (기초 설정)
    ↓
Phase 1 (공통 컴포넌트)
    ├─→ Phase 1.1.4 (holidays.json) 완료 필요
    ↓
Phase 2 (일정 계산기) ← Phase 1.1.4 의존
    ↓
Phase 3 (JIRA 일감 생성) ← Phase 2 의존
Phase 4 (폴더 생성) ← Phase 2 의존
Phase 5 (메시지 템플릿) ← Phase 2 (ScheduleResult) 의존
    ↓
Phase 6 (테이블 병합) ← Phase 1.3 (로깅) 의존
Phase 7 (L10N Admin) ← Phase 1, 2 의존
    ↓
Phase 8A/8B/8C (GUI) ← Phase 1-7 핵심 로직 완료 필요
    ↓
Phase 9 (에러 처리 및 검증) ← 전체 기능 구현 완료 필요
    ↓
Phase 10 (통합 테스트 및 배포) ← 전체 Phase 완료 필요
```

**주요 의존성 요약:**
- **Phase 2 → Phase 1.1.4**: 일정 계산에 holidays.json 필수
- **Phase 5 → Phase 2**: 메시지 생성에 ScheduleResult 객체 필수
- **Phase 8A/8B/8C → Phase 1-7**: GUI는 모든 핵심 로직 완료 후 구현

---

## Phase 0: 프로젝트 기초 설정

### 0.1 프로젝트 구조 및 의존성 설정
- [x] `src/` 디렉토리 생성
- [x] `tests/` 디렉토리 생성
- [x] `requirements.txt` 생성 (PyQt6, pytest, openpyxl, pandas, requests, APScheduler, keyring)
- [x] `pytest.ini` 설정 파일 생성
- [x] `.gitignore` 파일 생성
- [x] 가상환경 생성 및 의존성 설치 확인

### 0.2 기본 모듈 구조
- [x] `src/__init__.py` 생성
- [x] `src/main.py` 생성 (엔트리 포인트)
- [x] `tests/__init__.py` 생성
- [x] pytest 실행 확인

---

## Phase 1: 공통 컴포넌트 (shared.md 기반)

### 1.1 설정 시스템 - 데이터 파일 관리

#### 1.1.1 config.json 읽기/쓰기
- [x] 테스트: config.json이 없을 때 기본값 생성
- [x] 구현: `ConfigManager.load_or_create_default()`
- [x] 테스트: config.json 읽기 성공
- [x] 구현: `ConfigManager.load()`
- [x] 테스트: config.json 쓰기 성공
- [x] 구현: `ConfigManager.save()`
- [x] 테스트: 잘못된 JSON 형식 처리
- [x] 구현: 예외 처리 및 에러 로깅

#### 1.1.2 projects.json 읽기/쓰기
- [x] 테스트: projects.json 기본 구조 생성
- [x] 구현: `ProjectManager.create_default()`
- [x] 테스트: 프로젝트별 설정 로드
- [x] 구현: `ProjectManager.get_project(project_code)`
- [x] 테스트: offset_days 유효성 검증 (-100~30)
- [x] 구현: `ProjectManager.validate_offset_days()`

#### 1.1.3 templates.json 읽기/쓰기
- [x] 테스트: templates.json 기본 구조 생성
- [x] 구현: `TemplateManager.create_default()`
- [x] 테스트: 프로젝트별 템플릿 로드
- [x] 구현: `TemplateManager.get_template(project, type)`

#### 1.1.4 holidays.json 읽기/쓰기
- [x] 테스트: holidays.json 기본 데이터 (2025-2027) 로드
- [x] 구현: `HolidayManager.load_default()`
- [x] 테스트: 특정 연도 공휴일 조회
- [x] 구현: `HolidayManager.get_holidays(year)`
- [x] 테스트: 공휴일 데이터 병합 (가져오기)
- [x] 구현: `HolidayManager.import_holidays(json_data)`

### 1.2 인증 관리

#### 1.2.1 키링 기반 인증 정보 저장
- [x] 테스트: JIRA 인증 정보 저장
- [x] 구현: `AuthManager.store_jira_credentials(email, token)`
- [x] 테스트: Slack 인증 정보 저장
- [x] 구현: `AuthManager.store_slack_credentials(token)`
- [x] 테스트: Confluence 인증 정보 저장
- [x] 구현: `AuthManager.store_confluence_credentials(email, token)`

#### 1.2.2 인증 정보 조회
- [x] 테스트: JIRA 인증 정보 조회
- [x] 구현: `AuthManager.get_jira_credentials()`
- [x] 테스트: Slack 인증 정보 조회
- [x] 구현: `AuthManager.get_slack_credentials()`
- [x] 테스트: 인증 정보 없을 때 None 반환
- [x] 구현: 예외 처리

#### 1.2.3 연결 테스트
- [x] 테스트: JIRA 연결 테스트 (Mock API)
- [x] 구현: `AuthManager.test_jira_connection()`
- [x] 테스트: Slack 연결 테스트 (Mock API)
- [x] 구현: `AuthManager.test_slack_connection()`
- [x] 테스트: Confluence 연결 테스트 (Mock API)
- [x] 구현: `AuthManager.test_confluence_connection()`

### 1.3 로깅 시스템

#### 1.3.1 로그 파일 생성 및 로테이션
- [x] 테스트: 로그 파일 자동 생성 (sebastian_YYYYMMDD.log)
- [x] 구현: `Logger.setup()`
- [x] 테스트: 일별 로그 파일 로테이션
- [x] 구현: `Logger.rotate_daily()`
- [x] 테스트: 30일 이전 로그 파일 자동 삭제
- [x] 구현: `Logger.cleanup_old_logs()`

#### 1.3.2 로그 레벨 및 메시지
- [x] 테스트: INFO 레벨 로그 기록
- [x] 구현: `Logger.info(message)`
- [x] 테스트: WARNING 레벨 로그 기록
- [x] 구현: `Logger.warning(message)`
- [x] 테스트: ERROR 레벨 로그 기록
- [x] 구현: `Logger.error(message)`

### 1.4 템플릿 변수 시스템

#### 1.4.1 시스템 변수 치환
- [x] 테스트: {project} 변수 치환
- [x] 구현: `TemplateEngine.substitute(template, variables)`
- [x] 테스트: {update_date} 변수 치환
- [x] 구현: 날짜 포맷팅 로직 추가
- [x] 테스트: 정의되지 않은 변수는 [ERROR:변수명]으로 치환
- [x] 구현: 변수 검증 및 에러 처리

#### 1.4.2 사용자 정의 변수
- [x] 테스트: 사용자 정의 변수 추가
- [x] 구현: `TemplateEngine.add_custom_variable(name, value)`
- [x] 테스트: 사용자 정의 변수 치환
- [x] 구현: 변수 딕셔너리 확장

---

## Phase 2: 일정 계산기 (scheduler.md 기반)

### 2.1 공휴일 기반 영업일 계산

#### 2.1.1 WORKDAY 함수 구현
- [x] 테스트: 기준일로부터 N 영업일 전 계산 (공휴일 없음)
- [x] 구현: `DateCalculator.workday(base_date, offset_days, holidays=[])`
- [x] 테스트: 공휴일을 제외한 영업일 계산
- [x] 구현: 공휴일 리스트 처리 로직
- [x] 테스트: 주말(토/일)을 제외한 영업일 계산
- [x] 구현: 주말 검증 로직

#### 2.1.2 L10N 프로젝트용 복합 계산
- [x] 테스트: EOMONTH + day_adjustment + WORKDAY 복합 계산
- [x] 구현: `DateCalculator.eomonth_workday(base_date, eomonth_offset, day_adjustment, workday_offset, holidays)`
- [x] 테스트: 정산 마감일 기준 역산
- [x] 구현: L10N offset 타입별 계산 로직

### 2.2 프로젝트별 일정 계산

#### 2.2.1 M4GL 일정 계산
- [x] 테스트: M4GL 헤즈업 일정 계산
- [x] 구현: `ScheduleCalculator.calculate_m4gl(update_date, holidays)`
- [x] 테스트: M4GL REGULAR 일정 계산
- [x] 구현: Task 및 Subtask 일정 계산
- [x] 테스트: M4GL EXTRA0, EXTRA1 일정 계산
- [x] 구현: 모든 Task 일정 계산 완료

#### 2.2.2 NCGL 일정 계산
- [x] 테스트: NCGL 마일스톤 포함 일정 계산
- [x] 구현: `ScheduleCalculator.calculate_ncgl(update_date, milestone, holidays)`
- [x] 테스트: NCGL 모든 Task 일정 계산
- [x] 구현: Task 및 Subtask 일정 계산

#### 2.2.3 FBGL 일정 계산 (CDN/APP 분기)
- [x] 테스트: FBGL CDN 배포 일정 계산
- [x] 구현: `ScheduleCalculator.calculate_fbgl(update_date, deployment_type, holidays)`
- [x] 테스트: FBGL APP 배포 일정 계산
- [x] 구현: 배포 유형별 offset 적용

#### 2.2.4 LYGL 일정 계산
- [x] 테스트: LYGL 일정 계산
- [x] 구현: `ScheduleCalculator.calculate_lygl(update_date, holidays)`

#### 2.2.5 L10N 프로젝트 일정 계산

##### 2.2.5.1 L10N offset 타입별 계산
- [x] 테스트: base_date 타입 offset 계산 (정산일 기준 단순 offset)
- [x] 구현: `DateCalculator.calculate_base_date_offset(base_date, offset_days)` - workday(base_date, 0) 사용
- [x] 테스트: workday_from_base 타입 offset 계산 (기준일 기준 영업일 offset)
- [x] 구현: `DateCalculator.calculate_workday_from_base(base_date, workday_offset, holidays)` - workday() 사용
- [x] 테스트: eomonth_workday 타입 복합 계산 (EOMONTH + day_adjustment + WORKDAY)
- [x] 구현: `DateCalculator.calculate_eomonth_workday(base_date, eomonth_offset, day_adjustment, workday_offset, holidays)` - eomonth_workday() 사용

##### 2.2.5.2 L10N 일정 생성
- [x] 테스트: L10N Epic 일정 계산
- [x] 구현: `ScheduleCalculator.calculate_l10n(settlement_date, holidays)`
- [x] 테스트: L10N Task (M4, NC, FB, LY) 일정 계산
- [x] 구현: 프로젝트별 Task 일정
- [x] 테스트: L10N Subtask (견적서, 세금계산서, 지결) 일정 계산
- [x] 구현: Subtask 일정

### 2.3 일정 데이터 구조

#### 2.3.1 ScheduleResult 데이터 클래스
- [x] 테스트: ScheduleResult 객체 생성 - dictionary 구조 사용
- [x] 구현: `@dataclass ScheduleResult` - dictionary로 대체
- [x] 테스트: IssueSchedule 객체 생성 - dictionary 구조 사용
- [x] 구현: `@dataclass IssueSchedule` - dictionary로 대체
- [x] 테스트: TaskSchedule 객체 생성 - dictionary 구조 사용
- [x] 구현: `@dataclass TaskSchedule` - dictionary로 대체

#### 2.3.2 ISO8601 날짜 포맷
- [x] 테스트: datetime → ISO8601 변환 (2025-01-08T09:30:00.000+0900)
- [x] 구현: `DateFormatter.to_iso8601(datetime_obj, time_str)` - _combine_date_time() 사용
- [x] 테스트: 날짜 표시 포맷 (1월 8일(수))
- [x] 구현: `DateFormatter.to_display_format(date)` - 필요시 추가 구현

---

## Phase 3: JIRA 일감 생성 (scheduler.md 3장)

### 3.1 JIRA API 연동

#### 3.1.1 Epic 생성
- [x] 테스트: Epic 생성 Payload 구성
- [x] 구현: `JiraClient.build_epic_payload(schedule_result)`
- [x] 테스트: Epic API 호출 (Mock)
- [x] 구현: `JiraClient.create_epic(payload)`
- [x] 테스트: Epic Key 반환
- [x] 구현: 응답 파싱 및 Key 추출

#### 3.1.2 Task 생성
- [x] 테스트: Task 생성 Payload 구성 (parent: Epic Key)
- [x] 구현: `JiraClient.build_task_payload(schedule_result, parent_key)`
- [x] 테스트: Task API 호출 (Mock)
- [x] 구현: `JiraClient.create_task(payload)`

#### 3.1.3 Subtask 생성
- [x] 테스트: Subtask 생성 Payload 구성 (parent: Task Key)
- [x] 구현: `JiraClient.build_subtask_payload(schedule_result, parent_key)`
- [x] 테스트: Subtask API 호출 (Mock)
- [x] 구현: `JiraClient.create_subtask(payload)`

### 3.2 일감 생성 흐름

#### 3.2.1 순차 생성
- [x] 테스트: Epic → Task → Subtask 순차 생성
- [x] 구현: `JiraCreator.create_all_issues(schedule_result)`
- [x] 테스트: 생성된 일감 Key 목록 반환
- [x] 구현: Key 수집 및 반환

#### 3.2.2 실패 처리
- [x] 테스트: 중간 실패 시 생성된 일감 유지
- [x] 구현: 예외 처리 및 로그 기록
- [x] 테스트: 실패 지점 표시
- [x] 구현: 실패 정보 수집 및 반환

#### 3.2.3 중복 생성 방지
- [x] 테스트: 동일 입력으로 재생성 시도 시 경고 - UI 레벨에서 처리 (메모리 플래그)
- [x] 구현: 입력 해시 저장 및 비교 (메모리만) - UI 레벨에서 처리

---

## Phase 4: 폴더 생성 (scheduler.md 4장)

### 4.1 폴더 구조 생성

#### 4.1.1 폴더 경로 구성
- [x] 테스트: M4GL 폴더 구조 생성 (02_REVIEW 포함)
- [x] 구현: `FolderCreator.build_folder_structure(project, schedule_result)`
- [x] 테스트: NCGL 폴더 구조 생성 (02_REVIEW 미포함)
- [x] 구현: 프로젝트별 폴더 구조 분기

#### 4.1.2 폴더 생성 실행
- [x] 테스트: NAS 경로에 폴더 생성
- [x] 구현: `FolderCreator.create_folders(nas_path, folder_list)`
- [x] 테스트: 폴더 이미 존재 시 건너뛰기
- [x] 구현: 폴더 존재 확인 및 예외 처리

#### 4.1.3 미리보기 기능
- [x] 테스트: 폴더 구조 미리보기 텍스트 생성
- [x] 구현: `FolderCreator.preview(folder_list)`

---

## Phase 5: 메시지 템플릿 (messaging.md 기반)

### 5.1 헤즈업 메시지 생성

#### 5.1.1 변수 치환
- [x] 테스트: 헤즈업 템플릿에 일정 변수 치환
- [x] 구현: `MessageGenerator.generate_headsup(schedule_result, template)`
- [x] 테스트: 제목 및 본문 생성
- [x] 구현: 제목/본문 분리 출력

#### 5.1.2 프로젝트별 템플릿
- [x] 테스트: M4GL 헤즈업 메시지 생성
- [x] 구현: 프로젝트별 템플릿 로드
- [x] 테스트: NCGL 헤즈업 메시지 생성 (마일스톤 포함)
- [x] 구현: 마일스톤 변수 추가

### 5.2 HO (Handoff) 메시지 생성

#### 5.2.1 배치별 메시지
- [x] 테스트: REGULAR 배치 HO 메시지 생성
- [x] 구현: `MessageGenerator.generate_handoff(schedule_result, batch_name, template)`
- [x] 테스트: EXTRA0, EXTRA1 배치 HO 메시지 생성
- [x] 구현: 배치별 마감일 변수 치환

---

## Phase 6: 테이블 병합 (table-merge.md 기반)

### 6.1 M4/GL DIALOGUE 병합

#### 6.1.1 파일 읽기
- [x] 테스트: CINEMATIC_DIALOGUE.xlsm 읽기
- [x] 구현: `ExcelReader.read_dialogue(file_path, sheet_index, header_row, data_start_row)` - DialogueMerger에 통합
- [x] 테스트: SMALLTALK_DIALOGUE.xlsm 읽기
- [x] 구현: 동일 함수 재사용
- [x] 테스트: NPC.xlsm 읽기 및 매핑 생성
- [x] 구현: `ExcelReader.read_npc_mapping(file_path)` - DialogueMerger에 통합

#### 6.1.2 데이터 병합
- [x] 테스트: CINEMATIC + SMALLTALK 순차 병합
- [x] 구현: `DialogueMerger.merge(cinematic_df, smalltalk_df)` - pd.concat 사용
- [x] 테스트: NPC ID → Speaker Name 매핑
- [x] 구현: `DialogueMerger.fill_speaker_names(merged_df, npc_map)` - map().fillna() 사용

#### 6.1.3 행 필터링
- [x] 테스트: EN (M) 빈 셀 행 제거
- [x] 구현: `DialogueMerger.filter_rows(df)` - 필터링 조건 적용
- [x] 테스트: EN (M) '미사용' 행 제거
- [x] 구현: 필터링 조건 확장

#### 6.1.4 출력 파일 생성
- [x] 테스트: 헤더 구조 생성
- [x] 구현: `DialogueMerger.build_output(df)` - # 열 추가, reset_index
- [x] 테스트: Excel 파일 저장 (서식 포함)
- [x] 구현: `ExcelWriter.save(df, file_path, apply_format=True)` - ExcelFormatter 사용

### 6.2 M4/GL STRING 병합

#### 6.2.1 파일 읽기
- [ ] 테스트: 8개 STRING 파일 병렬 읽기
- [ ] 구현: `StringMerger.read_all_files(file_paths)`

#### 6.2.2 데이터 병합
- [ ] 테스트: 8개 파일 순차 병합
- [ ] 구현: `StringMerger.merge(dataframes)`

#### 6.2.3 출력 파일 생성
- [ ] 테스트: 헤더 구조 생성 및 저장
- [ ] 구현: `StringMerger.build_output(df)`

### 6.3 M4/GL 통합 병합

#### 6.3.1 순차 실행
- [ ] 테스트: DIALOGUE 병합 → STRING 병합 순차 실행
- [ ] 구현: `M4GLMerger.merge_all(folder_path)`

### 6.4 NC/GL 병합

#### 6.4.1 8개 언어 파일 병합
- [ ] 테스트: 8개 언어 파일 병렬 읽기
- [ ] 구현: `NCGLMerger.read_all_files(folder_path)`
- [ ] 테스트: EN 파일을 마스터로 병합
- [ ] 구현: `NCGLMerger.merge(dataframes)`

#### 6.4.2 필드 검증
- [ ] 테스트: Table, Source, Status, NOTE 일치 검증
- [ ] 구현: `NCGLMerger.validate_fields(dataframes)`
- [ ] 테스트: 불일치 발견 시 작업 중단
- [ ] 구현: 예외 발생 및 에러 메시지

#### 6.4.3 출력 파일 생성
- [ ] 테스트: 헤더 구조 생성 및 저장
- [ ] 구현: `NCGLMerger.build_output(df, yymmdd, milestone)`

### 6.5 LY/GL 병합

#### 6.5.1 7개 언어 파일 병합
- [ ] 테스트: 7개 언어 파일 읽기
- [ ] 구현: `LYGLMerger.read_all_files(folder_path)`
- [ ] 테스트: EN 파일을 마스터로 병합
- [ ] 구현: `LYGLMerger.merge(dataframes)`

#### 6.5.2 검증 규칙
- [ ] 테스트: 정확히 7개 파일 검증
- [ ] 구현: `LYGLMerger.validate_file_count(file_paths)`
- [ ] 테스트: KEY 일치 검증
- [ ] 구현: `LYGLMerger.validate_keys(dataframes)`

#### 6.5.3 출력 파일 생성
- [ ] 테스트: 헤더 구조 생성 및 저장
- [ ] 구현: `LYGLMerger.build_output(df)`

### 6.6 LY/GL 분할

#### 6.6.1 통합 파일 읽기
- [ ] 테스트: 병합 파일 읽기
- [ ] 구현: `LYGLSplitter.read_merged_file(file_path)`

#### 6.6.2 언어별 분할
- [ ] 테스트: 7개 언어별 파일로 분할
- [ ] 구현: `LYGLSplitter.split(merged_df, output_folder, date_prefix)`

#### 6.6.3 출력 파일 생성
- [ ] 테스트: 언어별 파일 저장
- [ ] 구현: 언어 코드별 파일명 생성 및 저장

### 6.7 공통 기능

#### 6.7.1 Excel 서식 적용
- [x] 테스트: 헤더 서식 적용 (배경색, 폰트)
- [x] 구현: `ExcelFormatter.apply_header_format(worksheet)`
- [x] 테스트: 데이터 셀 서식 적용 (폰트, 테두리)
- [x] 구현: `ExcelFormatter.apply_data_format(worksheet)`
- [x] 테스트: 틀 고정 (A2)
- [x] 구현: `ExcelFormatter.freeze_panes(worksheet)`

#### 6.7.2 진행률 표시
- [ ] 테스트: 진행률 계산
- [ ] 구현: `ProgressTracker.update(current, total)`

#### 6.7.3 병합 작업 동시 실행 방지
- [ ] 테스트: 병합 작업 실행 중 다른 병합 시도 시 차단
- [ ] 구현: 전역 플래그 `is_merge_running` 관리

---

## Phase 7: L10N Admin 기능 (l10n-admin.md 기반)

### 7.1 스케줄링 시스템

#### 7.1.1 Cron 표현식 파싱
- [ ] 테스트: Cron 표현식 파싱 및 다음 실행 시각 계산
- [ ] 구현: `CronParser.parse(cron_expr)`
- [ ] 테스트: APScheduler 통합
- [ ] 구현: `Scheduler.add_job(job_func, cron_expr)`

#### 7.1.2 누락된 스케줄 처리
- [ ] 테스트: 앱 시작 시 last_execution 날짜 확인
- [ ] 구현: `Scheduler.check_missed_schedules()`
- [ ] 테스트: Daily Task 누락 시 즉시 실행
- [ ] 구현: 날짜 비교 및 실행 로직
- [ ] 테스트: Daily Scrum 누락 시 즉시 실행
- [ ] 구현: 평일 확인 및 실행 로직
- [ ] 테스트: Slack MSG 누락 시 건너뛰기
- [ ] 구현: 건너뛰기 로직

### 7.2 Daily Task

#### 7.2.1 Confluence API 연동
- [ ] 테스트: 페이지 조회 (Mock API)
- [ ] 구현: `ConfluenceClient.get_page(page_id)`
- [ ] 테스트: 라벨 조회 (Mock API)
- [ ] 구현: `ConfluenceClient.get_labels(page_id)`

#### 7.2.2 영업일 계산
- [ ] 테스트: 다음 달 영업일 목록 계산
- [ ] 구현: `DateCalculator.get_business_days(year, month, holidays)`

#### 7.2.3 템플릿 블록 생성
- [ ] 테스트: Page Properties 매크로 JSON 구조 생성
- [ ] 구현: `DailyTaskGenerator.build_macro_json(date, weekday)`
- [ ] 테스트: UUID 및 timestamp 동적 생성
- [ ] 구현: UUID v4 생성 및 Unix timestamp 계산

#### 7.2.4 페이지 업데이트
- [ ] 테스트: 페이지 본문 업데이트 (Mock API)
- [ ] 구현: `ConfluenceClient.update_page(page_id, content)`
- [ ] 테스트: 라벨 삭제 (Mock API)
- [ ] 구현: `ConfluenceClient.delete_label(page_id, label_name)`
- [ ] 테스트: 라벨 추가 (Mock API)
- [ ] 구현: `ConfluenceClient.add_label(page_id, label_name)`

### 7.3 Daily Scrum

#### 7.3.1 월 첫 영업일 감지
- [ ] 테스트: 월 첫 영업일 계산 (주말 고려)
- [ ] 구현: `DateCalculator.get_first_business_day(year, month)`

#### 7.3.2 CQL 라벨 조건 업데이트
- [ ] 테스트: CQL 파라미터에서 라벨 조건 교체
- [ ] 구현: `DailyScrumUpdater.update_cql_label(content, old_label, new_label)`

#### 7.3.3 날짜 표시 업데이트
- [ ] 테스트: Details Summary 매크로의 firstcolumn 값 업데이트
- [ ] 구현: `DailyScrumUpdater.update_date_display(content, new_date)`

#### 7.3.4 페이지 업데이트
- [ ] 테스트: 페이지 업데이트 실행 (Mock API)
- [ ] 구현: `ConfluenceClient.update_page(page_id, updated_content)`

### 7.4 Slack MSG

#### 7.4.1 공휴일 확인
- [ ] 테스트: 오늘이 주말인지 확인
- [ ] 구현: `DateCalculator.is_weekend(date)`
- [ ] 테스트: 오늘이 공휴일인지 확인
- [ ] 구현: `DateCalculator.is_holiday(date, holidays)`
- [ ] 테스트: 영업일 확인 (주말 + 공휴일)
- [ ] 구현: `DateCalculator.is_business_day(date, holidays)`

#### 7.4.2 Slack API 연동
- [ ] 테스트: Slack 메시지 발송 (Mock API)
- [ ] 구현: `SlackClient.post_message(channel_id, text)`
- [ ] 테스트: 2개 메시지 순차 발송
- [ ] 구현: 메시지 2개 발송 로직

#### 7.4.3 메시지 포맷
- [ ] 테스트: 메시지 1 포맷 생성 (MM/dd(요일) 업무 출근은 찍었나요?)
- [ ] 구현: `SlackMsgGenerator.format_message_1(date)`
- [ ] 테스트: 메시지 2 포맷 생성 (MM/dd(요일) ## 잡담)
- [ ] 구현: `SlackMsgGenerator.format_message_2(date)`

### 7.5 동시성 처리

#### 7.5.1 다중 인스턴스 방지
- [ ] 테스트: 뮤텍스 생성 및 확인
- [ ] 구현: `SingleInstanceManager.create_mutex()`
- [ ] 테스트: 이미 실행 중일 때 경고 및 종료
- [ ] 구현: 뮤텍스 존재 확인 및 앱 종료

#### 7.5.2 작업 동시 실행 방지
- [ ] 테스트: 작업 실행 상태 플래그 관리
- [ ] 구현: `TaskRunner.is_running` 플래그
- [ ] 테스트: 실행 중 재실행 시도 시 차단
- [ ] 구현: 플래그 확인 및 예외 발생

#### 7.5.3 설정 파일 동시 접근
- [ ] 테스트: 파일 잠금 (읽기/쓰기)
- [ ] 구현: `FileLocker.acquire_lock(file_path, mode='r'|'w')`
- [ ] 테스트: 잠금 획득 실패 시 재시도
- [ ] 구현: 재시도 로직 (최대 3초)

---

## Phase 8A: PyQt6 GUI - 메인 윈도우 및 탭 구조 (shared.md 2장 기반)

### 8A.1 메인 윈도우

#### 8A.1.1 기본 구조
- [ ] 테스트: MainWindow 생성 및 표시
- [ ] 구현: `MainWindow.__init__()`
- [ ] 테스트: 탭 위젯 생성 (일정/메시지, 테이블 병합, 관리)
- [ ] 구현: `MainWindow.setup_tabs()`

#### 8A.1.2 최소화 및 종료
- [ ] 테스트: 최소화 시 시스템 트레이로 이동
- [ ] 구현: `MainWindow.minimize_to_tray()`
- [ ] 테스트: 트레이 아이콘 우클릭 → 종료
- [ ] 구현: `TrayIcon.show_context_menu()`

---

## Phase 8B: PyQt6 GUI - 탭별 UI 컴포넌트

### 8B.1 일정/메시지 탭

#### 8B.1.1 입력 UI
- [ ] 테스트: 프로젝트 드롭다운 생성
- [ ] 구현: `SchedulerTab.create_project_dropdown()`
- [ ] 테스트: 업데이트일 날짜 선택기 생성
- [ ] 구현: `SchedulerTab.create_date_picker()`
- [ ] 테스트: FBGL 배포 유형 드롭다운 (조건부 표시)
- [ ] 구현: `SchedulerTab.create_deployment_type_dropdown()`

#### 8B.1.2 결과 UI
- [ ] 테스트: 일정 테이블 표시
- [ ] 구현: `SchedulerTab.display_schedule_table(schedule_result)`
- [ ] 테스트: [JIRA 일감 생성] 버튼
- [ ] 구현: `SchedulerTab.create_jira_button()`
- [ ] 테스트: [폴더 생성] 버튼
- [ ] 구현: `SchedulerTab.create_folder_button()`
- [ ] 테스트: [헤즈업] 버튼
- [ ] 구현: `SchedulerTab.create_headsup_button()`
- [ ] 테스트: [HO] 드롭다운 버튼
- [ ] 구현: `SchedulerTab.create_ho_button()`

### 8B.2 테이블 병합 탭

#### 8B.2.1 버튼 UI
- [ ] 테스트: M4/GL 버튼 3개 생성
- [ ] 구현: `TableMergeTab.create_m4gl_buttons()`
- [ ] 테스트: NC/GL 버튼 생성
- [ ] 구현: `TableMergeTab.create_ncgl_button()`
- [ ] 테스트: LY/GL 버튼 2개 생성
- [ ] 구현: `TableMergeTab.create_lygl_buttons()`

#### 8B.2.2 진행률 UI
- [ ] 테스트: 진행률 바 표시
- [ ] 구현: `TableMergeTab.update_progress(value, message)`

### 8B.3 관리 탭

#### 8B.3.1 작업 카드 UI
- [ ] 테스트: Daily Task 카드 생성
- [ ] 구현: `AdminTab.create_daily_task_card()`
- [ ] 테스트: Daily Scrum 카드 생성
- [ ] 구현: `AdminTab.create_daily_scrum_card()`
- [ ] 테스트: Slack MSG 카드 생성
- [ ] 구현: `AdminTab.create_slack_msg_card()`

#### 8B.3.2 로그 UI
- [ ] 테스트: 실행 로그 텍스트 영역 생성
- [ ] 구현: `AdminTab.create_log_area()`

---

## Phase 8C: PyQt6 GUI - 설정 화면 및 마법사

### 8C.1 설정 화면

#### 8C.1.1 인증 정보 UI
- [ ] 테스트: JIRA 인증 정보 입력 필드
- [ ] 구현: `SettingsWindow.create_jira_auth_section()`
- [ ] 테스트: Slack 인증 정보 입력 필드
- [ ] 구현: `SettingsWindow.create_slack_auth_section()`
- [ ] 테스트: Confluence 인증 정보 입력 필드
- [ ] 구현: `SettingsWindow.create_confluence_auth_section()`

#### 8C.1.2 프로젝트 설정 UI
- [ ] 테스트: 프로젝트 드롭다운 및 설정 필드
- [ ] 구현: `SettingsWindow.create_project_settings_section()`

#### 8C.1.3 템플릿 편집 UI
- [ ] 테스트: 템플릿 편집 다이얼로그
- [ ] 구현: `TemplateEditDialog.__init__()`
- [ ] 테스트: 편집 중 프로젝트 변경 시 저장 확인
- [ ] 구현: `TemplateEditDialog.confirm_save_on_change()`

#### 8C.1.4 공휴일 관리 UI
- [ ] 테스트: 공휴일 가져오기/내보내기 버튼
- [ ] 구현: `SettingsWindow.create_holiday_section()`

#### 8C.1.5 스케줄 설정 UI
- [ ] 테스트: 스케줄 활성화 체크박스 및 Cron 표현식 입력
- [ ] 구현: `SettingsWindow.create_schedule_section()`

### 8C.2 초기 설정 마법사

#### 8C.2.1 PIN 설정
- [ ] 테스트: PIN 입력 화면
- [ ] 구현: `SetupWizard.create_pin_step()`
- [ ] 테스트: PIN 일치 검증
- [ ] 구현: `SetupWizard.validate_pin(pin, confirm_pin)`

#### 8C.2.2 서비스 연동
- [ ] 테스트: JIRA 연동 화면
- [ ] 구현: `SetupWizard.create_jira_step()`
- [ ] 테스트: 연결 테스트 실행
- [ ] 구현: `SetupWizard.test_jira_connection()`
- [ ] 테스트: 건너뛰기 후 기능 비활성화
- [ ] 구현: 버튼 비활성화 및 tooltip 표시

#### 8C.2.3 완료
- [ ] 테스트: 설정 저장 및 메인 화면 전환
- [ ] 구현: `SetupWizard.finish()`

---

## Phase 9: 에러 처리 및 검증 (shared.md 14장 기반)

### 9.1 파일 I/O 에러

#### 9.1.1 파일 없음
- [ ] 테스트: 파일 없음 에러 메시지
- [ ] 구현: `ErrorHandler.handle_file_not_found(path)`

#### 9.1.2 파일 접근 거부
- [ ] 테스트: 파일 잠금 에러 메시지
- [ ] 구현: `ErrorHandler.handle_file_access_denied(path)`

#### 9.1.3 파일 형식 오류
- [ ] 테스트: 지원하지 않는 형식 에러 메시지
- [ ] 구현: `ErrorHandler.handle_file_format_invalid(path)`

### 9.2 데이터 검증 에러

#### 9.2.1 필수 파일 누락
- [ ] 테스트: 필수 언어 파일 누락 에러 메시지
- [ ] 구현: `ErrorHandler.handle_validation_missing_files(required, missing)`

#### 9.2.2 중복 KEY
- [ ] 테스트: 중복 KEY 에러 메시지
- [ ] 구현: `ErrorHandler.handle_validation_duplicate_key(key, file)`

#### 9.2.3 필드 불일치
- [ ] 테스트: 필드 값 불일치 에러 메시지
- [ ] 구현: `ErrorHandler.handle_validation_field_mismatch(key, field, en_value, lang_value)`

### 9.3 API 연동 에러

#### 9.3.1 인증 실패
- [ ] 테스트: API 인증 실패 에러 메시지
- [ ] 구현: `ErrorHandler.handle_api_auth_failed(service)`

#### 9.3.2 권한 부족
- [ ] 테스트: API 권한 부족 에러 메시지
- [ ] 구현: `ErrorHandler.handle_api_permission_denied(service, operation)`

#### 9.3.3 네트워크 오류
- [ ] 테스트: 네트워크 오프라인 에러 메시지
- [ ] 구현: `ErrorHandler.handle_network_offline()`

### 9.4 재시도 정책

#### 9.4.1 지수 백오프
- [ ] 테스트: 재시도 간격 계산 (5초, 10초, 20초)
- [ ] 구현: `RetryPolicy.calculate_backoff(attempt)`

#### 9.4.2 최대 재시도 횟수
- [ ] 테스트: 3회 재시도 후 실패
- [ ] 구현: `RetryPolicy.execute_with_retry(func, max_attempts=3)`

---

## Phase 10: 통합 테스트 및 배포

### 10.1 통합 테스트

#### 10.1.1 엔드투엔드 테스트 - 일정 계산 → JIRA 생성
- [ ] 테스트: M4GL 일정 계산 → JIRA 생성 (Mock API)
- [ ] 구현: 통합 시나리오 테스트

#### 10.1.2 엔드투엔드 테스트 - 일정 계산 → 폴더 생성
- [ ] 테스트: M4GL 일정 계산 → 폴더 생성 (임시 디렉토리)
- [ ] 구현: 통합 시나리오 테스트

#### 10.1.3 엔드투엔드 테스트 - 테이블 병합
- [ ] 테스트: M4/GL DIALOGUE 병합 (샘플 데이터)
- [ ] 구현: 통합 시나리오 테스트

#### 10.1.4 엔드투엔드 테스트 - L10N Admin
- [ ] 테스트: Daily Task 실행 (Mock API)
- [ ] 구현: 통합 시나리오 테스트

### 10.2 패키징

#### 10.2.1 PyInstaller 설정
- [ ] 테스트: sebastian.spec 파일 작성
- [ ] 구현: PyInstaller 빌드 스크립트
- [ ] 테스트: 단일 실행 파일 생성 확인
- [ ] 구현: `pyinstaller --onefile --windowed`

#### 10.2.2 리소스 번들링
- [ ] 테스트: holidays.json 번들링
- [ ] 구현: `--add-data` 옵션 추가
- [ ] 테스트: 아이콘 번들링
- [ ] 구현: `--icon` 옵션 추가

### 10.3 배포 테스트

#### 10.3.1 설치 테스트
- [ ] 테스트: 클린 Windows 환경에서 실행
- [ ] 구현: VM 또는 테스트 환경 구축

#### 10.3.2 초기 설정 테스트
- [ ] 테스트: 초기 설정 마법사 완료
- [ ] 구현: 시나리오 테스트

#### 10.3.3 기능 테스트
- [ ] 테스트: 모든 주요 기능 실행 확인
- [ ] 구현: 기능별 체크리스트

---

## 완료 기준

각 항목은 다음 조건을 만족할 때 체크 표시:
1. 테스트가 작성되고 실패함 (Red)
2. 최소한의 코드로 테스트가 통과함 (Green)
3. 코드가 리팩토링되고 모든 테스트가 여전히 통과함 (Refactor)
4. 코드가 CLAUDE.md의 원칙을 준수함

---

## 참고 문서

- `CLAUDE.md` - TDD 방법론 가이드
- `prd/sebastian/sebastian-prd-master.md` - 마스터 PRD
- `prd/sebastian/sebastian-prd-shared.md` - 공통 컴포넌트
- `prd/sebastian/sebastian-prd-scheduler.md` - 일정 관리
- `prd/sebastian/sebastian-prd-messaging.md` - 메시지 기능
- `prd/sebastian/sebastian-prd-table-merge.md` - 테이블 병합
- `prd/sebastian/sebastian-prd-l10n-admin.md` - L10N Admin

---

## 진행 상황

- **Phase 0**: [x] 완료
- **Phase 1**: [x] 완료
- **Phase 2**: [x] 완료
- **Phase 3**: [x] 완료
- **Phase 4**: [x] 완료
- **Phase 5**: [x] 완료
- **Phase 6**: [ ] 시작 전
- **Phase 7**: [ ] 시작 전
- **Phase 8A**: [ ] 시작 전 (메인 윈도우 및 탭 구조)
- **Phase 8B**: [ ] 시작 전 (탭별 UI 컴포넌트)
- **Phase 8C**: [ ] 시작 전 (설정 화면 및 마법사)
- **Phase 9**: [ ] 시작 전
- **Phase 10**: [ ] 시작 전

---

## 다음 단계

"go" 명령을 입력하면:
1. plan.md에서 다음 체크되지 않은 테스트를 찾습니다
2. 해당 테스트를 구현합니다 (Red)
3. 테스트를 통과시킬 최소한의 코드를 작성합니다 (Green)
4. 필요시 리팩토링합니다 (Refactor)
5. plan.md에 체크 표시를 합니다
6. 다음 테스트를 기다립니다
