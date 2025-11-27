# Sebastian PRD - Shared Components

**문서 버전**: 1.6
**최종 수정**: 2025-11-27
**상태**: Approved

---

## 1. 개요

이 문서는 Sebastian 앱의 공통 컴포넌트를 정의합니다. 모든 Feature 문서가 이 문서를 참조합니다.

---

## 2. UI 아키텍처

### 2.1 메인 윈도우 구조

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 1장

**시안 참조**: `prd/wireframes/1_메인_윈도우/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

**주요 구성**:
- 상단: 탭 버튼 3개 (일정/메시지, 테이블 병합, 관리)
- 중앙: 탭 콘텐츠 영역
- 하단: 버전 정보 (좌), 설정 버튼 (우)

### 2.2 탭 구성

| 탭 | 포함 기능 | 참조 문서 |
|----|----------|----------|
| 일정/메시지 | 자동 일정 계산기, JIRA 일감 생성, 폴더 생성, 헤즈업/HO | scheduler, messaging |
| 테이블 병합 | M4/GL, NC/GL, LY/GL 병합/분할 | table-merge |
| 관리 | Daily Task, Daily Scrum, Slack MSG | l10n-admin |

### 2.3 앱 동작

- **시작 시**: 자동으로 스케줄 활성화
- **최소화**: 시스템 트레이로 최소화 (백그라운드 실행)
- **종료**: 트레이 아이콘 우클릭 → 종료

---

## 3. 설정 시스템

### 3.1 설정 화면 구조

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 2장

**시안 참조**: `prd/wireframes/2_설정_화면/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

**방식**: 단일 화면 + 섹션 분리 (스크롤)

**주요 섹션**:
1. 인증 정보 (JIRA, Slack, Confluence)
2. 프로젝트 설정 (드롭다운 선택)
3. 공휴일 관리 (가져오기/내보내기)
4. 템플릿 변수 (시스템/사용자)
5. 메시지 템플릿 (프로젝트별 편집)
6. 스케줄 설정 (Daily Task/Scrum/Slack MSG)

### 3.2 저장 방식

- **저장 트리거**: [저장] 버튼 클릭 시
- **변경 감지**: 미저장 변경사항 있을 시 버튼 활성화
- **유효성 검증**: 저장 전 필수 필드 검증

---

## 4. 인증 관리

### 4.1 지원 서비스

| 서비스 | 인증 방식 | 용도 |
|--------|----------|------|
| JIRA | API Token + Email | 일감 생성, 조회 |
| Slack | OAuth Token | 메시지 발송 |
| Confluence | API Token + Email | 페이지 업데이트 |

### 4.2 인증 정보 저장

- **저장 위치**: `config.json`
- **암호화**: 시스템 키링 사용 (Windows Credential Manager)
- **표시**: 마스킹 처리 (`**********`)

### 4.3 연결 테스트

각 서비스별 [테스트] 버튼 제공:
- 성공: "연결 성공" 메시지
- 실패: 오류 메시지 및 해결 방법 안내

---

## 5. 프로젝트 관리

### 5.1 지원 프로젝트

| 프로젝트 | 코드 | JIRA Key | 특이사항 |
|----------|------|----------|----------|
| MIR4 Global | M4GL | L10NM4 | 02_REVIEW 폴더 포함 |
| NC Global | NCGL | L10NNC | 마일스톤 입력 필요 |
| FB Global | FBGL | L10NFB | - |
| LY Global | LYGL | L10NLY | 병합/분할 지원 |
| L10N 공통 | L10N | L10N | - |

### 5.2 프로젝트별 설정 항목

| 설정 항목 | 설명 | 예시 (M4GL) |
|-----------|------|-------------|
| JIRA Project Key | JIRA 프로젝트 식별자 | L10NM4 |
| NAS 기본 경로 | 폴더 생성 기본 위치 | `\\nas\m4gl\l10n\` |
| 마일스톤별 영업일 수 | 일정 계산 규칙 | Index 시트 참조 |
| 폴더 구조 | 02_REVIEW 포함 여부 | 포함 |
| 언어 목록 | 지원 언어 | KO, EN, CT, CS, JA, TH, ES-LATAM, PT-BR |
| 메시지 템플릿 | 헤즈업/HO 템플릿 | 프로젝트별 정의 |
| Slack 채널 | 메시지 발송 채널 | C06BZA056E4 |

### 5.3 새 프로젝트 추가

- **방식**: 코드 수정으로만 추가 (사용자 기능 X)
- **필요 작업**: 프로젝트 정의, 기본 설정값, UI 업데이트

---

## 6. 데이터 저장

### 6.1 파일 구조

```
%APPDATA%/Sebastian/
├── config.json          # 기본 설정 (인증, 스케줄, L10N Admin 채널)
├── projects.json        # 프로젝트별 설정 (메시지 채널 포함)
├── templates.json       # 메시지 템플릿
├── holidays.json        # 공휴일 데이터
└── logs/
    └── sebastian.log    # 실행 로그
