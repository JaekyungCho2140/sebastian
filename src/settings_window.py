"""설정 화면"""
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLabel, QPushButton, QLineEdit, QWidget, QScrollArea
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
        # 인증 정보 섹션
        auth_section = self._create_auth_section()
        content_layout.addWidget(auth_section)

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
