# Sebastian PRD - Scheduler Feature

**문서 버전**: 1.6
**최종 수정**: 2025-11-27
**상태**: Approved

---

## 1. 개요

이 문서는 Sebastian의 일정 관리 기능을 정의합니다.

**포함 기능**:
- 자동 일정 계산기
- JIRA 일감 생성
- 폴더 생성

---

## 2. 자동 일정 계산기

### 2.1 기능 설명

업데이트일을 기준으로 각 마일스톤의 날짜를 자동 계산합니다. 공휴일을 제외한 영업일 기준으로 역산합니다.

### 2.2 입력

| 항목 | 설명 | 예시 |
|------|------|------|
| 프로젝트 | 드롭다운 선택 | M4GL |
| 업데이트일 | 날짜 선택기 | 2025-01-15 |
| 배포 유형 (FBGL 전용) | 드롭다운 선택 (CDN/APP) | CDN |

**배포 유형 선택**:
- **표시 조건**: 프로젝트가 FBGL일 때만 표시
- **기본값**: CDN
- **동작**: 선택된 배포 유형에 따라 `projects.json`의 해당 스케줄 사용
  - CDN 선택 → `schedule_by_deployment.CDN` 사용
  - APP 선택 → `schedule_by_deployment.APP` 사용

### 2.3 출력

각 마일스톤별 시작일/종료일 테이블:

```
┌─────────────────────────────────────────────────┐
│ M4GL 250115 업데이트 일정                        │
├─────────────────────────────────────────────────┤
│ 마일스톤        │ 시작일     │ 종료일     │
│─────────────────┼────────────┼────────────│
│ 헤즈업          │ 01/08      │ 01/08      │
│ REGULAR HO&HB   │ 01/08      │ 01/10      │
│ REGULAR DELIVERY│ 01/10      │ 01/10      │
│ EXTRA0 HO&HB    │ 01/10      │ 01/13      │
│ EXTRA0 DELIVERY │ 01/13      │ 01/13      │
│ EXTRA1 HO&HB    │ 01/13      │ 01/14      │
│ EXTRA1 DELIVERY │ 01/14      │ 01/14      │
└─────────────────────────────────────────────────┘
```

### 2.4 계산 로직

**기본 공식**: `WORKDAY(업데이트일, -영업일수, 공휴일목록) + 시각`

> **참고**: 모든 `offset_days` 값은 **영업일 기준**입니다. 주말과 공휴일을 제외한 실제 근무일 기준으로 역산합니다.

**프로젝트별 역산 인덱스** (projects.json에서 관리):

**M4GL**:
```json
{
  "tasks": {
    "헤즈업": {
      "start_offset_days": -18,
      "start_time": "09:30",
      "end_offset_days": -18,
      "end_time": "18:30"
    },
    "REGULAR": {
      "start_offset_days": -12,
      "start_time": "15:00",
      "end_offset_days": -5,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -12,
          "start_time": "18:00",
          "end_offset_days": -6,
          "end_time": "11:00"
        },
        "DELIVERY": {
          "start_offset_days": -5,
          "start_time": "17:00",
          "end_offset_days": -5,
          "end_time": "17:00"
        }
      }
    },
    "EXTRA0": {
      "start_offset_days": -10,
      "start_time": "15:00",
      "end_offset_days": -5,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -10,
          "start_time": "18:00",
          "end_offset_days": -6,
          "end_time": "11:00"
        },
        "DELIVERY": {
          "start_offset_days": -5,
          "start_time": "17:00",
          "end_offset_days": -5,
          "end_time": "17:00"
        }
      }
    },
    "EXTRA1": {
      "start_offset_days": -7,
      "start_time": "15:00",
      "end_offset_days": -1,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -7,
          "start_time": "18:00",
          "end_offset_days": -2,
          "end_time": "11:00"
        },
        "DELIVERY": {
          "start_offset_days": -1,
          "start_time": "17:00",
          "end_offset_days": -1,
          "end_time": "17:00"
        }
      }
    }
  }
}
```

**NCGL**:
```json
{
  "tasks": {
    "헤즈업": {
      "start_offset_days": -7,
      "start_time": "09:30",
      "end_offset_days": -7,
      "end_time": "18:30"
    },
    "REGULAR": {
      "start_offset_days": -6,
      "start_time": "15:00",
      "end_offset_days": -4,
      "end_time": "12:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -6,
          "start_time": "15:00",
          "end_offset_days": -4,
          "end_time": "12:00"
        },
        "DELIVERY": {
          "start_offset_days": -4,
          "start_time": "12:00",
          "end_offset_days": -4,
          "end_time": "12:00"
        }
      }
    },
    "EXTRA0": {
      "start_offset_days": -4,
      "start_time": "15:00",
      "end_offset_days": -2,
      "end_time": "12:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -4,
          "start_time": "15:00",
          "end_offset_days": -2,
          "end_time": "12:00"
        },
        "DELIVERY": {
          "start_offset_days": -2,
          "start_time": "12:00",
          "end_offset_days": -2,
          "end_time": "12:00"
        }
      }
    },
    "EXTRA1": {
      "start_offset_days": -3,
      "start_time": "15:00",
      "end_offset_days": -1,
      "end_time": "12:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -3,
          "start_time": "15:00",
          "end_offset_days": -1,
          "end_time": "12:00"
        },
        "DELIVERY": {
          "start_offset_days": -1,
          "start_time": "12:00",
          "end_offset_days": -1,
          "end_time": "12:00"
        }
      }
    }
  }
}
```

