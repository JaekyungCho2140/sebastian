"""초기 설정 마법사 테스트"""
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


class TestSetupWizard:
    """SetupWizard 클래스 테스트"""

    def test_setup_wizard_creates_with_title(self, qapp):
        """초기 설정 마법사가 제목과 함께 생성되어야 함"""
        from src.setup_wizard import SetupWizard

        wizard = SetupWizard()

        # PRD shared.md 12.2: 초기 설정 마법사
        assert wizard.windowTitle() == "초기 설정", "윈도우 제목이 '초기 설정'이어야 합니다"

    def test_setup_wizard_has_pin_page(self, qapp):
        """PIN 설정 페이지가 있어야 함"""
        from src.setup_wizard import SetupWizard

        wizard = SetupWizard()

        # PRD shared.md 12.3: PIN 설정 단계
        assert hasattr(wizard, 'pin_page'), "PIN 페이지가 있어야 합니다"
        assert wizard.pin_page is not None, "PIN 페이지가 초기화되어야 합니다"

    def test_setup_wizard_validates_pin_match(self, qapp):
        """PIN과 확인 PIN이 일치해야 함"""
        from src.setup_wizard import SetupWizard

        wizard = SetupWizard()

        # PRD shared.md 12.3: PIN 일치 검증
        result = wizard.validate_pin("1234", "1234")
        assert result is True, "일치하는 PIN은 True를 반환해야 합니다"

        result_mismatch = wizard.validate_pin("1234", "5678")
        assert result_mismatch is False, "불일치하는 PIN은 False를 반환해야 합니다"

    def test_setup_wizard_has_service_pages(self, qapp):
        """서비스 연동 페이지가 있어야 함"""
        from src.setup_wizard import SetupWizard

        wizard = SetupWizard()

        # PRD shared.md 12.2: 서비스 연동 페이지
        assert hasattr(wizard, 'jira_page'), "JIRA 페이지가 있어야 합니다"
        assert hasattr(wizard, 'slack_page'), "Slack 페이지가 있어야 합니다"
