# Sebastian PRD - L10n Admin Feature

**문서 버전**: 1.6
**최종 수정**: 2025-11-27
**상태**: Approved

---

## 1. 개요

이 문서는 Sebastian의 관리자 기능을 정의합니다.

**포함 기능**:
- Daily Task (Confluence 월간 템플릿 생성)
- Daily Scrum (Confluence 일일 업데이트)
- Slack MSG (Slack 채널 메시지)

**동작 방식**: 앱 실행 중 자동 스케줄 + 수동 실행 버튼

---

## 2. 스케줄링 시스템

### 2.1 동작 방식

- **앱 시작 시**: 자동으로 스케줄 활성화
- **상태 표시**: 설정 화면에서만 확인 가능
- **최소화 시**: 시스템 트레이로 최소화 (백그라운드 실행)
- **결과 알림**: 로그에만 기록 (토스트 알림 X)

### 2.2 스케줄 설정

| 작업 | 기본 스케줄 | Cron 표현식 |
|------|------------|-------------|
| Daily Task | 매월 10일 09:00 | `0 9 10 * *` |
| Daily Scrum | 매일 09:00 (평일) | `0 9 * * 1-5` |
| Slack MSG | 매일 07:00 (평일) | `0 7 * * 1-5` |

### 2.3 설정 화면

```
┌─────────────────────────────────────────────┐
│ 스케줄 설정                                  │
├─────────────────────────────────────────────┤
│ Daily Task                                  │
│   [✓] 활성화  스케줄: 매월 10일 09:00        │
│                                             │
│ Daily Scrum                                 │
│   [✓] 활성화  스케줄: 매일 09:00 (평일)      │
│                                             │
│ Slack MSG                                   │
│   [✓] 활성화  스케줄: 매일 07:00 (평일)      │
│                                             │
│ Slack 채널 ID: [C06BZA056E4]                │
└─────────────────────────────────────────────┘
```

### 2.4 누락된 스케줄 처리

**시나리오**: 앱이 스케줄 시간에 실행 중이지 않았을 때

**앱 시작 시 확인**:
1. 마지막 실행 날짜를 `config.json`에서 로드
   ```json
   "last_execution": {
     "daily_task": "2025-01-10",
     "daily_scrum": "2025-01-10",
     "slack_msg": "2025-01-10"
   }
   ```

2. 오늘 날짜와 비교하여 누락 여부 확인

**작업별 처리**:

| 작업 | 누락 시 처리 |
|------|-------------|
| Daily Task | 오늘이 10일이고 아직 실행 안 했으면 **즉시 실행** |
| Daily Scrum | 오늘이 평일이고 아직 실행 안 했으면 **즉시 실행** |
| Slack MSG | **건너뛰기** (출근 시간 07:00 이후에는 의미 없음) |

**실행 후**:
- `last_execution` 날짜를 오늘로 업데이트
- config.json에 저장

**로그 예시**:
```
[INFO] 앱 시작: 누락된 스케줄 확인 중
[INFO] Daily Scrum 누락 감지: 마지막 실행=2025-01-09, 오늘=2025-01-10
[INFO] Daily Scrum 즉시 실행 시작
[INFO] Confluence 페이지 업데이트 완료
[INFO] last_execution 업데이트: daily_scrum=2025-01-10
```

---

## 3. Daily Task

### 3.1 기능 설명

매월 10일에 Confluence 페이지에 다음 달 영업일 템플릿을 자동 생성합니다.

### 3.2 동작 흐름

1. 현재 페이지 내용 조회
2. 현재 라벨 조회
3. 다음 달 영업일 목록 계산 (주말 제외)
4. 새 템플릿 블록 생성
5. 페이지 본문 업데이트
6. 이전 라벨 삭제 (`daily_task_이전월`)
7. 새 라벨 추가 (`daily_task_다음월`)

### 3.3 Confluence API

**페이지 ID**: 190906620 (설정 가능)

**사용 API**:
- `GET /wiki/api/v2/pages/{id}` - 페이지 조회
- `GET /wiki/api/v2/pages/{id}/labels` - 라벨 조회
- `PUT /wiki/api/v2/pages/{id}` - 페이지 업데이트
- `DELETE /wiki/rest/api/content/{id}/label/{name}` - 라벨 삭제
- `POST /wiki/rest/api/content/{id}/label` - 라벨 추가

### 3.4 템플릿 블록 구조 (Page Properties 매크로)

각 영업일에 대해 Page Properties 매크로 생성:

