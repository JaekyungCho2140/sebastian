"""스케줄러"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, date, timedelta


class Scheduler:
    """작업 스케줄러 클래스"""

    def __init__(self):
        """Scheduler 초기화"""
        self.scheduler = BackgroundScheduler()

    def get_next_run_time(self, cron_expr):
        """Cron 표현식의 다음 실행 시각 계산

        Args:
            cron_expr: Cron 표현식 (예: "0 9 10 * *")

        Returns:
            datetime: 다음 실행 시각
        """
        # Cron 표현식 파싱
        parts = cron_expr.split()

        if len(parts) != 5:
            return None

        minute, hour, day, month, day_of_week = parts

        # CronTrigger 생성
        trigger = CronTrigger(
            minute=minute,
            hour=hour,
            day=day,
            month=month,
            day_of_week=day_of_week
        )

        # 다음 실행 시각 계산
        now = datetime.now()
        next_fire_time = trigger.get_next_fire_time(None, now)

        return next_fire_time

    def add_job(self, func, cron_expr, job_id):
        """Cron 표현식으로 작업 추가

        Args:
            func: 실행할 함수
            cron_expr: Cron 표현식
            job_id: 작업 ID

        Returns:
            str: 작업 ID
        """
        # Cron 표현식 파싱
        parts = cron_expr.split()
        minute, hour, day, month, day_of_week = parts

        # 작업 추가
        self.scheduler.add_job(
            func,
            CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week
            ),
            id=job_id
        )

        return job_id

    def get_jobs(self):
        """등록된 작업 목록 조회

        Returns:
            list: 작업 목록
        """
        return self.scheduler.get_jobs()

    def check_missed_schedules(self, last_execution, today=None):
        """누락된 스케줄 확인

        Args:
            last_execution: 마지막 실행 날짜 딕셔너리
            today: 오늘 날짜 (기본값: date.today())

        Returns:
            list: 누락된 작업 이름 목록
        """
        if today is None:
            today = date.today()

        missed = []

        # PRD l10n-admin.md 2.4: Daily Task (매월 10일)
        if today.day == 10:
            last_daily_task = last_execution.get("daily_task")
            if last_daily_task:
                last_date = datetime.strptime(last_daily_task, "%Y-%m-%d").date()
                if last_date < today:
                    missed.append("daily_task")
            else:
                missed.append("daily_task")

        # PRD l10n-admin.md 2.4: Daily Scrum (평일만)
        if today.weekday() < 5:  # 월-금 (0-4)
            last_daily_scrum = last_execution.get("daily_scrum")
            if last_daily_scrum:
                last_date = datetime.strptime(last_daily_scrum, "%Y-%m-%d").date()
                if last_date < today:
                    missed.append("daily_scrum")
            else:
                missed.append("daily_scrum")

        # PRD l10n-admin.md 2.4: Slack MSG는 건너뛰기 (07:00 이후 실행 의미 없음)
        # missed에 포함하지 않음

        return missed

    def start(self):
        """스케줄러 시작"""
        self.scheduler.start()

    def shutdown(self):
        """스케줄러 종료"""
        self.scheduler.shutdown()