**LYGL**:
```json
{
  "tasks": {
    "헤즈업": {
      "start_offset_days": -7,
      "start_time": "09:30",
      "end_offset_days": -7,
      "end_time": "18:30"
    },
    "REGULAR": {
      "start_offset_days": -4,
      "start_time": "12:00",
      "end_offset_days": -3,
      "end_time": "16:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -4,
          "start_time": "13:00",
          "end_offset_days": -3,
          "end_time": "15:00"
        },
        "DELIVERY": {
          "start_offset_days": -3,
          "start_time": "16:00",
          "end_offset_days": -3,
          "end_time": "16:00"
        }
      }
    },
    "EXTRA0": {
      "start_offset_days": -4,
      "start_time": "15:00",
      "end_offset_days": -2,
      "end_time": "15:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -4,
          "start_time": "16:00",
          "end_offset_days": -2,
          "end_time": "14:00"
        },
        "DELIVERY": {
          "start_offset_days": -2,
          "start_time": "15:00",
          "end_offset_days": -2,
          "end_time": "15:00"
        }
      }
    },
    "EXTRA1": {
      "start_offset_days": -4,
      "start_time": "17:00",
      "end_offset_days": -2,
      "end_time": "18:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -4,
          "start_time": "18:00",
          "end_offset_days": -2,
          "end_time": "17:00"
        },
        "DELIVERY": {
          "start_offset_days": -2,
          "start_time": "18:00",
          "end_offset_days": -2,
          "end_time": "18:00"
        }
      }
    }
  }
}
```

**FBGL** (배포 유형에 따라 다름):

**CDN 배포**:
```json
{
  "tasks": {
    "헤즈업": {
      "start_offset_days": -12,
      "start_time": "09:30",
      "end_offset_days": -12,
      "end_time": "18:30"
    },
    "REGULAR": {
      "start_offset_days": -9,
      "start_time": "14:00",
      "end_offset_days": -6,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -9,
          "start_time": "15:30",
          "end_offset_days": -6,
          "end_time": "16:00"
        },
        "DELIVERY": {
          "start_offset_days": -6,
          "start_time": "17:00",
          "end_offset_days": -6,
          "end_time": "17:00"
        }
      }
    },
    "EXTRA0": {
      "start_offset_days": -8,
      "start_time": "14:00",
      "end_offset_days": -6,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -8,
          "start_time": "15:30",
          "end_offset_days": -6,
          "end_time": "16:00"
        },
        "DELIVERY": {
          "start_offset_days": -6,
          "start_time": "17:00",
          "end_offset_days": -6,
          "end_time": "17:00"
        }
      }
    },
    "EXTRA1": {
      "start_offset_days": -6,
      "start_time": "14:00",
      "end_offset_days": -4,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -6,
          "start_time": "15:30",
          "end_offset_days": -4,
          "end_time": "16:00"
        },
        "DELIVERY": {
          "start_offset_days": -4,
          "start_time": "17:00",
          "end_offset_days": -4,
          "end_time": "17:00"
        }
      }
    }
  }
}
```

**APP 배포**:
```json
{
  "tasks": {
    "헤즈업": {
      "start_offset_days": -15,
      "start_time": "09:30",
      "end_offset_days": -15,
      "end_time": "18:30"
    },
    "REGULAR": {
      "start_offset_days": -12,
      "start_time": "14:00",
      "end_offset_days": -9,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -12,
          "start_time": "15:30",
          "end_offset_days": -9,
          "end_time": "16:00"
        },
        "DELIVERY": {
          "start_offset_days": -9,
          "start_time": "17:00",
          "end_offset_days": -9,
          "end_time": "17:00"
        }
      }
    },
    "EXTRA0": {
      "start_offset_days": -11,
      "start_time": "14:00",
      "end_offset_days": -8,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -11,
          "start_time": "15:30",
          "end_offset_days": -8,
          "end_time": "16:00"
        },
        "DELIVERY": {
          "start_offset_days": -8,
          "start_time": "17:00",
          "end_offset_days": -8,
          "end_time": "17:00"
        }
      }
    },
    "EXTRA1": {
      "start_offset_days": -8,
      "start_time": "14:00",
      "end_offset_days": -3,
      "end_time": "17:00",
      "subtasks": {
        "HO&HB": {
          "start_offset_days": -8,
          "start_time": "15:30",
          "end_offset_days": -3,
          "end_time": "16:00"
        },
        "DELIVERY": {
          "start_offset_days": -3,
          "start_time": "17:00",
          "end_offset_days": -3,
          "end_time": "17:00"
        }
      }
    }
  }
}
```

**참고**: Epic의 시작일은 헤즈업 Task와 동일, 종료일은 마지막 Task 종료일과 동일

### 2.5 공휴일 관리

#### 2.5.1 저장 및 관리

- **저장 위치**: `%APPDATA%/Sebastian/holidays.json`
- **초기 번들**: 앱 설치 시 2025~2027년 공휴일 자동 포함
- **관리 방식**: 설정 화면에서 가져오기/내보내기
- **API 미사용**: 외부 공휴일 API 의존성 없음 (완전 로컬 기반)

