"""메인 윈도우 테스트"""
import pytest
from PyQt6.QtWidgets import QApplication
import sys


# QApplication 인스턴스는 테스트 세션당 1개만 필요
@pytest.fixture(scope="session")
def qapp():
    """QApplication 인스턴스 생성"""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


class TestMainWindow:
    """MainWindow 클래스 테스트"""

    def test_main_window_creates_with_title(self, qapp):
        """메인 윈도우가 제목과 함께 생성되어야 함"""
        from src.main_window import MainWindow

        window = MainWindow()

        assert window.windowTitle() == "Sebastian", "윈도우 제목이 Sebastian이어야 합니다"

    def test_main_window_has_correct_size(self, qapp):
        """메인 윈도우 크기가 900x700이어야 함"""
        from src.main_window import MainWindow

        window = MainWindow()

        # PRD wireframes.md 1.3: 900px × 700px
        assert window.width() == 900, "너비가 900이어야 합니다"
        assert window.height() == 700, "높이가 700이어야 합니다"

    def test_main_window_has_tab_widget(self, qapp):
        """탭 위젯이 있어야 함"""
        from src.main_window import MainWindow

        window = MainWindow()

        # 탭 위젯 찾기
        tab_widget = window.findChild(object, "tabs")
        assert tab_widget is not None, "탭 위젯이 있어야 합니다"

    def test_main_window_has_three_tabs(self, qapp):
        """3개의 탭이 있어야 함"""
        from src.main_window import MainWindow
        from PyQt6.QtWidgets import QTabWidget

        window = MainWindow()

        # QTabWidget 찾기
        tab_widget = window.findChild(QTabWidget)
        assert tab_widget is not None, "QTabWidget이 있어야 합니다"

        # PRD wireframes.md 1.2: 3개 탭
        assert tab_widget.count() == 3, "3개 탭이 있어야 합니다"

    def test_main_window_has_correct_tab_labels(self, qapp):
        """탭 라벨이 올바라야 함"""
        from src.main_window import MainWindow
        from PyQt6.QtWidgets import QTabWidget

        window = MainWindow()

        tab_widget = window.findChild(QTabWidget)

        # PRD wireframes.md 1.2: 일정/메시지, 테이블 병합, 관리
        assert tab_widget.tabText(0) == "일정/메시지", "첫 번째 탭이 일정/메시지여야 합니다"
        assert tab_widget.tabText(1) == "테이블 병합", "두 번째 탭이 테이블 병합이어야 합니다"
        assert tab_widget.tabText(2) == "관리", "세 번째 탭이 관리여야 합니다"

    def test_main_window_has_settings_button(self, qapp):
        """설정 버튼이 있어야 함"""
        from src.main_window import MainWindow
        from PyQt6.QtWidgets import QPushButton

        window = MainWindow()

        # PRD wireframes.md 1.2: 설정 버튼
        settings_button = window.findChild(QPushButton, "settings_button")
        assert settings_button is not None, "설정 버튼이 있어야 합니다"
        assert "설정" in settings_button.text(), "버튼 텍스트에 '설정'이 있어야 합니다"
