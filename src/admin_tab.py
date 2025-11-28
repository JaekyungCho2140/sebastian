"""관리 탭"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QTextEdit
)
from PyQt6.QtCore import Qt


class AdminTab(QWidget):
    """관리 탭 위젯"""

    def __init__(self):
        """AdminTab 초기화"""
        super().__init__()

        # 메인 레이아웃
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(20)

        # 제목
        title = QLabel("관리")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #333333;")
        layout.addWidget(title)

        # PRD wireframes.md 5.1: 작업 카드 3개
        daily_task_card = self._create_task_card("Daily Task", "daily_task")
        layout.addWidget(daily_task_card)

        daily_scrum_card = self._create_task_card("Daily Scrum", "daily_scrum")
        layout.addWidget(daily_scrum_card)

        slack_msg_card = self._create_task_card("Slack MSG", "slack_msg")
        layout.addWidget(slack_msg_card)

        # PRD wireframes.md 5.1: 실행 로그
        log_section = self._create_log_section()
        layout.addWidget(log_section)

        layout.addStretch()

    def _create_task_card(self, title, task_name):
        """작업 카드 생성

        Args:
            title: 카드 제목
            task_name: 작업 이름 (객체명에 사용)

        Returns:
            QWidget: 작업 카드
        """
        card = QWidget()
        card.setObjectName(f"{task_name}_card")
        card.setFixedHeight(120)
        card.setStyleSheet("""
            QWidget {
                background-color: #F9F9F9;
                border: 1px solid #E0E0E0;
                border-radius: 8px;
            }
        """)

        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(20, 16, 20, 16)
        card_layout.setSpacing(8)

        # 제목
        title_label = QLabel(title)
        title_label.setStyleSheet("font-size: 14px; font-weight: bold; color: #333333;")
        card_layout.addWidget(title_label)

        # 다음 실행 시간 (임시)
        next_label = QLabel("다음 실행: 설정 필요")
        next_label.setStyleSheet("font-size: 12px; color: #666666;")
        card_layout.addWidget(next_label)

        # 마지막 실행 시간 (임시)
        last_label = QLabel("마지막: -")
        last_label.setStyleSheet("font-size: 12px; color: #999999;")
        card_layout.addWidget(last_label)

        # 실행 버튼
        execute_button = QPushButton("지금 실행")
        execute_button.setObjectName(f"{task_name}_execute")
        execute_button.setFixedSize(100, 32)
        execute_button.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: #FFFFFF;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)

        card_layout.addWidget(execute_button, alignment=Qt.AlignmentFlag.AlignRight)

        return card

    def _create_log_section(self):
        """실행 로그 섹션 생성"""
        section = QWidget()
        section_layout = QVBoxLayout(section)
        section_layout.setContentsMargins(0, 0, 0, 0)
        section_layout.setSpacing(8)

        # 라벨
        label = QLabel("실행 로그:")
        label.setStyleSheet("font-size: 13px; font-weight: bold; color: #666666;")
        section_layout.addWidget(label)

        # 로그 영역
        self.log_area = QTextEdit()
        self.log_area.setObjectName("admin_log_area")
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