#### 2.5.2 JSON 형식

```json
{
  "2025": [
    { "date": "2025-01-01", "name": "신정" },
    { "date": "2025-01-28", "name": "설날 연휴" },
    { "date": "2025-01-29", "name": "설날" },
    { "date": "2025-01-30", "name": "설날 연휴" },
    { "date": "2025-03-01", "name": "삼일절" },
    { "date": "2025-03-03", "name": "대체공휴일(삼일절)" },
    { "date": "2025-05-05", "name": "어린이날" },
    { "date": "2025-05-06", "name": "석가탄신일" },
    { "date": "2025-06-06", "name": "현충일" },
    { "date": "2025-08-15", "name": "광복절" },
    { "date": "2025-10-03", "name": "개천절" },
    { "date": "2025-10-06", "name": "추석 연휴" },
    { "date": "2025-10-07", "name": "추석" },
    { "date": "2025-10-08", "name": "추석 연휴" },
    { "date": "2025-10-09", "name": "한글날" }
  ],
  "2026": [
    { "date": "2026-01-01", "name": "신정" },
    ...
  ],
  "2027": [
    { "date": "2027-01-01", "name": "신정" },
    ...
  ]
}
```

#### 2.5.3 초기 설정

**앱 첫 실행 시**:
1. `holidays.json` 존재 확인
2. 없으면 앱 내장 기본 데이터 복사 (2025~2027년)
3. 설정 화면에서 상태 표시: "2025년: 15개, 2026년: 14개, 2027년: 15개"

**기본 번들 데이터**:
- 대한민국 법정 공휴일 기준
- 대체공휴일 포함
- 설/추석 연휴 포함

#### 2.5.4 사용자 업데이트

**가져오기 기능**:
1. 사용자가 준비한 JSON 파일 선택
2. 기존 `holidays.json`과 병합 (연도별 덮어쓰기)
3. 성공 메시지: "공휴일 데이터가 업데이트되었습니다. (2028년: 12개 추가)"

**내보내기 기능**:
1. 현재 `holidays.json` 파일 복사
2. 사용자가 지정한 위치에 저장
3. 용도: 백업, 다른 PC에서 재사용

#### 2.5.5 연도 부족 경고

**감지 시점**: 일정 계산 시 해당 연도 공휴일 데이터 확인

**경고 메시지**:
```
"{year}년 공휴일 데이터가 없습니다.

공휴일을 제외하지 않고 계산하시겠습니까?

- [공휴일 없이 계산]: 주말만 제외하고 계산 (영업일 = 평일)
- [공휴일 추가]: 설정 화면으로 이동하여 공휴일 추가

[공휴일 없이 계산]  [공휴일 추가]  [취소]
```

**공휴일 없이 계산 선택 시**:
- 주말(토/일)만 제외
- 공휴일은 영업일로 계산
- 결과 화면에 경고 표시: "⚠️ {year}년 공휴일 미적용"

**L10N 프로젝트의 공휴일 처리**:
- L10N 프로젝트도 일반 프로젝트와 동일한 방식 적용
- EOMONTH + WORKDAY 계산에서도 공휴일 데이터 없으면 주말만 제외
- 예: 2028-11-13 정산 마감일이지만 2028년 공휴일 없음 → 주말만 제외하고 영업일 계산
- 결과 화면에 동일한 경고 표시: "⚠️ 2028년 공휴일 미적용"

### 2.6 UI 구성

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 3.1절

**시안 참조**: `prd/wireframes/3.1_일정_계산기_입력/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

**기본 화면** (M4GL, NCGL, LYGL):
```
┌─────────────────────────────────────────────┐
│ 자동 일정 계산기                             │
├─────────────────────────────────────────────┤
│ 프로젝트: [M4GL ▼]                          │
│ 업데이트일: [2025-01-15] [📅]               │
│                                             │
│ [계산]                                      │
├─────────────────────────────────────────────┤
│ 결과:                                       │
│ ┌─────────────────────────────────────┐     │
│ │ (일정 테이블)                        │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ [JIRA 일감 생성] [폴더 생성] [클립보드 복사] │
└─────────────────────────────────────────────┘
```

**FBGL 선택 시**:
```
┌─────────────────────────────────────────────┐
│ 자동 일정 계산기                             │
├─────────────────────────────────────────────┤
│ 프로젝트: [FBGL ▼]                          │
│ 배포 유형: [CDN ▼]   (CDN/APP 선택)         │
│ 업데이트일: [2025-01-15] [📅]               │
│                                             │
│ [계산]                                      │
├─────────────────────────────────────────────┤
│ 결과:                                       │
│ ┌─────────────────────────────────────┐     │
│ │ (일정 테이블)                        │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ [JIRA 일감 생성] [폴더 생성] [클립보드 복사] │
└─────────────────────────────────────────────┘
```

---

## 3. JIRA 일감 생성

### 3.1 기능 설명

자동 일정 계산기의 결과를 기반으로 JIRA에 Epic, Task, Subtask를 자동 생성합니다.

### 3.2 일감 구조

```
Epic: {yymmdd} 업데이트
├── Task: {yymmdd} 업데이트 일정 헤즈업
├── Task: {yymmdd} 업데이트 REGULAR
│   ├── Subtask: {yymmdd} 업데이트 REGULAR HO&HB
│   └── Subtask: {yymmdd} 업데이트 REGULAR DELIVERY
├── Task: {yymmdd} 업데이트 EXTRA0
│   ├── Subtask: {yymmdd} 업데이트 EXTRA0 HO&HB
│   └── Subtask: {yymmdd} 업데이트 EXTRA0 DELIVERY
└── Task: {yymmdd} 업데이트 EXTRA1
    ├── Subtask: {yymmdd} 업데이트 EXTRA1 HO&HB
    └── Subtask: {yymmdd} 업데이트 EXTRA1 DELIVERY
