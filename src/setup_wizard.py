"""초기 설정 마법사"""
from PyQt6.QtWidgets import (
    QWizard, QWizardPage, QVBoxLayout, QFormLayout,
    QLabel, QLineEdit, QPushButton
)
from PyQt6.QtCore import Qt


class SetupWizard(QWizard):
    """초기 설정 마법사"""

    def __init__(self, parent=None):
        """SetupWizard 초기화"""
        super().__init__(parent)

        # PRD shared.md 12.2: 초기 설정 마법사
        self.setWindowTitle("초기 설정")
        self.setFixedSize(600, 500)
        self.setWizardStyle(QWizard.WizardStyle.ModernStyle)

        # PRD shared.md 12.2: 5단계 마법사
        # 1. PIN 설정
        self.pin_page = self._create_pin_page()
        self.addPage(self.pin_page)

        # 2. JIRA 연동
        self.jira_page = self._create_jira_page()
        self.addPage(self.jira_page)

        # 3. Slack 연동
        self.slack_page = self._create_slack_page()
        self.addPage(self.slack_page)

        # 4. Confluence 연동 (간소화 - 필요시 추가)
        # 5. 기본 프로젝트 (간소화 - 필요시 추가)

    def _create_pin_page(self):
        """PIN 설정 페이지 생성"""
        page = QWizardPage()
        page.setTitle("PIN 설정")
        page.setSubTitle("민감한 설정 변경 시 사용할 4자리 PIN을 설정합니다.")

        layout = QVBoxLayout(page)
        form_layout = QFormLayout()

        # PIN 입력
        self.pin_input = QLineEdit()
        self.pin_input.setMaxLength(4)
        self.pin_input.setEchoMode(QLineEdit.EchoMode.Password)
        form_layout.addRow("PIN (4자리):", self.pin_input)

        # PIN 확인
        self.pin_confirm = QLineEdit()
        self.pin_confirm.setMaxLength(4)
        self.pin_confirm.setEchoMode(QLineEdit.EchoMode.Password)
        form_layout.addRow("PIN 확인:", self.pin_confirm)

        layout.addLayout(form_layout)

        return page

    def _create_jira_page(self):
        """JIRA 연동 페이지 생성"""
        page = QWizardPage()
        page.setTitle("JIRA 연동")
        page.setSubTitle("JIRA 인증 정보를 입력하고 연결 테스트를 진행합니다.")

        layout = QVBoxLayout(page)
        form_layout = QFormLayout()

        # JIRA Email
        self.jira_email = QLineEdit()
        form_layout.addRow("Email:", self.jira_email)

        # JIRA Token
        self.jira_token = QLineEdit()
        self.jira_token.setEchoMode(QLineEdit.EchoMode.Password)
        form_layout.addRow("API Token:", self.jira_token)

        layout.addLayout(form_layout)

        # 연결 테스트 버튼
        test_button = QPushButton("연결 테스트")
        test_button.clicked.connect(self._test_jira_connection)
        layout.addWidget(test_button)

        return page

    def _create_slack_page(self):
        """Slack 연동 페이지 생성"""
        page = QWizardPage()
        page.setTitle("Slack 연동")
        page.setSubTitle("Slack 인증 정보를 입력합니다.")

        layout = QVBoxLayout(page)
        form_layout = QFormLayout()

        # Slack Token
        self.slack_token = QLineEdit()
        self.slack_token.setEchoMode(QLineEdit.EchoMode.Password)
        form_layout.addRow("OAuth Token:", self.slack_token)

        layout.addLayout(form_layout)

        return page

    def validate_pin(self, pin, confirm_pin):
        """PIN 일치 검증

        Args:
            pin: PIN
            confirm_pin: 확인 PIN

        Returns:
            bool: 일치하면 True
        """
        return pin == confirm_pin

    def _test_jira_connection(self):
        """JIRA 연결 테스트"""
        # TODO: AuthManager.test_jira_connection() 연동
        pass
