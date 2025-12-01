"""설정 화면 테스트"""
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


class TestSettingsWindow:
    """SettingsWindow 클래스 테스트"""

    def test_settings_window_creates_with_title(self, qapp):
        """설정 윈도우가 제목과 함께 생성되어야 함"""
        from src.settings_window import SettingsWindow

        window = SettingsWindow()

        assert window.windowTitle() == "설정", "윈도우 제목이 '설정'이어야 합니다"

    def test_settings_window_has_correct_size(self, qapp):
        """설정 윈도우 크기가 800x600이어야 함"""
        from src.settings_window import SettingsWindow

        window = SettingsWindow()

        # PRD wireframes.md 2.3: 800px × 600px
        assert window.width() == 800, "너비가 800이어야 합니다"
        assert window.height() == 600, "높이가 600이어야 합니다"

    def test_settings_window_has_save_button(self, qapp):
        """저장 버튼이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QPushButton

        window = SettingsWindow()

        # PRD wireframes.md 2.2: 저장 버튼
        save_button = window.findChild(QPushButton, "save_button")
        assert save_button is not None, "저장 버튼이 있어야 합니다"
        assert "저장" in save_button.text(), "버튼 텍스트에 '저장'이 있어야 합니다"

    def test_settings_window_has_cancel_button(self, qapp):
        """취소 버튼이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QPushButton

        window = SettingsWindow()

        # PRD wireframes.md 2.2: 취소 버튼
        cancel_button = window.findChild(QPushButton, "cancel_button")
        assert cancel_button is not None, "취소 버튼이 있어야 합니다"
        assert "취소" in cancel_button.text(), "버튼 텍스트에 '취소'가 있어야 합니다"

    def test_settings_window_has_auth_section(self, qapp):
        """인증 정보 섹션이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QWidget

        window = SettingsWindow()

        # PRD wireframes.md 2.2: 인증 정보 섹션
        auth_section = window.findChild(QWidget, "auth_section")
        assert auth_section is not None, "인증 정보 섹션이 있어야 합니다"

    def test_settings_window_has_jira_fields(self, qapp):
        """JIRA 인증 필드가 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QLineEdit

        window = SettingsWindow()

        # PRD wireframes.md 2.2: JIRA 필드
        jira_email = window.findChild(QLineEdit, "jira_email")
        jira_token = window.findChild(QLineEdit, "jira_token")

        assert jira_email is not None, "JIRA 이메일 필드가 있어야 합니다"
        assert jira_token is not None, "JIRA 토큰 필드가 있어야 합니다"

    def test_settings_window_has_project_settings_section(self, qapp):
        """프로젝트 설정 섹션이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QComboBox

        window = SettingsWindow()

        # PRD shared.md 3.1: 프로젝트 드롭다운
        project_dropdown = window.findChild(QComboBox, "project_settings_dropdown")
        assert project_dropdown is not None, "프로젝트 드롭다운이 있어야 합니다"

    def test_settings_window_has_template_edit_button(self, qapp):
        """템플릿 편집 버튼이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QPushButton

        window = SettingsWindow()

        # PRD messaging.md 3.2.3: 템플릿 편집 버튼
        template_edit_btn = window.findChild(QPushButton, "template_edit_button")
        assert template_edit_btn is not None, "템플릿 편집 버튼이 있어야 합니다"

    def test_settings_window_has_holiday_buttons(self, qapp):
        """공휴일 관리 버튼이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QPushButton

        window = SettingsWindow()

        # PRD scheduler.md 2.5: 공휴일 가져오기/내보내기
        import_btn = window.findChild(QPushButton, "holiday_import_button")
        export_btn = window.findChild(QPushButton, "holiday_export_button")

        assert import_btn is not None, "공휴일 가져오기 버튼이 있어야 합니다"
        assert export_btn is not None, "공휴일 내보내기 버튼이 있어야 합니다"

    def test_settings_window_has_schedule_section(self, qapp):
        """스케줄 설정 섹션이 있어야 함"""
        from src.settings_window import SettingsWindow
        from PyQt6.QtWidgets import QCheckBox

        window = SettingsWindow()

        # PRD l10n-admin.md 2.2: 스케줄 활성화 체크박스
        daily_task_checkbox = window.findChild(QCheckBox, "daily_task_enabled")
        daily_scrum_checkbox = window.findChild(QCheckBox, "daily_scrum_enabled")
        slack_msg_checkbox = window.findChild(QCheckBox, "slack_msg_enabled")

        assert daily_task_checkbox is not None, "Daily Task 활성화 체크박스가 있어야 합니다"
        assert daily_scrum_checkbox is not None, "Daily Scrum 활성화 체크박스가 있어야 합니다"
        assert slack_msg_checkbox is not None, "Slack MSG 활성화 체크박스가 있어야 합니다"