```

### 3.3 필드 매핑

| JIRA 필드 | 값 소스 | 예시 |
|-----------|---------|------|
| Project Key | 프로젝트 설정 | L10NM4 |
| Summary | 템플릿 | "250115 업데이트 REGULAR" |
| Issue Type | 고정값 | Epic: 10000, Task: 10637, Subtask: 10638 (*) |
| Start Date (customfield_10569) | 일정 계산기 | 2025-01-08T09:30:00.000+0900 (**) |
| Due Date (customfield_10570) | 일정 계산기 | 2025-01-10T18:30:00.000+0900 (**) |
| Assignee | 프로젝트별 상이 | 아래 참조 (***) |
| Reporter | 현재 사용자 | account_id |
| Parent (Epic/Task 링크) | Epic/Task Key | L10NM4-1234 |
| Description | - | 빈 문자열 (사용 안 함) |

> **참고**:
> - (*) Issue Type ID는 현재 JIRA 인스턴스 기준 고정값입니다.
> - (**) Custom Field ID는 현재 JIRA 인스턴스 기준입니다.
> - (***) **Assignee 규칙**:
>   - **일반 프로젝트** (M4GL, NCGL, FBGL, LYGL): 앱에 로그인한 사용자 (JIRA API 토큰 소유자)
>   - **L10N 프로젝트**: projects.json에 정의된 담당자 Account ID 사용 (5.5절 참조)

### 3.4 일정 데이터 구조

**저장 방식**: 메모리 (Dictionary 또는 dataclass 구조)

**계산 결과 데이터 구조**:
```python
@dataclass
class ScheduleResult:
    project: str              # 프로젝트 코드 (예: "M4GL")
    update_date: datetime     # 업데이트일
    yymmdd: str              # YYMMDD 형식 (예: "250115")

    epic: IssueSchedule
    tasks: Dict[str, TaskSchedule]  # "헤즈업", "REGULAR", "EXTRA0", "EXTRA1"

@dataclass
class IssueSchedule:
    summary: str
    start: datetime           # ISO8601 형식 (예: "2025-01-08T09:30:00.000+0900")
    due: datetime             # ISO8601 형식

@dataclass
class TaskSchedule:
    summary: str
    start: datetime
    due: datetime
    subtasks: Dict[str, IssueSchedule]  # "HO&HB", "DELIVERY"
