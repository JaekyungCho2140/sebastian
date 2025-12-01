"""메시지 다이얼로그 테스트"""
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


class TestMessageDialog:
    """MessageDialog 클래스 테스트"""

    def test_message_dialog_displays_subject_and_body(self, qapp):
        """메시지 다이얼로그가 제목과 본문을 표시해야 함"""
        from src.message_dialog import MessageDialog
        from PyQt6.QtWidgets import QTextEdit

        message = {
            "subject": "M4GL 250115 업데이트 일정 안내",
            "body": "안녕하세요.\n\nM4GL 2025년 1월 15일 업데이트 일정을 안내드립니다."
        }

        dialog = MessageDialog(message)

        # PRD messaging.md 6.2: 제목 영역
        subject_edit = dialog.findChild(QTextEdit, "subject_edit")
        assert subject_edit is not None, "제목 영역이 있어야 합니다"
        assert message["subject"] in subject_edit.toPlainText(), "제목이 표시되어야 합니다"

        # PRD messaging.md 6.2: 본문 영역
        body_edit = dialog.findChild(QTextEdit, "body_edit")
        assert body_edit is not None, "본문 영역이 있어야 합니다"
        assert message["body"] in body_edit.toPlainText(), "본문이 표시되어야 합니다"

    def test_message_dialog_has_copy_buttons(self, qapp):
        """메시지 다이얼로그에 복사 버튼이 있어야 함"""
        from src.message_dialog import MessageDialog
        from PyQt6.QtWidgets import QPushButton

        message = {"subject": "제목", "body": "본문"}
        dialog = MessageDialog(message)

        # PRD messaging.md 6.3: 복사 버튼
        subject_copy_btn = dialog.findChild(QPushButton, "subject_copy_button")
        body_copy_btn = dialog.findChild(QPushButton, "body_copy_button")
        all_copy_btn = dialog.findChild(QPushButton, "all_copy_button")

        assert subject_copy_btn is not None, "제목 복사 버튼이 있어야 합니다"
        assert body_copy_btn is not None, "본문 복사 버튼이 있어야 합니다"
        assert all_copy_btn is not None, "전체 복사 버튼이 있어야 합니다"

    def test_message_dialog_subject_copy_button_copies_to_clipboard(self, qapp, mocker):
        """제목 복사 버튼 클릭 시 클립보드에 복사되어야 함"""
        from src.message_dialog import MessageDialog
        from PyQt6.QtWidgets import QPushButton

        message = {"subject": "테스트 제목", "body": "테스트 본문"}
        dialog = MessageDialog(message)

        # QClipboard Mock
        mock_clipboard = mocker.patch('PyQt6.QtWidgets.QApplication.clipboard')
        mock_clipboard_instance = mocker.Mock()
        mock_clipboard.return_value = mock_clipboard_instance

        # 제목 복사 버튼 클릭
        subject_copy_btn = dialog.findChild(QPushButton, "subject_copy_button")
        subject_copy_btn.click()

        # PRD messaging.md 6.3: 클립보드에 제목만 복사
        assert mock_clipboard_instance.setText.called is True, "클립보드에 복사되어야 합니다"
        call_args = mock_clipboard_instance.setText.call_args[0]
        assert "테스트 제목" in call_args[0], "제목이 복사되어야 합니다"
