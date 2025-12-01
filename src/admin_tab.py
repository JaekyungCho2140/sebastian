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
        daily_task_card = self._create_task_card("Daily Task", "daily_task", self._on_execute_daily_task)
        layout.addWidget(daily_task_card)

        daily_scrum_card = self._create_task_card("Daily Scrum", "daily_scrum", self._on_execute_daily_scrum)
        layout.addWidget(daily_scrum_card)

        slack_msg_card = self._create_task_card("Slack MSG", "slack_msg", self._on_execute_slack_msg)
        layout.addWidget(slack_msg_card)

        # PRD wireframes.md 5.1: 실행 로그
        log_section = self._create_log_section()
        layout.addWidget(log_section)

        layout.addStretch()

    def _create_task_card(self, title, task_name, on_execute):
        """작업 카드 생성

        Args:
            title: 카드 제목
            task_name: 작업 이름 (객체명에 사용)
            on_execute: 실행 버튼 클릭 시 호출할 함수

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
        execute_button.clicked.connect(on_execute)

        card_layout.addWidget(execute_button, alignment=Qt.AlignmentFlag.AlignRight)

        return card

    def _on_execute_daily_task(self):
        """Daily Task 실행"""
        from src.confluence_client import ConfluenceClient
        from src.daily_task_generator import DailyTaskGenerator
        from src.auth_manager import AuthManager
        from src.holiday_manager import HolidayManager
        from src.date_calculator import DateCalculator
        from datetime import date

        try:
            # 인증 정보 로드
            auth_manager = AuthManager()
            confluence_email, confluence_token = auth_manager.get_confluence_credentials()

            if not confluence_email or not confluence_token:
                self.log_area.append("✗ Confluence 인증 정보가 없습니다")
                return

            # Confluence 클라이언트 생성
            confluence_client = ConfluenceClient(confluence_email, confluence_token)

            # 페이지 조회
            page_id = "190906620"  # PRD에서 정의된 Daily Task 페이지 ID
            page = confluence_client.get_page(page_id)

            self.log_area.append(f"Daily Task 페이지 조회 완료 (ID: {page_id})")

            # 다음 달 영업일 계산
            today = date.today()
            next_month_year = today.year if today.month < 12 else today.year + 1
            next_month = today.month + 1 if today.month < 12 else 1

            holiday_manager = HolidayManager()
            holidays = holiday_manager.get_holidays(next_month_year)

            date_calculator = DateCalculator()
            business_days = date_calculator.get_business_days(next_month_year, next_month, holidays)

            # 템플릿 생성
            generator = DailyTaskGenerator()
            templates = generator.generate_templates_for_month(next_month_year, next_month, business_days)

            # TODO: 페이지 업데이트 로직 (Phase 9에서 완성)
            self.log_area.append(f"✓ Daily Task 실행 완료 ({len(business_days)}일)")

        except Exception as e:
            self.log_area.append(f"✗ Daily Task 실행 실패: {e}")

    def _on_execute_daily_scrum(self):
        """Daily Scrum 실행"""
        from src.confluence_client import ConfluenceClient
        from src.daily_scrum_updater import DailyScrumUpdater
        from src.auth_manager import AuthManager
        from datetime import date

        try:
            # 인증 정보 로드
            auth_manager = AuthManager()
            confluence_email, confluence_token = auth_manager.get_confluence_credentials()

            if not confluence_email or not confluence_token:
                self.log_area.append("✗ Confluence 인증 정보가 없습니다")
                return

            # Confluence 클라이언트 생성
            confluence_client = ConfluenceClient(confluence_email, confluence_token)

            # 페이지 조회
            page_id = "191332855"  # PRD에서 정의된 Daily Scrum 페이지 ID
            page = confluence_client.get_page(page_id)

            self.log_area.append(f"Daily Scrum 페이지 조회 완료 (ID: {page_id})")

            # 날짜 업데이트
            updater = DailyScrumUpdater()
            today = date.today()

            # TODO: 페이지 업데이트 로직 (Phase 9에서 완성)
            self.log_area.append(f"✓ Daily Scrum 실행 완료")

        except Exception as e:
            self.log_area.append(f"✗ Daily Scrum 실행 실패: {e}")

    def _on_execute_slack_msg(self):
        """Slack MSG 실행"""
        from src.slack_client import SlackClient
        from src.slack_msg_generator import SlackMsgGenerator
        from src.auth_manager import AuthManager
        from src.config_manager import ConfigManager
        from datetime import date

        try:
            # 인증 정보 로드
            auth_manager = AuthManager()
            slack_token = auth_manager.get_slack_credentials()

            if not slack_token:
                self.log_area.append("✗ Slack 인증 정보가 없습니다")
                return

            # 채널 ID (기본값 사용, Phase 9에서 설정 연동 예정)
            channel_id = "C06BZA056E4"

            # Slack 클라이언트 생성 (email은 사용 안 하지만 signature 유지)
            slack_client = SlackClient("", slack_token)

            # 메시지 생성
            generator = SlackMsgGenerator()
            today = date.today()
            msg1 = generator.format_message_1(today)
            msg2 = generator.format_message_2(today)

            # 메시지 발송
            slack_client.post_message(channel_id, msg1)
            slack_client.post_message(channel_id, msg2)

            self.log_area.append(f"✓ Slack MSG 실행 완료 (2개 메시지 발송)")

        except Exception as e:
            self.log_area.append(f"✗ Slack MSG 실행 실패: {e}")

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