```json
{
  "type": "bodiedExtension",
  "attrs": {
    "layout": "default",
    "extensionType": "com.atlassian.confluence.macro.core",
    "extensionKey": "details",
    "parameters": {
      "macroParams": {
        "id": {
          "value": "DAILY_TASK_MK2_20250203"
        }
      },
      "macroMetadata": {
        "macroId": {
          "value": "747feb18b0d676004bf942e2e1602b2e6344d970307fe38be07815a34ee0cafe"
        },
        "schemaVersion": {
          "value": "1"
        },
        "title": "Page Properties"
      }
    },
    "localId": "UUID_생성_필요"
  },
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "date",
          "attrs": {
            "timestamp": "1738540800000"
          }
        },
        {
          "text": " (월)",
          "type": "text"
        }
      ]
    },
    {
      "type": "table",
      "attrs": {
        "layout": "default",
        "localId": "UUID_생성_필요"
      },
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableHeader",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [323]
              },
              "content": [
                {
                  "type": "paragraph",
                  "marks": [
                    {
                      "type": "alignment",
                      "attrs": {
                        "align": "center"
                      }
                    }
                  ],
                  "content": [
                    {
                      "text": "업무",
                      "type": "text",
                      "marks": [
                        {
                          "type": "strong"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "type": "tableHeader",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [323]
              },
              "content": [
                {
                  "type": "paragraph",
                  "marks": [
                    {
                      "type": "alignment",
                      "attrs": {
                        "align": "center"
                      }
                    }
                  ],
                  "content": [
                    {
                      "text": "코멘트",
                      "type": "text",
                      "marks": [
                        {
                          "type": "strong"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [323]
              },
              "content": [
                {
                  "type": "paragraph"
                }
              ]
            },
            {
              "type": "tableCell",
              "attrs": {
                "colspan": 1,
                "rowspan": 1,
                "colwidth": [323]
              },
              "content": [
                {
                  "type": "paragraph"
                },
                {
                  "type": "paragraph"
                },
                {
                  "type": "paragraph"
                },
                {
                  "type": "paragraph"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**동적 값**:
- `id.value`: `DAILY_TASK_MK2_{YYYYMMDD}` 형식 (예: DAILY_TASK_MK2_20250203)
- `timestamp`: Unix timestamp (milliseconds) - UTC 기준 해당 날짜 00:00
- `text`: 요일 (예: " (월)", " (화)", ...)
- `localId` (2곳): UUID v4 생성 필요 (각각 다른 값)

### 3.5 라벨 관리

- **형식**: `daily_task_MM` (예: `daily_task_02`)
- **삭제**: 이전 달 라벨
- **추가**: 다음 달 라벨

### 3.6 UI

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 5.2절

**시안 참조**: `prd/wireframes/5.2_Daily_Task_실행/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

```
┌─────────────────────────────────────────────┐
│ Daily Task                                  │
├─────────────────────────────────────────────┤
│ 다음 예정 실행: 2025-02-10 09:00            │
│ 마지막 실행: 2025-01-10 09:00 (성공)         │
│                                             │
│ [지금 실행]                                  │
├─────────────────────────────────────────────┤
│ 로그:                                       │
│ 2025-01-10 09:00:15 페이지 업데이트 완료     │
│ 2025-01-10 09:00:16 라벨 daily_task_01 삭제  │
│ 2025-01-10 09:00:17 라벨 daily_task_02 추가  │
└─────────────────────────────────────────────┘
```

---

## 4. Daily Scrum

### 4.1 기능 설명

매일 평일 09:00에 Confluence Daily Scrum 페이지의 날짜와 라벨을 업데이트합니다.

### 4.2 동작 흐름

**월 첫 영업일**:
1. 첫 영업일 감지 (주말 고려)
2. 페이지 조회
3. CQL 라벨 조건 업데이트 (이전 달 → 현재 달)
4. 페이지 업데이트
5. 날짜 표시 업데이트

**일반 평일**:
1. 페이지 조회
2. 날짜 표시 업데이트 (`MM월 DD일(요일)`)
3. 페이지 업데이트

### 4.3 Confluence API

**페이지 ID**: 191332855 (설정 가능)

**사용 API**:
- `GET /wiki/rest/api/content/{id}?expand=body.atlas_doc_format,version`
- `PUT /wiki/rest/api/content/{id}`

### 4.4 월 첫 영업일 감지

```python
def get_first_business_day(year, month):
    first_day = date(year, month, 1)
    weekday = first_day.weekday()

    if weekday == 5:  # 토요일
        return first_day + timedelta(days=2)
    elif weekday == 6:  # 일요일
        return first_day + timedelta(days=1)
    else:
        return first_day
```

### 4.5 라벨 조건 업데이트

CQL 파라미터에서 라벨 조건 교체:

