# Sebastian PRD - Table Merge Feature

**문서 버전**: 1.6
**최종 수정**: 2025-11-27
**상태**: Approved

---

## 1. 개요

이 문서는 Sebastian의 테이블 병합 기능을 정의합니다.

**포함 기능**:
- M4/GL 테이블 병합 (DIALOGUE, STRING, 통합)
- NC/GL 테이블 병합
- LY/GL 테이블 병합/분할

---

## 2. 테이블 병합 탭 구조

### 2.1 UI 구성

```
┌─────────────────────────────────────────────┐
│  테이블 병합                                │
├─────────────────────────────────────────────┤
│                                             │
│  [M4/GL DIALOGUE] [M4/GL STRING] [통합 병합] │
│                                             │
│  [NC/GL 병합]                               │
│                                             │
│  [LY/GL 병합]  [LY/GL 분할]                  │
│                                             │
├─────────────────────────────────────────────┤
│ 로그/결과 영역                               │
│                                             │
└─────────────────────────────────────────────┘
```

### 2.2 병합 작업 동시 실행 방지

**목적**: 여러 병합 작업이 동시에 실행되는 것을 방지하여 리소스 충돌 및 UI 혼란 방지

**구현**:
- 병합 작업 시작 시 전역 플래그 `is_merge_running = True`
- 작업 완료/실패 시 플래그 `is_merge_running = False`
- 플래그가 `True`인 동안:
  - 모든 병합 버튼 비활성화 (M4/GL, NC/GL, LY/GL 모두)
  - 버튼 tooltip: "다른 병합 작업이 진행 중입니다"
  - 상태 표시: "작업 진행 중... (시작: {시작_시각})"

**예외 처리**:
- 작업 중 앱 비정상 종료 시: 다음 실행 시 플래그 자동 초기화 (메모리만 사용, 파일 저장 안 함)
- 작업 중 예외 발생 시: `finally` 블록에서 플래그 반드시 `False`로 복구

**UI 상태 예시**:
```
┌─────────────────────────────────────────────┐
│  테이블 병합                                │
├─────────────────────────────────────────────┤
│  [M4/GL DIALOGUE] (비활성화)                │
│  [M4/GL STRING] (비활성화)                  │
│  [통합 병합] (비활성화)                      │
│  [NC/GL 병합] (비활성화)                     │
│  [LY/GL 병합] (비활성화)                     │
│                                             │
│  상태: M4/GL DIALOGUE 병합 진행 중...        │
│  시작: 14:30:15                             │
├─────────────────────────────────────────────┤
│ 진행률: ████████░░░░ 60%                    │
└─────────────────────────────────────────────┘
```

---

## 3. M4/GL 테이블 병합

### 3.1 DIALOGUE 병합

#### 3.1.1 기능 설명

3개의 대화 테이블 파일을 1개의 마스터 파일로 병합합니다.

#### 3.1.2 입력 파일

| 파일명 | 시트 | 헤더 행 | 데이터 시작 행 | NPC ID 열 | Speaker Name 열 |
|--------|------|---------|---------------|----------|----------------|
| CINEMATIC_DIALOGUE.xlsm | 2번째 | 2 | 10 | - | - |
| SMALLTALK_DIALOGUE.xlsm | 2번째 | 2 | 5 | - | - |
| NPC.xlsm | NPC | 2 | 3 | 7 (H열) | 9 (J열) |

#### 3.1.3 출력 파일

**파일명**: `{MMDD}_MIR4_MASTER_DIALOGUE.xlsx`

**헤더 구조**:
```
#, Table Name, String ID, Table/ID, NPC ID, Speaker Name,
KO (M), KO (F), EN (M), EN (F), CT (M), CT (F), CS (M), CS (F),
JA (M), JA (F), TH (M), TH (F), ES-LATAM (M), ES-LATAM (F),
PT-BR (M), PT-BR (F), NOTE
```

#### 3.1.4 병합 로직

