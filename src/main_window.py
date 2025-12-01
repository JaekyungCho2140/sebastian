"""메인 윈도우"""
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTabWidget, QPushButton, QLabel, QSystemTrayIcon, QMenu
)
from PyQt6.QtGui import QIcon, QAction
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

        # PRD shared.md 2.3: 시스템 트레이 아이콘
        self._create_tray_icon()

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

    def _create_tray_icon(self):
        """시스템 트레이 아이콘 생성"""
        # 트레이 아이콘 생성
        self.tray_icon = QSystemTrayIcon(self)
        
        # 아이콘 설정 (기본 아이콘 사용, 실제로는 assets/icon.png 사용)
        # self.tray_icon.setIcon(QIcon("assets/icon.png"))
        
        # 트레이 메뉴 생성
        tray_menu = QMenu()
        
        # 열기 액션
        show_action = QAction("열기", self)
        show_action.triggered.connect(self.show)
        tray_menu.addAction(show_action)
        
        tray_menu.addSeparator()
        
        # 종료 액션
        quit_action = QAction("종료", self)
        quit_action.triggered.connect(self.close)
        tray_menu.addAction(quit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.show()
        
        # 트레이 아이콘 클릭 시 윈도우 표시
        self.tray_icon.activated.connect(self._on_tray_activated)
    
    def _on_tray_activated(self, reason):
        """트레이 아이콘 클릭 시 처리"""
        from PyQt6.QtWidgets import QSystemTrayIcon
        
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            # 왼쪽 클릭: 윈도우 표시/숨김 토글
            if self.isVisible():
                self.hide()
            else:
                self.show()
                self.activateWindow()
    
    def changeEvent(self, event):
        """윈도우 상태 변경 이벤트"""
        from PyQt6.QtCore import QEvent
        
        # PRD shared.md 2.3: 최소화 시 트레이로 숨김
        if event.type() == QEvent.Type.WindowStateChange:
            if self.isMinimized():
                self.hide()
                event.ignore()
        
        super().changeEvent(event)
    
    def hide_to_tray(self):
        """트레이로 숨기기"""
        self.hide()
