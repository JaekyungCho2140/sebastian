"""설정 화면"""
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLabel, QPushButton, QLineEdit, QWidget, QScrollArea, QComboBox
)
from PyQt6.QtCore import Qt


class SettingsWindow(QDialog):
    """설정 화면 다이얼로그"""

    def __init__(self, parent=None):
        """SettingsWindow 초기화"""
        super().__init__(parent)

        # PRD wireframes.md 2.3: 윈도우 설정
        self.setWindowTitle("설정")
        self.setFixedSize(800, 600)
        self.setModal(True)

        # 메인 레이아웃
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 헤더
        header = self._create_header()
        main_layout.addWidget(header)

        # 스크롤 가능한 콘텐츠 영역
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("QScrollArea { border: none; }")

        # 콘텐츠 위젯
        content_widget = QWidget()
        content_layout = QVBoxLayout(content_widget)
        content_layout.setContentsMargins(24, 24, 24, 24)
        content_layout.setSpacing(32)

        # PRD wireframes.md 2.2: 섹션들
        auth_section = self._create_auth_section()
        content_layout.addWidget(auth_section)

        project_section = self._create_project_settings_section()
        content_layout.addWidget(project_section)

        template_section = self._create_template_section()
        content_layout.addWidget(template_section)

        holiday_section = self._create_holiday_section()
        content_layout.addWidget(holiday_section)

        schedule_section = self._create_schedule_section()
        content_layout.addWidget(schedule_section)

        content_layout.addStretch()

        scroll_area.setWidget(content_widget)
        main_layout.addWidget(scroll_area)

    def _create_header(self):
        """헤더 생성"""
        header = QWidget()
        header.setFixedHeight(60)
        header.setStyleSheet("background-color: #FFFFFF; border-bottom: 1px solid #E0E0E0;")

        layout = QHBoxLayout(header)
        layout.setContentsMargins(24, 0, 24, 0)

        # 제목
        title = QLabel("설정")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #333333;")
        layout.addWidget(title)

        layout.addStretch()

        # PRD wireframes.md 2.2: 저장/취소 버튼
        # 저장 버튼
        save_button = QPushButton("저장")
        save_button.setObjectName("save_button")
        save_button.setFixedSize(80, 36)
        save_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        layout.addWidget(save_button)

        # 취소 버튼
        cancel_button = QPushButton("취소")
        cancel_button.setObjectName("cancel_button")
        cancel_button.setFixedSize(80, 36)
        cancel_button.setStyleSheet("""
            QPushButton {
                background-color: #FFFFFF;
                color: #666666;
                border: 1px solid #CCCCCC;
                border-radius: 4px;
                font-size: 12px;
            }
            QPushButton:hover {
                background-color: #F5F5F5;
            }
        """)
        cancel_button.clicked.connect(self.reject)
        layout.addWidget(cancel_button)

        return header

    def _create_auth_section(self):
        """인증 정보 섹션 생성"""
        section = QWidget()
        section.setObjectName("auth_section")
        section.setStyleSheet("""
            QWidget#auth_section {
                background-color: #F9F9F9;
                border: 1px solid #E0E0E0;
                border-radius: 8px;
            }
        """)

        layout = QVBoxLayout(section)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        # 섹션 제목
        title = QLabel("▼ 인증 정보")
        title.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        layout.addWidget(title)

        # 폼 레이아웃
        form_layout = QFormLayout()
        form_layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)
        form_layout.setSpacing(12)

        # PRD wireframes.md 2.2: JIRA 필드
        jira_email = QLineEdit()
        jira_email.setObjectName("jira_email")
        jira_email.setFixedWidth(300)
        jira_email.setPlaceholderText("user@example.com")
        form_layout.addRow("JIRA Email:", jira_email)

        jira_token = QLineEdit()
        jira_token.setObjectName("jira_token")
        jira_token.setFixedWidth(300)
        jira_token.setEchoMode(QLineEdit.EchoMode.Password)
        jira_token.setPlaceholderText("API Token")

        # 테스트 버튼 추가
        jira_row = QHBoxLayout()
        jira_row.addWidget(jira_token)
        jira_test_btn = QPushButton("테스트")
        jira_test_btn.setFixedSize(80, 32)
        jira_row.addWidget(jira_test_btn)
        jira_row.addStretch()

        form_layout.addRow("JIRA API Token:", jira_row)

        # Slack 필드
        slack_token = QLineEdit()
        slack_token.setObjectName("slack_token")
        slack_token.setFixedWidth(300)
        slack_token.setEchoMode(QLineEdit.EchoMode.Password)
        slack_token.setPlaceholderText("OAuth Token")
        form_layout.addRow("Slack OAuth Token:", slack_token)

        # Confluence 필드
        confluence_email = QLineEdit()
        confluence_email.setObjectName("confluence_email")
        confluence_email.setFixedWidth(300)
        confluence_email.setPlaceholderText("user@example.com")
        form_layout.addRow("Confluence Email:", confluence_email)

        confluence_token = QLineEdit()
        confluence_token.setObjectName("confluence_token")
        confluence_token.setFixedWidth(300)
        confluence_token.setEchoMode(QLineEdit.EchoMode.Password)
        confluence_token.setPlaceholderText("API Token")
        form_layout.addRow("Confluence Token:", confluence_token)

        layout.addLayout(form_layout)

        return section

    def _create_project_settings_section(self):
        """프로젝트 설정 섹션 생성"""
        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 20, 0, 0)
        section_layout.setSpacing(12)

        title = QLabel("프로젝트 설정")
        title.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        section_layout.addWidget(title)

        form_layout = QFormLayout()
        form_layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self.project_dropdown = QComboBox()
        self.project_dropdown.setObjectName("project_settings_dropdown")
        self.project_dropdown.addItems(["M4GL", "NCGL", "FBGL", "LYGL", "L10N"])
        self.project_dropdown.setFixedWidth(200)
        form_layout.addRow("프로젝트:", self.project_dropdown)

        section_layout.addLayout(form_layout)
        return section

    def _create_template_section(self):
        """템플릿 편집 섹션 생성"""
        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 20, 0, 0)
        section_layout.setSpacing(12)

        title = QLabel("메시지 템플릿")
        title.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        section_layout.addWidget(title)

        self.template_edit_button = QPushButton("템플릿 편집")
        self.template_edit_button.setObjectName("template_edit_button")
        self.template_edit_button.setFixedSize(120, 36)
        self.template_edit_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        section_layout.addWidget(self.template_edit_button)
        return section

    def _create_holiday_section(self):
        """공휴일 관리 섹션 생성"""
        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 20, 0, 0)
        section_layout.setSpacing(12)

        title = QLabel("공휴일 관리")
        title.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        section_layout.addWidget(title)

        button_layout = QHBoxLayout()

        self.holiday_import_button = QPushButton("가져오기")
        self.holiday_import_button.setObjectName("holiday_import_button")
        self.holiday_import_button.setFixedSize(100, 36)
        self.holiday_import_button.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        button_layout.addWidget(self.holiday_import_button)

        self.holiday_export_button = QPushButton("내보내기")
        self.holiday_export_button.setObjectName("holiday_export_button")
        self.holiday_export_button.setFixedSize(100, 36)
        self.holiday_export_button.setStyleSheet("""
            QPushButton {
                background-color: #FF9800;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #F57C00;
            }
        """)
        button_layout.addWidget(self.holiday_export_button)

        button_layout.addStretch()
        section_layout.addLayout(button_layout)
        return section

    def _create_schedule_section(self):
        """스케줄 설정 섹션 생성"""
        from PyQt6.QtWidgets import QCheckBox

        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 20, 0, 0)
        section_layout.setSpacing(12)

        title = QLabel("스케줄 설정")
        title.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        section_layout.addWidget(title)

        form_layout = QFormLayout()
        form_layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        # Daily Task 체크박스
        self.daily_task_checkbox = QCheckBox("활성화")
        self.daily_task_checkbox.setObjectName("daily_task_enabled")
        self.daily_task_checkbox.setChecked(True)
        form_layout.addRow("Daily Task:", self.daily_task_checkbox)

        # Daily Scrum 체크박스
        self.daily_scrum_checkbox = QCheckBox("활성화")
        self.daily_scrum_checkbox.setObjectName("daily_scrum_enabled")
        self.daily_scrum_checkbox.setChecked(True)
        form_layout.addRow("Daily Scrum:", self.daily_scrum_checkbox)

        # Slack MSG 체크박스
        self.slack_msg_checkbox = QCheckBox("활성화")
        self.slack_msg_checkbox.setObjectName("slack_msg_enabled")
        self.slack_msg_checkbox.setChecked(True)
        form_layout.addRow("Slack MSG:", self.slack_msg_checkbox)

        section_layout.addLayout(form_layout)
        return section