```

### 6.2 파일 스키마

**config.json** (공통 설정):
```json
{
  "version": "1.0",
  "auth": {
    "jira": { "email": "", "token": "" },
    "slack": { "token": "" },
    "confluence": { "email": "", "token": "" }
  },
  "schedule": {
    "daily_task": { "enabled": true, "cron": "0 9 10 * *" },
    "daily_scrum": { "enabled": true, "cron": "0 9 * * 1-5" },
    "slack_msg": { "enabled": true, "cron": "0 7 * * 1-5" }
  },
  "last_execution": {
    "daily_task": "2025-01-10",
    "daily_scrum": "2025-01-10",
    "slack_msg": "2025-01-10"
  },
  "admin_slack_channel": "C06BZA056E4"
}
```

> **Note**: `admin_slack_channel`은 L10N Admin 기능(Daily Task/Scrum/Slack MSG)에서 사용하는 공통 채널입니다.

**projects.json** (프로젝트별 설정):
```json
{
  "M4GL": {
    "jira_key": "L10NM4",
    "nas_path": "\\\\nas\\m4gl\\l10n\\",
    "folder_structure": ["00_SOURCE", "01_HB", "02_REVIEW", "03_DELIVERY"],
    "languages": ["KO", "EN", "CT", "CS", "JA", "TH", "ES-LATAM", "PT-BR"],
    "schedule": {
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
    },
    "slack_channel": "C07BZA056M4"
  },
  "NCGL": {
    "jira_key": "L10NNC",
    "nas_path": "\\\\nas\\ncgl\\l10n\\",
    "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"],
    "languages": ["EN", "CT", "CS", "JA", "TH", "ES", "PT", "RU"],
    "schedule": {
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
    },
    "slack_channel": "C06BZA056E5"
  },
  "FBGL": {
    "jira_key": "L10NFB",
    "nas_path": "\\\\nas\\fbgl\\l10n\\",
    "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"],
    "regions": ["GL", "JP"],
    "languages_by_region": {
      "GL": ["EN", "CT"],
      "JP": ["EN", "JA"]
    },
    "deployment_types": ["CDN", "APP"],
    "schedule_by_deployment": {
      "CDN": {
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
      },
      "APP": {
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
    },
    "slack_channel": "C06BZA056E6"
  },
  "LYGL": {
    "jira_key": "L10NLY",
    "nas_path": "\\\\nas\\lygl\\l10n\\",
    "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"],
    "languages": ["EN", "CT", "CS", "JA", "TH", "PT-BR", "RU"],
    "schedule": {
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
    },
    "slack_channel": "C06BZA056E7"
  },
  "L10N": {
    "type": "monthly_settlement",
    "jira_key": "L10N",
    "base_date_type": "settlement_deadline",
    "nas_path": null,
    "epic": {
      "summary_template": "{year}년 {month}월 작업 정산",
      "start_offset": {
        "type": "eomonth_workday",
        "eomonth_offset_months": -2,
        "day_adjustment": 24,
        "workday_offset": -1,
        "time": "09:30"
      },
      "due_offset": {
        "type": "base_date",
        "workday_offset": 0,
        "time": "18:30"
      },
      "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
      "description_template": "{year}년 {month}월 L10n팀에서 작업한 내역의 정산을 관리하는 에픽입니다.\n\n{year}년 {month}월 일반비용 및 수입 품의 / 결의\n\n{month}월 결의서 마감: *{settlement_date_formatted}(승인완료까지)*"
    },
    "tasks": [
      {
        "name": "M4",
        "summary_template": "M4 {year}년 {month}월 정산",
        "start_offset": {
          "type": "eomonth_workday",
          "eomonth_offset_months": -2,
          "day_adjustment": 24,
          "workday_offset": -1,
          "time": "09:30"
        },
        "due_offset": {
          "type": "base_date",
          "workday_offset": 0,
          "time": "18:30"
        },
        "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
        "description_template": "{work_period_start}~{work_period_end} 작업 정산",
        "subtasks": [
          {
            "name": "견적서 요청",
            "summary_template": "[M4] {month}월 견적서 요청",
            "start_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "09:30"
            },
            "due_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": "견적서 입수: {estimate_deadline} EOD까지"
          },
          {
            "name": "세금계산서 요청",
            "summary_template": "[M4] {month}월 세금계산서 요청",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": ""
          },
          {
            "name": "지결 상신",
            "summary_template": "[M4] {month}월 지결 상신",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": "문서 번호: "
          }
        ]
      },
      {
        "name": "NC",
        "summary_template": "NC {year}년 {month}월 정산",
        "start_offset": {
          "type": "eomonth_workday",
          "eomonth_offset_months": -2,
          "day_adjustment": 24,
          "workday_offset": -1,
          "time": "09:30"
        },
        "due_offset": {
          "type": "base_date",
          "workday_offset": 0,
          "time": "18:30"
        },
        "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
        "description_template": "{work_period_start}~{work_period_end} 작업 정산",
        "subtasks": [
          {
            "name": "견적서 요청",
            "summary_template": "[NC] {month}월 견적서 요청",
            "start_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "09:30"
            },
            "due_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": "견적서 입수: {estimate_deadline} EOD까지"
          },
          {
            "name": "세금계산서 요청",
            "summary_template": "[NC] {month}월 세금계산서 요청",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": ""
          },
          {
            "name": "지결 상신",
            "summary_template": "[NC] {month}월 지결 상신",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": "문서 번호: "
          }
        ]
      },
      {
        "name": "FB",
        "summary_template": "FB {year}년 {month}월 정산",
        "start_offset": {
          "type": "eomonth_workday",
          "eomonth_offset_months": -2,
          "day_adjustment": 24,
          "workday_offset": -1,
          "time": "09:30"
        },
        "due_offset": {
          "type": "base_date",
          "workday_offset": 0,
          "time": "18:30"
        },
        "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
        "description_template": "{work_period_start}~{work_period_end} 작업 정산",
        "subtasks": [
          {
            "name": "견적서 요청",
            "summary_template": "[FB] {month}월 견적서 요청",
            "start_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "09:30"
            },
            "due_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": "견적서 입수: {estimate_deadline} EOD까지"
          },
          {
            "name": "세금계산서 요청",
            "summary_template": "[FB] {month}월 세금계산서 요청",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": ""
          },
          {
            "name": "지결 상신",
            "summary_template": "[FB] {month}월 지결 상신",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "18:30"
            },
            "assignee": "712020:1a1a9943-9787-44e1-b2da-d4f558df471e",
            "description_template": "문서 번호: "
          }
        ]
      },
      {
        "name": "LY",
        "summary_template": "LY {year}년 {month}월 정산",
        "start_offset": {
          "type": "eomonth_workday",
          "eomonth_offset_months": -2,
          "day_adjustment": 24,
          "workday_offset": -1,
          "time": "09:30"
        },
        "due_offset": {
          "type": "base_date",
          "workday_offset": 0,
          "time": "18:30"
        },
        "assignee": "62b57632f38b4dcf73daedb2",
        "description_template": "{work_period_start}~{work_period_end} 작업 정산",
        "subtasks": [
          {
            "name": "견적서 요청",
            "summary_template": "[LY] {month}월 견적서 요청",
            "start_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "09:30"
            },
            "due_offset": {
              "type": "eomonth_workday",
              "eomonth_offset_months": -2,
              "day_adjustment": 26,
              "workday_offset": -1,
              "time": "18:30"
            },
            "assignee": "62b57632f38b4dcf73daedb2",
            "description_template": "견적서 입수: {estimate_deadline} EOD까지"
          },
          {
            "name": "세금계산서 요청",
            "summary_template": "[LY] {month}월 세금계산서 요청",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -3,
              "time": "18:30"
            },
            "assignee": "62b57632f38b4dcf73daedb2",
            "description_template": ""
          },
          {
            "name": "지결 상신",
            "summary_template": "[LY] {month}월 지결 상신",
            "start_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "09:30"
            },
            "due_offset": {
              "type": "workday_from_base",
              "workday_offset": -2,
              "time": "18:30"
            },
            "assignee": "62b57632f38b4dcf73daedb2",
            "description_template": "문서 번호: "
          }
        ]
      },
      {
        "name": "견적서 크로스체크",
        "summary_template": "{year}년 {month}월 견적서 크로스체크",
        "start_offset": {
          "type": "workday_from_base",
          "workday_offset": -4,
          "time": "09:30"
        },
        "due_offset": {
          "type": "workday_from_base",
          "workday_offset": -4,
          "time": "18:30"
        },
        "assignee": "617f7523f485cd0068077192",
        "description_template": "*프로젝트별 요약*\n||프로젝트||경로||파일||특기사항||\n|M4/GL||||\n|NC/GL||||\n|FB/GL\\\\FB/JP||||\n|LY/GL||||\n|BV/GL||||",
        "subtasks": []
      }
    ]
  }
}
```

**참고**:
- **일반 프로젝트** (M4GL, NCGL, FBGL, LYGL):
  - `schedule` 구조는 scheduler.md 2.4절의 역산 인덱스와 동일
  - `folder_structure`: M4GL은 02_REVIEW 포함, 나머지는 미포함
  - `deployment_types`: FBGL만 CDN/APP 구분
- **L10N 프로젝트**:
  - `type: "monthly_settlement"`: 월간 정산 프로젝트임을 명시
  - `base_date_type: "settlement_deadline"`: 기준일이 "정산 마감일"임
  - Offset 타입:
    - `base_date`: 기준일 그대로 사용
    - `workday_from_base`: 기준일로부터 N 영업일 (양수/음수)
    - `eomonth_workday`: EOMONTH + day_adjustment + workday_offset 복합 계산
  - Template 변수: `{year}`, `{month}`, `{work_period_start}`, `{work_period_end}`, `{estimate_deadline}`, `{settlement_date_formatted}`
  - 상세 설명: scheduler.md 5.6절 참조
- `last_execution`: L10N Admin 작업의 마지막 실행 날짜 (누락 스케줄 감지용)

#### 6.2.1 projects.json 필수/선택 항목

**모든 프로젝트 설정 항목은 필수입니다.** 설정 누락 시 해당 기능이 비활성화됩니다:

| 항목 | 필수 여부 | 누락 시 동작 |
|------|----------|-------------|
| `jira_key` | 필수 | JIRA 일감 생성 버튼 비활성화 |
| `nas_path` | 필수 | 폴더 생성 버튼 비활성화 |
| `folder_structure` | 필수 | 폴더 생성 시 기본 구조 사용 |
| `languages` | 필수 | 테이블 병합 버튼 비활성화 |
| `schedule` | 필수 | 일정 계산 불가 |
| `slack_channel` | 필수 | 메시지 템플릿 발송 기능 비활성화 |

**검증 시점**: 설정 화면에서 [저장] 버튼 클릭 시

**검증 실패 시**: 에러 메시지 표시 + 저장 불가
- 예: "`jira_key`가 비어있습니다. JIRA 프로젝트 키를 입력해주세요."

#### 6.2.2 설정값 유효 범위

**offset_days 값 검증**:

`schedule` 내 모든 `offset_days` 필드는 다음 범위를 준수해야 합니다:

| 항목 | 유효 범위 | 허용값 |
|------|----------|--------|
| `start_offset_days` | -100 ~ +30 | 음수, 양수, 0 모두 허용 |
| `end_offset_days` | -100 ~ +30 | 음수, 양수, 0 모두 허용 |

**검증 규칙**:
```python
def validate_offset_days(value: int) -> bool:
    return -100 <= value <= 30