```
이전: label = "daily_task_01" and space = "L10N"
이후: label = "daily_task_02" and space = "L10N"
```

### 4.6 날짜 표시 업데이트

Details Summary 매크로의 `firstcolumn` 값 업데이트:

```
이전: "1월 9일(목)"
이후: "1월 10일(금)"
```

ID 값도 업데이트:
```
이전: "DAILY_TASK_MK2_20250109"
이후: "DAILY_TASK_MK2_20250110"
```

### 4.7 UI

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 5.3절

**시안 참조**: `prd/wireframes/5.3_Daily_Scrum_실행/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

```
┌─────────────────────────────────────────────┐
│ Daily Scrum                                 │
├─────────────────────────────────────────────┤
│ 다음 예정 실행: 2025-01-13 09:00            │
│ 마지막 실행: 2025-01-10 09:00 (성공)         │
│                                             │
│ [지금 실행]                                  │
├─────────────────────────────────────────────┤
│ 로그:                                       │
│ 2025-01-10 09:00:15 페이지 업데이트 완료     │
│ 2025-01-10 09:00:16 날짜 표시: 1월 10일(금)  │
└─────────────────────────────────────────────┘
```

---

## 5. Slack MSG

### 5.1 기능 설명

매일 평일 07:00에 Slack 채널에 메시지를 발송합니다. 공휴일에는 발송하지 않습니다.

### 5.2 동작 흐름

1. `holidays.json`에서 공휴일 정보 로드
2. 오늘이 공휴일인지 확인
3. 공휴일이 아니면 메시지 발송
4. 공휴일이면 중단 (로그 기록)

### 5.3 공휴일 확인

**데이터 소스**: `holidays.json` (로컬 파일)

```python
def is_business_day(date, holidays):
    # 주말 확인
    if date.weekday() in [5, 6]:
        return False

    # 공휴일 확인
    date_str = date.strftime('%Y-%m-%d')
    return date_str not in [h['date'] for h in holidays]
```

공휴일 데이터는 `holidays.json` 파일에서 로드하며, 설정 화면에서 가져오기/내보내기 가능합니다.

### 5.4 Slack API

**채널 ID**: C06BZA056E4 (설정 가능)

**사용 API**: `POST https://slack.com/api/chat.postMessage`

### 5.5 발송 메시지

| 순서 | 메시지 형식 | 예시 |
|------|------------|------|
| 1 | `{MM/dd}({요일}) 업무 출근은 찍었나요?` | "01/10(금) 업무 출근은 찍었나요?" |
| 2 | `{MM/dd}({요일}) ## 잡담` | "01/10(금) ## 잡담" |

### 5.6 UI

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 5.4절

**시안 참조**: `prd/wireframes/5.4_Slack_MSG_실행/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

```
┌─────────────────────────────────────────────┐
│ Slack MSG                                   │
├─────────────────────────────────────────────┤
│ 다음 예정 실행: 2025-01-13 07:00            │
│ 마지막 실행: 2025-01-10 07:00 (성공)         │
│                                             │
│ [지금 실행]                                  │
├─────────────────────────────────────────────┤
│ 로그:                                       │
│ 2025-01-10 07:00:15 공휴일 확인: 영업일      │
│ 2025-01-10 07:00:16 메시지 발송 완료 (2개)   │
└─────────────────────────────────────────────┘
```

---

## 6. 관리 탭 UI

### 6.1 전체 구조

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 5.1절

**시안 참조**: `prd/wireframes/5.1_관리_대시보드/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

