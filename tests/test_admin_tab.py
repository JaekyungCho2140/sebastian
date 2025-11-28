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
