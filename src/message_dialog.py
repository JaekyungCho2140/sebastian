"""메시지 다이얼로그"""
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout,
    QLabel, QTextEdit, QPushButton, QWidget
)
from PyQt6.QtCore import Qt


class MessageDialog(QDialog):
    """메시지 표시 다이얼로그"""

    def __init__(self, message, parent=None):
        """MessageDialog 초기화

        Args:
            message: 메시지 딕셔너리 {"subject": str, "body": str}
            parent: 부모 위젯
        """
        super().__init__(parent)

        self.message = message

        # 다이얼로그 설정
        self.setWindowTitle("메시지")
        self.setMinimumSize(600, 500)

        # 메인 레이아웃
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        # PRD messaging.md 6.2: 제목 섹션
        subject_section = self._create_subject_section()
        layout.addWidget(subject_section)

        # PRD messaging.md 6.2: 본문 섹션
        body_section = self._create_body_section()
        layout.addWidget(body_section)

        # PRD messaging.md 6.3: 버튼 섹션
        button_section = self._create_button_section()
        layout.addLayout(button_section)

    def _create_subject_section(self):
        """제목 섹션 생성"""
        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 0, 0, 0)
        section_layout.setSpacing(8)

        # 라벨 및 복사 버튼
        header_layout = QHBoxLayout()
        label = QLabel("제목:")
        label.setStyleSheet("font-size: 13px; font-weight: bold; color: #333333;")
        header_layout.addWidget(label)

        self.subject_copy_button = QPushButton("복사")
        self.subject_copy_button.setObjectName("subject_copy_button")
        self.subject_copy_button.setFixedSize(60, 28)
        self.subject_copy_button.setStyleSheet("""
            QPushButton {
                background-color: #9E9E9E;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #757575;
            }
        """)
        self.subject_copy_button.clicked.connect(self._on_copy_subject)
        header_layout.addWidget(self.subject_copy_button)
        header_layout.addStretch()

        section_layout.addLayout(header_layout)

        # 제목 텍스트
        self.subject_edit = QTextEdit()
        self.subject_edit.setObjectName("subject_edit")
        self.subject_edit.setPlainText(self.message.get("subject", ""))
        self.subject_edit.setReadOnly(True)
        self.subject_edit.setFixedHeight(60)
        self.subject_edit.setStyleSheet("""
            QTextEdit {
                background-color: #F5F5F5;
                border: 1px solid #E0E0E0;
                border-radius: 4px;
                padding: 8px;
                font-size: 12px;
            }
        """)

        section_layout.addWidget(self.subject_edit)

        return section

    def _create_body_section(self):
        """본문 섹션 생성"""
        from PyQt6.QtWidgets import QWidget

        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 0, 0, 0)
        section_layout.setSpacing(8)

        # 라벨 및 복사 버튼
        header_layout = QHBoxLayout()
        label = QLabel("본문:")
        label.setStyleSheet("font-size: 13px; font-weight: bold; color: #333333;")
        header_layout.addWidget(label)

        self.body_copy_button = QPushButton("복사")
        self.body_copy_button.setObjectName("body_copy_button")
        self.body_copy_button.setFixedSize(60, 28)
        self.body_copy_button.setStyleSheet("""
            QPushButton {
                background-color: #9E9E9E;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #757575;
            }
        """)
        self.body_copy_button.clicked.connect(self._on_copy_body)
        header_layout.addWidget(self.body_copy_button)
        header_layout.addStretch()

        section_layout.addLayout(header_layout)

        # 본문 텍스트
        self.body_edit = QTextEdit()
        self.body_edit.setObjectName("body_edit")
        self.body_edit.setPlainText(self.message.get("body", ""))
        self.body_edit.setReadOnly(True)
        self.body_edit.setStyleSheet("""
            QTextEdit {
                background-color: #F5F5F5;
                border: 1px solid #E0E0E0;
                border-radius: 4px;
                padding: 8px;
                font-size: 12px;
            }
        """)

        section_layout.addWidget(self.body_edit)

        return section

    def _create_button_section(self):
        """버튼 섹션 생성"""
        button_layout = QHBoxLayout()
        button_layout.setSpacing(12)

        # PRD messaging.md 6.3: 전체 복사 버튼
        self.all_copy_button = QPushButton("전체 복사")
        self.all_copy_button.setObjectName("all_copy_button")
        self.all_copy_button.setFixedSize(100, 36)
        self.all_copy_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        self.all_copy_button.clicked.connect(self._on_copy_all)
        button_layout.addWidget(self.all_copy_button)

        button_layout.addStretch()

        # 닫기 버튼
        close_button = QPushButton("닫기")
        close_button.setFixedSize(80, 36)
        close_button.setStyleSheet("""
            QPushButton {
                background-color: #757575;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #616161;
            }
        """)
        close_button.clicked.connect(self.close)
        button_layout.addWidget(close_button)

        return button_layout

    def _on_copy_subject(self):
        """제목 복사"""
        from PyQt6.QtWidgets import QApplication

        clipboard = QApplication.clipboard()
        clipboard.setText(self.message.get("subject", ""))

    def _on_copy_body(self):
        """본문 복사"""
        from PyQt6.QtWidgets import QApplication

        clipboard = QApplication.clipboard()
        clipboard.setText(self.message.get("body", ""))

    def _on_copy_all(self):
        """전체 복사 (제목 + 본문)"""
        from PyQt6.QtWidgets import QApplication

        subject = self.message.get("subject", "")
        body = self.message.get("body", "")
        full_text = f"{subject}\n\n{body}"

        clipboard = QApplication.clipboard()
        clipboard.setText(full_text)
