# Sebastian 구성 가이드

**목적**: Sebastian을 실제 운영 환경에 맞게 구성하기 위한 가이드

---

## 🔍 하드코딩된 값 목록 및 설정 방법

Sebastian 코드에는 테스트 및 예시를 위한 하드코딩된 값들이 있습니다.
실제 환경에 맞게 다음 값들을 **확인 및 수정**해야 합니다.

---

## 1. JIRA 설정

### 1.1 JIRA 베이스 URL

**현재 하드코딩된 값**:
- `https://wemade.atlassian.net`

**위치**:
- `src/auth_manager.py:79` (연결 테스트)
- `src/confluence_client.py:17` (Confluence 베이스 URL)
- `src/scheduler_tab.py:412` (JIRA Client 생성)

**질문**:
```
Q1. 귀하의 JIRA 인스턴스 URL은 무엇입니까?
   - 예: https://your-company.atlassian.net
   - 또는 on-premise: https://jira.your-company.com
A1: 하드코딩된 값과 동일합니다.
```

**수정 방법**:
1. 전역 상수로 추출 권장
2. `src/config_manager.py`에 `jira_base_url` 필드 추가
3. 설정 화면에서 입력 받기
답변: 수정 방법에 따라 입력할 수 있기를 희망합니다.
---

### 1.2 JIRA Custom Field ID

**현재 하드코딩된 값**:
- `customfield_10569` - Start Date
- `customfield_10570` - Due Date

**위치**:
- `src/jira_client.py:113-114`

**질문**:
```
Q2. JIRA의 Start Date와 Due Date Custom Field ID를 확인해주세요.

확인 방법:
1. JIRA에서 REST API 호출:
   curl -u email:api_token https://wemade.atlassian.net/rest/api/3/field | grep -i "start\|due"

2. 응답에서 "Start Date"와 "Due Date"의 `id` 값을 찾으세요.
   예: "id": "customfield_10569"

Q2-1. Start Date Custom Field ID: ________________
Q2-2. Due Date Custom Field ID: ________________
A: 현재 설정된 값이 정확합니다.
```

**수정 방법**:
- `src/jira_client.py` 상단에 상수로 정의
```python
JIRA_START_DATE_FIELD = "customfield_10569"  # 실제 값으로 교체
JIRA_DUE_DATE_FIELD = "customfield_10570"    # 실제 값으로 교체
```

---

### 1.3 JIRA Issue Type ID

**현재 하드코딩된 값**:
- `10000` - Epic
- `10637` - Task
- `10638` - Subtask

**위치**:
- `src/jira_client.py:36, 59, 83`

**질문**:
```
Q3. JIRA의 Issue Type ID를 확인해주세요.

확인 방법:
curl -u email:api_token https://wemade.atlassian.net/rest/api/3/issuetype

Q3-1. Epic Issue Type ID: ________________
Q3-2. Task Issue Type ID: ________________
Q3-3. Subtask Issue Type ID: ________________
A: 현재 설정된 값이 정확합니다.
```

**수정 방법**:
```python
JIRA_EPIC_TYPE_ID = "10000"     # 실제 값으로 교체
JIRA_TASK_TYPE_ID = "10637"     # 실제 값으로 교체
JIRA_SUBTASK_TYPE_ID = "10638"  # 실제 값으로 교체
```

---

### 1.4 JIRA Project Key

**현재 하드코딩된 값** (projects.json):
- `L10NM4` - M4GL 프로젝트
- `L10NNC` - NCGL 프로젝트
- `L10NFB` - FBGL 프로젝트
- `L10NLY` - LYGL 프로젝트

**위치**:
- `src/project_manager.py:24, 99, 107, 123`