```

**검증 실패 시**:
```
에러 메시지: "offset_days 값은 -100에서 +30 사이여야 합니다. 입력값: {value}"
```

**검증 시점**: 설정 화면에서 [저장] 버튼 클릭 시, 또는 프로젝트 데이터 로드 시

> **Note**:
> - `admin_slack_channel` (config.json): L10N Admin 기능(Daily Task/Scrum/Slack MSG) 전용
> - `slack_channel` (projects.json): 각 프로젝트의 헤즈업/HO 메시지 발송용
> - 실무에서는 같은 채널 ID 사용 가능하나, 예시에서는 구분을 위해 다른 ID 사용

**templates.json**:
```json
{
  "variables": {
    "system": [
      "project",
      "update_date",
      "update_date_full",
      "milestone",
      "batch_name",
      "today",
      "headsup_date",
      "regular_ho_date",
      "regular_delivery_date",
      "extra0_ho_date",
      "extra0_delivery_date",
      "extra1_ho_date",
      "extra1_delivery_date",
      "batch_due_date"
    ],
    "custom": []
  },
  "templates": {
    "M4GL": {
      "headsup": {
        "subject": "{project} {update_date} 업데이트 일정 안내",
        "body": "안녕하세요.\n\n{project} {update_date_full} 업데이트 일정을 안내드립니다.\n\n**주요 일정**\n- 헤즈업: {headsup_date}\n- REGULAR HO: {regular_ho_date}\n- REGULAR Delivery: {regular_delivery_date}\n- EXTRA0 HO: {extra0_ho_date}\n- EXTRA0 Delivery: {extra0_delivery_date}\n- EXTRA1 HO: {extra1_ho_date}\n- EXTRA1 Delivery: {extra1_delivery_date}\n\n감사합니다."
      },
      "handoff": {
        "subject": "{project} {update_date} {batch_name} HO",
        "body": "안녕하세요.\n\n{project} {update_date} {batch_name} HO를 전달드립니다.\n\n**마감 일시**: {batch_due_date}\n\n감사합니다."
      }
    },
    "NCGL": {
      "headsup": {
        "subject": "{project} {milestone} {update_date} 업데이트 일정 안내",
        "body": "안녕하세요.\n\n{project} {milestone} {update_date_full} 업데이트 일정을 안내드립니다.\n\n**주요 일정**\n- 헤즈업: {headsup_date}\n- REGULAR HO: {regular_ho_date}\n- REGULAR Delivery: {regular_delivery_date}\n- EXTRA0 HO: {extra0_ho_date}\n- EXTRA0 Delivery: {extra0_delivery_date}\n- EXTRA1 HO: {extra1_ho_date}\n- EXTRA1 Delivery: {extra1_delivery_date}\n\n감사합니다."
      },
      "handoff": {
        "subject": "{project} {milestone} {update_date} {batch_name} HO",
        "body": "안녕하세요.\n\n{project} {milestone} {update_date} {batch_name} HO를 전달드립니다.\n\n**마감 일시**: {batch_due_date}\n\n감사합니다."
      }
    },
    "FBGL": {
      "headsup": {
        "subject": "{project} {update_date} 업데이트 일정 안내",
        "body": "안녕하세요.\n\n{project} {update_date_full} 업데이트 일정을 안내드립니다.\n\n**주요 일정**\n- 헤즈업: {headsup_date}\n- REGULAR HO: {regular_ho_date}\n- REGULAR Delivery: {regular_delivery_date}\n- EXTRA0 HO: {extra0_ho_date}\n- EXTRA0 Delivery: {extra0_delivery_date}\n- EXTRA1 HO: {extra1_ho_date}\n- EXTRA1 Delivery: {extra1_delivery_date}\n\n감사합니다."
      },
      "handoff": {
        "subject": "{project} {update_date} {batch_name} HO",
        "body": "안녕하세요.\n\n{project} {update_date} {batch_name} HO를 전달드립니다.\n\n**마감 일시**: {batch_due_date}\n\n감사합니다."
      }
    },
    "LYGL": {
      "headsup": {
        "subject": "{project} {update_date} 업데이트 일정 안내",
        "body": "안녕하세요.\n\n{project} {update_date_full} 업데이트 일정을 안내드립니다.\n\n**주요 일정**\n- 헤즈업: {headsup_date}\n- REGULAR HO: {regular_ho_date}\n- REGULAR Delivery: {regular_delivery_date}\n- EXTRA0 HO: {extra0_ho_date}\n- EXTRA0 Delivery: {extra0_delivery_date}\n- EXTRA1 HO: {extra1_ho_date}\n- EXTRA1 Delivery: {extra1_delivery_date}\n\n감사합니다."
      },
      "handoff": {
        "subject": "{project} {update_date} {batch_name} HO",
        "body": "안녕하세요.\n\n{project} {update_date} {batch_name} HO를 전달드립니다.\n\n**마감 일시**: {batch_due_date}\n\n감사합니다."
      }
    }
  }
}
```

> **Note**: 위 템플릿은 기본 구조 예시입니다. 실제 본문 내용은 사용자가 설정 화면에서 직접 작성합니다.
> - **초기 설치 시**: 빈 템플릿 제공 (변수만 포함된 기본 구조)
> - **사용자 설정**: 설정 > 메시지 템플릿에서 프로젝트별, 유형별로 편집 가능
> - **변수 치환**: 출력 시 시스템 변수가 실제 값으로 자동 치환

**holidays.json**:
```json
{
  "2025": [
    { "date": "2025-01-01", "name": "신정" },
    { "date": "2025-01-28", "name": "설날 연휴" },
    { "date": "2025-01-29", "name": "설날" },
    { "date": "2025-01-30", "name": "설날 연휴" },
    { "date": "2025-03-01", "name": "삼일절" },
    { "date": "2025-05-05", "name": "어린이날" },
    { "date": "2025-06-06", "name": "현충일" },
    { "date": "2025-08-15", "name": "광복절" },
    { "date": "2025-10-03", "name": "개천절" },
    { "date": "2025-10-09", "name": "한글날" }
  ],
  "2026": [...],
  "2027": [...]
}
```

**초기 번들**:
- 앱 설치 시 2025~2027년 공휴일 자동 포함
- 대한민국 법정 공휴일 + 대체공휴일 + 설/추석 연휴

**업데이트 방법**:
- 설정 화면 > 공휴일 관리 > [가져오기]로 JSON 파일 추가
- 외부 API 미사용 (완전 로컬 기반)
- 상세: scheduler.md 2.5절 참조

### 6.3 내보내기/가져오기

- **내보내기**: 설정 화면에서 [내보내기] → ZIP 파일로 전체 설정 백업
- **가져오기**: [가져오기] → ZIP 선택 → 기존 설정 덮어쓰기 확인
- **자동 백업**: 미지원

---

## 7. 템플릿 변수 시스템

### 7.1 시스템 변수

**기본 변수**:

| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `{project}` | 프로젝트명 | M4GL |
| `{update_date}` | 업데이트일 (YYMMDD) | 250115 |
| `{update_date_full}` | 업데이트일 전체 | 2025년 1월 15일 |
| `{milestone}` | 마일스톤 | M42 |
| `{batch_name}` | 배치명 | REGULAR |
| `{today}` | 오늘 날짜 | 1월 10일(금) |

**일정 변수** (일정 계산기에서 자동 생성):

| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `{headsup_date}` | 헤즈업 날짜 | 1월 8일(수) |
| `{regular_ho_date}` | REGULAR HO 날짜 | 1월 8일(수) |
| `{regular_delivery_date}` | REGULAR Delivery 날짜 | 1월 10일(금) |
| `{extra0_ho_date}` | EXTRA0 HO 날짜 | 1월 10일(금) |
| `{extra0_delivery_date}` | EXTRA0 Delivery 날짜 | 1월 13일(월) |
| `{extra1_ho_date}` | EXTRA1 HO 날짜 | 1월 13일(월) |
| `{extra1_delivery_date}` | EXTRA1 Delivery 날짜 | 1월 14일(화) |
| `{batch_due_date}` | 선택된 배치 마감일 | 1월 10일(금) |

### 7.2 사용자 정의 변수

- **추가**: 설정 → 템플릿 변수 → [추가]
- **형식**: `{변수명}` (영문, 숫자, 언더스코어)
- **값 입력**: 템플릿 생성 시 직접 입력

### 7.3 변수 치환

템플릿 출력 시 자동으로 변수를 실제 값으로 치환:
```
입력: "{project} {update_date} 업데이트"
출력: "M4GL 250115 업데이트"
```

---

## 8. 권한 관리

### 8.1 PIN 인증

- **용도**: 민감한 설정 변경 시 (인증 정보, 내보내기 등)
- **설정**: 최초 실행 시 4자리 숫자 PIN 설정
- **재설정**: 기존 PIN 입력 후 변경 가능
- **실패 처리**:
  - 5회 연속 실패 시 설정 초기화 안내
- **분실 시 복구**:
  - `%APPDATA%/Sebastian/` 폴더 삭제
  - 앱 재시작 후 초기 설정 진행

### 8.2 보호 대상

- 인증 정보 조회/수정
- 설정 내보내기
- 전체 설정 초기화

---

## 9. 로깅

### 9.1 로그 레벨

| 레벨 | 용도 |
|------|------|
| INFO | 일반 작업 완료 |
| WARNING | 경고 (계속 진행 가능) |
| ERROR | 오류 (작업 실패) |

### 9.2 로그 형식

```
2025-01-10 09:00:15 [INFO] Daily Scrum 업데이트 완료
2025-01-10 09:00:16 [INFO] Confluence 페이지 191332855 업데이트 성공
2025-01-10 09:01:00 [ERROR] Slack 메시지 발송 실패: 인증 오류
```

### 9.3 로그 관리

- **위치**: `%APPDATA%/Sebastian/logs/`
- **파일명**: `sebastian_YYYYMMDD.log` (예: `sebastian_20251125.log`)
- **로테이션**: 일별 (자정 기준, 새 날짜가 되면 새 파일 생성)
- **보존**: 최근 30일, 30일 초과 파일 자동 삭제
- **크기 제한**: 파일당 최대 10MB (초과 시 `.1`, `.2` 접미사로 분할)
  - 예: `sebastian_20251125.log` → `sebastian_20251125.log.1`
- **레벨**: 고정 INFO (DEBUG, WARNING, ERROR 포함, 레벨 변경 불가)
- **조회**: 설정 화면에서 [로그 보기] 버튼

---

## 10. 기술 스택

| 구분 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 언어 | Python | 3.11+ | |
| GUI | PyQt6 | 6.x | |
| HTTP | requests | 2.x | |
| Excel | openpyxl, pandas | latest | |
| 스케줄링 | APScheduler | 3.x | |
| 암호화 | keyring | latest | |
| Windows API | pywin32 | latest | 다중 인스턴스 방지 (뮤텍스) |

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

---

## 12. 초기 설정 (First-Time Setup)

### 12.1 최초 실행 감지

앱이 다음 조건을 만족하면 초기 설정 모드로 진입:
- `%APPDATA%/Sebastian/config.json` 파일이 존재하지 않음
- 또는 `config.json`의 `version` 필드가 없음

### 12.2 초기 설정 흐름

**와이어프레임 참조**: `sebastian-prd-wireframes.md` 6.1절

**시안 참조**: `prd/wireframes/6.1_초기_설정_마법사/`
- `code.html` - HTML/CSS 코드
- `screen.png` - 렌더링된 시안 이미지

**5단계 마법사**:
1. PIN 설정 (4자리 숫자)
2. JIRA 연동 (Email + API Token)
3. Slack 연동 (OAuth Token)
4. Confluence 연동 (Email + API Token)
5. 기본 프로젝트 선택 (M4GL/NCGL/FBGL/LYGL)

### 12.3 단계별 상세

**1단계: PIN 설정**
- 4자리 숫자 입력 (0000~9999)
- 확인 입력과 일치 검증
- 일치하지 않으면 재입력 요청
- 설정된 PIN은 keyring에 저장

**2-4단계: 서비스 연동**
- 각 서비스별 인증 정보 입력
- [연결 테스트]: API 호출하여 인증 검증
  - 성공: ✓ 표시, 자동으로 [다음] 활성화
  - 실패: ✗ 표시, 에러 메시지 ("인증 실패: {상세 사유}")
- [건너뛰기]: 나중에 설정 가능 (경고 메시지 표시)

**5단계: 기본 프로젝트**
- 메인 화면 로드 시 선택된 프로젝트로 초기화
- 나중에 설정에서 변경 가능

### 12.4 연결 테스트 실패 시

**동작**:
- 에러 메시지와 함께 해결 방법 안내
- [재시도] 또는 [건너뛰기] 선택 가능
- 건너뛰기 선택 시:
  - 경고: "나중에 설정 > 인증 정보에서 설정할 수 있습니다"
  - 해당 서비스 사용 불가 상태로 진행
  - **메인 화면에서**: 해당 기능 버튼 비활성화 + tooltip "설정 필요"

**건너뛰기 후 기능 접근 처리**:

| 미설정 서비스 | 영향받는 기능 | UI 표시 | 클릭 시 동작 |
|-------------|-------------|---------|-------------|
| JIRA | JIRA 일감 생성 버튼 | 비활성화 (회색) + tooltip "JIRA 설정 필요" | 클릭 불가 (버튼 완전 비활성화) |
| Slack | Slack MSG 실행 버튼, 메시지 채널 발송 | 비활성화 (회색) + tooltip "Slack 설정 필요" | 클릭 불가 (버튼 완전 비활성화) |
| Confluence | Daily Task/Scrum 실행 버튼 | 비활성화 (회색) + tooltip "Confluence 설정 필요" | 클릭 불가 (버튼 완전 비활성화) |

> **참고**:
> - 비활성화된 버튼은 회색으로 표시되며, 마우스 호버 시 tooltip이 나타납니다.
> - 버튼은 완전히 비활성화되어 클릭 이벤트가 발생하지 않습니다.
> - 설정 완료 후 자동으로 활성화됩니다.

**에러 메시지 예시**:
```
JIRA 연결 실패
- 인증 오류: API Token이 유효하지 않습니다
- 해결 방법:
  1. JIRA 계정 설정에서 API Token 재생성
  2. Email 주소 확인 (JIRA 계정과 일치해야 함)
  3. 네트워크 연결 확인

