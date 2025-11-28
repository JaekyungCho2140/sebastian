"""테이블 병합 탭 테스트"""
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


class TestTableMergeTab:
    """TableMergeTab 클래스 테스트"""

    def test_table_merge_tab_has_m4gl_dialogue_button(self, qapp):
        """M4GL DIALOGUE 병합 버튼이 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton

        tab = TableMergeTab()

        # PRD wireframes.md 4.1: M4GL DIALOGUE 병합 버튼
        button = tab.findChild(QPushButton, "m4gl_dialogue_button")
        assert button is not None, "M4GL DIALOGUE 버튼이 있어야 합니다"
        assert "DIALOGUE" in button.text(), "버튼 텍스트에 DIALOGUE가 있어야 합니다"

    def test_table_merge_tab_has_m4gl_string_button(self, qapp):
        """M4GL STRING 병합 버튼이 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton

        tab = TableMergeTab()

        button = tab.findChild(QPushButton, "m4gl_string_button")
        assert button is not None, "M4GL STRING 버튼이 있어야 합니다"
        assert "STRING" in button.text(), "버튼 텍스트에 STRING이 있어야 합니다"

    def test_table_merge_tab_has_m4gl_merge_all_button(self, qapp):
        """M4GL 통합 병합 버튼이 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton

        tab = TableMergeTab()

        button = tab.findChild(QPushButton, "m4gl_merge_all_button")
        assert button is not None, "통합 병합 버튼이 있어야 합니다"
        assert "통합" in button.text(), "버튼 텍스트에 통합이 있어야 합니다"

    def test_table_merge_tab_has_ncgl_button(self, qapp):
        """NC/GL 병합 버튼이 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton

        tab = TableMergeTab()

        button = tab.findChild(QPushButton, "ncgl_merge_button")
        assert button is not None, "NC/GL 병합 버튼이 있어야 합니다"
        assert "NC/GL" in button.text(), "버튼 텍스트에 NC/GL이 있어야 합니다"

    def test_table_merge_tab_has_lygl_buttons(self, qapp):
        """LY/GL 병합/분할 버튼이 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton

        tab = TableMergeTab()

        merge_button = tab.findChild(QPushButton, "lygl_merge_button")
        split_button = tab.findChild(QPushButton, "lygl_split_button")

        assert merge_button is not None, "LY/GL 병합 버튼이 있어야 합니다"
        assert split_button is not None, "LY/GL 분할 버튼이 있어야 합니다"

    def test_table_merge_tab_has_log_area(self, qapp):
        """로그 영역이 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QTextEdit

        tab = TableMergeTab()

        # PRD table-merge.md 2.1: 로그/결과 영역
        log_area = tab.findChild(QTextEdit, "log_area")
        assert log_area is not None, "로그 영역이 있어야 합니다"
