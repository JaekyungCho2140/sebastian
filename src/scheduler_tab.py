"""일정/메시지 탭"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLabel, QComboBox, QDateEdit, QPushButton, QLineEdit
)
from PyQt6.QtCore import Qt, QDate


class SchedulerTab(QWidget):
    """일정/메시지 탭 위젯"""

    def __init__(self):
        """SchedulerTab 초기화"""
        super().__init__()

        # 메인 레이아웃
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)

        # 제목
        title = QLabel("자동 일정 계산기")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #333333;")
        layout.addWidget(title)

        # 입력 폼
        form_widget = self._create_input_form()
        layout.addWidget(form_widget)

        # 계산 버튼
        calc_button = QPushButton("계산")
        calc_button.setObjectName("calculate_button")
        calc_button.setFixedSize(120, 40)
        calc_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        calc_button.clicked.connect(self._on_calculate)

        layout.addWidget(calc_button, alignment=Qt.AlignmentFlag.AlignCenter)
        layout.addStretch()

    def _create_input_form(self):
        """입력 폼 생성"""
        form_widget = QWidget()
        form_layout = QFormLayout(form_widget)
        form_layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)
        form_layout.setSpacing(16)

        # PRD wireframes.md 3.1: 프로젝트 드롭다운
        self.project_dropdown = QComboBox()
        self.project_dropdown.setObjectName("project_dropdown")
        self.project_dropdown.addItems(["M4GL", "NCGL", "FBGL", "LYGL", "L10N"])
        self.project_dropdown.setFixedWidth(200)
        self.project_dropdown.currentTextChanged.connect(self._on_project_changed)
        form_layout.addRow("프로젝트:", self.project_dropdown)

        # PRD wireframes.md 3.1: 업데이트일 날짜 선택기
        self.date_picker = QDateEdit()
        self.date_picker.setObjectName("date_picker")
        self.date_picker.setCalendarPopup(True)
        self.date_picker.setDate(QDate.currentDate())
        self.date_picker.setFixedWidth(200)
        self.date_label = QLabel("업데이트일:")
        form_layout.addRow(self.date_label, self.date_picker)

        # PRD wireframes.md 3.1: 마일스톤 입력 (NCGL만)
        self.milestone_input = QLineEdit()
        self.milestone_input.setObjectName("milestone_input")
        self.milestone_input.setPlaceholderText("M42")
        self.milestone_input.setFixedWidth(200)
        self.milestone_label = QLabel("마일스톤:")
        form_layout.addRow(self.milestone_label, self.milestone_input)

        # 초기 상태 설정 (M4GL 기본값이므로 마일스톤 숨김)
        self.milestone_label.setVisible(False)
        self.milestone_input.setVisible(False)

        return form_widget

    def _on_project_changed(self, project):
        """프로젝트 변경 시 처리"""
        # PRD wireframes.md 3.1: 동적 필드 표시/숨김
        if project == "NCGL":
            # 마일스톤 표시
            self.milestone_label.setVisible(True)
            self.milestone_input.setVisible(True)
        else:
            # 마일스톤 숨김
            self.milestone_label.setVisible(False)
            self.milestone_input.setVisible(False)

        # PRD wireframes.md 3.1: L10N 선택 시 레이블 변경
        if project == "L10N":
            self.date_label.setText("정산 마감일:")
        else:
            self.date_label.setText("업데이트일:")

    def _on_calculate(self):
        """계산 버튼 클릭 시 처리"""
        # TODO: Phase 8B에서 일정 계산 로직 연결
        pass
