"""테이블 병합 탭"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QTextEdit
)
from PyQt6.QtCore import Qt


class TableMergeTab(QWidget):
    """테이블 병합 탭 위젯"""

    def __init__(self):
        """TableMergeTab 초기화"""
        super().__init__()

        # 메인 레이아웃
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)

        # 제목
        title = QLabel("테이블 병합")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #333333;")
        layout.addWidget(title)

        # 버튼 그리드
        button_grid = self._create_button_grid()
        layout.addLayout(button_grid)

        # 로그/결과 영역
        log_section = self._create_log_section()
        layout.addWidget(log_section)

        layout.addStretch()

    def _create_button_grid(self):
        """병합 버튼 그리드 생성"""
        grid = QGridLayout()
        grid.setSpacing(12)

        # PRD table-merge.md 2.1: M4GL 버튼 3개 (가로 배치)
        # Row 0: M4GL 버튼들
        m4gl_dialogue_btn = self._create_merge_button("M4GL DIALOGUE", "m4gl_dialogue_button")
        m4gl_string_btn = self._create_merge_button("M4GL STRING", "m4gl_string_button")
        m4gl_all_btn = self._create_merge_button("M4GL 통합 병합", "m4gl_merge_all_button")

        grid.addWidget(m4gl_dialogue_btn, 0, 0)
        grid.addWidget(m4gl_string_btn, 0, 1)
        grid.addWidget(m4gl_all_btn, 0, 2)

        # Row 1: NC/GL 버튼
        ncgl_btn = self._create_merge_button("NC/GL 병합", "ncgl_merge_button")
        grid.addWidget(ncgl_btn, 1, 0)

        # Row 2: LY/GL 버튼 2개
        lygl_merge_btn = self._create_merge_button("LY/GL 병합", "lygl_merge_button")
        lygl_split_btn = self._create_merge_button("LY/GL 분할", "lygl_split_button")

        grid.addWidget(lygl_merge_btn, 2, 0)
        grid.addWidget(lygl_split_btn, 2, 1)

        return grid

    def _create_merge_button(self, text, object_name):
        """병합 버튼 생성

        Args:
            text: 버튼 텍스트
            object_name: 객체 이름

        Returns:
            QPushButton: 생성된 버튼
        """
        button = QPushButton(text)
        button.setObjectName(object_name)
        button.setFixedSize(180, 50)
        button.setStyleSheet("""
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
            QPushButton:disabled {
                background-color: #CCCCCC;
            }
        """)

        return button

    def _create_log_section(self):
        """로그/결과 영역 생성"""
        # 섹션 컨테이너
        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 0, 0, 0)
        section_layout.setSpacing(8)

        # 라벨
        label = QLabel("로그/결과:")
        label.setStyleSheet("font-size: 13px; font-weight: bold; color: #666666;")
        section_layout.addWidget(label)

        # PRD table-merge.md 2.1: 로그/결과 영역
        self.log_area = QTextEdit()
        self.log_area.setObjectName("log_area")
        self.log_area.setReadOnly(True)
        self.log_area.setFixedHeight(200)
        self.log_area.setStyleSheet("""
            QTextEdit {
                background-color: #FAFAFA;
                border: 1px solid #E0E0E0;
                border-radius: 4px;
                font-family: 'Consolas', monospace;
                font-size: 11px;
                color: #333333;
                padding: 12px;
            }
        """)

        section_layout.addWidget(self.log_area)

        return section