```

**계산 예시** (M4GL, 업데이트일: 2025-01-15):
```json
{
  "project": "M4GL",
  "update_date": "2025-01-15",
  "yymmdd": "250115",
  "epic": {
    "summary": "250115 업데이트",
    "start": "2025-01-08T09:30:00.000+0900",
    "due": "2025-01-14T17:00:00.000+0900"
  },
  "tasks": {
    "헤즈업": {
      "summary": "250115 업데이트 일정 헤즈업",
      "start": "2025-01-08T09:30:00.000+0900",
      "due": "2025-01-08T18:30:00.000+0900",
      "subtasks": {}
    },
    "REGULAR": {
      "summary": "250115 업데이트 REGULAR",
      "start": "2025-01-08T15:00:00.000+0900",
      "due": "2025-01-10T17:00:00.000+0900",
      "subtasks": {
        "HO&HB": {
          "summary": "250115 업데이트 REGULAR HO&HB",
          "start": "2025-01-08T18:00:00.000+0900",
          "due": "2025-01-09T11:00:00.000+0900"
        },
        "DELIVERY": {
          "summary": "250115 업데이트 REGULAR DELIVERY",
          "start": "2025-01-10T17:00:00.000+0900",
          "due": "2025-01-10T17:00:00.000+0900"
        }
      }
    }
  }
}
```

**JIRA API 매핑**:
- `ScheduleResult` → Epic/Task/Subtask Payload
- `IssueSchedule.start` → `customfield_10569`
- `IssueSchedule.due` → `customfield_10570`
- `TaskSchedule.subtasks` → parent 필드로 Task Key 연결

### 3.5 API 연동

**엔드포인트**: `POST /rest/api/3/issue`

**인증**: Basic Auth (Email + API Token)

**Payload 예시** (Epic):
```json
{
  "fields": {
    "project": { "key": "L10NM4" },
    "summary": "250115 업데이트",
    "issuetype": { "id": "10000" },
    "customfield_10569": "2025-01-08T09:30:00.000+0900",
    "customfield_10570": "2025-01-15T18:30:00.000+0900",
    "assignee": { "id": "account_id" },
    "reporter": { "id": "account_id" }
  }
}
```

**Payload 예시** (Task - Epic 링크):
```json
{
  "fields": {
    "project": { "key": "L10NM4" },
    "summary": "250115 업데이트 REGULAR",
    "issuetype": { "id": "10637" },
    "customfield_10569": "2025-01-08T09:30:00.000+0900",
    "customfield_10570": "2025-01-10T18:30:00.000+0900",
    "assignee": { "id": "account_id" },
    "reporter": { "id": "account_id" },
    "parent": { "key": "L10NM4-1234" }
  }
}
```

**Payload 예시** (Subtask - Task 링크):
```json
{
  "fields": {
    "project": { "key": "L10NM4" },
    "summary": "250115 업데이트 REGULAR HO&HB",
    "issuetype": { "id": "10638" },
    "customfield_10569": "2025-01-08T09:30:00.000+0900",
    "customfield_10570": "2025-01-10T12:00:00.000+0900",
    "assignee": { "id": "account_id" },
    "reporter": { "id": "account_id" },
    "parent": { "key": "L10NM4-1235" }
  }
}
```

### 3.6 생성 흐름

**순차 생성** (Epic → Task → Subtask):

1. **Epic 생성**
   - Payload: Epic 정보
   - 응답: Epic Key (예: L10NM4-1234)
   - 저장: Epic Key를 메모리에 저장

2. **Task 생성 (Epic 링크)**
   - Payload: Task 정보 + `parent: { "key": "L10NM4-1234" }`
   - 응답: Task Key (예: L10NM4-1235)
   - 저장: Task Key를 메모리에 저장
   - 반복: 모든 Task (헤즈업, REGULAR, EXTRA0, EXTRA1)

3. **Subtask 생성 (Task 링크)**
   - Payload: Subtask 정보 + `parent: { "key": "L10NM4-1235" }`
   - 응답: Subtask Key (예: L10NM4-1236)
   - 반복: 각 Task의 모든 Subtask

4. **결과 표시**
   - 생성된 일감 목록 (Key + Summary)
   - 총 생성 개수
   - JIRA 링크

**실패 처리**:
- 생성 중 실패 시 이미 생성된 일감은 **유지**
- 생성된 일감 Key를 로그에 기록
- 실패 지점 표시 (어느 일감에서 실패했는지)
- 에러 메시지와 함께 사용자에게 알림
- **재시도 옵션 미제공** (중복 생성 방지)

**중복 생성 방지**:
- 생성 완료 후 [JIRA 일감 생성] 버튼 비활성화
- 버튼 텍스트 변경: "[JIRA에서 보기]" (생성된 Epic 링크로 이동)
- 재활성화 조건:
  - 업데이트일 변경 시 → 즉시 재활성화
  - 프로젝트 변경 시 → 즉시 재활성화
  - [계산] 버튼 클릭 시 → 경고 다이얼로그 표시 후 재활성화
- 상태 저장: 메모리만 (세션 동안만 유효, JSON 파일 저장 안 함)

**재계산 시 경고 다이얼로그**:
- **트리거**: [계산] 버튼 클릭 시, 입력값(프로젝트 + 업데이트일)이 이전과 동일한 경우
- **메시지**:
  ```
  동일한 일정으로 JIRA 일감을 다시 생성할 수 있습니다.

  이미 생성된 일감: {Epic Key}

  계속하시겠습니까?

  [JIRA에서 보기] [계속] [취소]
  ```
- **버튼 동작**:
  - [JIRA에서 보기]: 기존 Epic 링크 열기
  - [계속]: 일정 재계산 + [JIRA 일감 생성] 버튼 재활성화
  - [취소]: 아무 동작 없음

### 3.7 에러 처리

| 에러 | 처리 |
|------|------|
| 인증 실패 | 설정 화면으로 이동 유도 |
| 권한 없음 | 프로젝트 권한 확인 안내 |
| 중복 생성 | 기존 일감 검색 후 확인 요청 |
| 네트워크 오류 | 에러 메시지 표시 |

### 3.8 UI 구성

**와이어프레임 참조**:
- `sebastian-prd-wireframes.md` 3.3절 (생성 진행)
- `sebastian-prd-wireframes.md` 3.4절 (생성 완료)

**시안 참조**:
- `prd/wireframes/3.3_JIRA_일감_생성_진행/` - 진행 화면
- `prd/wireframes/3.4_JIRA_일감_생성_완료/` - 완료 화면

```
┌─────────────────────────────────────────────┐
│ JIRA 일감 생성                              │
├─────────────────────────────────────────────┤
│ ✓ Epic 생성됨: L10NM4-1234                  │
│ ✓ Task 생성됨: L10NM4-1235 (헤즈업)          │
│ ✓ Task 생성됨: L10NM4-1236 (REGULAR)        │
│   ✓ Subtask: L10NM4-1237 (HO&HB)           │
│   ✓ Subtask: L10NM4-1238 (DELIVERY)        │
│ ✓ Task 생성됨: L10NM4-1239 (EXTRA0)         │
│   ✓ Subtask: L10NM4-1240 (HO&HB)           │
│   ✓ Subtask: L10NM4-1241 (DELIVERY)        │
│ ✓ Task 생성됨: L10NM4-1242 (EXTRA1)         │
│   ✓ Subtask: L10NM4-1243 (HO&HB)           │
│   ✓ Subtask: L10NM4-1244 (DELIVERY)        │
├─────────────────────────────────────────────┤
│ 총 11개 일감 생성 완료                       │
│ [JIRA에서 보기]  [새 일정으로 다시 계산]      │
└─────────────────────────────────────────────┘