**질문**:
```
Q4. 각 프로젝트의 실제 JIRA Project Key를 확인해주세요.

Q4-1. M4GL JIRA Project Key: ________________ (현재: L10NM4)
Q4-2. NCGL JIRA Project Key: ________________ (현재: L10NNC)
Q4-3. FBGL JIRA Project Key: ________________ (현재: L10NFB)
Q4-4. LYGL JIRA Project Key: ________________ (현재: L10NLY)
A: 4개 모두 현재 설정된 값이 정확합니다.
```

**수정 방법**:
- 앱 첫 실행 시 자동 생성되는 `%APPDATA%/Sebastian/projects.json` 파일 수정
- 또는 설정 화면에서 수정 (향후 구현 시)

---

## 2. Confluence 설정

### 2.1 Confluence 페이지 ID

**현재 하드코딩된 값**:
- `190906620` - Daily Task 페이지
- `191332855` - Daily Scrum 페이지

**위치**:
- `src/admin_tab.py:129, 175`

**질문**:
```
Q5. Confluence 페이지 ID를 확인해주세요.
A5. 현재 설정된 값이 정확합니다.
확인 방법:
1. Confluence에서 해당 페이지 열기
2. URL에서 pageId 확인
   예: https://wemade.atlassian.net/wiki/spaces/L10N/pages/190906620/Daily+Task
   → 190906620이 페이지 ID

또는 REST API:
curl -u email:api_token "https://wemade.atlassian.net/wiki/rest/api/content?title=Daily Task&spaceKey=L10N"

Q5-1. Daily Task 페이지 ID: ________________ (현재: 190906620)
Q5-2. Daily Scrum 페이지 ID: ________________ (현재: 191332855)
```

**수정 방법**:
- `src/config_manager.py`에 필드 추가
```python
"confluence_pages": {
    "daily_task": "190906620",
    "daily_scrum": "191332855"
}
```
- `src/admin_tab.py`에서 config에서 로드하도록 수정

---

## 3. Slack 설정

### 3.1 Slack 채널 ID

**현재 하드코딩된 값**:
- `C06BZA056E4` - Admin 공통 채널 (Daily Task/Scrum/Slack MSG)
- `C06BZA056E5` - NCGL 채널
- `C06BZA056E6` - FBGL 채널
- `C06BZA056E7` - LYGL 채널

**위치**:
- `src/admin_tab.py:208` (Admin 채널)
- `src/project_manager.py:104, 120, 128` (프로젝트별 채널)

**질문**:
```
Q6. Slack 채널 ID를 확인해주세요.
A6: 이는 이후 앱에서 수정할 수 있기를 희망하며, L10n Admin 공통 채널의 ID는 C06BZA056E4이 정확합니다. 나머지 3개 채널은 앱 구동 후 설정하겠습니다. 우선 동일하게 C06BZA056E4로 설정 바랍니다.
확인 방법:
1. Slack에서 채널 열기
2. 채널 이름 클릭 → "통합" 탭
3. 하단에 "채널 ID" 표시
   예: C06BZA056E4

또는 Slack API:
curl -H "Authorization: Bearer xoxb-your-token" \
  "https://slack.com/api/conversations.list"

Q6-1. L10N Admin 공통 채널 ID: ________________ (현재: C06BZA056E4)
Q6-2. NCGL 채널 ID: ________________ (현재: C06BZA056E5)
Q6-3. FBGL 채널 ID: ________________ (현재: C06BZA056E6)
Q6-4. LYGL 채널 ID: ________________ (현재: C06BZA056E7)
```

**수정 방법**:
- `%APPDATA%/Sebastian/config.json` 파일 수정:
```json
{
  "admin_slack_channel": "C06BZA056E4"
}
```
- `%APPDATA%/Sebastian/projects.json` 각 프로젝트 섹션 수정:
```json
{
  "M4GL": {
    "slack_channel": "실제_채널_ID"
  }
}
```

---

## 4. NAS 경로

