"""메인 윈도우"""
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTabWidget, QPushButton, QLabel
)
from PyQt6.QtCore import Qt
from src.scheduler_tab import SchedulerTab
from src.table_merge_tab import TableMergeTab
from src.admin_tab import AdminTab
from src.settings_window import SettingsWindow


class MainWindow(QMainWindow):
    """Sebastian 메인 윈도우"""

    def __init__(self):
        """MainWindow 초기화"""
        super().__init__()

        # PRD wireframes.md 1.2: 윈도우 설정
        self.setWindowTitle("Sebastian")
        self.setFixedSize(900, 700)

        # 중앙 위젯 설정
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # 메인 레이아웃
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 탭 위젯 생성
        self.tabs = QTabWidget()
        self.tabs.setObjectName("tabs")

        # PRD wireframes.md 1.2: 3개 탭 추가
        self._setup_tabs()

        main_layout.addWidget(self.tabs)

        # 푸터 추가
        footer = self._create_footer()
        main_layout.addWidget(footer)

    def _setup_tabs(self):
        """탭 설정"""
        # PRD wireframes.md 1.2: 탭 라벨
        # 일정/메시지 탭
        scheduler_tab = SchedulerTab()
        self.tabs.addTab(scheduler_tab, "일정/메시지")

        # 테이블 병합 탭
        table_merge_tab = TableMergeTab()
        self.tabs.addTab(table_merge_tab, "테이블 병합")

        # 관리 탭
        admin_tab = AdminTab()
        self.tabs.addTab(admin_tab, "관리")

    def _create_footer(self):
        """푸터 생성"""
        footer = QWidget()
        footer.setFixedHeight(50)

        layout = QHBoxLayout(footer)
        layout.setContentsMargins(20, 0, 20, 0)

        # PRD wireframes.md 1.2: 버전 정보
        version_label = QLabel("Sebastian v1.0.0")
        version_label.setStyleSheet("color: #999999; font-size: 11px;")

        layout.addWidget(version_label)
        layout.addStretch()

        # PRD wireframes.md 1.2: 설정 버튼
        settings_button = QPushButton("⚙ 설정")
        settings_button.setObjectName("settings_button")
        settings_button.setFixedSize(80, 32)
        settings_button.setStyleSheet("""
            QPushButton {
                background-color: #FFFFFF;
                border: 1px solid #CCCCCC;
                border-radius: 4px;
                font-size: 12px;
                color: #333333;
            }
            QPushButton:hover {
                background-color: #E3F2FD;
                border-color: #2196F3;
            }
        """)
        settings_button.clicked.connect(self._open_settings)

        layout.addWidget(settings_button)

        return footer

    def _open_settings(self):
        """설정 화면 열기"""
        settings = SettingsWindow(self)
        settings.exec()
