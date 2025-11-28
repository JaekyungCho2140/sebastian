"""일정/메시지 탭 테스트"""
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


class TestSchedulerTab:
    """SchedulerTab 클래스 테스트"""

    def test_scheduler_tab_has_project_dropdown(self, qapp):
        """프로젝트 드롭다운이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        # PRD wireframes.md 3.1: 프로젝트 드롭다운
        project_dropdown = tab.findChild(QComboBox, "project_dropdown")
        assert project_dropdown is not None, "프로젝트 드롭다운이 있어야 합니다"

    def test_scheduler_tab_has_date_picker(self, qapp):
        """업데이트일 날짜 선택기가 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QDateEdit

        tab = SchedulerTab()

        # PRD wireframes.md 3.1: 업데이트일 날짜 선택기
        date_picker = tab.findChild(QDateEdit, "date_picker")
        assert date_picker is not None, "날짜 선택기가 있어야 합니다"

    def test_scheduler_tab_has_calculate_button(self, qapp):
        """계산 버튼이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        # PRD wireframes.md 3.1: 계산 버튼
        calc_button = tab.findChild(QPushButton, "calculate_button")
        assert calc_button is not None, "계산 버튼이 있어야 합니다"
        assert "계산" in calc_button.text(), "버튼 텍스트에 '계산'이 있어야 합니다"

    def test_scheduler_tab_project_dropdown_has_options(self, qapp):
        """프로젝트 드롭다운에 5개 옵션이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        project_dropdown = tab.findChild(QComboBox, "project_dropdown")

        # PRD wireframes.md 3.1: M4GL, NCGL, FBGL, LYGL, L10N
        assert project_dropdown.count() == 5, "5개 프로젝트 옵션이 있어야 합니다"

        items = [project_dropdown.itemText(i) for i in range(project_dropdown.count())]
        assert "M4GL" in items, "M4GL 옵션이 있어야 합니다"
        assert "NCGL" in items, "NCGL 옵션이 있어야 합니다"
        assert "FBGL" in items, "FBGL 옵션이 있어야 합니다"
        assert "LYGL" in items, "LYGL 옵션이 있어야 합니다"
        assert "L10N" in items, "L10N 옵션이 있어야 합니다"

    def test_scheduler_tab_shows_milestone_for_ncgl(self, qapp):
        """NCGL 선택 시 마일스톤 입력이 표시되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QLineEdit

        tab = SchedulerTab()
        tab.show()  # 위젯을 표시해야 isVisible()이 정상 작동

        milestone_input = tab.findChild(QLineEdit, "milestone_input")
        milestone_label = tab.milestone_label

        assert milestone_input is not None, "마일스톤 입력이 있어야 합니다"

        # 초기 상태는 숨김
        assert milestone_input.isVisible() is False, "초기에는 숨겨져야 합니다"
        assert milestone_label.isVisible() is False, "라벨도 숨겨져야 합니다"

        # NCGL 선택 - 직접 메서드 호출
        tab._on_project_changed("NCGL")

        # PRD wireframes.md 3.1: NCGL 선택 시 마일스톤 표시
        assert milestone_input.isVisible() is True, "NCGL 선택 시 마일스톤이 보여야 합니다"
        assert milestone_label.isVisible() is True, "라벨도 보여야 합니다"

    def test_scheduler_tab_hides_milestone_for_m4gl(self, qapp):
        """M4GL 선택 시 마일스톤이 숨겨져야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QLineEdit

        tab = SchedulerTab()

        milestone_input = tab.findChild(QLineEdit, "milestone_input")

        # M4GL 선택
        tab._on_project_changed("M4GL")

        # PRD wireframes.md 3.1: M4GL은 마일스톤 없음
        assert milestone_input.isVisible() is False, "M4GL 선택 시 마일스톤이 숨겨져야 합니다"