**현재 하드코딩된 값**:
- `\\nas\m4gl\l10n\` - M4GL NAS 경로
- `\\nas\ncgl\l10n\` - NCGL NAS 경로
- `\\nas\fbgl\l10n\` - FBGL NAS 경로
- `\\nas\lygl\l10n\` - LYGL NAS 경로

**위치**:
- `src/project_manager.py` (각 프로젝트 설정)

**질문**:
```
Q7. 각 프로젝트의 실제 NAS 경로를 확인해주세요.

Q7-1. M4GL NAS 경로: _\\172.17.255.21\nas_wm\WM_L10n팀\01_MIR4\_______________ (현재: \\nas\m4gl\l10n\)
Q7-2. NCGL NAS 경로: _\\172.17.255.21\nas_wm\WM_L10n팀\02_NIGHT CROWS\_______________ (현재: \\nas\ncgl\l10n\)
Q7-3. FBGL NAS 경로: _\\172.17.255.21\nas_wm\WM_L10n팀\03_FANTASTIC BASEBALL\_______________ (현재: \\nas\fbgl\l10n\)
Q7-4. LYGL NAS 경로: _\\172.17.255.21\nas_wm\WM_L10n팀\07_LEGEND OF YMIR\_______________ (현재: \\nas\lygl\l10n\)

```

**수정 방법**:
- `%APPDATA%/Sebastian/projects.json` 파일 수정
- 설정 화면에서 수정 (향후)

---

## 5. JIRA Account ID (담당자)

**참고**: PRD에 정의된 Account ID는 **예시**입니다.

**위치**:
- PRD `sebastian-prd-shared.md` Line 567-873 (L10N 프로젝트 설정)
- 현재 코드에는 하드코딩되지 **않음** (ProjectManager에서 projects.json 로드)

**질문**:
```
Q8. JIRA 담당자 Account ID를 확인해주세요.
A8: 현재 설정된 ID가 정확합니다.
확인 방법:
curl -u email:api_token \
  "https://wemade.atlassian.net/rest/api/3/user/search?query=사용자이름"

Q8-1. 일반 담당자 Account ID: ________________
      (현재 PRD: 712020:1a1a9943-9787-44e1-b2da-d4f558df471e)

Q8-2. LY 담당자 Account ID: ________________
      (현재 PRD: 62b57632f38b4dcf73daedb2)

Q8-3. 견적서 담당자 Account ID: ________________
      (현재 PRD: 617f7523f485cd0068077192)