1. CINEMATIC_DIALOGUE 데이터 추출
2. SMALLTALK_DIALOGUE 데이터 추출
3. 데이터 병합 (CINEMATIC 먼저, SMALLTALK 다음)

   **병합 방식**: 순차 이어붙이기 (Concatenation)

   **중복 KEY 처리**:
   - String ID는 파일 내에서만 고유 (같은 파일에 중복 없음)
   - CINEMATIC의 String ID=1234와 SMALLTALK의 String ID=1234는 **서로 다른 데이터**
   - Table Name이 다르므로 (CINEMATIC_DIALOGUE vs SMALLTALK_DIALOGUE) 중복 아님
   - 중복 체크 불필요, 모든 데이터를 순차적으로 추가

   **병합 순서**:
   - CINEMATIC의 모든 행 (헤더 제외)
   - SMALLTALK의 모든 행 (헤더 제외)
   - 최종 인덱스(#) 열은 1부터 재정렬

4. NPC.xlsm에서 NPC ID → Speaker Name 매핑

   **NPC 파일 읽기**:
   - 시트: `'NPC'`
   - 헤더 행: 2 (pandas header=1)
   - 데이터 시작: 3행부터
   - NPC ID 열: 7 (H열, 0-based index)
   - Speaker Name 열: 9 (J열, 0-based index)

   **매핑 생성**:
   ```python
   npc_data = pd.read_excel('NPC.xlsm', sheet_name='NPC', header=1)
   npc_data = npc_data.drop_duplicates(subset=npc_data.columns[7])  # NPC ID 중복 제거
   npc_map = dict(zip(npc_data.iloc[:, 7], npc_data.iloc[:, 9]))  # {NPC_ID: Speaker_Name}
   ```

   **Speaker Name 채우기**:
   - 병합된 데이터의 'NPC ID' 열 값으로 npc_map에서 조회
   - 매핑되는 값이 있으면 Speaker Name에 채움
   - 매핑되지 않으면 NPC ID 값을 그대로 유지 (fillna)
5. 행 필터링 규칙:

   **제거 조건** (EN (M) 열 기준):
   - EN (M) 열이 다음 중 하나라도 만족하면 **전체 행 제거**:
     - 빈 셀 (NaN, None, 빈 문자열)
     - 숫자 0
     - 문자열 '미사용' (대소문자 구분 없음)

   **유지 규칙** (다른 언어 열):
   - EN (M)이 유효한 값이 있으면 행 유지
   - 다른 언어 열(EN (F), KO (M), KO (F), CT (M), etc.)이 비어 있어도 무방
   - 빈 셀은 빈 문자열("")로 처리하여 출력

   **예시**:
   ```
   행 1: EN (M) = "Hello", EN (F) = "", KO (M) = "안녕" → 유지 (EN (F)는 빈 문자열)
   행 2: EN (M) = "", EN (F) = "Hi", KO (M) = "안녕" → 제거 (EN (M)이 비어있음)
   행 3: EN (M) = "미사용", EN (F) = "Hi" → 제거 (EN (M)이 '미사용')
   행 4: EN (M) = "World", 모든 다른 열 = "" → 유지 (EN (M)이 유효)
   ```

6. 인덱스 재정렬
7. 서식 적용 및 저장

#### 3.1.5 열 매핑

| 출력 열 | CINEMATIC 인덱스 | SMALLTALK 인덱스 |
|---------|-----------------|-----------------|
| String ID | 7 | 7 |
| NPC ID | 8 | 8 |
| KO (M) | 11 | 12 |
| KO (F) | 12 | 13 |
| EN (M) | 13 | 14 |
| EN (F) | 14 | 15 |
| CT (M) | 15 | 16 |
| CT (F) | 16 | 17 |
| CS (M) | 17 | 18 |
| CS (F) | 18 | 19 |
| JA (M) | 19 | 20 |
| JA (F) | 20 | 21 |
| TH (M) | 21 | 22 |
| TH (F) | 22 | 23 |
| ES-LATAM (M) | 23 | 24 |
| ES-LATAM (F) | 24 | 25 |
| PT-BR (M) | 25 | 26 |
| PT-BR (F) | 26 | 27 |
| NOTE | 29 | 30 |

---

### 3.2 STRING 병합

#### 3.2.1 기능 설명

8개의 스트링 테이블 파일을 1개의 마스터 파일로 병합합니다.

#### 3.2.2 입력 파일

| 파일명 | 헤더 행 | 데이터 시작 행 |
|--------|---------|---------------|
| SEQUENCE_DIALOGUE.xlsm | 2 | 9 |
| STRING_BUILTIN.xlsm | 2 | 4 |
| STRING_MAIL.xlsm | 2 | 4 |
| STRING_MESSAGE.xlsm | 2 | 4 |
| STRING_NPC.xlsm | 2 | 4 |
| STRING_QUESTTEMPLATE.xlsm | 2 | 7 |
| STRING_TEMPLATE.xlsm | 2 | 4 |
| STRING_TOOLTIP.xlsm | 2 | 4 |

#### 3.2.3 출력 파일

**파일명**: `{MMDD}_MIR4_MASTER_STRING.xlsx`

**헤더 구조**:
```
#, Table Name, String ID, Table/ID, NOTE, KO, EN, CT, CS, JA, TH, ES-LATAM, PT-BR, NPC 이름, 비고
```

#### 3.2.4 열 매핑 (파일별)

| 파일 | String ID | NOTE | KO | EN | CT | CS | JA | TH | ES-LATAM | PT-BR | NPC 이름 | 비고 |
|------|-----------|------|----|----|----|----|----|----|----------|-------|----------|------|
| SEQUENCE_DIALOGUE | 7 | - | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | - | - |
| STRING_BUILTIN | 7 | 21 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | - | - |
| STRING_MAIL | 7 | - | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | - | - |
| STRING_MESSAGE | 7 | 21 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | - | - |
| STRING_NPC | 7 | 20 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 18 | 19 |
| STRING_QUESTTEMPLATE | 7 | 0 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | - | - |
| STRING_TEMPLATE | 7 | 19 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | - | 18 |
| STRING_TOOLTIP | 7 | 8 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | - | - |

**참고**: `-`는 해당 파일에 해당 열이 없음을 의미. `None`으로 처리.

---

### 3.3 통합 병합

#### 3.3.1 기능 설명

DIALOGUE와 STRING 병합을 순차적으로 실행합니다.

#### 3.3.2 실행 흐름

1. DIALOGUE 병합 실행
2. 완료 확인
3. STRING 병합 실행
4. 완료 확인
5. 총 2개 파일 생성 완료

#### 3.3.3 UI

```
┌─────────────────────────────────────────────┐
│ M4/GL 통합 병합                              │
├─────────────────────────────────────────────┤
│ ✓ DIALOGUE 병합 완료                         │
│   → 0110_MIR4_MASTER_DIALOGUE.xlsx          │
│ ✓ STRING 병합 완료                           │
│   → 0110_MIR4_MASTER_STRING.xlsx            │
├─────────────────────────────────────────────┤
│ 총 2개 파일 생성 완료 (소요 시간: 15초)       │
│ [폴더 열기]                                  │
└─────────────────────────────────────────────┘
```

---

### 3.4 M4/GL 공통 UI

```
┌─────────────────────────────────────────────┐
│ M4/GL DIALOGUE 병합                          │
├─────────────────────────────────────────────┤
│ 파일 폴더: [경로 선택...]  [선택]             │
├─────────────────────────────────────────────┤
│ 필요 파일:                                   │
│ ✓ CINEMATIC_DIALOGUE.xlsm                   │
│ ✓ SMALLTALK_DIALOGUE.xlsm                   │
│ ✓ NPC.xlsm                                  │
├─────────────────────────────────────────────┤
│ [병합 시작]                                  │
├─────────────────────────────────────────────┤
│ 진행률: ████████████░░░░░░░░ 60%             │
│ 현재: 데이터 병합 중...                       │
└─────────────────────────────────────────────┘
```

---

## 4. NC/GL 테이블 병합

### 4.1 기능 설명

8개 언어별 파일을 1개의 통합 파일로 병합합니다.

### 4.2 입력

| 항목 | 설명 | 예시 |
|------|------|------|
| 파일 폴더 | 언어 파일이 있는 폴더 | 폴더 선택 |
| 업데이트일 | YYMMDD 형식 | 250115 |
| 마일스톤 | 차수 입력 | 42 |

### 4.3 입력 파일

| 파일명 | 언어 코드 |
|--------|----------|
| StringEnglish.xlsx | EN |
| StringTraditionalChinese.xlsx | CT |
| StringSimplifiedChinese.xlsx | CS |
| StringJapanese.xlsx | JA |
| StringThai.xlsx | TH |
| StringSpanish.xlsx | ES |
| StringPortuguese.xlsx | PT |
| StringRussian.xlsx | RU |

### 4.4 출력 파일

**파일명**: `{YYMMDD}_M{milestone}_StringALL.xlsx`

**헤더 구조**:
```
Key, Source, Target_EN, Target_CT, Target_CS, Target_JA, Target_TH, Target_ES, Target_PT, Target_RU, Comment, TableName, Status
```

### 4.5 열 매핑

**각 언어 파일 구조** (고정):

| 열 인덱스 | 열 이름 |
|----------|---------|
| 0 | Table |
| 1 | KEY |
| 2 | Source |
| 3 | Target |
| 4 | Status |
| 5 | NOTE |

**병합 파일 헤더**:

| 출력 열 인덱스 | 열 이름 | 소스 |
|-------------|---------|------|
| 0 | Key | EN의 KEY (열 1) |
| 1 | Source | EN의 Source (열 2) |
| 2 | Target_EN | EN의 Target (열 3) |
| 3 | Target_CT | CT의 Target (열 3) |
| 4 | Target_CS | CS의 Target (열 3) |
| 5 | Target_JA | JA의 Target (열 3) |
| 6 | Target_TH | TH의 Target (열 3) |
| 7 | Target_ES | ES의 Target (열 3) |
| 8 | Target_PT | PT의 Target (열 3) |
| 9 | Target_RU | RU의 Target (열 3) |
| 10 | Comment | EN의 NOTE (열 5) |
| 11 | TableName | EN의 Table (열 0) |
| 12 | Status | EN의 Status (열 4) |

### 4.6 병합 로직

1. 8개 파일 병렬 로드
2. EN 파일에서 마스터 KEY 목록 추출
3. 각 KEY에 대해 모든 언어 파일의 Target 값 수집
4. Table, Source, Status, NOTE 일치 검증
   - **검증 규칙**: EN 파일의 각 KEY에 대해 모든 언어 파일의 해당 필드 값이 동일해야 함
   - **불일치 발견 시**:
     - 에러 메시지 표시: "KEY '{key}'의 {field} 값이 언어별로 다릅니다. EN: '{en_value}', {lang}: '{lang_value}'"
     - 작업 즉시 중단 (부분 병합 방지)
     - 불일치 항목 모두 로그에 기록
     - 사용자에게 원본 파일 수정 후 재시도 안내
5. NaN/inf 값 빈 문자열로 변환
6. 서식 적용 및 저장

### 4.6 UI

```
┌─────────────────────────────────────────────┐
│ NC/GL 병합                                   │
├─────────────────────────────────────────────┤
│ 파일 폴더: [경로 선택...]  [선택]             │
│ 업데이트일: [250115]                         │
│ 마일스톤: [42]                               │
├─────────────────────────────────────────────┤
│ 필요 파일:                                   │
│ ✓ StringEnglish.xlsx                        │
│ ✓ StringTraditionalChinese.xlsx             │
│ ✓ StringSimplifiedChinese.xlsx              │
│ ✓ StringJapanese.xlsx                       │
│ ✓ StringThai.xlsx                           │
│ ✓ StringSpanish.xlsx                        │
│ ✓ StringPortuguese.xlsx                     │
│ ✓ StringRussian.xlsx                        │
├─────────────────────────────────────────────┤
│ [병합 시작]                                  │
└─────────────────────────────────────────────┘
```

---

## 5. LY/GL 테이블 병합/분할

### 5.1 병합 기능

#### 5.1.1 기능 설명

7개 언어별 파일을 1개의 통합 파일로 병합합니다.

#### 5.1.2 입력 파일

| 언어 코드 | 파일명 형식 |
|----------|------------|
| EN | `{date}_EN.xlsx` |
| CT | `{date}_CT.xlsx` |
| CS | `{date}_CS.xlsx` |
| JA | `{date}_JA.xlsx` |
| TH | `{date}_TH.xlsx` |
| PT-BR | `{date}_PT-BR.xlsx` |
| RU | `{date}_RU.xlsx` |

#### 5.1.3 출력 파일

**헤더 구조**:
```
Table, KEY, Source, Target_EN, Target_CT, Target_CS, Target_JA, Target_TH, Target_PT-BR, Target_RU, Status, NOTE
```

#### 5.1.4 열 매핑

**각 언어 파일 구조** (고정):

| 열 인덱스 | 열 이름 |
|----------|---------|
| 0 | Table |
| 1 | KEY |
| 2 | Source |
| 3 | Target |
| 4 | Status |
| 5 | NOTE |

**병합 파일 헤더**:

| 출력 열 인덱스 | 열 이름 | 소스 |
|-------------|---------|------|
| 0 | Table | EN의 Table (열 0) |
| 1 | KEY | EN의 KEY (열 1) |
| 2 | Source | EN의 Source (열 2) |
| 3 | Target_EN | EN의 Target (열 3) |
| 4 | Target_CT | CT의 Target (열 3) |
| 5 | Target_CS | CS의 Target (열 3) |
| 6 | Target_JA | JA의 Target (열 3) |
| 7 | Target_TH | TH의 Target (열 3) |
| 8 | Target_PT-BR | PT-BR의 Target (열 3) |
| 9 | Target_RU | RU의 Target (열 3) |
| 10 | Status | EN의 Status (열 4) |
| 11 | NOTE | EN의 NOTE (열 5) |

#### 5.1.5 검증 규칙

- 정확히 7개 파일 필요
- KEY 일치 검증 (EN을 마스터로)
- Table, Source, Status, NOTE 일치 검증
- 중복 KEY 검증

#### 5.1.6 에러 처리

| 에러 | 메시지 |
|------|--------|
| 파일 수 불일치 | "7개 언어 파일이 필요합니다" |
| KEY 불일치 | "KEY '{key}'가 EN 파일에 없습니다" |
| 데이터 불일치 | "KEY '{key}'의 Table 값이 다릅니다" |

---

#### 5.1.7 분할 열 매핑

**병합 파일 → 언어별 파일**:

| 병합 파일 열 | 언어별 파일 열 |
|-------------|---------------|
| Table (0) | Table (0) |
| KEY (1) | KEY (1) |
| Source (2) | Source (2) |
| Target_{lang} (3~9) | Target (3) |
| Status (10) | Status (4) |
| NOTE (11) | NOTE (5) |

---

### 5.2 분할 기능

#### 5.2.1 기능 설명

1개의 통합 파일을 7개 언어별 파일로 분할합니다.

#### 5.2.2 입력

| 항목 | 설명 |
|------|------|
| 병합 파일 | 통합 Excel 파일 선택 |
| 출력 폴더 | 분할 파일 저장 위치 |
| 날짜 접두사 | 파일명에 사용 (선택적, 기본값: 입력 파일에서 추출) |

#### 5.2.3 출력 파일

| 언어 코드 | 파일명 형식 |
|----------|------------|
| EN | `{date}_EN.xlsx` |
| CT | `{date}_CT.xlsx` |
| CS | `{date}_CS.xlsx` |
| JA | `{date}_JA.xlsx` |
| TH | `{date}_TH.xlsx` |
| PT-BR | `{date}_PT-BR.xlsx` |
| RU | `{date}_RU.xlsx` |

**개별 파일 헤더**:
```
Table, KEY, Source, Target, Status, NOTE
```

---

### 5.3 LY/GL UI

```
┌─────────────────────────────────────────────┐
│ LY/GL 병합                                   │
├─────────────────────────────────────────────┤
│ 파일 폴더: [경로 선택...]  [선택]             │
├─────────────────────────────────────────────┤
│ 감지된 파일:                                 │
│ ✓ 251104_EN.xlsx                            │
│ ✓ 251104_CT.xlsx                            │
│ ✓ 251104_CS.xlsx                            │
│ ✓ 251104_JA.xlsx                            │
│ ✓ 251104_TH.xlsx                            │
│ ✓ 251104_PT-BR.xlsx                         │
│ ✓ 251104_RU.xlsx                            │
├─────────────────────────────────────────────┤
│ [병합 시작]                                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ LY/GL 분할                                   │
├─────────────────────────────────────────────┤
│ 병합 파일: [파일 선택...]  [선택]             │
│ 출력 폴더: [경로 선택...]  [선택]             │
├─────────────────────────────────────────────┤
│ [분할 시작]                                  │
└─────────────────────────────────────────────┘
```

---

## 6. 공통 기능

### 6.1 출력 파일 서식

모든 병합 결과 파일에 적용:

| 요소 | 스타일 |
|------|--------|
| 헤더 폰트 | 맑은 고딕, 12pt, Bold |
| 헤더 색상 | 배경: #FFEB9C, 글자: #9C5700 |
| 데이터 폰트 | 맑은 고딕, 10pt |
| 테두리 | Thin, Black |
| 틀 고정 | A2 (헤더 행 고정) |

### 6.2 진행률 표시

```
┌─────────────────────────────────────────────┐
│ 진행률: ████████████░░░░░░░░ 60%             │
│ 단계: 2/3                                   │
│ 현재 파일: SMALLTALK_DIALOGUE.xlsm          │
│ 처리된 파일: 2/3                             │
└─────────────────────────────────────────────┘
```

### 6.3 결과 표시

```
┌─────────────────────────────────────────────┐
│ ✓ 병합 완료                                  │
│                                             │
│ 출력 파일: 0110_MIR4_MASTER_DIALOGUE.xlsx    │
│ 총 행 수: 15,234                            │
│ 소요 시간: 8초                               │
│                                             │
│ [폴더 열기]  [파일 열기]                      │
└─────────────────────────────────────────────┘
```

### 6.4 출력 파일 저장 위치

**규칙**: 입력 파일이 위치한 폴더와 동일한 경로에 저장

| 병합 유형 | 입력 파일 경로 예시 | 출력 파일 경로 |
|----------|-------------------|---------------|
| M4/GL DIALOGUE | `D:\work\m4gl\tables\` | `D:\work\m4gl\tables\{MMDD}_MIR4_MASTER_DIALOGUE.xlsx` |
| M4/GL STRING | `D:\work\m4gl\tables\` | `D:\work\m4gl\tables\{MMDD}_MIR4_MASTER_STRING.xlsx` |
| NC/GL | `D:\work\ncgl\250115_M42\` | `D:\work\ncgl\250115_M42\{YYMMDD}_M{milestone}_StringALL.xlsx` |
| LY/GL 병합 | `D:\work\lygl\251104\` | `D:\work\lygl\251104\{출력파일명}.xlsx` |
| LY/GL 분할 | 사용자 지정 출력 폴더 | 사용자 지정 폴더에 언어별 파일 생성 |

> **참고**: LY/GL 분할의 경우, 분할 결과가 여러 파일이므로 별도의 출력 폴더를 선택하도록 합니다.

### 6.5 에러 처리

| 에러 | 처리 |
|------|------|
| 파일 없음 | 필요 파일 목록 표시 |
| 파일 손상 | 구체적 오류 위치 표시 |
| 메모리 부족 | 파일 크기 확인 안내 |
| 권한 없음 | 파일 잠금 확인 안내 |

---

## 7. 프로젝트별 언어 목록

| 프로젝트 | 언어 |
|----------|------|
| M4GL | KO, EN, CT, CS, JA, TH, ES-LATAM, PT-BR (M/F 구분) |
| NCGL | EN, CT, CS, JA, TH, ES, PT, RU |
| LYGL | EN, CT, CS, JA, TH, PT-BR, RU |

---

## 부록 A: 참조 문서

- `sebastian-prd-shared.md`: 공통 컴포넌트
- `sebastian-prd-master.md`: 마스터 문서
- `legacy/Merged_M4/Merged_M4.py`: 레거시 M4 병합 코드
- `legacy/Merged_NC/Merged_NC.py`: 레거시 NC 병합 코드
- `legacy/Merged_LY/src/merge.py`: 레거시 LY 병합 코드
- `legacy/Merged_LY/src/split.py`: 레거시 LY 분할 코드

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-11-20 | 초안 작성 - 레거시 코드 분석 및 라운드 1-4 답변 반영 |
| 1.1 | 2025-11-25 | 검증 완료, 승인 |
| 1.2 | 2025-11-26 | Draft 재전환 (변경 사항 없음) |
| 1.3 | 2025-11-27 | 버전 동기화 (master.md와 일치) |
| 1.4 | 2025-11-27 | PRD 정제 라운드 1: 병합 작업 동시 실행 방지 로직 추가 |
| 1.5 | 2025-11-27 | Wireframes 문서 보완 완료, UI 시안 참조 체계 확립 |
| 1.6 | 2025-11-27 | 최종 승인: 모든 Feature 문서 v1.6 통일, Approved 상태로 전환 |
