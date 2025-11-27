# Sebastian PRD - UI Wireframes

**문서 버전**: 1.6
**최종 수정**: 2025-11-27
**상태**: Approved

---

## 목차

1. [메인 윈도우](#1-메인-윈도우)
2. [설정 화면](#2-설정-화면)
3. [일정/메시지 탭](#3-일정메시지-탭)
   - 3.1 일정 계산기 입력 (M4GL/NCGL/FBGL/LYGL/L10N)
   - 3.2 일정 계산 결과
   - 3.3 JIRA 일감 생성 진행
   - 3.4 JIRA 일감 생성 완료
   - 3.5 폴더 생성 미리보기
   - 3.6 폴더 생성 완료
   - 3.7 메시지 출력 (헤즈업)
   - 3.8 메시지 출력 (HO)
   - 3.9 L10N 일정 계산 결과
4. [테이블 병합 탭](#4-테이블-병합-탭)
   - 4.1 M4GL DIALOGUE 병합
   - 4.2 M4GL STRING 병합
   - 4.3 NC/GL 병합
   - 4.4 LY/GL 병합
   - 4.5 LY/GL 분할
5. [관리 탭](#5-관리-탭)
   - 5.1 관리 대시보드
   - 5.2 Daily Task 실행
   - 5.3 Daily Scrum 실행
   - 5.4 Slack MSG 실행
6. [공통 다이얼로그](#6-공통-다이얼로그)
   - 6.1 초기 설정 마법사
   - 6.2 템플릿 편집 다이얼로그
   - 6.3 확인 다이얼로그
   - 6.4 에러 다이얼로그

---

## 1. 메인 윈도우

### 1.1 화면 설명

Sebastian 앱의 메인 윈도우입니다. 3개의 탭(일정/메시지, 테이블 병합, 관리)으로 구성되며, 하단에 버전 정보와 설정 버튼이 있습니다.

**주요 구성**:
- 상단: 탭 버튼 (3개)
- 중앙: 탭 콘텐츠 영역
- 하단: 버전 정보, 설정 버튼

### 1.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  Sebastian                                          [_][□][X]│
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐┌──────────────┐┌──────────────┐           │
│  │ 일정/메시지  ││ 테이블 병합  ││   관리       │           │
│  └──────────────┘└──────────────┘└──────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                                                               │
│                                                               │
│                                                               │
│                    [탭 콘텐츠 영역]                           │
│                                                               │
│                                                               │
│                                                               │
│                                                               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Sebastian v1.0.0                           [⚙ 설정]         │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Stitch 프롬프트

```
Create a Windows desktop application main window with the following specifications:

Window:
- Size: 900px width × 700px height
- Background: #F5F5F5 (light gray)
- Title bar: "Sebastian" with standard Windows controls (minimize, maximize, close)
- Border: 1px solid #CCCCCC

Tab Bar (Top):
- Position: 0px top, full width
- Height: 50px
- Background: #FFFFFF (white)
- Border bottom: 2px solid #E0E0E0

Tab Buttons:
- Count: 3 tabs
- Size: 150px width × 45px height each
- Spacing: 5px between tabs
- Font: Malgun Gothic, 14px, medium weight
- Colors:
  * Active tab: Background #2196F3 (blue), Text #FFFFFF (white)
  * Inactive tab: Background #F5F5F5, Text #666666
- Border radius: 4px top corners
- Hover effect: Background #E3F2FD (light blue) for inactive tabs

Tab Labels:
- Tab 1: "일정/메시지"
- Tab 2: "테이블 병합"
- Tab 3: "관리"

Content Area:
- Position: Below tab bar (50px from top)
- Size: Full width × 600px height
- Background: #FFFFFF (white)
- Padding: 20px
- Border: none

Footer:
- Position: Bottom of window
- Height: 50px
- Background: #F5F5F5 (light gray)
- Border top: 1px solid #E0E0E0
- Layout: Horizontal flex

Footer Elements:
- Left: Version text "Sebastian v1.0.0"
  * Font: Malgun Gothic, 11px, regular
  * Color: #999999
  * Padding left: 20px
- Right: Settings button "⚙ 설정"
  * Size: 80px width × 32px height
  * Background: #FFFFFF (white)
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 12px
  * Color: #333333
  * Padding right: 20px
  * Hover: Background #E3F2FD, Border #2196F3
```

---

## 2. 설정 화면

### 2.1 화면 설명

모든 설정을 관리하는 단일 화면입니다. 스크롤 가능하며, 섹션별로 구분되어 있습니다.

**주요 섹션**:
1. 인증 정보 (JIRA, Slack, Confluence)
2. 프로젝트 설정 (드롭다운으로 프로젝트 선택)
3. 공휴일 관리
4. 템플릿 변수
5. 메시지 템플릿
6. 스케줄 설정

### 2.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  설정                                           [저장] [취소]│
├─────────────────────────────────────────────────────────────┤
│  ▼ 인증 정보                                                 │
│     JIRA API Token:     [**********]           [테스트]      │
│     JIRA Email:         [user@example.com]                   │
│     Slack OAuth Token:  [**********]           [테스트]      │
│     Confluence Token:   [**********]           [테스트]      │
│     Confluence Email:   [user@example.com]                   │
│                                                               │
│  ▼ 프로젝트 설정                                             │
│     프로젝트 선택:      [M4GL ▼]                             │
│     JIRA Project Key:   [L10NM4]                             │
│     NAS 기본 경로:      [\\nas\m4gl\l10n\...]   [찾아보기]   │
│     Slack 채널 ID:      [C06BZA056E4]                        │
│                                                               │
│  ▼ 공휴일 관리                                               │
│     [가져오기]  [내보내기]                                    │
│     2025년: 15개 공휴일 등록됨                               │
│                                                               │
│  ▼ 템플릿 변수                                               │
│     시스템 변수: 14개 정의됨                                 │
│     사용자 변수: [추가]                                       │
│                                                               │
│  ▼ 메시지 템플릿                                             │
│     프로젝트: [M4GL ▼]  템플릿: [헤즈업 ▼]  [편집]          │
│                                                               │
│  ▼ 스케줄 설정                                               │
│     Daily Task:     [✓] 매월 10일 09:00                     │
│     Daily Scrum:    [✓] 매일 09:00 (평일)                   │
│     Slack MSG:      [✓] 매일 07:00 (평일)                   │
│     Admin 채널 ID:  [C06BZA056E4]                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Stitch 프롬프트

```
Create a settings dialog window with scrollable content:

Window:
- Size: 800px width × 600px height
- Background: #FFFFFF (white)
- Title: "설정"
- Modal dialog (centered on parent window)
- Border: none (standard dialog shadow)

Header:
- Position: Top, full width
- Height: 60px
- Background: #FFFFFF
- Border bottom: 1px solid #E0E0E0
- Layout: Horizontal flex

Header Elements:
- Left: Title "설정"
  * Font: Malgun Gothic, 18px, bold
  * Color: #333333
  * Padding left: 24px
- Right: Action buttons
  * [저장] button: 80px × 36px, Background #2196F3, Text #FFFFFF, Border radius 4px
  * [취소] button: 80px × 36px, Background #FFFFFF, Text #666666, Border 1px solid #CCCCCC
  * Spacing: 8px between buttons
  * Padding right: 24px

Content Area:
- Position: Below header
- Size: Full width × 520px height
- Overflow: Auto scroll (vertical)
- Padding: 24px

Section Style (repeating for each section):
- Margin bottom: 32px
- Background: #F9F9F9
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 20px

Section Header:
- Font: Malgun Gothic, 14px, bold
- Color: #333333
- Margin bottom: 16px
- Icon: ▼ (collapsible indicator), Color #2196F3

Section: 인증 정보
- Fields (5 rows):
  * Label: 120px width, right-aligned, Color #666666
  * Input: 300px width, 32px height, Border 1px solid #CCCCCC
  * Masked input: Show **********, Font monospace
  * Test button: 80px × 32px, Background #FFFFFF, Border 1px solid #2196F3, Color #2196F3
  * Spacing: 12px between rows

Section: 프로젝트 설정
- Fields:
  * Dropdown: 200px width, 32px height
  * Text inputs: 300px width, 32px height
  * Browse button: 80px × 32px

Section: 공휴일 관리
- Buttons: 100px × 32px each, 8px spacing
- Status text: Font 12px, Color #666666

Section: 템플릿 변수
- Text + Button layout
- Add button: 80px × 32px, Background #2196F3, Color #FFFFFF

Section: 메시지 템플릿
- Dropdowns: 150px width each, 8px spacing
- Edit button: 80px × 32px

Section: 스케줄 설정
- Checkbox: 16px × 16px, Color #2196F3 when checked
- Label: Font 12px, Color #333333
- Spacing: 12px between items

Colors:
- Primary: #2196F3 (blue)
- Background: #FFFFFF (white)
- Secondary BG: #F9F9F9
- Border: #E0E0E0, #CCCCCC
- Text: #333333 (main), #666666 (secondary), #999999 (disabled)
- Success: #4CAF50 (green)
- Error: #F44336 (red)
```

---

## 3. 일정/메시지 탭

### 3.1 일정 계산기 입력

#### 3.1.1 화면 설명

사용자가 프로젝트와 업데이트일을 입력하여 일정을 계산하는 화면입니다.

**입력 요소**:
- 프로젝트 드롭다운
- 업데이트일 또는 정산 마감일 날짜 선택기 (프로젝트에 따라 레이블 변경)
- 마일스톤 입력 (NCGL만 표시)
- 지역 선택 (FBGL만 표시)
- 배포 유형 선택 (FBGL만 표시)
- 계산 버튼

**동적 필드**:
- NCGL 선택 시: 마일스톤 입력 표시
- FBGL 선택 시: 지역(GL/JP), 배포 유형(CDN/APP) 선택 표시
- L10N 선택 시: "업데이트일" → "정산 마감일"로 레이블 변경

#### 3.1.2 ASCII 와이어프레임

**기본 화면 (M4GL/LYGL)**:
```
┌─────────────────────────────────────────────────────────────┐
│  자동 일정 계산기                                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  프로젝트:      [M4GL ▼]                                     │
│                                                               │
│  업데이트일:    [2025-01-15]  [📅]                           │
│                                                               │
│                        [계산]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**NCGL 선택 시**:
```
┌─────────────────────────────────────────────────────────────┐
│  자동 일정 계산기                                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  프로젝트:      [NCGL ▼]                                     │
│                                                               │
│  업데이트일:    [2025-01-15]  [📅]                           │
│                                                               │
│  마일스톤:      [M42]                                        │
│                                                               │
│                        [계산]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**FBGL 선택 시**:
```
┌─────────────────────────────────────────────────────────────┐
│  자동 일정 계산기                                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  프로젝트:      [FBGL ▼]                                     │
│                                                               │
│  업데이트일:    [2025-01-15]  [📅]                           │
│                                                               │
│  지역:          [GL ▼]  (GL/JP 선택)                         │
│                                                               │
│  배포 유형:     [CDN ▼]  (CDN/APP 선택)                      │
│                                                               │
│  지원 언어:     EN, CT  (지역에 따라 자동 표시)              │
│                                                               │
│                        [계산]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**L10N 선택 시**:
```
┌─────────────────────────────────────────────────────────────┐
│  자동 일정 계산기                                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  프로젝트:      [L10N ▼]                                     │
│                                                               │
│  정산 마감일:   [2025-11-13]  [📅]                           │
│                                                               │
│                        [계산]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.3 Stitch 프롬프트

```
Create a scheduler input form:

Container:
- Size: 600px width × 300px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px

Title:
- Text: "자동 일정 계산기"
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 24px
- Border bottom: 2px solid #2196F3
- Padding bottom: 12px

Form Fields (vertical layout, 16px spacing):

Field 1 - 프로젝트:
- Label: "프로젝트:"
  * Width: 120px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Align: Right
- Dropdown:
  * Width: 200px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 13px
  * Background: #FFFFFF
  * Hover: Border #2196F3
  * Options: M4GL, NCGL, FBGL, LYGL, L10N

Field 2 - 업데이트일:
- Label: "업데이트일:"
  * Same style as Field 1 label
- Date picker:
  * Width: 200px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 13px
  * Calendar icon: Right side, 24×24px, Color #2196F3

Field 3 - 마일스톤 (conditional, NCGL only):
- Label: "마일스톤:"
  * Same style as Field 1 label
- Text input:
  * Width: 200px
  * Height: 36px
  * Placeholder: "M42"
  * Visible only when NCGL selected

Field 4 - 지역 (conditional, FBGL only):
- Label: "지역:"
  * Same style as Field 1 label
- Dropdown:
  * Width: 200px
  * Height: 36px
  * Options: GL, JP
  * Visible only when FBGL selected

Field 5 - 배포 유형 (conditional, FBGL only):
- Label: "배포 유형:"
  * Same style as Field 1 label
- Dropdown:
  * Width: 200px
  * Height: 36px
  * Options: CDN, APP
  * Visible only when FBGL selected

Field 6 - 지원 언어 (conditional, FBGL only):
- Label: "지원 언어:"
  * Same style as Field 1 label
- Display text (read-only):
  * Width: 200px
  * Font: Malgun Gothic, 13px
  * Color: #999999
  * Content: "EN, CT" (GL) or "EN, JA" (JP)
  * Visible only when FBGL selected

Calculate Button:
- Position: Center aligned
- Size: 120px width × 40px height
- Background: #2196F3 (blue)
- Text: "계산"
- Font: Malgun Gothic, 14px, bold
- Color: #FFFFFF (white)
- Border: none
- Border radius: 4px
- Margin top: 24px
- Hover: Background #1976D2 (darker blue)
- Active: Background #0D47A1 (darkest blue)

Layout:
- All fields use horizontal flex layout (label + input)
- Label width: 120px (fixed)
- Input area starts at 140px from left (20px gap)
- Vertical spacing: 16px between fields
```

---

### 3.2 일정 계산 결과

#### 3.2.1 화면 설명

계산된 일정을 테이블 형식으로 표시하고, JIRA 생성/폴더 생성/메시지 생성 기능을 제공합니다.

**주요 요소**:
- 프로젝트 및 업데이트일 헤더
- 일정 테이블 (마일스톤별 시작일/종료일)
- 액션 버튼 4개

#### 3.2.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  M4GL 250115 업데이트 일정                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 마일스톤           │ 시작일     │ 종료일       │      │   │
│  ├───────────────────────────────────────────────────────┤   │
│  │ 헤즈업             │ 01/08 09:30│ 01/08 18:30  │      │   │
│  │ REGULAR HO&HB      │ 01/08 18:00│ 01/09 11:00  │      │   │
│  │ REGULAR DELIVERY   │ 01/10 17:00│ 01/10 17:00  │      │   │
│  │ EXTRA0 HO&HB       │ 01/10 18:00│ 01/12 11:00  │      │   │
│  │ EXTRA0 DELIVERY    │ 01/13 17:00│ 01/13 17:00  │      │   │
│  │ EXTRA1 HO&HB       │ 01/13 18:00│ 01/14 11:00  │      │   │
│  │ EXTRA1 DELIVERY    │ 01/14 17:00│ 01/14 17:00  │      │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  [JIRA 일감 생성] [폴더 생성] [헤즈업] [HO ▼]                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 Stitch 프롬프트

```
Create a schedule result display with action buttons:

Container:
- Size: 700px width × 500px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px

Title:
- Text: "M4GL 250115 업데이트 일정" (dynamic)
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 20px
- Border bottom: 2px solid #2196F3
- Padding bottom: 12px

Table:
- Width: 100% (652px)
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Cell padding: 12px

Table Header:
- Background: #F5F5F5 (light gray)
- Border bottom: 2px solid #2196F3
- Font: Malgun Gothic, 13px, bold
- Color: #333333
- Columns:
  * 마일스톤: 280px width
  * 시작일: 180px width
  * 종료일: 180px width

Table Rows (7 rows):
- Background: #FFFFFF
- Border bottom: 1px solid #E0E0E0
- Font: Malgun Gothic, 12px, regular
- Color: #666666
- Hover: Background #F9F9F9
- Height: 40px

Row Data:
1. 헤즈업 | 01/08 09:30 | 01/08 18:30
2. REGULAR HO&HB | 01/08 18:00 | 01/09 11:00
3. REGULAR DELIVERY | 01/10 17:00 | 01/10 17:00
4. EXTRA0 HO&HB | 01/10 18:00 | 01/12 11:00
5. EXTRA0 DELIVERY | 01/13 17:00 | 01/13 17:00
6. EXTRA1 HO&HB | 01/13 18:00 | 01/14 11:00
7. EXTRA1 DELIVERY | 01/14 17:00 | 01/14 17:00

Action Buttons (horizontal layout):
- Position: Bottom of container
- Margin top: 24px
- Spacing: 12px between buttons

Button Styles:
1. [JIRA 일감 생성]:
   * Size: 140px × 40px
   * Background: #2196F3 (primary blue)
   * Color: #FFFFFF
   * Border: none
   * Border radius: 4px
   * Font: Malgun Gothic, 13px, bold

2. [폴더 생성]:
   * Size: 120px × 40px
   * Background: #4CAF50 (green)
   * Color: #FFFFFF
   * Border: none
   * Border radius: 4px
   * Font: Malgun Gothic, 13px, bold

3. [헤즈업]:
   * Size: 100px × 40px
   * Background: #FF9800 (orange)
   * Color: #FFFFFF
   * Border: none
   * Border radius: 4px
   * Font: Malgun Gothic, 13px, bold

4. [HO ▼]:
   * Size: 100px × 40px
   * Background: #9C27B0 (purple)
   * Color: #FFFFFF
   * Border: none
   * Border radius: 4px
   * Font: Malgun Gothic, 13px, bold
   * Dropdown indicator: ▼ on right

Hover Effects:
- All buttons: Brightness -10%
- Shadow: 0 2px 4px rgba(0,0,0,0.2)
```

---

### 3.3 JIRA 일감 생성 진행

#### 3.3.1 화면 설명

JIRA 일감 생성 중 진행 상황을 실시간으로 표시합니다.

**주요 요소**:
- 진행률 표시
- 현재 생성 중인 일감 정보
- 생성 완료된 일감 목록

#### 3.3.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  JIRA 일감 생성 중...                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  진행률: ████████████░░░░░░░░ 60%                            │
│                                                               │
│  현재: Task 생성 중 - "250115 업데이트 REGULAR"              │
│                                                               │
│  ✓ Epic 생성 완료: L10NM4-1234                               │
│  ✓ Task 생성 완료: L10NM4-1235 (헤즈업)                      │
│  ● Task 생성 중:   L10NM4-1236 (REGULAR)                     │
│  ○ 대기 중:        Task (EXTRA0)                             │
│  ○ 대기 중:        Task (EXTRA1)                             │
│                                                               │
│  생성된 일감: 2/11                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3.3 Stitch 프롬프트

```
Create a JIRA issue creation progress dialog:

Container:
- Size: 600px width × 400px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)

Title:
- Text: "JIRA 일감 생성 중..."
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 24px

Progress Bar:
- Width: 100% (552px)
- Height: 24px
- Background: #E0E0E0 (light gray)
- Border radius: 12px
- Margin bottom: 20px

Progress Fill:
- Background: Linear gradient #2196F3 to #1976D2
- Height: 100% of progress bar
- Border radius: 12px
- Animation: Smooth transition, 300ms
- Width: 60% (example - dynamic)

Progress Text:
- Position: Center of progress bar
- Font: Malgun Gothic, 12px, bold
- Color: #FFFFFF
- Text: "60%" (dynamic)

Current Task:
- Margin bottom: 20px
- Font: Malgun Gothic, 13px, medium
- Color: #333333
- Text: "현재: Task 생성 중 - '250115 업데이트 REGULAR'"

Task List:
- Margin bottom: 20px
- Max height: 200px
- Overflow: Auto scroll

Task Item (repeating):
- Height: 32px
- Font: Malgun Gothic, 12px
- Padding: 4px 0
- Layout: Icon + Text

Status Icons:
- ✓ (Complete): Color #4CAF50 (green), Size 16×16px
- ● (In Progress): Color #FF9800 (orange), Size 16×16px, Pulsing animation
- ○ (Pending): Color #CCCCCC (gray), Size 16×16px

Task Text:
- Color:
  * Complete: #666666
  * In Progress: #333333 (bold)
  * Pending: #999999
- Spacing: 8px left margin from icon

Summary Footer:
- Position: Bottom
- Font: Malgun Gothic, 12px
- Color: #666666
- Text: "생성된 일감: 2/11" (dynamic)

Colors:
- Primary: #2196F3 (blue)
- Success: #4CAF50 (green)
- In Progress: #FF9800 (orange)
- Pending: #CCCCCC (gray)
- Text: #333333, #666666, #999999
```

---

### 3.4 JIRA 일감 생성 완료

#### 3.4.1 화면 설명

JIRA 일감 생성이 완료된 후 결과를 표시합니다.

**주요 요소**:
- 생성 완료 메시지
- 생성된 일감 목록 (Key + Summary)
- JIRA에서 보기 버튼

#### 3.4.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  JIRA 일감 생성 완료                                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ Epic 생성됨: L10NM4-1234                                  │
│  ✓ Task 생성됨: L10NM4-1235 (헤즈업)                         │
│  ✓ Task 생성됨: L10NM4-1236 (REGULAR)                       │
│    ✓ Subtask: L10NM4-1237 (HO&HB)                           │
│    ✓ Subtask: L10NM4-1238 (DELIVERY)                        │
│  ✓ Task 생성됨: L10NM4-1239 (EXTRA0)                        │
│    ✓ Subtask: L10NM4-1240 (HO&HB)                           │
│    ✓ Subtask: L10NM4-1241 (DELIVERY)                        │
│  ✓ Task 생성됨: L10NM4-1242 (EXTRA1)                        │
│    ✓ Subtask: L10NM4-1243 (HO&HB)                           │
│    ✓ Subtask: L10NM4-1244 (DELIVERY)                        │
│                                                               │
│  총 11개 일감 생성 완료                                       │
│  소요 시간: 8초                                               │
│                                                               │
│                    [JIRA에서 보기]                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.4.3 Stitch 프롬프트

```
Create a JIRA issue creation success dialog:

Container:
- Size: 600px width × 500px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)

Title:
- Text: "JIRA 일감 생성 완료"
- Font: Malgun Gothic, 16px, bold
- Color: #4CAF50 (green)
- Margin bottom: 24px
- Icon: ✓ checkmark, Size 20×20px, Color #4CAF50

Issue List:
- Max height: 320px
- Overflow: Auto scroll
- Margin bottom: 20px

Issue Item (Epic):
- Layout: Icon + Text
- Icon: ✓, Size 16×16px, Color #4CAF50
- Text:
  * Font: Malgun Gothic, 13px, bold
  * Color: #333333
  * Format: "Epic 생성됨: L10NM4-1234"
- Margin bottom: 8px

Issue Item (Task):
- Same as Epic
- Indentation: 0px
- Format: "Task 생성됨: L10NM4-1235 (헤즈업)"

Issue Item (Subtask):
- Same as Task
- Indentation: 20px (left margin)
- Format: "Subtask: L10NM4-1237 (HO&HB)"
- Color: #666666 (slightly lighter)

Summary Section:
- Border top: 1px solid #E0E0E0
- Padding top: 16px
- Margin bottom: 20px

Summary Text:
- Font: Malgun Gothic, 13px, medium
- Color: #333333
- Lines:
  * "총 11개 일감 생성 완료"
  * "소요 시간: 8초"
- Spacing: 8px between lines

Action Button:
- Position: Center aligned
- Size: 160px width × 40px height
- Background: #2196F3 (blue)
- Text: "JIRA에서 보기"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF (white)
- Border: none
- Border radius: 4px
- Hover: Background #1976D2
- Icon: External link icon, 16×16px, right side

Colors:
- Success: #4CAF50 (green)
- Primary: #2196F3 (blue)
- Text: #333333, #666666
- Border: #E0E0E0
```

---

### 3.5 폴더 생성 미리보기

#### 3.5.1 화면 설명

NAS에 생성될 폴더 구조를 미리보기로 표시하고, 사용자 확인을 받습니다.

**주요 요소**:
- 생성 위치 경로
- 폴더 구조 트리
- 생성 예정 폴더 개수
- 생성/취소 버튼

#### 3.5.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  폴더 생성                                                   │
├─────────────────────────────────────────────────────────────┤
│  생성 위치: [\\nas\m4gl\l10n\]               [찾아보기]      │
├─────────────────────────────────────────────────────────────┤
│  미리보기:                                                   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 📁 250115_UPDATE/                                    │   │
│  │   📁 00_SOURCE/                                      │   │
│  │     📁 250108_REGULAR/                               │   │
│  │     📁 250110_EXTRA0/                                │   │
│  │     📁 250113_EXTRA1/                                │   │
│  │   📁 01_HB/                                          │   │
│  │     📁 250108_REGULAR/                               │   │
│  │     📁 250110_EXTRA0/                                │   │
│  │     📁 250113_EXTRA1/                                │   │
│  │   📁 02_REVIEW/                                      │   │
│  │     📁 250108_REGULAR/                               │   │
│  │     📁 250110_EXTRA0/                                │   │
│  │     📁 250113_EXTRA1/                                │   │
│  │   📁 03_DELIVERY/                                    │   │
│  │     📁 250108_REGULAR/                               │   │
│  │     📁 250110_EXTRA0/                                │   │
│  │     📁 250113_EXTRA1/                                │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  총 16개 폴더 생성 예정                                       │
│                                                               │
│                   [생성]      [취소]                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.5.3 Stitch 프롬프트

```
Create a folder creation preview dialog:

Container:
- Size: 600px width × 550px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px

Title:
- Text: "폴더 생성"
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 20px

Path Section:
- Layout: Label + Input + Button (horizontal)
- Margin bottom: 20px

Path Label:
- Text: "생성 위치:"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Width: 80px

Path Input:
- Width: 380px
- Height: 36px
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Font: Malgun Gothic, 12px
- Color: #333333
- Padding: 8px
- Background: #F9F9F9 (read-only)

Browse Button:
- Size: 100px × 36px
- Background: #FFFFFF
- Text: "찾아보기"
- Font: Malgun Gothic, 12px
- Color: #2196F3
- Border: 1px solid #2196F3
- Border radius: 4px
- Margin left: 8px
- Hover: Background #E3F2FD

Preview Section:
- Label: "미리보기:"
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Margin bottom: 12px

Tree View:
- Size: 100% width × 300px height
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #F9F9F9
- Padding: 16px
- Overflow: Auto scroll

Folder Item (repeating):
- Layout: Icon + Text
- Icon: 📁 folder emoji, Size 16×16px
- Text:
  * Font: Malgun Gothic, 12px, monospace
  * Color: #333333
- Indentation:
  * Level 1: 0px
  * Level 2: 20px
  * Level 3: 40px
- Spacing: 4px vertical between items

Summary:
- Position: Below tree view
- Margin top: 16px
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Text: "총 16개 폴더 생성 예정"

Action Buttons:
- Position: Bottom center
- Margin top: 24px
- Layout: Horizontal, 12px spacing

Button [생성]:
- Size: 120px × 40px
- Background: #4CAF50 (green)
- Text: "생성"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #45A049

Button [취소]:
- Size: 120px × 40px
- Background: #FFFFFF
- Text: "취소"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Colors:
- Primary: #2196F3 (blue)
- Success: #4CAF50 (green)
- Background: #F9F9F9, #FFFFFF
- Border: #E0E0E0, #CCCCCC
- Text: #333333, #666666
```

---

### 3.6 폴더 생성 완료

#### 3.6.1 화면 설명

폴더 생성이 완료된 후 결과를 표시합니다.

#### 3.6.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  폴더 생성 완료                                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ 폴더 생성 완료                                            │
│                                                               │
│  생성 위치:   \\nas\m4gl\l10n\250115_UPDATE\                │
│  생성 개수:   16개 폴더                                       │
│  소요 시간:   2초                                             │
│                                                               │
│                                                               │
│              [폴더 열기]      [닫기]                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.6.3 Stitch 프롬프트

```
Create a folder creation success dialog:

Container:
- Size: 500px width × 300px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)

Title:
- Text: "폴더 생성 완료"
- Font: Malgun Gothic, 16px, bold
- Color: #4CAF50 (green)
- Margin bottom: 24px
- Icon: ✓ checkmark, Size 20×20px, Color #4CAF50

Success Message:
- Icon: ✓, Size 48×48px, Color #4CAF50
- Position: Top center
- Margin bottom: 20px

Info Section:
- Layout: Vertical, left-aligned
- Margin bottom: 32px
- Spacing: 12px between items

Info Item (repeating 3 times):
- Layout: Label + Value (horizontal)
- Label:
  * Width: 100px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Align: Right
- Value:
  * Font: Malgun Gothic, 13px
  * Color: #333333
  * Margin left: 12px

Info Data:
1. 생성 위치: \\nas\m4gl\l10n\250115_UPDATE\
2. 생성 개수: 16개 폴더
3. 소요 시간: 2초

Action Buttons:
- Position: Bottom center
- Layout: Horizontal, 12px spacing

Button [폴더 열기]:
- Size: 120px × 40px
- Background: #2196F3 (blue)
- Text: "폴더 열기"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #1976D2
- Icon: 📁 folder icon, 16×16px, left side

Button [닫기]:
- Size: 100px × 40px
- Background: #FFFFFF
- Text: "닫기"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Colors:
- Success: #4CAF50 (green)
- Primary: #2196F3 (blue)
- Text: #333333, #666666
- Border: #E0E0E0, #CCCCCC
```

---

### 3.7 메시지 출력 (헤즈업)

#### 3.7.1 화면 설명

헤즈업 메시지 템플릿을 생성하여 표시합니다. 제목과 본문을 개별적으로 또는 전체를 복사할 수 있습니다.

#### 3.7.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  헤즈업 메시지                                       [X]      │
├─────────────────────────────────────────────────────────────┤
│  제목:                                                       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ M4GL 250115 업데이트 일정 안내                        │   │
│  └───────────────────────────────────────────────────────┘   │
│  [복사]                                                      │
│                                                               │
│  본문:                                                       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 안녕하세요.                                           │   │
│  │                                                       │   │
│  │ M4GL 2025년 1월 15일 업데이트 일정을 안내드립니다.   │   │
│  │                                                       │   │
│  │ **주요 일정**                                         │   │
│  │ - 헤즈업: 1월 8일(수)                                 │   │
│  │ - REGULAR HO: 1월 8일(수)                             │   │
│  │ - REGULAR Delivery: 1월 10일(금)                      │   │
│  │ - EXTRA0 HO: 1월 10일(금)                             │   │
│  │ - EXTRA0 Delivery: 1월 13일(월)                       │   │
│  │ - EXTRA1 HO: 1월 13일(월)                             │   │
│  │ - EXTRA1 Delivery: 1월 14일(화)                       │   │
│  │                                                       │   │
│  │ 자세한 일정은 JIRA Epic을 참고해주세요.               │   │
│  │ 감사합니다.                                           │   │
│  └───────────────────────────────────────────────────────┘   │
│  [복사]                                                      │
│                                                               │
│                  [전체 복사]      [닫기]                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.7.3 Stitch 프롬프트

```
Create a message output dialog for Heads-up:

Container:
- Size: 650px width × 600px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)

Title Bar:
- Layout: Horizontal flex
- Height: 32px
- Margin bottom: 20px

Title Text:
- Text: "헤즈업 메시지"
- Font: Malgun Gothic, 16px, bold
- Color: #333333

Close Button:
- Position: Right aligned
- Size: 24×24px
- Icon: X
- Color: #999999
- Hover: Color #333333

Subject Section:
- Margin bottom: 20px

Subject Label:
- Text: "제목:"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Margin bottom: 8px

Subject Text Box:
- Width: 100% (602px)
- Height: 48px
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #F9F9F9
- Padding: 12px
- Font: Malgun Gothic, 13px
- Color: #333333
- Read-only style

Subject Copy Button:
- Size: 80px × 32px
- Background: #FFFFFF
- Text: "복사"
- Font: Malgun Gothic, 12px
- Color: #2196F3
- Border: 1px solid #2196F3
- Border radius: 4px
- Margin top: 8px
- Hover: Background #E3F2FD

Body Section:
- Margin bottom: 20px

Body Label:
- Text: "본문:"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Margin bottom: 8px

Body Text Box:
- Width: 100% (602px)
- Height: 320px
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #F9F9F9
- Padding: 12px
- Font: Malgun Gothic, 12px
- Color: #333333
- Line height: 1.6
- Overflow: Auto scroll
- Read-only style

Body Copy Button:
- Same style as Subject Copy Button

Action Buttons:
- Position: Bottom center
- Layout: Horizontal, 12px spacing

Button [전체 복사]:
- Size: 120px × 40px
- Background: #2196F3 (blue)
- Text: "전체 복사"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #1976D2
- Icon: 📋 clipboard icon, 16×16px, left side

Button [닫기]:
- Size: 100px × 40px
- Background: #FFFFFF
- Text: "닫기"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Toast Notification (on copy):
- Position: Bottom center, above buttons
- Size: Auto width × 40px height
- Background: #4CAF50 (green)
- Text: "복사되었습니다"
- Font: Malgun Gothic, 12px
- Color: #FFFFFF
- Border radius: 4px
- Padding: 12px 24px
- Animation: Fade in, 2s hold, fade out
- Shadow: 0 2px 4px rgba(0,0,0,0.2)

Colors:
- Primary: #2196F3 (blue)
- Success: #4CAF50 (green)
- Background: #F9F9F9, #FFFFFF
- Border: #E0E0E0, #CCCCCC
- Text: #333333, #666666, #999999
```

---

### 3.8 메시지 출력 (HO)

#### 3.8.1 화면 설명

HO (Handoff) 메시지 템플릿을 생성하여 표시합니다. 헤즈업 메시지와 동일한 구조이지만 내용이 다릅니다.

#### 3.8.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  HO 메시지                                           [X]      │
├─────────────────────────────────────────────────────────────┤
│  제목:                                                       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ M4GL 250115 REGULAR HO                                │   │
│  └───────────────────────────────────────────────────────┘   │
│  [복사]                                                      │
│                                                               │
│  본문:                                                       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 안녕하세요.                                           │   │
│  │                                                       │   │
│  │ M4GL 250115 REGULAR HO를 전달드립니다.                │   │
│  │                                                       │   │
│  │ **전달 정보**                                         │   │
│  │ - 배치: REGULAR                                       │   │
│  │ - 전달일: 1월 10일(금)                                │   │
│  │ - 마감일: 1월 10일(금) 17:00                          │   │
│  │                                                       │   │
│  │ **폴더 위치**                                         │   │
│  │ \\nas\m4gl\l10n\250115_UPDATE\00_SOURCE\250108_...   │   │
│  │                                                       │   │
│  │ 확인 부탁드립니다.                                    │   │
│  │ 감사합니다.                                           │   │
│  └───────────────────────────────────────────────────────┘   │
│  [복사]                                                      │
│                                                               │
│                  [전체 복사]      [닫기]                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.8.3 Stitch 프롬프트

```
Create a message output dialog for Handoff (HO):

Container:
- Same as 3.7.3 (헤즈업 메시지)
- Only difference: Title text "HO 메시지"

All other specifications identical to 3.7.3 including:
- Layout, sizes, colors
- Subject and body sections
- Copy buttons
- Action buttons
- Toast notification

Content difference (example):
- Title: "M4GL 250115 REGULAR HO"
- Body: HO-specific message format with:
  * 배치 (Batch)
  * 전달일 (Delivery date)
  * 마감일 (Due date)
  * 폴더 위치 (Folder path)
```

---

### 3.9 L10N 일정 계산 결과

#### 3.9.1 화면 설명

L10N 프로젝트의 일정 계산 결과를 표시합니다. 일반 프로젝트와 달리 Epic 1개 + Task 5개 + Subtask 12개로 구성됩니다.

**표시 요소**:
- Epic 정보 (1행)
- Task 정보 (5행: M4, NC, FB, LY, 견적서 크로스체크)
- Subtask 정보 (12행: 각 Task당 0~3개)
- JIRA 생성, 메시지 출력 버튼

#### 3.9.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  일정 계산 결과                                              │
├─────────────────────────────────────────────────────────────┤
│  프로젝트: L10N  |  정산 마감일: 2025-11-13                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ■ Epic: 2025년 10월 작업 정산                              │
│    시작: 2025-10-23 09:30  |  종료: 2025-11-13 18:30        │
│                                                               │
│  ▼ Task 1: M4 2025년 10월 정산                              │
│    시작: 2025-10-23 09:30  |  종료: 2025-11-13 18:30        │
│    담당자: 712020:1a1a9943-9787-44e1-b2da-d4f558df471e      │
│                                                               │
│    • Subtask 1.1: [M4] 10월 견적서 요청                     │
│      시작: 2025-10-27 09:30  |  종료: 2025-10-27 18:30      │
│                                                               │
│    • Subtask 1.2: [M4] 10월 세금계산서 요청                 │
│      시작: 2025-11-10 09:30  |  종료: 2025-11-10 18:30      │
│                                                               │
│    • Subtask 1.3: [M4] 10월 지결 상신                       │
│      시작: 2025-11-11 09:30  |  종료: 2025-11-11 18:30      │
│                                                               │
│  ▼ Task 2: NC 2025년 10월 정산                              │
│    시작: 2025-10-23 09:30  |  종료: 2025-11-13 18:30        │
│    (Subtask 3개 - M4와 동일 구조)                            │
│                                                               │
│  ▼ Task 3: FB 2025년 10월 정산                              │
│    (Subtask 3개 - M4와 동일 구조)                            │
│                                                               │
│  ▼ Task 4: LY 2025년 10월 정산                              │
│    담당자: 62b57632f38b4dcf73daedb2                          │
│    (Subtask 3개 - M4와 동일 구조)                            │
│                                                               │
│  ▼ Task 5: 2025년 10월 견적서 크로스체크                    │
│    시작: 2025-11-07 09:30  |  종료: 2025-11-07 18:30        │
│    담당자: 617f7523f485cd0068077192                          │
│    (Subtask 없음)                                             │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  총 일감: Epic 1개 + Task 5개 + Subtask 12개 = 18개         │
├─────────────────────────────────────────────────────────────┤
│  [JIRA 일감 생성]  [메시지 출력 (헤즈업)]  [메시지 출력 (HO)]│
└─────────────────────────────────────────────────────────────┘
```

#### 3.9.3 Stitch 프롬프트

```
Create a schedule result display for L10N project:

Container:
- Same base structure as 3.2.3 (일정 계산 결과)
- Header shows: "프로젝트: L10N | 정산 마감일: YYYY-MM-DD"

Result Display:
- Hierarchical tree structure with expand/collapse
- Epic level (1 item):
  * Background: #E3F2FD (light blue)
  * Icon: ■ (square)
  * Font weight: bold
  * Shows: Summary, Start, Due

- Task level (5 items):
  * Background: #F5F5F5 (light gray)
  * Icon: ▼ (expandable)
  * Indent: 16px
  * Shows: Summary, Start, Due, Assignee
  * Task names: M4/NC/FB/LY 정산, 견적서 크로스체크

- Subtask level (12 items total):
  * Background: #FFFFFF (white)
  * Icon: • (bullet)
  * Indent: 32px
  * Shows: Summary, Start, Due
  * Subtask names: 견적서 요청, 세금계산서 요청, 지결 상신
  * Note: 견적서 크로스체크 Task는 Subtask 없음

Summary Section:
- Position: Below result tree
- Background: #FFF3E0 (light orange)
- Padding: 12px
- Border: 1px solid #FFB74D
- Content: "총 일감: Epic 1개 + Task 5개 + Subtask 12개 = 18개"

Action Buttons:
- Same as 3.2.3
- Three buttons: JIRA 일감 생성, 메시지 출력 (헤즈업), 메시지 출력 (HO)

Special Features:
- Assignee display with different colors per person
- Collapsible Task sections for better readability
- Highlight tasks with no subtasks (견적서 크로스체크)
```

---

## 4. 테이블 병합 탭

### 4.1 M4GL DIALOGUE 병합

#### 4.1.1 화면 설명

M4GL DIALOGUE 테이블 병합을 위한 파일 선택 및 진행 화면입니다.

#### 4.1.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  M4GL DIALOGUE 병합                                          │
├─────────────────────────────────────────────────────────────┤
│  파일 폴더: [경로 선택...]                      [선택]        │
├─────────────────────────────────────────────────────────────┤
│  필요 파일:                                                  │
│  ✓ CINEMATIC_DIALOGUE.xlsm                                  │
│  ✓ SMALLTALK_DIALOGUE.xlsm                                  │
│  ✓ NPC.xlsm                                                 │
├─────────────────────────────────────────────────────────────┤
│  [병합 시작]                                                 │
├─────────────────────────────────────────────────────────────┤
│  진행률: ████████████░░░░░░░░ 60%                            │
│  현재: 데이터 병합 중...                                      │
│                                                               │
│  로그:                                                       │
│  [09:00:15] CINEMATIC_DIALOGUE 읽기 완료 (1,234 rows)       │
│  [09:00:16] SMALLTALK_DIALOGUE 읽기 완료 (567 rows)         │
│  [09:00:17] NPC 매핑 완료                                    │
│  [09:00:18] 데이터 병합 중...                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.3 Stitch 프롬프트

```
Create a table merge interface for M4GL DIALOGUE:

Container:
- Size: 700px width × 550px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px

Title:
- Text: "M4GL DIALOGUE 병합"
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 20px
- Border bottom: 2px solid #2196F3
- Padding bottom: 12px

File Selector Section:
- Margin bottom: 20px
- Layout: Label + Input + Button (horizontal)

Label:
- Text: "파일 폴더:"
- Width: 80px
- Font: Malgun Gothic, 13px, medium
- Color: #666666

Path Display:
- Width: 480px
- Height: 36px
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Font: Malgun Gothic, 12px
- Color: #999999
- Padding: 8px
- Background: #F9F9F9
- Placeholder: "경로 선택..."

Browse Button:
- Size: 80px × 36px
- Background: #2196F3
- Text: "선택"
- Font: Malgun Gothic, 12px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Margin left: 8px
- Hover: Background #1976D2

Required Files Section:
- Margin bottom: 20px
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Padding: 16px
- Background: #F9F9F9

Section Label:
- Text: "필요 파일:"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Margin bottom: 12px

File Item (repeating 3 times):
- Layout: Icon + Text (horizontal)
- Height: 28px
- Spacing: 8px between items

File Status Icon:
- ✓ (Found): Color #4CAF50 (green), Size 16×16px
- ✗ (Missing): Color #F44336 (red), Size 16×16px
- ○ (Pending): Color #CCCCCC (gray), Size 16×16px

File Name:
- Font: Malgun Gothic, 12px, monospace
- Color: #333333
- Margin left: 8px from icon

Start Button:
- Position: Center aligned
- Size: 120px × 40px
- Background: #4CAF50 (green)
- Text: "병합 시작"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Margin: 20px 0
- Hover: Background #45A049
- Disabled: Background #CCCCCC, Cursor not-allowed

Progress Section:
- Margin top: 20px
- Border top: 1px solid #E0E0E0
- Padding top: 20px

Progress Bar:
- Width: 100% (652px)
- Height: 24px
- Background: #E0E0E0
- Border radius: 12px
- Margin bottom: 12px

Progress Fill:
- Background: Linear gradient #4CAF50 to #45A049
- Height: 100%
- Border radius: 12px
- Animation: Smooth, 300ms

Progress Text:
- Position: Center of bar
- Font: Malgun Gothic, 12px, bold
- Color: #FFFFFF

Status Text:
- Font: Malgun Gothic, 12px
- Color: #666666
- Margin bottom: 16px

Log Section:
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #FAFAFA
- Height: 140px
- Padding: 12px
- Overflow: Auto scroll
- Font: Malgun Gothic, 11px, monospace
- Line height: 1.5

Log Entry (repeating):
- Color: #333333
- Format: "[HH:MM:SS] message"
- Spacing: 4px between entries

Colors:
- Primary: #2196F3 (blue)
- Success: #4CAF50 (green)
- Error: #F44336 (red)
- Background: #F9F9F9, #FAFAFA
- Border: #E0E0E0, #CCCCCC
- Text: #333333, #666666, #999999
```

---

### 4.2 M4GL STRING 병합

#### 4.2.1 화면 설명

M4GL STRING 테이블 병합을 위한 화면입니다. 8개 파일을 병합합니다.

#### 4.2.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  M4GL STRING 병합                                            │
├─────────────────────────────────────────────────────────────┤
│  파일 폴더: [경로 선택...]                      [선택]        │
├─────────────────────────────────────────────────────────────┤
│  필요 파일:                                                  │
│  ✓ SEQUENCE_DIALOGUE.xlsm                                   │
│  ✓ STRING_BUILTIN.xlsm                                      │
│  ✓ STRING_MAIL.xlsm                                         │
│  ✓ STRING_MESSAGE.xlsm                                      │
│  ✓ STRING_NPC.xlsm                                          │
│  ✓ STRING_QUESTTEMPLATE.xlsm                                │
│  ✓ STRING_TEMPLATE.xlsm                                     │
│  ✓ STRING_TOOLTIP.xlsm                                      │
├─────────────────────────────────────────────────────────────┤
│  [병합 시작]                                                 │
├─────────────────────────────────────────────────────────────┤
│  진행률: ████████████████████ 100%                           │
│  완료: 출력 파일 저장 중...                                  │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2.3 Stitch 프롬프트

```
Create a table merge interface for M4GL STRING:

Identical structure to 4.1.3 (M4GL DIALOGUE) with these changes:

Title:
- Text: "M4GL STRING 병합"

Required Files (8 files instead of 3):
1. SEQUENCE_DIALOGUE.xlsm
2. STRING_BUILTIN.xlsm
3. STRING_MAIL.xlsm
4. STRING_MESSAGE.xlsm
5. STRING_NPC.xlsm
6. STRING_QUESTTEMPLATE.xlsm
7. STRING_TEMPLATE.xlsm
8. STRING_TOOLTIP.xlsm

File List Height:
- Adjust to accommodate 8 files (240px height)
- Scroll if necessary

All other specifications identical to 4.1.3
```

---

### 4.3 NC/GL 병합

#### 4.3.1 화면 설명

NC/GL 테이블 병합을 위한 화면입니다. 8개 언어 파일 + 업데이트일/마일스톤 입력이 필요합니다.

#### 4.3.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  NC/GL 병합                                                  │
├─────────────────────────────────────────────────────────────┤
│  파일 폴더: [경로 선택...]                      [선택]        │
│  업데이트일: [250115]                                        │
│  마일스톤:   [42]                                            │
├─────────────────────────────────────────────────────────────┤
│  필요 파일:                                                  │
│  ✓ StringEnglish.xlsx                                       │
│  ✓ StringTraditionalChinese.xlsx                            │
│  ✓ StringSimplifiedChinese.xlsx                             │
│  ✓ StringJapanese.xlsx                                      │
│  ✓ StringThai.xlsx                                          │
│  ✓ StringSpanish.xlsx                                       │
│  ✓ StringPortuguese.xlsx                                    │
│  ✓ StringRussian.xlsx                                       │
├─────────────────────────────────────────────────────────────┤
│  [병합 시작]                                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3.3 Stitch 프롬프트

```
Create a table merge interface for NC/GL:

Based on 4.1.3 structure with these additions:

Title:
- Text: "NC/GL 병합"

Input Fields Section:
- Position: Between file selector and required files
- Margin: 16px vertical

Field Layout (2 fields, horizontal):

Field 1 - 업데이트일:
- Label: "업데이트일:"
  * Width: 80px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
- Input:
  * Width: 120px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 13px
  * Placeholder: "250115"

Field 2 - 마일스톤:
- Label: "마일스톤:"
  * Same as Field 1
- Input:
  * Width: 80px
  * Height: 36px
  * Placeholder: "42"

Required Files (8 language files):
1. StringEnglish.xlsx
2. StringTraditionalChinese.xlsx
3. StringSimplifiedChinese.xlsx
4. StringJapanese.xlsx
5. StringThai.xlsx
6. StringSpanish.xlsx
7. StringPortuguese.xlsx
8. StringRussian.xlsx

File List:
- Height: 240px (8 files)
- Scroll if necessary

All other specifications from 4.1.3 apply
```

---

### 4.4 LY/GL 병합

#### 4.4.1 화면 설명

LY/GL 테이블 병합을 위한 화면입니다. 7개 언어 파일을 자동 감지합니다.

#### 4.4.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  LY/GL 병합                                                  │
├─────────────────────────────────────────────────────────────┤
│  파일 폴더: [경로 선택...]                      [선택]        │
├─────────────────────────────────────────────────────────────┤
│  감지된 파일:                                                │
│  ✓ 251104_EN.xlsx                                           │
│  ✓ 251104_CT.xlsx                                           │
│  ✓ 251104_CS.xlsx                                           │
│  ✓ 251104_JA.xlsx                                           │
│  ✓ 251104_TH.xlsx                                           │
│  ✓ 251104_PT-BR.xlsx                                        │
│  ✓ 251104_RU.xlsx                                           │
├─────────────────────────────────────────────────────────────┤
│  [병합 시작]                                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 4.4.3 Stitch 프롬프트

```
Create a table merge interface for LY/GL merge:

Based on 4.1.3 structure with these changes:

Title:
- Text: "LY/GL 병합"

Detected Files Section:
- Label: "감지된 파일:" (instead of "필요 파일:")
- Description: Files are auto-detected from folder

File List (7 language files):
- Pattern: {date}_{lang}.xlsx
- Example date: 251104
- Languages: EN, CT, CS, JA, TH, PT, RU

File Status:
- Auto-detect based on folder contents
- ✓ Found
- ✗ Missing or name pattern mismatch

File List Height:
- 210px (7 files)

All other specifications from 4.1.3 apply
```

---

### 4.5 LY/GL 분할

#### 4.5.1 화면 설명

LY/GL 테이블 분할을 위한 화면입니다. 병합 파일 1개를 7개 언어 파일로 분할합니다.

#### 4.5.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  LY/GL 분할                                                  │
├─────────────────────────────────────────────────────────────┤
│  병합 파일: [파일 선택...]                      [선택]        │
│  출력 폴더: [경로 선택...]                      [선택]        │
│  날짜 접두사: [251104]  (선택적)                             │
├─────────────────────────────────────────────────────────────┤
│  분할 파일 미리보기:                                         │
│  251104_EN.xlsx                                              │
│  251104_CT.xlsx                                              │
│  251104_CS.xlsx                                              │
│  251104_JA.xlsx                                              │
│  251104_TH.xlsx                                              │
│  251104_PT-BR.xlsx                                           │
│  251104_RU.xlsx                                              │
├─────────────────────────────────────────────────────────────┤
│  [분할 시작]                                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 4.5.3 Stitch 프롬프트

```
Create a table split interface for LY/GL:

Container:
- Same as 4.1.3 base structure

Title:
- Text: "LY/GL 분할"

Input Section (3 fields, vertical layout):

Field 1 - 병합 파일:
- Label: "병합 파일:"
  * Width: 80px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
- Layout: Horizontal (Label + Display + Button)
- File Display:
  * Width: 480px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Background: #F9F9F9
  * Placeholder: "파일 선택..."
- Button:
  * Size: 80px × 36px
  * Background: #2196F3
  * Text: "선택"

Field 2 - 출력 폴더:
- Same layout as Field 1
- Placeholder: "경로 선택..."

Field 3 - 날짜 접두사:
- Label: "날짜 접두사:"
- Input:
  * Width: 120px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Placeholder: "251104"
  * Optional indicator: "(선택적)" text
- Help text:
  * Font: Malgun Gothic, 11px
  * Color: #999999
  * Text: "비워두면 입력 파일명에서 추출됩니다"

Preview Section:
- Label: "분할 파일 미리보기:"
- Background: #F9F9F9
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Padding: 16px
- Height: 200px

File List (7 items):
- Font: Malgun Gothic, 12px, monospace
- Color: #666666
- Spacing: 8px between items
- Prefix: Date from input or auto-detected
- Languages: EN, CT, CS, JA, TH, PT, RU

Start Button:
- Same as 4.1.3
- Text: "분할 시작"

Colors: Same as 4.1.3
```

---

## 5. 관리 탭

### 5.1 관리 대시보드

#### 5.1.1 화면 설명

관리 탭의 메인 화면으로, 3개의 스케줄 작업(Daily Task, Daily Scrum, Slack MSG)을 관리합니다.

#### 5.1.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  관리                                                        │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Daily Task                                           │   │
│  │ 다음 실행: 2025-02-10 09:00                          │   │
│  │ 마지막:   2025-01-10 09:00 (성공)                    │   │
│  │                                    [지금 실행]       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Daily Scrum                                          │   │
│  │ 다음 실행: 2025-01-13 09:00                          │   │
│  │ 마지막:   2025-01-10 09:00 (성공)                    │   │
│  │                                    [지금 실행]       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Slack MSG                                            │   │
│  │ 다음 실행: 2025-01-13 07:00                          │   │
│  │ 마지막:   2025-01-10 07:00 (성공)                    │   │
│  │                                    [지금 실행]       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  실행 로그                                                    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 2025-01-10 09:00:15  Daily Scrum 완료               │   │
│  │ 2025-01-10 07:00:12  Slack MSG 완료 (2개 발송)      │   │
│  │ 2025-01-09 09:00:10  Daily Scrum 완료               │   │
│  │ ...                                                  │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 5.1.3 Stitch 프롬프트

```
Create an admin dashboard for scheduled tasks:

Container:
- Size: 700px width × 650px height
- Background: #FFFFFF (white)
- Padding: 24px

Title:
- Text: "관리"
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 24px
- Border bottom: 2px solid #2196F3
- Padding bottom: 12px

Task Cards (3 cards, vertical layout):
- Spacing: 16px between cards

Card Structure (repeating):
- Width: 100% (652px)
- Height: 100px
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Background: #FAFAFA
- Padding: 16px
- Hover: Shadow 0 2px 4px rgba(0,0,0,0.1)

Card Layout:
- Left side: Task info (480px width)
- Right side: Action button (120px width)

Task Title:
- Font: Malgun Gothic, 14px, bold
- Color: #333333
- Margin bottom: 8px

Task Info (2 lines):
- Font: Malgun Gothic, 12px
- Color: #666666
- Spacing: 6px between lines
- Format:
  * "다음 실행: YYYY-MM-DD HH:MM"
  * "마지막: YYYY-MM-DD HH:MM (성공/실패)"

Status Indicator:
- (성공): Color #4CAF50 (green)
- (실패): Color #F44336 (red)

Execute Button:
- Size: 100px × 36px
- Position: Right aligned, vertically centered
- Background: #2196F3 (blue)
- Text: "지금 실행"
- Font: Malgun Gothic, 12px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #1976D2

Task Cards:
1. Daily Task
2. Daily Scrum
3. Slack MSG

Log Section:
- Margin top: 24px
- Label: "실행 로그"
  * Font: Malgun Gothic, 14px, bold
  * Color: #333333
  * Margin bottom: 12px

Log Box:
- Width: 100% (652px)
- Height: 180px
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #FAFAFA
- Padding: 12px
- Overflow: Auto scroll

Log Entry (repeating):
- Font: Malgun Gothic, 11px, monospace
- Color: #333333
- Line height: 1.6
- Format: "YYYY-MM-DD HH:MM:SS  Task name status"
- Spacing: 4px between entries

Status in Log:
- 완료: Color #4CAF50 (green)
- 실패: Color #F44336 (red)

Colors:
- Primary: #2196F3 (blue)
- Success: #4CAF50 (green)
- Error: #F44336 (red)
- Background: #FAFAFA, #FFFFFF
- Border: #E0E0E0
- Text: #333333, #666666
```

---

### 5.2 Daily Task 실행

#### 5.2.1 화면 설명

Daily Task 수동 실행 시 진행 상황을 표시하는 다이얼로그입니다.

#### 5.2.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  Daily Task 실행 중...                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  진행률: ████████████░░░░░░░░ 65%                            │
│                                                               │
│  현재: 페이지 본문 업데이트 중...                            │
│                                                               │
│  로그:                                                       │
│  [09:00:10] 페이지 190906620 조회 완료                       │
│  [09:00:11] 현재 라벨 조회 완료                              │
│  [09:00:12] 2월 영업일 계산 완료 (20일)                      │
│  [09:00:13] 템플릿 생성 중...                                │
│  [09:00:14] 페이지 본문 업데이트 중...                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.3 Stitch 프롬프트

```
Create a Daily Task execution progress dialog:

Container:
- Size: 500px width × 380px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)
- Modal: Yes (blocks interaction with main window)

Title:
- Text: "Daily Task 실행 중..."
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 20px

Progress Bar:
- Width: 100% (452px)
- Height: 24px
- Background: #E0E0E0
- Border radius: 12px
- Margin bottom: 16px

Progress Fill:
- Background: Linear gradient #FF9800 to #F57C00 (orange)
- Height: 100%
- Border radius: 12px
- Animation: Smooth, 300ms

Progress Text:
- Position: Center of bar
- Font: Malgun Gothic, 12px, bold
- Color: #FFFFFF

Status Text:
- Font: Malgun Gothic, 13px, medium
- Color: #333333
- Margin bottom: 20px
- Format: "현재: [current action]"

Log Section:
- Label: "로그:"
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Margin bottom: 8px

Log Box:
- Width: 100% (452px)
- Height: 180px
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #FAFAFA
- Padding: 12px
- Overflow: Auto scroll (always scroll to bottom)
- Font: Malgun Gothic, 11px, monospace
- Line height: 1.6

Log Entry:
- Color: #333333
- Format: "[HH:MM:SS] message"
- Auto-scroll: Yes (new entries at bottom)

Colors:
- Primary: #FF9800 (orange, for Daily Task)
- Background: #FAFAFA, #FFFFFF
- Border: #E0E0E0
- Text: #333333, #666666
```

---

### 5.3 Daily Scrum 실행

#### 5.3.1 화면 설명

Daily Scrum 수동 실행 시 진행 상황을 표시하는 다이얼로그입니다.

#### 5.3.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  Daily Scrum 실행 중...                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  진행률: ████████████████████ 100%                           │
│                                                               │
│  완료: 페이지 업데이트 완료                                  │
│                                                               │
│  로그:                                                       │
│  [09:00:10] 페이지 191332855 조회 완료                       │
│  [09:00:11] 월 첫 영업일 확인: 일반 평일                     │
│  [09:00:12] 날짜 표시 업데이트: 1월 10일(금)                 │
│  [09:00:13] ID 업데이트: DAILY_TASK_MK2_20250110            │
│  [09:00:14] 페이지 업데이트 완료                             │
│                                                               │
│                         [닫기]                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.3 Stitch 프롬프트

```
Create a Daily Scrum execution progress dialog:

Identical to 5.2.3 (Daily Task) with these changes:

Title:
- Text: "Daily Scrum 실행 중..."

Progress Fill Color:
- Background: Linear gradient #9C27B0 to #7B1FA2 (purple, for Daily Scrum)

Completion State:
- Title changes to: "Daily Scrum 완료"
- Status text: "완료: 페이지 업데이트 완료"
- Progress: 100%

Close Button:
- Appears when completed
- Size: 100px × 40px
- Background: #FFFFFF
- Text: "닫기"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Position: Bottom center
- Hover: Background #F5F5F5

Colors:
- Primary: #9C27B0 (purple, for Daily Scrum)
- All other colors same as 5.2.3
```

---

### 5.4 Slack MSG 실행

#### 5.4.1 화면 설명

Slack MSG 수동 실행 시 진행 상황을 표시하는 다이얼로그입니다.

#### 5.4.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  Slack MSG 실행 중...                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  진행률: ████████████████████ 100%                           │
│                                                               │
│  완료: 메시지 발송 완료 (2개)                                │
│                                                               │
│  로그:                                                       │
│  [07:00:10] 공휴일 확인: 영업일                              │
│  [07:00:11] 오늘 날짜: 1월 10일(금)                          │
│  [07:00:12] 메시지 1 발송 완료                               │
│  [07:00:13] 메시지 2 발송 완료                               │
│  [07:00:14] 총 2개 메시지 발송 완료                          │
│                                                               │
│                         [닫기]                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 5.4.3 Stitch 프롬프트

```
Create a Slack MSG execution progress dialog:

Identical to 5.2.3 (Daily Task) with these changes:

Title:
- Text: "Slack MSG 실행 중..."

Progress Fill Color:
- Background: Linear gradient #4CAF50 to #45A049 (green, for Slack MSG)

Completion State:
- Title changes to: "Slack MSG 완료"
- Status text: "완료: 메시지 발송 완료 (2개)"
- Progress: 100%

Close Button:
- Same as 5.3.3

Colors:
- Primary: #4CAF50 (green, for Slack MSG)
- All other colors same as 5.2.3
```

---

## 6. 공통 다이얼로그

### 6.1 초기 설정 마법사

#### 6.1.1 화면 설명

앱 최초 실행 시 사용자 인증 정보와 기본 설정을 안내하는 5단계 마법사입니다.

**단계**:
1. PIN 설정
2. JIRA 연동
3. Slack 연동
4. Confluence 연동
5. 기본 프로젝트 선택

#### 6.1.2 ASCII 와이어프레임

**1단계: PIN 설정**
```
┌─────────────────────────────────────────────────────────────┐
│  Sebastian 초기 설정                                 (1/5)   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Sebastian을 보호할 4자리 PIN을 설정하세요.                  │
│                                                               │
│  PIN:     [____]                                             │
│                                                               │
│  확인:    [____]                                             │
│                                                               │
│                                                               │
│                              [다음]                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**2단계: JIRA 연동**
```
┌─────────────────────────────────────────────────────────────┐
│  Sebastian 초기 설정                                 (2/5)   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  JIRA 인증 정보를 입력하세요.                                │
│                                                               │
│  Email:        [________________________________]             │
│                                                               │
│  API Token:    [________________________________]             │
│                                                               │
│                                                               │
│                  [연결 테스트]                                │
│                                                               │
│                          [건너뛰기]  [다음]                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**3단계: Slack 연동**
```
┌─────────────────────────────────────────────────────────────┐
│  Sebastian 초기 설정                                 (3/5)   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Slack 인증 정보를 입력하세요.                               │
│                                                               │
│  OAuth Token:  [________________________________]             │
│                                                               │
│                                                               │
│                  [연결 테스트]                                │
│                                                               │
│                          [건너뛰기]  [다음]                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**4단계: Confluence 연동**
```
┌─────────────────────────────────────────────────────────────┐
│  Sebastian 초기 설정                                 (4/5)   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Confluence 인증 정보를 입력하세요.                          │
│                                                               │
│  Email:        [________________________________]             │
│                                                               │
│  API Token:    [________________________________]             │
│                                                               │
│                                                               │
│                  [연결 테스트]                                │
│                                                               │
│                          [건너뛰기]  [다음]                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**5단계: 기본 프로젝트 선택**
```
┌─────────────────────────────────────────────────────────────┐
│  Sebastian 초기 설정                                 (5/5)   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  주로 사용할 프로젝트를 선택하세요.                          │
│                                                               │
│  ○ M4GL                                                      │
│  ○ NCGL                                                      │
│  ○ FBGL                                                      │
│  ○ LYGL                                                      │
│                                                               │
│                                                               │
│                           [완료]                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 6.1.3 Stitch 프롬프트

```
Create a 5-step setup wizard for Sebastian app:

Container (all steps):
- Size: 600px width × 400px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)
- Modal: Yes (center of screen)

Header (all steps):
- Layout: Horizontal flex
- Height: 32px
- Margin bottom: 20px

Title:
- Text: "Sebastian 초기 설정"
- Font: Malgun Gothic, 16px, bold
- Color: #333333

Progress Indicator:
- Position: Right aligned
- Text: "(X/5)"
- Font: Malgun Gothic, 14px, medium
- Color: #999999

Progress Bar (below header):
- Width: 100% (552px)
- Height: 4px
- Background: #E0E0E0
- Border radius: 2px
- Margin bottom: 24px

Progress Fill:
- Background: #2196F3 (blue)
- Height: 100%
- Border radius: 2px
- Width: X * 20% (step 1 = 20%, step 2 = 40%, etc.)
- Animation: Smooth, 300ms

--- Step 1: PIN Setup ---

Description:
- Text: "Sebastian을 보호할 4자리 PIN을 설정하세요."
- Font: Malgun Gothic, 13px
- Color: #666666
- Margin bottom: 32px

PIN Input Fields (2 fields):
- Label: "PIN:" / "확인:"
  * Width: 60px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Align: Right
- Input:
  * Width: 80px
  * Height: 40px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 24px, bold
  * Text align: Center
  * Type: Password (show dots)
  * Max length: 4
  * Pattern: [0-9]
- Spacing: 16px between fields

Next Button:
- Position: Bottom right
- Size: 100px × 40px
- Background: #2196F3 (blue)
- Text: "다음"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #1976D2
- Disabled: Background #CCCCCC when PINs don't match

--- Steps 2-4: Service Integration (JIRA, Slack, Confluence) ---

Description:
- Text: "{Service} 인증 정보를 입력하세요."
- Same style as Step 1

Input Fields (2 fields for JIRA/Confluence, 1 for Slack):
- Label: "Email:" / "API Token:" / "OAuth Token:"
  * Width: 100px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Align: Right
- Input:
  * Width: 400px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 12px
  * Type: Text / Password (masked with ********)
  * Padding: 8px
- Spacing: 16px between fields

Test Connection Button:
- Position: Center aligned below inputs
- Size: 120px × 40px
- Background: #FFFFFF
- Text: "연결 테스트"
- Font: Malgun Gothic, 13px, medium
- Color: #2196F3
- Border: 1px solid #2196F3
- Border radius: 4px
- Margin: 24px 0
- Hover: Background #E3F2FD

Success Indicator (after test):
- Icon: ✓, Size 16×16px, Color #4CAF50
- Position: Right of Test button
- Animation: Fade in

Navigation Buttons:
- Position: Bottom (horizontal layout, right aligned)
- Spacing: 12px between buttons

Skip Button:
- Size: 100px × 40px
- Background: #FFFFFF
- Text: "건너뛰기"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Next Button:
- Same as Step 1
- Enabled after successful test OR skip

--- Step 5: Default Project ---

Description:
- Text: "주로 사용할 프로젝트를 선택하세요."
- Same style as Step 1

Radio Options (4 options):
- Layout: Vertical, 12px spacing
- Option height: 36px

Radio Button:
- Size: 20×20px
- Border: 2px solid #CCCCCC
- Border radius: 50% (circle)
- Selected: Background #2196F3, inner circle #FFFFFF

Label:
- Font: Malgun Gothic, 13px, medium
- Color: #333333
- Margin left: 12px from radio

Options:
- ○ M4GL
- ○ NCGL
- ○ FBGL
- ○ LYGL

Complete Button:
- Position: Bottom right
- Size: 100px × 40px
- Background: #4CAF50 (green)
- Text: "완료"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #45A049

Colors:
- Primary: #2196F3 (blue)
- Success: #4CAF50 (green)
- Background: #FFFFFF
- Border: #E0E0E0, #CCCCCC
- Text: #333333, #666666, #999999
```

---

### 6.2 템플릿 편집 다이얼로그

#### 6.2.1 화면 설명

메시지 템플릿을 편집하는 다이얼로그입니다. 프로젝트와 유형을 선택하고 제목/본문을 편집할 수 있습니다.

#### 6.2.2 ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│  템플릿 편집                                        [X]       │
├─────────────────────────────────────────────────────────────┤
│  프로젝트: [M4GL ▼]     유형: [헤즈업 ▼]                     │
├─────────────────────────────────────────────────────────────┤
│  제목:                                                       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ {project} {update_date} 업데이트 일정 안내            │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  본문:                                                       │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 안녕하세요.                                           │   │
│  │                                                       │   │
│  │ {project} {update_date_full} 업데이트                │   │
│  │ 일정을 안내드립니다.                                  │   │
│  │                                                       │   │
│  │ **주요 일정**                                         │   │
│  │ - 헤즈업: {headsup_date}                              │   │
│  │ - REGULAR HO: {regular_ho_date}                       │   │
│  │ - REGULAR Delivery: {regular_delivery_date}           │   │
│  │ ...                                                   │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  사용 가능 변수: {project}, {update_date}, {milestone}, ...  │
│                                                               │
│                      [저장]  [취소]  [기본값으로 복원]        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2.3 Stitch 프롬프트

```
Create a message template editor dialog:

Container:
- Size: 700px width × 650px height
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)
- Modal: Yes

Title Bar:
- Layout: Horizontal flex
- Height: 32px
- Margin bottom: 20px

Title Text:
- Text: "템플릿 편집"
- Font: Malgun Gothic, 16px, bold
- Color: #333333

Close Button:
- Position: Right aligned
- Size: 24×24px
- Icon: X
- Color: #999999
- Hover: Color #333333

Selection Section:
- Layout: Horizontal, 12px spacing
- Margin bottom: 24px

Project Dropdown:
- Label: "프로젝트:"
  * Width: 70px
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
- Dropdown:
  * Width: 150px
  * Height: 36px
  * Border: 1px solid #CCCCCC
  * Border radius: 4px
  * Font: Malgun Gothic, 13px
  * Options: M4GL, NCGL, FBGL, LYGL

Template Type Dropdown:
- Label: "유형:"
  * Same as Project label
- Dropdown:
  * Width: 150px
  * Height: 36px
  * Options: 헤즈업, HO (Handoff)

Subject Section:
- Margin bottom: 20px

Subject Label:
- Text: "제목:"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Margin bottom: 8px

Subject Input:
- Width: 100% (652px)
- Height: 48px
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Background: #FFFFFF
- Padding: 12px
- Font: Malgun Gothic, 13px
- Color: #333333

Body Section:
- Margin bottom: 20px

Body Label:
- Text: "본문:"
- Same style as Subject Label

Body Textarea:
- Width: 100% (652px)
- Height: 320px
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Background: #FFFFFF
- Padding: 12px
- Font: Malgun Gothic, 12px
- Color: #333333
- Line height: 1.6
- Resize: Vertical

Available Variables Section:
- Font: Malgun Gothic, 11px
- Color: #999999
- Margin bottom: 20px
- Text: "사용 가능 변수: {project}, {update_date}, {milestone}, ..."

Action Buttons:
- Position: Bottom center
- Layout: Horizontal, 12px spacing

Button [저장]:
- Size: 100px × 40px
- Background: #2196F3 (blue)
- Text: "저장"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #1976D2

Button [취소]:
- Size: 100px × 40px
- Background: #FFFFFF
- Text: "취소"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Button [기본값으로 복원]:
- Size: 140px × 40px
- Background: #FFFFFF
- Text: "기본값으로 복원"
- Font: Malgun Gothic, 13px, medium
- Color: #FF9800
- Border: 1px solid #FF9800
- Border radius: 4px
- Hover: Background #FFF3E0

Colors:
- Primary: #2196F3 (blue)
- Warning: #FF9800 (orange)
- Background: #FFFFFF
- Border: #E0E0E0, #CCCCCC
- Text: #333333, #666666, #999999
```

---

### 6.3 확인 다이얼로그

#### 6.3.1 화면 설명

사용자에게 확인을 요청하는 범용 다이얼로그입니다. 여러 상황에서 재사용됩니다.

**사용 사례**:
- JIRA 재생성 확인
- 템플릿 저장 확인
- 폴더 덮어쓰기 확인
- 설정 초기화 확인

#### 6.3.2 ASCII 와이어프레임

**타입 A: 예/아니오**
```
┌─────────────────────────────────────────────────────────────┐
│  {제목}                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  {메시지 본문}                                               │
│  {추가 정보 (선택적)}                                         │
│                                                               │
│                                                               │
│                      [예]        [아니오]                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**타입 B: 3-way 선택**
```
┌─────────────────────────────────────────────────────────────┐
│  변경사항이 저장되지 않았습니다                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  저장하시겠습니까?                                           │
│                                                               │
│                                                               │
│                 [저장]  [저장 안 함]  [취소]                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**타입 C: JIRA 재생성 확인**
```
┌─────────────────────────────────────────────────────────────┐
│  동일한 일정으로 JIRA 일감을 다시 생성할 수 있습니다         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  이미 생성된 일감: L10NM4-1234                               │
│                                                               │
│  계속하시겠습니까?                                           │
│                                                               │
│                                                               │
│           [JIRA에서 보기]  [계속]  [취소]                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 6.3.3 Stitch 프롬프트

```
Create a flexible confirmation dialog:

Container:
- Size: 500px width × 250px height (adjust based on content)
- Background: #FFFFFF (white)
- Border: 1px solid #E0E0E0
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 8px rgba(0,0,0,0.1)
- Modal: Yes (center of screen, blocks interaction)

Title:
- Font: Malgun Gothic, 16px, bold
- Color: #333333
- Margin bottom: 20px

Message Body:
- Font: Malgun Gothic, 13px
- Color: #666666
- Line height: 1.6
- Margin bottom: 32px

Additional Info (optional):
- Font: Malgun Gothic, 12px
- Color: #999999
- Background: #F9F9F9
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Padding: 12px
- Margin bottom: 24px

Action Buttons:
- Position: Bottom center
- Layout: Horizontal, 12px spacing

Button Styles (3 variants):

Primary Button (확인, 예, 저장, 계속):
- Size: 100px × 40px
- Background: #2196F3 (blue)
- Text color: #FFFFFF
- Font: Malgun Gothic, 13px, bold
- Border: none
- Border radius: 4px
- Hover: Background #1976D2

Secondary Button (취소, 아니오):
- Size: 100px × 40px
- Background: #FFFFFF
- Text color: #666666
- Font: Malgun Gothic, 13px, medium
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Link Button (JIRA에서 보기, 저장 안 함):
- Size: Auto width × 40px
- Background: #FFFFFF
- Text color: #2196F3
- Font: Malgun Gothic, 13px, medium
- Border: 1px solid #2196F3
- Border radius: 4px
- Hover: Background #E3F2FD

Colors:
- Primary: #2196F3 (blue)
- Background: #FFFFFF, #F9F9F9
- Border: #E0E0E0, #CCCCCC
- Text: #333333, #666666, #999999
```

---

### 6.4 에러 다이얼로그

#### 6.4.1 화면 설명

오류 발생 시 사용자에게 표시하는 다이얼로그입니다. 에러 유형에 따라 다른 아이콘과 색상을 사용합니다.

#### 6.4.2 ASCII 와이어프레임

**에러 다이얼로그**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  {에러 제목}                                    [X]       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  {에러 내용}                                                 │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 오류 상세: {error_detail}                             │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  해결 방법:                                                  │
│  1. {해결 방법 1}                                            │
│  2. {해결 방법 2}                                            │
│                                                               │
│                      [재시도]  [취소]                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**네트워크 에러 예시**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  네트워크 오류                                  [X]       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  네트워크에 연결되어 있지 않습니다.                          │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 오류 상세: Connection timeout after 30s               │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  해결 방법:                                                  │
│  1. 인터넷 연결을 확인하세요                                 │
│  2. VPN 연결을 확인하세요                                    │
│  3. 방화벽 설정을 확인하세요                                 │
│                                                               │
│                      [재시도]  [취소]                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**API 인증 에러 예시**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  JIRA 인증 실패                                 [X]       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  JIRA 인증에 실패했습니다.                                   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 오류 상세: 401 Unauthorized - Invalid API token      │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  해결 방법:                                                  │
│  1. 설정에서 인증 정보를 확인하세요                          │
│  2. API Token을 재생성 후 업데이트하세요                     │
│  3. Email 주소가 JIRA 계정과 일치하는지 확인하세요           │
│                                                               │
│                   [설정 열기]  [취소]                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**파일 에러 예시**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  파일 오류                                      [X]       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  필수 언어 파일이 누락되었습니다.                            │
│                                                               │
│  필요: EN, CT, CS, JA, TH, ES, PT, RU                        │
│  누락: PT, RU                                                │
│                                                               │
│  모든 언어 파일을 선택해주세요.                              │
│                                                               │
│                          [확인]                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 6.4.3 Stitch 프롬프트

```
Create an error dialog with flexible layout:

Container:
- Size: 500px width × Auto height (min 250px, max 500px)
- Background: #FFFFFF (white)
- Border: 1px solid #F44336 (red, for errors)
- Border radius: 8px
- Padding: 24px
- Shadow: 0 4px 12px rgba(244,67,54,0.2)
- Modal: Yes (blocks interaction)

Title Bar:
- Layout: Horizontal flex
- Height: 32px
- Margin bottom: 20px

Error Icon:
- Icon: ⚠️ (warning triangle)
- Size: 24×24px
- Color: #F44336 (red)
- Position: Left of title

Title Text:
- Font: Malgun Gothic, 16px, bold
- Color: #F44336 (red)
- Margin left: 8px from icon

Close Button:
- Position: Right aligned
- Size: 24×24px
- Icon: X
- Color: #999999
- Hover: Color #333333

Message Section:
- Font: Malgun Gothic, 13px
- Color: #333333
- Line height: 1.6
- Margin bottom: 20px

Error Detail Box (optional):
- Border: 1px solid #E0E0E0
- Border radius: 4px
- Background: #FAFAFA
- Padding: 12px
- Margin bottom: 20px

Error Detail Label:
- Text: "오류 상세:"
- Font: Malgun Gothic, 11px, bold
- Color: #666666
- Margin bottom: 4px

Error Detail Text:
- Font: Consolas, 11px, monospace
- Color: #F44336 (red)
- Line height: 1.4
- Word wrap: break-all

Solution Section (optional):
- Label: "해결 방법:"
  * Font: Malgun Gothic, 13px, medium
  * Color: #666666
  * Margin bottom: 8px

Solution List:
- Layout: Numbered list
- Font: Malgun Gothic, 12px
- Color: #333333
- Line height: 1.8
- Spacing: 4px between items

Action Buttons:
- Position: Bottom center
- Layout: Horizontal, 12px spacing

Button [재시도]:
- Size: 100px × 40px
- Background: #2196F3 (blue)
- Text: "재시도"
- Font: Malgun Gothic, 13px, bold
- Color: #FFFFFF
- Border: none
- Border radius: 4px
- Hover: Background #1976D2

Button [취소] or [확인]:
- Size: 100px × 40px
- Background: #FFFFFF
- Text: "취소" or "확인"
- Font: Malgun Gothic, 13px, medium
- Color: #666666
- Border: 1px solid #CCCCCC
- Border radius: 4px
- Hover: Background #F5F5F5

Button [설정 열기] (context-specific):
- Size: 120px × 40px
- Background: #FFFFFF
- Text: "설정 열기"
- Font: Malgun Gothic, 13px, medium
- Color: #2196F3
- Border: 1px solid #2196F3
- Border radius: 4px
- Hover: Background #E3F2FD

Colors:
- Error: #F44336 (red)
- Primary: #2196F3 (blue)
- Background: #FFFFFF, #FAFAFA
- Border: #E0E0E0, #CCCCCC, #F44336
- Text: #333333, #666666, #999999
```

---

## 부록: 색상 팔레트

### 주요 색상

| 색상 | Hex Code | 용도 |
|------|----------|------|
| Primary Blue | #2196F3 | 주요 액션, 링크, 활성 요소 |
| Dark Blue | #1976D2 | Primary hover state |
| Darkest Blue | #0D47A1 | Primary active state |
| Light Blue | #E3F2FD | Inactive tab hover, 강조 배경 |
| Success Green | #4CAF50 | 성공 메시지, 완료 상태 |
| Dark Green | #45A049 | Success hover state |
| Orange | #FF9800 | 헤즈업, Daily Task |
| Dark Orange | #F57C00 | Orange hover state |
| Purple | #9C27B0 | HO, Daily Scrum |
| Dark Purple | #7B1FA2 | Purple hover state |
| Error Red | #F44336 | 오류, 실패 상태 |

### 배경 색상

| 색상 | Hex Code | 용도 |
|------|----------|------|
| White | #FFFFFF | 기본 배경, 카드 |
| Light Gray | #F5F5F5 | 페이지 배경, 푸터 |
| Very Light Gray | #F9F9F9 | 입력 필드 배경, 섹션 배경 |
| Ultra Light Gray | #FAFAFA | 로그 박스, 읽기 전용 영역 |

### 테두리 색상

| 색상 | Hex Code | 용도 |
|------|----------|------|
| Light Border | #E0E0E0 | 주요 테두리, 구분선 |
| Medium Border | #CCCCCC | 입력 필드, 버튼 테두리 |

### 텍스트 색상

| 색상 | Hex Code | 용도 |
|------|----------|------|
| Primary Text | #333333 | 주요 텍스트 |
| Secondary Text | #666666 | 라벨, 보조 텍스트 |
| Tertiary Text | #999999 | 비활성, 힌트 텍스트 |

---

## 부록: 타이포그래피

### 폰트

**주요 폰트**: Malgun Gothic (맑은 고딕)
**모노스페이스**: Consolas 또는 monospace

### 크기 및 용도

| 크기 | 용도 | 굵기 |
|------|------|------|
| 18px | 다이얼로그 타이틀 | Bold |
| 16px | 섹션 타이틀, 카드 타이틀 | Bold |
| 14px | 서브 타이틀, 강조 텍스트 | Bold / Medium |
| 13px | 기본 텍스트, 버튼 텍스트 | Medium / Bold |
| 12px | 보조 텍스트, 입력 필드 | Regular / Medium |
| 11px | 로그, 캡션 | Regular |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-11-21 | 초안 작성 - 모든 주요 화면 와이어프레임 및 Stitch 프롬프트 작성 |
| 1.1 | 2025-11-25 | 검증 완료 |
| 1.2 | 2025-11-26 | Draft 재전환, 3.1절 FBGL/L10N 동적 필드 추가, 3.9절 L10N 결과 화면 추가, PT→PT-BR 통일 |
| 1.3 | 2025-11-27 | 버전 동기화 (master.md와 일치), 변경 이력 테이블 형식 통일 |
| 1.4 | 2025-11-27 | 6장 공통 다이얼로그 섹션 추가 (초기 설정 마법사, 템플릿 편집, 확인/에러 다이얼로그), 목차 업데이트 |
| 1.5 | 2025-11-27 | PRD 문서와 시안 폴더 참조 체계 확립 |
| 1.6 | 2025-11-27 | 최종 승인: 모든 Feature 문서 v1.6 통일, Approved 상태로 전환 |