```

**수정 방법**:
- `%APPDATA%/Sebastian/projects.json`의 L10N 프로젝트 섹션 수정
- 해당 정보는 **L10N 월간 정산** 기능에서만 사용됨

---

## 6. 테스트 파일에만 존재하는 Mock

**다음 파일들은 테스트 전용**이므로 수정 불필요:
- `tests/*.py` - 모든 테스트 파일
- Mock API 응답
- 임시 경로 (tmp_path)

---

## 📝 구성 체크리스트

실제 배포 전 다음을 확인하세요:

### 필수 확인 (JIRA 기능 사용 시):
- [x] Q1: JIRA 베이스 URL 확인 - **검증 완료** (wemade.atlassian.net)
- [x] Q2: Start/Due Date Custom Field ID 확인 - **검증 완료**
- [x] Q3: Epic/Task/Subtask Issue Type ID 확인 - **검증 완료**
- [x] Q4: 각 프로젝트 JIRA Key 확인 - **검증 완료**

### 필수 확인 (L10N Admin 사용 시):
- [x] Q5: Confluence 페이지 ID 확인 - **검증 완료**
- [x] Q6: Slack 채널 ID 확인 및 통일 - **완료** (모두 C06BZA056E4)

### 필수 확인 (폴더 생성 사용 시):
- [x] Q7: NAS 경로 확인 및 업데이트 - **완료** (실제 NAS 경로 적용)

### 선택 확인 (L10N 월간 정산 사용 시):
- [x] Q8: JIRA Account ID 확인 - **검증 완료**

---

## 🔧 수정 우선순위

### 즉시 수정 필요 (앱 실행 전):
1. **config.json 생성 시 기본값**:
   - `src/config_manager.py` - JIRA/Confluence 베이스 URL

### 앱 첫 실행 후 수정 가능:
2. **projects.json** (`%APPDATA%/Sebastian/projects.json`):
   - JIRA Project Key
   - NAS 경로
   - Slack 채널 ID

3. **config.json** (`%APPDATA%/Sebastian/config.json`):
   - Confluence 페이지 ID
   - Admin Slack 채널 ID

### 실제 사용 시 확인:
4. **JIRA Custom Field & Issue Type ID**:
   - 첫 JIRA 생성 시도 시 실패하면 확인

---

## 📋 권장 구성 프로세스

### 단계 1: 개발 환경 확인
```bash
# JIRA 연결 테스트
curl -u your-email:your-token https://wemade.atlassian.net/rest/api/3/myself

# Custom Field 확인
curl -u your-email:your-token https://wemade.atlassian.net/rest/api/3/field

# Issue Type 확인
curl -u your-email:your-token https://wemade.atlassian.net/rest/api/3/issuetype
```

### 단계 2: Sebastian 앱 설정
1. Sebastian 첫 실행
2. 초기 설정 마법사에서 인증 정보 입력
3. `%APPDATA%/Sebastian/` 폴더 확인
4. `config.json`, `projects.json` 수정

### 단계 3: 검증
1. 일정 계산 테스트 (오프라인 가능)
2. JIRA 연결 테스트 (설정 > 인증 정보 > [테스트])
3. 실제 JIRA 생성 테스트 (테스트 프로젝트 권장)
4. 실패 시 Custom Field/Issue Type ID 확인

---

## ⚠️ 주의사항

### 하드코딩 값이 문제가 되는 경우:
- **JIRA Custom Field ID가 다를 때**: 일감 생성 실패
- **Issue Type ID가 다를 때**: 일감 생성 실패
- **Confluence 페이지 ID가 다를 때**: Daily Task/Scrum 실패
- **Slack 채널 ID가 다를 때**: 메시지 발송 실패

### 하드코딩 값이 문제가 안 되는 경우:
- **베이스 URL만 다를 때**: 코드 1곳만 수정하면 됨
- **프로젝트 Key가 다를 때**: projects.json만 수정하면 됨
- **NAS 경로가 다를 때**: projects.json만 수정하면 됨

---

## 🎯 향후 개선 사항

### Phase 11 (선택적):
1. **설정 화면 확장**:
   - JIRA 베이스 URL 입력 필드
   - Custom Field ID 입력 필드
   - Confluence 페이지 ID 입력 필드

2. **자동 감지**:
   - JIRA API로 Custom Field 자동 검색
   - Issue Type 자동 검색

3. **검증 기능**:
   - 설정 저장 시 ID 유효성 검증
   - 연결 테스트 시 Custom Field 존재 확인

---

## 📞 문제 해결

### JIRA 일감 생성 실패 시:
1. 에러 메시지 확인
2. `customfield_10569/10570`이 에러에 포함되면 → Q2 확인
3. `10000/10637/10638`이 에러에 포함되면 → Q3 확인
4. 프로젝트 Key 에러 → Q4 확인

### Confluence 업데이트 실패 시:
1. 페이지 ID 확인 → Q5
2. 권한 확인 (페이지 편집 권한 필요)

### Slack 메시지 발송 실패 시:
1. 채널 ID 확인 → Q6
2. Bot 권한 확인 (chat:write)

---

## ✅ 구성 완료 후 최종 체크

- [ ] JIRA 일감 생성 성공
- [ ] 폴더 생성 성공
- [ ] 메시지 생성 성공
- [ ] Daily Task 실행 성공
- [ ] Daily Scrum 실행 성공
- [ ] Slack MSG 발송 성공

**모든 항목이 체크되면 Sebastian 구성 완료!** 🎉
