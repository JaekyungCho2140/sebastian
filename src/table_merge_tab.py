"""테이블 병합 탭"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QTextEdit, QProgressBar
)
from PyQt6.QtCore import Qt


class TableMergeTab(QWidget):
    """테이블 병합 탭 위젯"""

    def __init__(self):
        """TableMergeTab 초기화"""
        super().__init__()

        # PRD table-merge.md 2.2: 병합 작업 동시 실행 방지
        self.is_merge_running = False

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

        # PRD table-merge.md 6.2: 진행률 바
        self.progress_bar = QProgressBar()
        self.progress_bar.setObjectName("progress_bar")
        self.progress_bar.setTextVisible(True)
        self.progress_bar.setFormat("%p% - %v/%m")
        self.progress_bar.setVisible(False)  # 초기에는 숨김
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                border: 1px solid #E0E0E0;
                border-radius: 4px;
                text-align: center;
                height: 24px;
                background-color: #F5F5F5;
            }
            QProgressBar::chunk {
                background-color: #2196F3;
                border-radius: 3px;
            }
        """)
        layout.addWidget(self.progress_bar)

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
        m4gl_dialogue_btn.clicked.connect(self._on_m4gl_dialogue_merge)

        m4gl_string_btn = self._create_merge_button("M4GL STRING", "m4gl_string_button")
        m4gl_string_btn.clicked.connect(self._on_m4gl_string_merge)

        m4gl_all_btn = self._create_merge_button("M4GL 통합 병합", "m4gl_merge_all_button")
        m4gl_all_btn.clicked.connect(self._on_m4gl_merge_all)

        grid.addWidget(m4gl_dialogue_btn, 0, 0)
        grid.addWidget(m4gl_string_btn, 0, 1)
        grid.addWidget(m4gl_all_btn, 0, 2)

        # Row 1: NC/GL 버튼
        ncgl_btn = self._create_merge_button("NC/GL 병합", "ncgl_merge_button")
        ncgl_btn.clicked.connect(self._on_ncgl_merge)
        grid.addWidget(ncgl_btn, 1, 0)

        # Row 2: LY/GL 버튼 2개
        lygl_merge_btn = self._create_merge_button("LY/GL 병합", "lygl_merge_button")
        lygl_merge_btn.clicked.connect(self._on_lygl_merge)

        lygl_split_btn = self._create_merge_button("LY/GL 분할", "lygl_split_button")
        lygl_split_btn.clicked.connect(self._on_lygl_split)

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

    def _on_m4gl_dialogue_merge(self):
        """M4GL DIALOGUE 병합 버튼 클릭 시 처리"""
        from PyQt6.QtWidgets import QFileDialog
        from src.dialogue_merger import DialogueMerger

        # 파일 폴더 선택
        folder_path = QFileDialog.getExistingDirectory(
            self,
            "M4GL DIALOGUE 파일 폴더 선택",
            ""
        )

        if not folder_path:
            return

        # 로그 출력
        self.log_area.append(f"폴더 선택: {folder_path}")

        try:
            # DIALOGUE 병합 실행
            merger = DialogueMerger()
            total_rows = merger.merge_dialogue(folder_path)

            # 성공 메시지
            self.log_area.append(f"✓ DIALOGUE 병합 완료 (총 {total_rows}행)")
        except Exception as e:
            # 에러 메시지
            self.log_area.append(f"✗ DIALOGUE 병합 실패: {e}")

    def _on_m4gl_string_merge(self):
        """M4GL STRING 병합 버튼 클릭 시 처리"""
        from PyQt6.QtWidgets import QFileDialog
        from src.string_merger import StringMerger

        # 파일 폴더 선택
        folder_path = QFileDialog.getExistingDirectory(
            self,
            "M4GL STRING 파일 폴더 선택",
            ""
        )

        if not folder_path:
            return

        self.log_area.append(f"폴더 선택: {folder_path}")

        try:
            # STRING 병합 실행
            merger = StringMerger()
            total_rows = merger.merge_string(folder_path)

            self.log_area.append(f"✓ STRING 병합 완료 (총 {total_rows}행)")
        except Exception as e:
            self.log_area.append(f"✗ STRING 병합 실패: {e}")

    def _on_m4gl_merge_all(self):
        """M4GL 통합 병합 버튼 클릭 시 처리"""
        from PyQt6.QtWidgets import QFileDialog
        from src.m4gl_merger import M4GLMerger

        # 파일 폴더 선택
        folder_path = QFileDialog.getExistingDirectory(
            self,
            "M4GL 파일 폴더 선택",
            ""
        )

        if not folder_path:
            return

        self.log_area.append(f"폴더 선택: {folder_path}")

        try:
            # 통합 병합 실행
            merger = M4GLMerger()
            dialogue_rows, string_rows = merger.merge_all(folder_path)

            self.log_area.append(f"✓ DIALOGUE 병합 완료 (총 {dialogue_rows}행)")
            self.log_area.append(f"✓ STRING 병합 완료 (총 {string_rows}행)")
            self.log_area.append(f"✓ 통합 병합 완료")
        except Exception as e:
            self.log_area.append(f"✗ 통합 병합 실패: {e}")

    def _on_ncgl_merge(self):
        """NC/GL 병합 버튼 클릭 시 처리"""
        from PyQt6.QtWidgets import QFileDialog, QInputDialog
        from src.ncgl_merger import NCGLMerger

        # 파일 폴더 선택
        folder_path = QFileDialog.getExistingDirectory(
            self,
            "NC/GL 파일 폴더 선택",
            ""
        )

        if not folder_path:
            return

        # 업데이트일 입력
        yymmdd, ok = QInputDialog.getText(
            self,
            "업데이트일 입력",
            "업데이트일 (YYMMDD):"
        )

        if not ok or not yymmdd:
            return

        # 마일스톤 입력
        milestone, ok = QInputDialog.getText(
            self,
            "마일스톤 입력",
            "마일스톤 (예: 42):"
        )

        if not ok or not milestone:
            return

        self.log_area.append(f"폴더 선택: {folder_path}")
        self.log_area.append(f"업데이트일: {yymmdd}, 마일스톤: M{milestone}")

        try:
            # NC/GL 병합 실행
            merger = NCGLMerger()
            total_rows = merger.merge_ncgl(folder_path, yymmdd, milestone)

            self.log_area.append(f"✓ NC/GL 병합 완료 (총 {total_rows}행)")
        except Exception as e:
            self.log_area.append(f"✗ NC/GL 병합 실패: {e}")

    def _on_lygl_merge(self):
        """LY/GL 병합 버튼 클릭 시 처리"""
        from PyQt6.QtWidgets import QFileDialog
        from src.lygl_merger import LYGLMerger

        # 파일 폴더 선택
        folder_path = QFileDialog.getExistingDirectory(
            self,
            "LY/GL 파일 폴더 선택",
            ""
        )

        if not folder_path:
            return

        self.log_area.append(f"폴더 선택: {folder_path}")

        try:
            # LY/GL 병합 실행
            merger = LYGLMerger()
            total_rows = merger.merge_lygl(folder_path)

            self.log_area.append(f"✓ LY/GL 병합 완료 (총 {total_rows}행)")
        except Exception as e:
            self.log_area.append(f"✗ LY/GL 병합 실패: {e}")

    def _on_lygl_split(self):
        """LY/GL 분할 버튼 클릭 시 처리"""
        from PyQt6.QtWidgets import QFileDialog
        from src.lygl_splitter import LYGLSplitter

        # 병합 파일 선택
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "LY/GL 병합 파일 선택",
            "",
            "Excel Files (*.xlsx *.xls)"
        )

        if not file_path:
            return

        # 출력 폴더 선택
        output_folder = QFileDialog.getExistingDirectory(
            self,
            "출력 폴더 선택",
            ""
        )

        if not output_folder:
            return

        self.log_area.append(f"병합 파일: {file_path}")
        self.log_area.append(f"출력 폴더: {output_folder}")

        try:
            # LY/GL 분할 실행
            splitter = LYGLSplitter()
            file_count = splitter.split_lygl(file_path, output_folder)

            self.log_area.append(f"✓ LY/GL 분할 완료 ({file_count}개 파일 생성)")
        except Exception as e:
            self.log_area.append(f"✗ LY/GL 분할 실패: {e}")
