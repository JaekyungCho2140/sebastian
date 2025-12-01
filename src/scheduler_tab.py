"""일정/메시지 탭"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLabel, QComboBox, QDateEdit, QPushButton, QLineEdit, QTableWidget
)
from PyQt6.QtCore import Qt, QDate


class SchedulerTab(QWidget):
    """일정/메시지 탭 위젯"""

    def __init__(self):
        """SchedulerTab 초기화"""
        super().__init__()

        # 메인 레이아웃
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)

        # 제목
        title = QLabel("자동 일정 계산기")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #333333;")
        layout.addWidget(title)

        # 입력 폼
        form_widget = self._create_input_form()
        layout.addWidget(form_widget)

        # 계산 버튼
        calc_button = QPushButton("계산")
        calc_button.setObjectName("calculate_button")
        calc_button.setFixedSize(120, 40)
        calc_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        calc_button.clicked.connect(self._on_calculate)

        layout.addWidget(calc_button, alignment=Qt.AlignmentFlag.AlignCenter)

        # PRD wireframes.md 3.2: 일정 결과 테이블
        result_section = self._create_result_section()
        layout.addWidget(result_section)

        layout.addStretch()

    def _create_input_form(self):
        """입력 폼 생성"""
        form_widget = QWidget()
        form_layout = QFormLayout(form_widget)
        form_layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)
        form_layout.setSpacing(16)

        # PRD wireframes.md 3.1: 프로젝트 드롭다운
        self.project_dropdown = QComboBox()
        self.project_dropdown.setObjectName("project_dropdown")
        self.project_dropdown.addItems(["M4GL", "NCGL", "FBGL", "LYGL", "L10N"])
        self.project_dropdown.setFixedWidth(200)
        self.project_dropdown.currentTextChanged.connect(self._on_project_changed)
        form_layout.addRow("프로젝트:", self.project_dropdown)

        # PRD wireframes.md 3.1: 업데이트일 날짜 선택기
        self.date_picker = QDateEdit()
        self.date_picker.setObjectName("date_picker")
        self.date_picker.setCalendarPopup(True)
        self.date_picker.setDate(QDate.currentDate())
        self.date_picker.setFixedWidth(200)
        self.date_label = QLabel("업데이트일:")
        form_layout.addRow(self.date_label, self.date_picker)

        # PRD wireframes.md 3.1: 마일스톤 입력 (NCGL만)
        self.milestone_input = QLineEdit()
        self.milestone_input.setObjectName("milestone_input")
        self.milestone_input.setPlaceholderText("M42")
        self.milestone_input.setFixedWidth(200)
        self.milestone_label = QLabel("마일스톤:")
        form_layout.addRow(self.milestone_label, self.milestone_input)

        # PRD scheduler.md 2.2: 배포 유형 드롭다운 (FBGL만)
        self.deployment_type_dropdown = QComboBox()
        self.deployment_type_dropdown.setObjectName("deployment_type_dropdown")
        self.deployment_type_dropdown.addItems(["CDN", "APP"])
        self.deployment_type_dropdown.setFixedWidth(200)
        self.deployment_type_label = QLabel("배포 유형:")
        form_layout.addRow(self.deployment_type_label, self.deployment_type_dropdown)

        # 초기 상태 설정 (M4GL 기본값이므로 마일스톤, 배포 유형 숨김)
        self.milestone_label.setVisible(False)
        self.milestone_input.setVisible(False)
        self.deployment_type_label.setVisible(False)
        self.deployment_type_dropdown.setVisible(False)

        return form_widget

    def _on_project_changed(self, project):
        """프로젝트 변경 시 처리"""
        # PRD wireframes.md 3.1: 동적 필드 표시/숨김

        # 마일스톤 (NCGL만)
        if project == "NCGL":
            self.milestone_label.setVisible(True)
            self.milestone_input.setVisible(True)
        else:
            self.milestone_label.setVisible(False)
            self.milestone_input.setVisible(False)

        # 배포 유형 (FBGL만)
        if project == "FBGL":
            self.deployment_type_label.setVisible(True)
            self.deployment_type_dropdown.setVisible(True)
        else:
            self.deployment_type_label.setVisible(False)
            self.deployment_type_dropdown.setVisible(False)

        # PRD wireframes.md 3.1: L10N 선택 시 레이블 변경
        if project == "L10N":
            self.date_label.setText("정산 마감일:")
        else:
            self.date_label.setText("업데이트일:")

    def _create_result_section(self):
        """결과 섹션 생성"""
        self.result_widget = QWidget()
        result_layout = QVBoxLayout(self.result_widget)
        result_layout.setContentsMargins(0, 20, 0, 0)
        result_layout.setSpacing(12)

        # 결과 제목
        result_title = QLabel("결과:")
        result_title.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        result_layout.addWidget(result_title)

        # 결과 테이블
        self.result_table = QTableWidget()
        self.result_table.setObjectName("result_table")
        self.result_table.setColumnCount(3)
        self.result_table.setHorizontalHeaderLabels(["마일스톤", "시작일", "종료일"])
        self.result_table.setMaximumHeight(300)
        result_layout.addWidget(self.result_table)

        # PRD wireframes.md 3.2: 액션 버튼
        button_layout = self._create_action_buttons()
        result_layout.addLayout(button_layout)

        # 초기에는 전체 섹션 숨김
        self.result_widget.setVisible(False)

        return self.result_widget

    def _create_action_buttons(self):
        """액션 버튼 생성"""
        button_layout = QHBoxLayout()
        button_layout.setSpacing(12)

        # JIRA 일감 생성 버튼
        self.jira_button = QPushButton("JIRA 일감 생성")
        self.jira_button.setObjectName("jira_button")
        self.jira_button.setFixedSize(150, 40)
        self.jira_button.setEnabled(False)  # 초기 비활성화
        self.jira_button.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover:enabled {
                background-color: #45a049;
            }
            QPushButton:disabled {
                background-color: #CCCCCC;
                color: #666666;
            }
        """)
        self.jira_button.clicked.connect(self._on_create_jira)
        button_layout.addWidget(self.jira_button)

        # 폴더 생성 버튼
        self.folder_button = QPushButton("폴더 생성")
        self.folder_button.setObjectName("folder_button")
        self.folder_button.setFixedSize(150, 40)
        self.folder_button.setEnabled(False)  # 초기 비활성화
        self.folder_button.setStyleSheet("""
            QPushButton {
                background-color: #FF9800;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover:enabled {
                background-color: #F57C00;
            }
            QPushButton:disabled {
                background-color: #CCCCCC;
                color: #666666;
            }
        """)
        self.folder_button.clicked.connect(self._on_create_folder)
        button_layout.addWidget(self.folder_button)

        # 헤즈업 버튼
        self.headsup_button = QPushButton("헤즈업")
        self.headsup_button.setObjectName("headsup_button")
        self.headsup_button.setFixedSize(120, 40)
        self.headsup_button.setEnabled(False)  # 초기 비활성화
        self.headsup_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover:enabled {
                background-color: #1976D2;
            }
            QPushButton:disabled {
                background-color: #CCCCCC;
                color: #666666;
            }
        """)
        self.headsup_button.clicked.connect(self._on_show_headsup)
        button_layout.addWidget(self.headsup_button)

        # HO 버튼
        self.ho_button = QPushButton("HO")
        self.ho_button.setObjectName("ho_button")
        self.ho_button.setFixedSize(120, 40)
        self.ho_button.setEnabled(False)  # 초기 비활성화
        self.ho_button.setStyleSheet("""
            QPushButton {
                background-color: #9C27B0;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover:enabled {
                background-color: #7B1FA2;
            }
            QPushButton:disabled {
                background-color: #CCCCCC;
                color: #666666;
            }
        """)
        self.ho_button.clicked.connect(self._on_show_ho_menu)
        button_layout.addWidget(self.ho_button)

        button_layout.addStretch()

        return button_layout

    def _on_show_ho_menu(self):
        """HO 버튼 클릭 시 배치 선택 메뉴 표시"""
        from PyQt6.QtWidgets import QMenu
        from src.message_generator import MessageGenerator
        from src.template_manager import TemplateManager

        # 저장된 일정 결과 확인
        if not hasattr(self, 'current_schedule_result'):
            return

        # PRD messaging.md 6.1: 배치 선택 메뉴 생성
        menu = QMenu(self)
        menu.addAction("REGULAR")
        menu.addAction("EXTRA0")
        menu.addAction("EXTRA1")

        # 메뉴 표시 및 선택
        action = menu.exec(self.ho_button.mapToGlobal(self.ho_button.rect().bottomLeft()))

        if not action:
            return

        # 선택된 배치
        batch_name = action.text()

        # 템플릿 로드
        template_manager = getattr(self, 'template_manager', None)
        if not template_manager:
            print(f"템플릿 관리자가 설정되지 않았습니다")
            return

        project = self.current_schedule_result["project"]
        template = template_manager.get_template(project, "handoff")

        if not template:
            print(f"HO 템플릿을 찾을 수 없습니다: {project}")
            return

        # HO 메시지 생성
        message_generator = MessageGenerator()
        message = message_generator.generate_handoff(
            self.current_schedule_result,
            batch_name,
            template
        )

        # PRD messaging.md 6.2: 메시지 다이얼로그 표시
        from src.message_dialog import MessageDialog
        dialog = MessageDialog(message, self)
        dialog.exec()

    def _on_show_headsup(self):
        """헤즈업 버튼 클릭 시 처리"""
        from src.message_generator import MessageGenerator

        # 저장된 일정 결과 확인
        if not hasattr(self, 'current_schedule_result'):
            return

        # 템플릿 로드
        template_manager = getattr(self, 'template_manager', None)
        if not template_manager:
            print(f"템플릿 관리자가 설정되지 않았습니다")
            return

        project = self.current_schedule_result["project"]
        template = template_manager.get_template(project, "headsup")

        if not template:
            print(f"헤즈업 템플릿을 찾을 수 없습니다: {project}")
            return

        # 메시지 생성
        message_generator = MessageGenerator()
        message = message_generator.generate_headsup(self.current_schedule_result, template)

        # PRD messaging.md 6.2: 메시지 다이얼로그 표시
        from src.message_dialog import MessageDialog
        dialog = MessageDialog(message, self)
        dialog.exec()

    def _on_create_folder(self):
        """폴더 생성 버튼 클릭 시 처리"""
        from src.folder_creator import FolderCreator

        # 저장된 일정 결과 확인
        if not hasattr(self, 'current_schedule_result'):
            return

        # 프로젝트 설정 로드
        if not hasattr(self, 'project_manager'):
            return

        project = self.current_schedule_result["project"]
        project_config = self.project_manager.get_project(project)

        if not project_config:
            print(f"프로젝트 설정을 찾을 수 없습니다: {project}")
            return

        # NAS 경로 확인
        nas_path = project_config.get("nas_path")

        if not nas_path:
            print(f"NAS 경로가 설정되지 않았습니다")
            return

        # 폴더 생성
        folder_creator = FolderCreator()
        folder_list = folder_creator.build_folder_structure(
            self.current_schedule_result,
            project_config
        )

        success = folder_creator.create_folders(nas_path, folder_list)

        # TODO: Phase 9에서 결과 다이얼로그 표시
        if success:
            print(f"폴더 생성 완료: {len(folder_list)}개")
        else:
            print(f"폴더 생성 실패")

    def _on_create_jira(self):
        """JIRA 일감 생성 버튼 클릭 시 처리"""
        from src.jira_creator import JiraCreator
        from src.jira_client import JiraClient
        from src.auth_manager import AuthManager

        # 저장된 일정 결과 확인
        if not hasattr(self, 'current_schedule_result'):
            return

        # 인증 정보 로드
        auth_manager = AuthManager()
        jira_email, jira_token = auth_manager.get_jira_credentials()

        if not jira_email or not jira_token:
            # TODO: Phase 9에서 에러 다이얼로그 표시
            print("JIRA 인증 정보가 없습니다")
            return

        # JIRA 일감 생성
        base_url = "https://wemade.atlassian.net"  # PRD에서 정의된 JIRA URL
        jira_client = JiraClient(base_url, jira_email, jira_token)
        jira_creator = JiraCreator(jira_client)

        success, created_keys = jira_creator.create_all_issues(self.current_schedule_result)

        # TODO: Phase 9에서 결과 다이얼로그 표시
        if success:
            print(f"JIRA 일감 생성 완료: {created_keys}")
        else:
            print(f"JIRA 일감 생성 실패")

    def display_schedule_result(self, schedule_result):
        """일정 계산 결과를 테이블에 표시"""
        # 일정 결과 저장
        self.current_schedule_result = schedule_result

        # 결과 섹션 및 테이블 표시
        self.result_widget.setVisible(True)
        self.result_table.setVisible(True)

        # 테이블 초기화
        self.result_table.setRowCount(0)

        # 액션 버튼 활성화
        self.jira_button.setEnabled(True)
        self.folder_button.setEnabled(True)
        self.headsup_button.setEnabled(True)
        self.ho_button.setEnabled(True)

        # PRD scheduler.md 2.3: 마일스톤별 시작일/종료일 테이블
        rows = []

        # 헤즈업 Task
        if "헤즈업" in schedule_result.get("tasks", {}):
            task = schedule_result["tasks"]["헤즈업"]
            rows.append({
                "milestone": "헤즈업",
                "start": self._format_date_short(task["start"]),
                "due": self._format_date_short(task["due"])
            })

        # REGULAR Task 및 Subtasks
        if "REGULAR" in schedule_result.get("tasks", {}):
            task = schedule_result["tasks"]["REGULAR"]
            for subtask_name, subtask in task.get("subtasks", {}).items():
                rows.append({
                    "milestone": f"REGULAR {subtask_name}",
                    "start": self._format_date_short(subtask["start"]),
                    "due": self._format_date_short(subtask["due"])
                })

        # EXTRA0 Task 및 Subtasks
        if "EXTRA0" in schedule_result.get("tasks", {}):
            task = schedule_result["tasks"]["EXTRA0"]
            for subtask_name, subtask in task.get("subtasks", {}).items():
                rows.append({
                    "milestone": f"EXTRA0 {subtask_name}",
                    "start": self._format_date_short(subtask["start"]),
                    "due": self._format_date_short(subtask["due"])
                })

        # EXTRA1 Task 및 Subtasks
        if "EXTRA1" in schedule_result.get("tasks", {}):
            task = schedule_result["tasks"]["EXTRA1"]
            for subtask_name, subtask in task.get("subtasks", {}).items():
                rows.append({
                    "milestone": f"EXTRA1 {subtask_name}",
                    "start": self._format_date_short(subtask["start"]),
                    "due": self._format_date_short(subtask["due"])
                })

        # 테이블에 행 추가
        self.result_table.setRowCount(len(rows))
        for row_idx, row_data in enumerate(rows):
            self.result_table.setItem(row_idx, 0, self._create_table_item(row_data["milestone"]))
            self.result_table.setItem(row_idx, 1, self._create_table_item(row_data["start"]))
            self.result_table.setItem(row_idx, 2, self._create_table_item(row_data["due"]))

    def _format_date_short(self, iso_date_str):
        """ISO8601 날짜를 MM/dd 형식으로 변환"""
        # 예: "2025-01-08T09:30:00.000+0900" → "01/08"
        from datetime import datetime
        dt = datetime.fromisoformat(iso_date_str.replace("+0900", "+09:00"))
        return dt.strftime("%m/%d")

    def _create_table_item(self, text):
        """테이블 아이템 생성"""
        from PyQt6.QtWidgets import QTableWidgetItem
        item = QTableWidgetItem(str(text))
        item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)  # 읽기 전용
        return item

    def _on_calculate(self):
        """계산 버튼 클릭 시 처리"""
        from src.schedule_calculator import ScheduleCalculator
        from datetime import date

        # 프로젝트 및 날짜 가져오기
        project = self.project_dropdown.currentText()
        qdate = self.date_picker.date()
        update_date = date(qdate.year(), qdate.month(), qdate.day())

        # 공휴일 로드
        holidays = []
        if hasattr(self, 'holiday_manager'):
            holidays = self.holiday_manager.get_holidays(update_date.year)

        # 일정 계산
        calculator = ScheduleCalculator(
            project_manager=getattr(self, 'project_manager', None)
        )

        schedule_result = None
        if project == "M4GL":
            schedule_result = calculator.calculate_m4gl(update_date, holidays)
        elif project == "NCGL":
            milestone = self.milestone_input.text() or "M1"
            schedule_result = calculator.calculate_ncgl(update_date, milestone, holidays)
        elif project == "FBGL":
            # PRD scheduler.md 2.2: 배포 유형 선택
            deployment_type = self.deployment_type_dropdown.currentText()
            schedule_result = calculator.calculate_fbgl(update_date, deployment_type, holidays)
        elif project == "LYGL":
            schedule_result = calculator.calculate_lygl(update_date, holidays)
        elif project == "L10N":
            schedule_result = calculator.calculate_l10n(update_date, holidays)

        # 결과 표시
        if schedule_result:
            self.display_schedule_result(schedule_result)