**버튼 동작**:
- [JIRA에서 보기]: 생성된 Epic 페이지를 브라우저에서 열기
- [새 일정으로 다시 계산]: 일정 계산 화면으로 돌아가기 (JIRA 버튼 재활성화)
```

---

## 4. 폴더 생성

### 4.1 기능 설명

자동 일정 계산기의 결과를 기반으로 NAS에 폴더 구조를 생성합니다.

### 4.2 폴더 구조

**M4GL (02_REVIEW 포함)**:
```
{NAS_PATH}/
└── 250115_UPDATE/
    ├── 00_SOURCE/
    │   ├── 250108_REGULAR/
    │   ├── 250110_EXTRA0/
    │   └── 250113_EXTRA1/
    ├── 01_HB/
    │   ├── 250108_REGULAR/
    │   ├── 250110_EXTRA0/
    │   └── 250113_EXTRA1/
    ├── 02_REVIEW/
    │   ├── 250108_REGULAR/
    │   ├── 250110_EXTRA0/
    │   └── 250113_EXTRA1/
    └── 03_DELIVERY/
        ├── 250108_REGULAR/
        ├── 250110_EXTRA0/
        └── 250113_EXTRA1/
```

**기타 프로젝트 (02_REVIEW 미포함)**:
```
{NAS_PATH}/
└── 250115_UPDATE/
    ├── 00_SOURCE/
    │   └── ...
    ├── 01_HB/
    │   └── ...
    └── 02_DELIVERY/
        └── ...
