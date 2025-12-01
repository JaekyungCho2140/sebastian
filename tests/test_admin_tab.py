"""관리 탭 테스트"""
import pytest
from PyQt6.QtWidgets import QApplication
import sys


@pytest.fixture(scope="session")
def qapp():
    """QApplication 인스턴스 생성"""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


class TestAdminTab:
    """AdminTab 클래스 테스트"""

    def test_admin_tab_has_daily_task_card(self, qapp):
        """Daily Task 카드가 있어야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QWidget

        tab = AdminTab()

        # PRD wireframes.md 5.1: Daily Task 카드
        card = tab.findChild(QWidget, "daily_task_card")
        assert card is not None, "Daily Task 카드가 있어야 합니다"

    def test_admin_tab_has_daily_scrum_card(self, qapp):
        """Daily Scrum 카드가 있어야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QWidget

        tab = AdminTab()

        card = tab.findChild(QWidget, "daily_scrum_card")
        assert card is not None, "Daily Scrum 카드가 있어야 합니다"

    def test_admin_tab_has_slack_msg_card(self, qapp):
        """Slack MSG 카드가 있어야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QWidget

        tab = AdminTab()

        card = tab.findChild(QWidget, "slack_msg_card")
        assert card is not None, "Slack MSG 카드가 있어야 합니다"

    def test_admin_tab_has_execute_buttons(self, qapp):
        """각 카드에 실행 버튼이 있어야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QPushButton

        tab = AdminTab()

        # PRD wireframes.md 5.1: [지금 실행] 버튼
        daily_task_btn = tab.findChild(QPushButton, "daily_task_execute")
        daily_scrum_btn = tab.findChild(QPushButton, "daily_scrum_execute")
        slack_msg_btn = tab.findChild(QPushButton, "slack_msg_execute")

        assert daily_task_btn is not None, "Daily Task 실행 버튼이 있어야 합니다"
        assert daily_scrum_btn is not None, "Daily Scrum 실행 버튼이 있어야 합니다"
        assert slack_msg_btn is not None, "Slack MSG 실행 버튼이 있어야 합니다"

    def test_admin_tab_has_log_area(self, qapp):
        """실행 로그 영역이 있어야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QTextEdit

        tab = AdminTab()

        # PRD wireframes.md 5.1: 실행 로그
        log_area = tab.findChild(QTextEdit, "admin_log_area")
        assert log_area is not None, "로그 영역이 있어야 합니다"

    def test_admin_tab_daily_task_button_executes_task(self, qapp, mocker):
        """Daily Task 버튼 클릭 시 작업을 실행해야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QPushButton, QTextEdit

        tab = AdminTab()

        # AuthManager Mock
        mock_auth = mocker.patch('src.auth_manager.AuthManager.get_confluence_credentials')
        mock_auth.return_value = ("test@example.com", "test_token")

        # HolidayManager Mock
        mock_holidays = mocker.patch('src.holiday_manager.HolidayManager.get_holidays')
        mock_holidays.return_value = []

        # DateCalculator Mock
        mock_business_days = mocker.patch('src.date_calculator.DateCalculator.get_business_days')
        mock_business_days.return_value = [1, 2, 3]  # 3개 영업일

        # ConfluenceClient Mock
        mock_get_page = mocker.patch('src.confluence_client.ConfluenceClient.get_page')
        mock_get_page.return_value = {"id": "190906620", "version": {"number": 1}}

        # Daily Task 실행 버튼 클릭
        button = tab.findChild(QPushButton, "daily_task_execute")

        # 로그 확인을 위해 QTextEdit 찾기
        log_area = tab.findChild(QTextEdit, "admin_log_area")

        button.click()

        # 로그 출력 확인
        log_text = log_area.toPlainText()
        print(f"DEBUG: Log output = {log_text}")

        # PRD l10n-admin.md 3.2: Confluence API 호출되어야 함
        assert mock_get_page.called is True, "ConfluenceClient.get_page()가 호출되어야 합니다"

    def test_admin_tab_daily_scrum_button_executes_task(self, qapp, mocker):
        """Daily Scrum 버튼 클릭 시 작업을 실행해야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QPushButton

        tab = AdminTab()

        # AuthManager Mock
        mock_auth = mocker.patch('src.auth_manager.AuthManager.get_confluence_credentials')
        mock_auth.return_value = ("test@example.com", "test_token")

        # ConfluenceClient Mock
        mock_get_page = mocker.patch('src.confluence_client.ConfluenceClient.get_page')
        mock_get_page.return_value = {"id": "191332855", "version": {"number": 1}, "body": {"atlas_doc_format": {"value": "{}"}}}

        # Daily Scrum 실행 버튼 클릭
        button = tab.findChild(QPushButton, "daily_scrum_execute")
        button.click()

        # PRD l10n-admin.md 4.2: Confluence API 호출되어야 함
        assert mock_get_page.called is True, "ConfluenceClient.get_page()가 호출되어야 합니다"

    def test_admin_tab_slack_msg_button_executes_task(self, qapp, mocker):
        """Slack MSG 버튼 클릭 시 메시지를 발송해야 함"""
        from src.admin_tab import AdminTab
        from PyQt6.QtWidgets import QPushButton, QTextEdit

        tab = AdminTab()

        # AuthManager Mock
        mock_auth = mocker.patch('src.auth_manager.AuthManager.get_slack_credentials')
        mock_auth.return_value = "test_token"

        # SlackMsgGenerator Mock
        mock_format1 = mocker.patch('src.slack_msg_generator.SlackMsgGenerator.format_message_1')
        mock_format1.return_value = "01/15(수) 업무 출근은 찍었나요?"

        mock_format2 = mocker.patch('src.slack_msg_generator.SlackMsgGenerator.format_message_2')
        mock_format2.return_value = "01/15(수) ## 잡담"

        # SlackClient Mock
        mock_post_message = mocker.patch('src.slack_client.SlackClient.post_message')
        mock_post_message.return_value = True

        # Slack MSG 실행 버튼 클릭
        button = tab.findChild(QPushButton, "slack_msg_execute")

        log_area = tab.findChild(QTextEdit, "admin_log_area")
        button.click()

        # 로그 출력 확인
        log_text = log_area.toPlainText()
        print(f"DEBUG: Slack MSG log = {log_text}")

        # PRD l10n-admin.md 5.2: SlackClient 호출되어야 함 (2회 - 메시지 2개)
        assert mock_post_message.call_count >= 1, "SlackClient.post_message()가 호출되어야 합니다"