[재시도]  [건너뛰기]
```

### 12.5 초기 설정 완료 후

1. 모든 설정을 `config.json`, `projects.json`에 저장
2. 기본 `holidays.json` 복사 (앱 번들에 포함된 2025~2027년 공휴일)
3. 메인 화면으로 전환
4. 환영 메시지: "Sebastian 설정이 완료되었습니다!"

### 12.6 설정 재실행

- 설정 화면 하단에 [초기 설정 다시 하기] 버튼 제공
- PIN 인증 후 초기 설정 모드 진입
- 기존 설정 백업 후 덮어쓰기

---

## 13. 네트워크 처리

### 13.1 타임아웃 설정

| 작업 유형 | 타임아웃 | 비고 |
|----------|---------|------|
| API 호출 | 30초 | JIRA, Slack, Confluence API |
| 파일 다운로드 | 60초 | 공휴일 데이터 등 |
| 연결 테스트 | 10초 | 초기 설정 시 인증 검증 |

### 13.2 오프라인 감지

**감지 방법**:
- 첫 API 호출 실패 시 네트워크 연결 상태 확인
- Windows API(`InternetGetConnectedState`) 또는 간단한 ping 테스트

**오프라인 시**:
- 에러 메시지: "네트워크 연결을 확인하세요"
- 재시도 옵션 제공
- 로그에 "오프라인 상태" 기록

### 13.3 롤백 정책

| 작업 | 실패 시 롤백 정책 |
|------|-----------------|
| JIRA 일감 생성 | 생성된 일감 유지 (수동 삭제 안내) |
| Confluence 업데이트 | 이전 버전 유지 (자동 롤백) |
| Slack 메시지 | 재시도 없음 (중복 방지) |
| 폴더 생성 | 생성된 폴더 유지 (부분 생성 허용) |
| 테이블 병합 | 임시 파일 삭제 (출력 파일 생성 전 실패 시) |

---

## 14. 에러 메시지 표준

### 14.1 에러 메시지 원칙

**구성 요소**:
1. **에러 제목**: 간결한 에러 유형 (예: "파일 오류", "API 오류")
2. **에러 내용**: 구체적인 상황 설명
3. **해결 방법**: 사용자 액션 가이드 (선택적)
4. **액션 버튼**: [재시도], [취소], [건너뛰기] 등

**작성 규칙**:
- 사용자 친화적 언어 사용 (기술 용어 최소화)
- 구체적인 해결 방법 제시
- 긍정적 톤 유지 ("~할 수 없습니다" 대신 "~를 확인해주세요")

### 14.2 에러 카탈로그

#### 14.2.1 파일 I/O 에러

| 에러 코드 | 상황 | 메시지 | 액션 |
|----------|------|--------|------|
| **FILE_NOT_FOUND** | 파일이 존재하지 않음 | "선택한 파일을 찾을 수 없습니다.\n\n파일 경로: {path}\n\n파일이 이동되었거나 삭제되었을 수 있습니다." | [확인] |
| **FILE_ACCESS_DENIED** | 파일 접근 권한 없음 | "파일에 접근할 수 없습니다.\n\n파일이 다른 프로그램에서 사용 중이거나 읽기 권한이 없을 수 있습니다.\n\n파일을 닫고 다시 시도해주세요." | [재시도], [취소] |
| **FILE_FORMAT_INVALID** | 지원하지 않는 파일 형식 | "지원하지 않는 파일 형식입니다.\n\n.xlsx 또는 .xls 파일만 선택해주세요." | [확인] |
| **FILE_SIZE_EXCEEDED** | 파일 크기 초과 | "파일 크기가 {size}MB로 제한({limit}MB)을 초과합니다.\n\n더 작은 파일을 선택해주세요." | [확인] |
| **FILE_READ_ERROR** | 파일 읽기 실패 | "파일을 읽을 수 없습니다.\n\n파일이 손상되었거나 형식이 올바르지 않을 수 있습니다.\n\n오류 상세: {error}" | [확인] |
| **FILE_WRITE_ERROR** | 파일 쓰기 실패 | "파일을 저장할 수 없습니다.\n\n디스크 공간을 확인하거나 다른 위치를 선택해주세요.\n\n오류 상세: {error}" | [재시도], [취소] |

#### 14.2.2 데이터 검증 에러

| 에러 코드 | 상황 | 메시지 | 액션 |
|----------|------|--------|------|
| **VALIDATION_MISSING_FILES** | 필수 언어 파일 누락 | "필수 언어 파일이 누락되었습니다.\n\n필요: {required_languages}\n누락: {missing_languages}\n\n모든 언어 파일을 선택해주세요." | [확인] |
| **VALIDATION_DUPLICATE_KEY** | 중복 KEY 발견 | "중복된 KEY가 발견되었습니다.\n\nKEY: '{key}'\n파일: {file}\n\nKEY는 파일 내에서 고유해야 합니다." | [확인] |
| **VALIDATION_HEADER_MISMATCH** | 헤더 구조 불일치 | "파일 헤더가 예상과 다릅니다.\n\n예상: {expected}\n실제: {actual}\n\n올바른 파일인지 확인해주세요." | [확인] |
| **VALIDATION_FIELD_MISMATCH** | 필드 값 불일치 | "KEY '{key}'의 {field} 값이 언어별로 다릅니다.\n\nEN: '{en_value}'\n{lang}: '{lang_value}'\n\n{field}는 모든 언어에서 동일해야 합니다." | [확인] |
| **VALIDATION_EMPTY_KEY** | 빈 KEY 발견 | "빈 KEY가 발견되었습니다.\n\n행 번호: {row}\n파일: {file}\n\n모든 행에 KEY 값이 있어야 합니다." | [확인] |

#### 14.2.3 API 연동 에러

| 에러 코드 | 상황 | 메시지 | 액션 |
|----------|------|--------|------|
| **API_AUTH_FAILED** | 인증 실패 | "{service} 인증에 실패했습니다.\n\n원인:\n- API Token이 유효하지 않거나 만료됨\n- Email 주소가 계정과 일치하지 않음\n\n해결 방법:\n1. 설정에서 인증 정보 확인\n2. API Token 재생성 후 업데이트\n3. Email 주소 확인" | [설정 열기], [취소] |
| **API_PERMISSION_DENIED** | 권한 부족 | "{service} 권한이 부족합니다.\n\n작업: {operation}\n\n관리자에게 권한을 요청하거나, 다른 계정으로 재시도해주세요." | [확인] |
| **API_RATE_LIMIT** | API 호출 제한 초과 | "{service} API 호출 한도를 초과했습니다.\n\n잠시 후 다시 시도해주세요." | [확인] |
| **API_RESOURCE_NOT_FOUND** | 리소스 없음 | "{service}에서 리소스를 찾을 수 없습니다.\n\n리소스: {resource_type} (ID: {resource_id})\n\nID가 올바른지 확인하거나, 설정을 업데이트해주세요." | [설정 열기], [취소] |
| **API_SERVER_ERROR** | 서버 오류 (5xx) | "{service} 서버 오류가 발생했습니다.\n\n잠시 후 다시 시도해주세요.\n\n오류 코드: {status_code}" | [재시도], [취소] |

#### 14.2.4 네트워크 에러

| 에러 코드 | 상황 | 메시지 | 액션 |
|----------|------|--------|------|
| **NETWORK_OFFLINE** | 네트워크 연결 없음 | "네트워크에 연결되어 있지 않습니다.\n\n인터넷 연결을 확인하고 다시 시도해주세요." | [재시도], [취소] |
| **NETWORK_TIMEOUT** | 요청 타임아웃 | "요청 시간이 초과되었습니다.\n\n네트워크가 느리거나 서버 응답이 지연되고 있습니다.\n\n다시 시도하시겠습니까?" | [재시도], [취소] |
| **NETWORK_NAS_UNREACHABLE** | NAS 접근 불가 | "NAS 경로에 접근할 수 없습니다.\n\n경로: {nas_path}\n\n해결 방법:\n1. 네트워크 연결 확인\n2. VPN 연결 확인\n3. NAS 경로 권한 확인" | [재시도], [취소] |

#### 14.2.5 사용자 입력 에러

| 에러 코드 | 상황 | 메시지 | 액션 |
|----------|------|--------|------|
| **INPUT_REQUIRED** | 필수 입력 누락 | "{field}을(를) 입력해주세요." | [확인] |
| **INPUT_INVALID_DATE** | 날짜 형식 오류 | "날짜 형식이 올바르지 않습니다.\n\nYYYY-MM-DD 형식으로 입력해주세요.\n예: 2025-01-15" | [확인] |
| **INPUT_INVALID_FORMAT** | 입력 형식 오류 | "{field} 형식이 올바르지 않습니다.\n\n형식: {format}\n예시: {example}" | [확인] |
| **INPUT_OUT_OF_RANGE** | 값 범위 초과 | "{field} 값이 유효 범위를 벗어났습니다.\n\n입력: {value}\n범위: {min} ~ {max}" | [확인] |

#### 14.2.6 비즈니스 로직 에러

| 에러 코드 | 상황 | 메시지 | 액션 |
|----------|------|--------|------|
| **JIRA_CREATION_FAILED** | JIRA 일감 생성 실패 | "JIRA 일감 생성에 실패했습니다.\n\n실패 항목: {failed_item}\n원인: {error}\n\n생성된 일감: {created_count}개\n\n부분적으로 생성된 일감은 JIRA에서 확인하실 수 있습니다." | [JIRA 열기], [확인] |
| **FOLDER_CREATION_PARTIAL** | 폴더 부분 생성 | "일부 폴더 생성에 실패했습니다.\n\n성공: {success_count}개\n실패: {failed_count}개\n\n실패한 폴더:\n{failed_folders}\n\n계속 진행하시겠습니까?" | [계속], [취소] |
| **MERGE_VALIDATION_FAILED** | 병합 데이터 검증 실패 | "테이블 병합 검증에 실패했습니다.\n\n문제:\n{validation_errors}\n\n소스 파일을 확인하고 다시 시도해주세요." | [확인] |
| **HOLIDAY_API_FAILED** | 공휴일 API 실패 | "공휴일 데이터를 가져올 수 없습니다.\n\n로컬 공휴일 데이터로 계속 진행합니다.\n\n마지막 업데이트: {last_update}" | [확인] |

### 14.3 에러 표시 방법

**UI 표시**:
- **Toast 알림**: 경미한 에러 (자동 복구 가능)
- **다이얼로그**: 중요한 에러 (사용자 액션 필요)
- **인라인 메시지**: 입력 필드 검증 에러

**로그 기록**:
- 모든 에러는 `logs/sebastian.log`에 기록
- 형식: `[YYYY-MM-DD HH:MM:SS] [ERROR] [에러코드] 상세 메시지`

**예시**:
```
[2025-01-15 14:23:45] [ERROR] [API_AUTH_FAILED] JIRA authentication failed: Invalid API token
[2025-01-15 14:25:10] [ERROR] [VALIDATION_MISSING_FILES] Missing language files: ['PT-BR', 'RU']
```

### 14.4 에러 복구 전략

| 에러 유형 | 복구 전략 | 사용자 안내 |
|----------|----------|------------|
| **일시적 에러** (네트워크, 타임아웃) | 자동 재시도 (최대 3회) | "재시도 중... ({count}/3)" |
| **영구적 에러** (인증, 권한) | 설정 화면으로 안내 | "설정을 확인해주세요" + [설정 열기] |
| **데이터 에러** (검증 실패) | 작업 중단, 상세 정보 제공 | 검증 오류 목록 표시 |
| **부분 실패** (JIRA 생성 중 일부 실패) | 성공/실패 분리 보고 | 성공 항목 유지, 실패 항목 안내 |

---

## 부록 A: 참조 문서

- `sebastian-prd-master.md`: 마스터 문서
- `sebastian-prd-scheduler.md`: 일정 관리 기능
- `sebastian-prd-table-merge.md`: 테이블 병합 기능
- `sebastian-prd-messaging.md`: 메시지 기능
- `sebastian-prd-l10n-admin.md`: 관리자 기능

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 0.1 | 2025-11-19 | 초안 작성 - 라운드 1 답변 반영 |
| 1.0 | 2025-11-20 | 라운드 1-4 답변 반영, 전체 재작성 |
| 1.1 | 2025-11-25 | 검증 완료, 승인 |
| 1.2 | 2025-11-26 | Draft 재전환, L10N 스키마 추가, FBGL CDN/APP 분리, 에러 메시지 표준 추가, 공휴일 관리 정책 확정 |
| 1.3 | 2025-11-27 | 버전 동기화 (master.md와 일치) |
| 1.4 | 2025-11-27 | PRD 정제 라운드 1: projects.json 필수 항목 및 검증 규칙 추가, offset_days 유효 범위 명시 |
| 1.5 | 2025-11-27 | PRD 정제 라운드 2: 초기 설정 건너뛰기 후 UI 동작 명확화 (12.4절) |
| 1.6 | 2025-11-27 | UI 중복 제거: ASCII 화면을 wireframes.md 참조로 교체 (2.1, 3.1, 12.2절) |