```

### 4.3 폴더명 규칙

| 레벨 | 형식 | 예시 |
|------|------|------|
| Level 2 | `{yymmdd}_UPDATE` | 250115_UPDATE |
| Level 3 | 고정 | 00_SOURCE, 01_HB, 02_REVIEW, 03_DELIVERY |
| Level 4 | `{yymmdd}_{batch}` | 250108_REGULAR |

### 4.4 입력

| 항목 | 설명 | 예시 |
|------|------|------|
| 기본 경로 | 프로젝트 설정에서 가져옴 | `\\nas\m4gl\l10n\` |
| 사용자 변경 | [선택] 버튼으로 변경 가능 | 선택적 |

### 4.5 생성 흐름

1. 일정 계산 결과에서 배치 목록 추출
2. 폴더 구조 미리보기 표시
3. 사용자 확인 후 생성
4. 결과 표시

### 4.6 UI 구성

**와이어프레임 참조**:
- `sebastian-prd-wireframes.md` 3.5절 (미리보기)
- `sebastian-prd-wireframes.md` 3.6절 (완료)

**시안 참조**:
- `prd/wireframes/3.5_폴더_생성_미리보기/` - 미리보기 화면
- `prd/wireframes/3.6_폴더_생성_완료/` - 완료 화면

```
┌─────────────────────────────────────────────┐
│ 폴더 생성                                   │
├─────────────────────────────────────────────┤
│ 생성 위치: [\\nas\m4gl\l10n\]  [선택]        │
├─────────────────────────────────────────────┤
│ 미리보기:                                   │
│ ├── 250115_UPDATE/                          │
│ │   ├── 00_SOURCE/                          │
│ │   │   ├── 250108_REGULAR/                 │
│ │   │   ├── 250110_EXTRA0/                  │
│ │   │   └── 250113_EXTRA1/                  │
│ │   ├── 01_HB/                              │
│ │   │   └── ...                             │
│ │   └── ...                                 │
│                                             │
│ 총 12개 폴더 생성 예정                       │
├─────────────────────────────────────────────┤
│ [생성]  [취소]                               │
└─────────────────────────────────────────────┘
```

### 4.7 에러 처리

| 에러 | 처리 |
|------|------|
| 경로 없음 | 경로 확인 안내 |
| 권한 없음 | 폴더 권한 확인 안내 |
| 폴더 존재 | 사용자 확인 다이얼로그: "폴더가 이미 존재합니다. 기존 폴더를 유지하고 누락된 하위 폴더만 생성하시겠습니까?" → [예]: 기존 폴더/파일 유지하고 누락된 폴더만 추가 생성, [아니요]: 작업 취소 |
| 경로 길이 초과 | 경로 단축 안내 (255자 제한) |

---

## 5. 프로젝트별 차이

### 5.1 M4GL

- **마일스톤**: 헤즈업, REGULAR, EXTRA0, EXTRA1
- **Subtask**: HO&HB, DELIVERY
- **폴더 구조**: 02_REVIEW 포함

### 5.2 NCGL

- **추가 입력**: 마일스톤 차수 (M1, M2, ...)
- **Summary 형식**: `{yymmdd} {milestone} 업데이트`
- **마일스톤**: 헤즈업, REGULAR, EXTRA0, EXTRA1

### 5.3 FBGL

- **지역 선택**: GL (Global) 또는 JP (Japan)
- **배포 유형 선택**: CDN 또는 APP
- **언어 목록**:
  - GL: EN, CT (2개)
  - JP: EN, JA (2개)
- **스케줄**: 배포 유형(CDN/APP)에 따라 다름 (2.4절 참조)
- **특징**:
  - GL/JP 구분은 언어 목록에만 영향, offset은 CDN/APP에만 영향
  - CDN: 헤즈업 -12, REGULAR -9/-6, EXTRA0 -8/-6, EXTRA1 -6/-4
  - APP: 헤즈업 -15, REGULAR -12/-9, EXTRA0 -11/-8, EXTRA1 -8/-3
- **폴더**: 02_REVIEW 미포함

### 5.4 LYGL

- **추가 입력**: 지역, 업데이트 타입
- **마일스톤**: 프로젝트별 설정 참조

### 5.5 L10N (월간 정산 프로젝트)

**개요**:
- **유형**: 월간 정산 프로젝트 (`type: "monthly_settlement"`)
- **목적**: L10n팀의 월간 작업 정산 관리
- **기준일**: 정산 마감일 (`settlement_deadline`) - 다른 프로젝트의 "업데이트일"과 다름
- **프로젝트 코드**: M4, NC, FB, LY (BV는 서비스 종료로 제외)

**구조적 차이**:

L10N은 다른 프로젝트와 완전히 다른 구조를 가짐:

| 구분 | 일반 프로젝트 (M4GL 등) | L10N 프로젝트 |
|------|------------------------|---------------|
| **Epic** | 1개 (업데이트) | 1개 (월간 작업 정산) |
| **Task** | 3개 (헤즈업, REGULAR, EXTRA0/1) | 5개 (M4, NC, FB, LY, 견적서 크로스체크) |
| **Subtask** | 고정 (HO&HB, DELIVERY, CS 검수) | 3개 (견적서/세금계산서/지결 상신) |
| **기준일** | 업데이트일 | 정산 마감일 |
| **일정 계산** | `start_offset_days` (단순 숫자) | 복합 수식 (EOMONTH + WORKDAY) |
| **NAS 경로** | 있음 | 없음 (폴더 생성 불필요) |

**일감 계층 구조**:

```
Epic: "{year}년 {month}월 작업 정산"
├── Task: "M4 {year}년 {month}월 정산"
│   ├── Subtask: "[M4] {month}월 견적서 요청"
│   ├── Subtask: "[M4] {month}월 세금계산서 요청"
│   └── Subtask: "[M4] {month}월 지결 상신"
├── Task: "NC {year}년 {month}월 정산"
│   ├── Subtask: "[NC] {month}월 견적서 요청"
│   ├── Subtask: "[NC] {month}월 세금계산서 요청"
│   └── Subtask: "[NC] {month}월 지결 상신"
├── Task: "FB {year}년 {month}월 정산"
│   ├── Subtask: "[FB] {month}월 견적서 요청"
│   ├── Subtask: "[FB] {month}월 세금계산서 요청"
│   └── Subtask: "[FB] {month}월 지결 상신"
├── Task: "LY {year}년 {month}월 정산"
│   ├── Subtask: "[LY] {month}월 견적서 요청"
│   ├── Subtask: "[LY] {month}월 세금계산서 요청"
│   └── Subtask: "[LY] {month}월 지결 상신"
└── Task: "{year}년 {month}월 견적서 크로스체크"
    └── (Subtask 없음)
```

**일정 계산 로직**:

| 일감 유형 | Start 계산 | Due 계산 | 예시 (마감일 2025-11-13) |
|----------|-----------|---------|-------------------------|
| **Epic** | `WORKDAY(EOMONTH(base,-2)+24, -1)` + 09:30 | `base` + 18:30 | 2025-10-23 09:30 ~ 2025-11-13 18:30 |
| **Task (M4/NC/FB/LY)** | Epic과 동일 | Epic과 동일 | Epic과 동일 |
| **Subtask - 견적서** | `WORKDAY(EOMONTH(base,-2)+26, -1)` + 09:30 | 동일 + 18:30 | 2025-10-27 (당일) |
| **Subtask - 세금계산서** | `WORKDAY(base, -3)` + 09:30 | 동일 + 18:30 | 2025-11-10 (당일) |
| **Subtask - 지결** | `WORKDAY(base, -2)` + 09:30 | 동일 + 18:30 | 2025-11-11 (당일) |
| **Task - 견적서 크로스체크** | `WORKDAY(base, -4)` + 09:30 | 동일 + 18:30 | 2025-11-07 (당일) |

**계산 수식 설명**:

1. **EOMONTH(base, -2)**:
   - `base` = 정산 마감일
   - `EOMONTH(base, -2)` = 정산 마감일로부터 2개월 전 월말
   - 예: 정산 마감일이 2025-11-13이면, 2025-09-30

2. **EOMONTH(...) + 24**:
   - 해당 월말에서 24일 후
   - 예: 2025-09-30 + 24 = 2025-10-24

3. **WORKDAY(..., -1, holidays)**:
   - 그 날짜의 1 영업일 전 (공휴일 제외)
   - 예: WORKDAY(2025-10-24, -1) = 2025-10-23

4. **WORKDAY(base, -N, holidays)**:
   - 정산 마감일로부터 N 영업일 전
   - 예: WORKDAY(2025-11-13, -3) = 2025-11-10

**Offset 타입 정의**:

```json
// Type 1: base_date - 기준일 그대로
{
  "type": "base_date",
  "workday_offset": 0,
  "time": "18:30"
}

