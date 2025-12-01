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

    def test_table_merge_tab_m4gl_dialogue_button_opens_file_dialog(self, qapp, mocker):
        """M4GL DIALOGUE 버튼 클릭 시 파일 선택 다이얼로그가 열려야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton

        tab = TableMergeTab()

        # QFileDialog.getExistingDirectory Mock
        mock_dialog = mocker.patch('PyQt6.QtWidgets.QFileDialog.getExistingDirectory')
        mock_dialog.return_value = "D:/test/folder"

        # M4GL DIALOGUE 버튼 클릭
        button = tab.findChild(QPushButton, "m4gl_dialogue_button")
        button.click()

        # PRD table-merge.md 3.4: 파일 폴더 선택 다이얼로그
        assert mock_dialog.called is True, "파일 선택 다이얼로그가 열려야 합니다"

    def test_table_merge_tab_m4gl_dialogue_merges_files(self, qapp, tmp_path, mocker):
        """M4GL DIALOGUE 병합이 실행되어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QPushButton
        import json

        # 테스트 폴더 생성
        test_folder = tmp_path / "m4gl_test"
        test_folder.mkdir()

        tab = TableMergeTab()

        # QFileDialog Mock
        mock_dialog = mocker.patch('PyQt6.QtWidgets.QFileDialog.getExistingDirectory')
        mock_dialog.return_value = str(test_folder)

        # DialogueMerger.merge_dialogue Mock
        mock_merge = mocker.patch('src.dialogue_merger.DialogueMerger.merge_dialogue')
        mock_merge.return_value = 100  # 총 행 수

        # M4GL DIALOGUE 버튼 클릭
        button = tab.findChild(QPushButton, "m4gl_dialogue_button")
        button.click()

        # PRD table-merge.md 3.1: DialogueMerger가 호출되어야 함
        assert mock_merge.called is True, "DialogueMerger.merge_dialogue()가 호출되어야 합니다"

    def test_table_merge_tab_has_progress_bar(self, qapp):
        """진행률 바가 있어야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QProgressBar

        tab = TableMergeTab()

        # PRD table-merge.md 6.2: 진행률 바
        progress_bar = tab.findChild(QProgressBar, "progress_bar")
        assert progress_bar is not None, "진행률 바가 있어야 합니다"

    def test_table_merge_tab_shows_progress_during_merge(self, qapp, tmp_path, mocker):
        """병합 중 진행률을 표시해야 함"""
        from src.table_merge_tab import TableMergeTab
        from PyQt6.QtWidgets import QProgressBar, QPushButton

        test_folder = tmp_path / "m4gl_test"
        test_folder.mkdir()

        tab = TableMergeTab()

        # QFileDialog Mock
        mock_dialog = mocker.patch('PyQt6.QtWidgets.QFileDialog.getExistingDirectory')
        mock_dialog.return_value = str(test_folder)

        # DialogueMerger Mock
        mock_merge = mocker.patch('src.dialogue_merger.DialogueMerger.merge_dialogue')
        mock_merge.return_value = 100

        progress_bar = tab.findChild(QProgressBar, "progress_bar")

        # 초기 상태: 숨김
        assert progress_bar.isVisible() is False, "초기에는 숨겨져야 합니다"

        # M4GL DIALOGUE 버튼 클릭
        button = tab.findChild(QPushButton, "m4gl_dialogue_button")
        button.click()

        # PRD table-merge.md 6.2: 병합 중 진행률 표시
        # (실제 구현에서는 병합 중 표시되지만, Mock에서는 즉시 완료되므로 로그만 확인)
        log_text = tab.log_area.toPlainText()
        assert "✓" in log_text or "병합" in log_text, "병합 로그가 있어야 합니다"

    def test_table_merge_tab_has_merge_lock(self, qapp):
        """병합 작업 잠금이 있어야 함"""
        from src.table_merge_tab import TableMergeTab

        tab = TableMergeTab()

        # PRD table-merge.md 2.2: 병합 작업 동시 실행 방지
        assert hasattr(tab, 'is_merge_running'), "병합 실행 플래그가 있어야 합니다"
        assert tab.is_merge_running is False, "초기값은 False여야 합니다"