```
┌─────────────────────────────────────────────┐
│  관리                                       │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Daily Task                              │ │
│ │ 다음: 2025-02-10 09:00                  │ │
│ │ [지금 실행]                              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Daily Scrum                             │ │
│ │ 다음: 2025-01-13 09:00                  │ │
│ │ [지금 실행]                              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Slack MSG                               │ │
│ │ 다음: 2025-01-13 07:00                  │ │
│ │ [지금 실행]                              │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 실행 로그                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ 2025-01-10 09:00 Daily Scrum 완료       │ │
│ │ 2025-01-10 07:00 Slack MSG 완료         │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 6.2 수동 실행

각 작업의 [지금 실행] 버튼으로 즉시 실행 가능:
- 스케줄과 무관하게 실행
- 결과는 로그에 기록

---

## 7. 에러 처리

### 7.1 에러 유형

| 에러 | 처리 |
|------|------|
| 인증 실패 | 설정 화면 이동 안내 (로그 기록) |
| 네트워크 오류 | 재시도 후 실패 시 로그 기록 |
| API 오류 | 상세 오류 메시지 로그 기록 |
| 공휴일 데이터 없음 | 주말만 체크 (공휴일 무시) |

### 7.2 재시도 정책

- 최대 3회 재시도
- 재시도 간격: 5초
- 모두 실패 시 로그에 기록

---

## 8. 설정 연동

### 8.1 인증 정보

- `config.json`에서 Confluence, Slack 인증 정보 로드

### 8.2 스케줄 설정

- `config.json`에서 각 작업의 활성화 여부 및 cron 표현식 로드

### 8.3 ID 설정

- Confluence 페이지 ID (기본값 제공, 설정 가능)
- `admin_slack_channel` (config.json에서 로드, L10N Admin 전용)

---

## 9. 동시성 처리

### 9.1 다중 인스턴스 방지

**목적**: 앱이 2개 이상 동시 실행되는 것을 방지

**구현**:
1. 앱 시작 시 뮤텍스 생성 (`Global\Sebastian_SingleInstance`)
2. 이미 존재하면:
   - 경고 다이얼로그: "Sebastian이 이미 실행 중입니다"
   - 앱 종료

### 9.2 작업 동시 실행 방지

**시나리오**: 스케줄 실행 중 사용자가 [지금 실행] 버튼 클릭

**구현**:
- 각 작업별 실행 상태 플래그 (`is_running`)
- 작업 시작 시 플래그 True, 완료 시 False
- 플래그 True인 상태에서 재실행 시도 시:
  - [지금 실행] 버튼 비활성화
  - 상태 메시지: "작업 진행 중... (시작: {시작_시각})"
  - 토스트 알림: "이미 실행 중인 작업입니다"

**예시**:
```
┌─────────────────────────────────────────────┐
│ Daily Scrum                                 │
├─────────────────────────────────────────────┤
│ 상태: 작업 진행 중 (시작: 09:00:15)          │
│                                             │
│ [지금 실행] (비활성화)                       │
└─────────────────────────────────────────────┘
```

### 9.3 스케줄 작업 간 충돌

**시나리오**: Daily Task(09:00)와 Daily Scrum(09:00)이 동시에 스케줄됨

**구현**:
- 각 작업은 독립적인 스레드/태스크로 실행
- 동시 실행 허용 (Confluence/Slack API가 서로 다름)
- 단, 로그 쓰기는 뮤텍스로 보호 (로그 순서 보장)

### 9.4 설정 파일 동시 접근

**시나리오**: 스케줄 작업 실행 중 사용자가 설정 저장

**구현**:
- 설정 파일 읽기/쓰기 시 파일 잠금 사용
- 읽기: 공유 잠금 (다중 읽기 허용)
- 쓰기: 배타 잠금 (단독 쓰기)
- 잠금 획득 실패 시:
  - 최대 3초 대기
  - 여전히 실패 시: "설정을 저장할 수 없습니다. 작업 완료 후 다시 시도하세요"

### 9.5 예외 상황 처리

**작업 실행 중 앱 종료 시**:
- 각 작업에 취소 토큰 전달
- 앱 종료 요청 시:
  1. 실행 중인 작업에 취소 신호 전송
  2. 최대 10초 대기
  3. 여전히 실행 중이면 강제 종료 확인:
     - "진행 중인 작업이 있습니다. 강제 종료하시겠습니까?"
     - [대기] [강제 종료]

**작업 실행 중 예외 발생 시**:
- 예외 캐치 후 플래그 False로 복구
- 에러 로그 기록
- 다음 스케줄 실행에는 영향 없음

---

## 부록 A: 참조 문서

- `sebastian-prd-shared.md`: 공통 컴포넌트
- `sebastian-prd-master.md`: 마스터 문서
- `legacy/Daily Task/Daily Task.json`: 레거시 n8n 워크플로
- `legacy/Daily Scrum/Daily Scrum.json`: 레거시 n8n 워크플로
- `legacy/Slack MSG/Slack MSG.json`: 레거시 n8n 워크플로

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-11-20 | 초안 작성 - n8n 워크플로 분석 및 라운드 1-4 답변 반영 |
| 1.1 | 2025-11-25 | 검증 완료, 승인 |
| 1.2 | 2025-11-26 | Draft 재전환 (변경 사항 없음) |
| 1.3 | 2025-11-27 | 버전 동기화 (master.md와 일치) |
| 1.4 | 2025-11-27 | PRD 정제 라운드 2: 버전 동기화 |
| 1.5 | 2025-11-27 | UI 시안 참조 추가: wireframes 폴더 연결 (3.6, 4.7, 5.6, 6.1절) |
| 1.6 | 2025-11-27 | 최종 승인: 모든 Feature 문서 v1.6 통일, Approved 상태로 전환 |