// Type 2: workday_from_base - 기준일로부터 N 영업일
{
  "type": "workday_from_base",
  "workday_offset": -3,  // 3 영업일 전
  "time": "09:30"
}

// Type 3: eomonth_workday - EOMONTH + day_adjustment + workday_offset
{
  "type": "eomonth_workday",
  "eomonth_offset_months": -2,   // 2개월 전 월말
  "day_adjustment": 24,           // +24일
  "workday_offset": -1,           // 1 영업일 전
  "time": "09:30"
}
```

**템플릿 변수**:

| 변수 | 설명 | 예시 |
|------|------|------|
| `{year}` | 정산 연도 | "2025" |
| `{month}` | 정산 월 | "10" |
| `{work_period_start}` | 작업 기간 시작일 | "09/26(금)" |
| `{work_period_end}` | 작업 기간 종료일 | "10/25(목)" |
| `{estimate_deadline}` | 견적서 입수 마감일 | "11/08(금)" |
| `{settlement_date_formatted}` | 정산 마감일 (포맷) | "11/13(수)" |

**담당자 정보**:

| 항목 | JIRA Account ID |
|------|-----------------|
| Epic | 712020:1a1a9943-9787-44e1-b2da-d4f558df471e |
| M4 Task/Subtasks | 712020:1a1a9943-9787-44e1-b2da-d4f558df471e |
| NC Task/Subtasks | 712020:1a1a9943-9787-44e1-b2da-d4f558df471e |
| FB Task/Subtasks | 712020:1a1a9943-9787-44e1-b2da-d4f558df471e |
| LY Task/Subtasks | 62b57632f38b4dcf73daedb2 |
| 견적서 크로스체크 | 617f7523f485cd0068077192 |

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 3.9절

**시안 참조**: `prd/wireframes/3.9_L10N_일정_계산_결과/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

**UI 동작**:

1. **프로젝트 선택**: L10N 선택
2. **정산 마감일 입력**: YYYY-MM-DD 형식 (예: 2025-11-13)
3. **일정 계산**: 복합 수식 기반 역산
4. **결과 표시**: Epic, Task, Subtask 계층 테이블
5. **JIRA 생성**: 5개 Task + 12개 Subtask = 총 17개 일감 생성

**참고**:
- BV 프로젝트는 서비스 종료로 Task 목록에서 제외됨
- 폴더 생성 기능은 L10N에 적용되지 않음 (NAS 경로 없음)
- 레거시 Excel: `legacy/L10n_Auto SchedulerV_1.9.xlsx`의 L10N 시트 참조

---

## 6. 데이터 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 입력        │ --> │ 일정 계산    │ --> │ 결과 표시   │
│ - 프로젝트   │     │ - WORKDAY   │     │ - 테이블    │
│ - 업데이트일 │     │ - 공휴일 제외│     │            │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌─────────────┐           ┌─────────────┐
      │ JIRA 생성   │           │ 폴더 생성   │
      │ - API 호출  │           │ - NAS 접근  │
      │ - 결과 표시 │           │ - 미리보기  │
      └─────────────┘           └─────────────┘
```

---

## 7. 설정 연동

### 7.1 프로젝트 설정 참조

- `projects.json`에서 마일스톤 규칙 로드
- NAS 기본 경로
- JIRA Project Key
- 폴더 구조 (02_REVIEW 포함 여부)

### 7.2 공휴일 설정 참조

- `holidays.json`에서 해당 연도 공휴일 로드

### 7.3 인증 정보 참조

- `config.json`에서 JIRA 인증 정보 로드

---

## 부록 A: 참조 문서

- `sebastian-prd-shared.md`: 공통 컴포넌트
- `sebastian-prd-master.md`: 마스터 문서
- `legacy/L10n_Auto SchedulerV_1.9.xlsx`: 레거시 Excel
- `legacy/Bulk Jira Task Creator/Code.gs`: 레거시 JIRA 생성 코드
- `legacy/Folder Creator/app.py`: 레거시 폴더 생성 코드

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-11-20 | 초안 작성 - 레거시 코드 분석 및 라운드 1-4 답변 반영 |
| 1.1 | 2025-11-25 | 검증 완료, 승인 |
| 1.2 | 2025-11-26 | Draft 재전환, L10N 5.5절 추가, FBGL 2.4절/5.3절 수정, 공휴일 관리 2.5절 확장 |
| 1.3 | 2025-11-27 | 버전 동기화 (master.md와 일치) |
| 1.4 | 2025-11-27 | PRD 정제 라운드 1: FBGL 배포 유형 선택 UI 추가, JIRA 생성 버튼 재활성화 로직 명확화 |
| 1.5 | 2025-11-27 | PRD 정제 라운드 2: L10N 프로젝트 공휴일 폴백 처리 명시 (2.5.5절) |
| 1.6 | 2025-11-27 | UI 시안 참조 추가: wireframes 폴더 연결 (2.6, 3.8, 4.6절, L10N UI) |
