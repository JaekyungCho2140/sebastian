"""스케줄러 테스트"""
import pytest
from datetime import datetime, date


class TestScheduler:
    """Scheduler 클래스 테스트"""

    def test_scheduler_parses_cron_expression(self):
        """Cron 표현식을 파싱할 수 있어야 함"""
        from src.scheduler import Scheduler

        scheduler = Scheduler()

        # PRD l10n-admin.md 2.2: Cron 표현식
        # Daily Task: "0 9 10 * *" - 매월 10일 09:00
        next_run = scheduler.get_next_run_time("0 9 10 * *")

        assert next_run is not None, "다음 실행 시각을 계산할 수 있어야 합니다"
        assert isinstance(next_run, datetime), "datetime 객체를 반환해야 합니다"

    def test_scheduler_adds_job_with_cron(self):
        """Cron 표현식으로 작업을 추가할 수 있어야 함"""
        from src.scheduler import Scheduler

        scheduler = Scheduler()

        # 테스트용 작업 함수
        def test_job():
            pass

        # PRD l10n-admin.md 2.2: APScheduler 통합
        job_id = scheduler.add_job(test_job, "0 9 10 * *", job_id="test_daily_task")

        assert job_id == "test_daily_task", "작업 ID를 반환해야 합니다"

        # 작업이 스케줄러에 추가되었는지 확인
        jobs = scheduler.get_jobs()
        assert len(jobs) > 0, "작업이 추가되어야 합니다"

    def test_scheduler_checks_missed_schedules(self):
        """앱 시작 시 누락된 스케줄을 확인해야 함"""
        from src.scheduler import Scheduler

        scheduler = Scheduler()

        # 마지막 실행 날짜
        last_execution = {
            "daily_task": "2025-01-09",
            "daily_scrum": "2025-01-09",
            "slack_msg": "2025-01-09"
        }

        # 오늘이 10일이면 daily_task가 누락됨
        today = date(2025, 1, 10)

        # PRD l10n-admin.md 2.4: 누락 스케줄 감지
        missed = scheduler.check_missed_schedules(last_execution, today)

        assert "daily_task" in missed, "Daily Task가 누락되었어야 합니다"

    def test_scheduler_detects_weekday_for_daily_scrum(self):
        """평일에만 Daily Scrum이 실행되어야 함"""
        from src.scheduler import Scheduler

        scheduler = Scheduler()

        last_execution = {"daily_scrum": "2025-01-09"}

        # 2025-01-10은 금요일 (평일)
        friday = date(2025, 1, 10)
        missed = scheduler.check_missed_schedules(last_execution, friday)
        assert "daily_scrum" in missed, "평일에는 Daily Scrum이 누락되어야 합니다"

        # 2025-01-11은 토요일 (주말)
        saturday = date(2025, 1, 11)
        missed_weekend = scheduler.check_missed_schedules(last_execution, saturday)
        assert "daily_scrum" not in missed_weekend, "주말에는 Daily Scrum이 누락되지 않아야 합니다"

    def test_scheduler_skips_slack_msg_if_past_7am(self):
        """Slack MSG는 07:00 이후 누락 시 건너뛰어야 함"""
        from src.scheduler import Scheduler

        scheduler = Scheduler()

        last_execution = {"slack_msg": "2025-01-09"}
        today = date(2025, 1, 10)

        # PRD l10n-admin.md 2.4: Slack MSG는 건너뛰기
        missed = scheduler.check_missed_schedules(last_execution, today)
        assert "slack_msg" not in missed, "Slack MSG는 누락되어도 건너뛰어야 합니다"
