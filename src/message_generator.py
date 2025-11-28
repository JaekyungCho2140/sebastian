"""메시지 생성기"""
from datetime import datetime
from src.template_engine import TemplateEngine


class MessageGenerator:
    """메시지 템플릿 생성 클래스"""

    def __init__(self):
        """메시지 생성기 초기화"""
        self.template_engine = TemplateEngine()

    def generate_headsup(self, schedule_result, template):
        """헤즈업 메시지 생성

        Args:
            schedule_result: 일정 계산 결과 딕셔너리
            template: 템플릿 딕셔너리 (subject, body)

        Returns:
            dict: 생성된 메시지 (subject, body)
        """
        # 변수 준비
        variables = self._prepare_variables(schedule_result)

        # 템플릿 치환
        subject = self.template_engine.substitute(template["subject"], variables)
        body = self.template_engine.substitute(template["body"], variables)

        return {
            "subject": subject,
            "body": body
        }

    def generate_handoff(self, schedule_result, batch_name, template):
        """HO (Handoff) 메시지 생성

        Args:
            schedule_result: 일정 계산 결과 딕셔너리
            batch_name: 배치명 (예: "REGULAR", "EXTRA0", "EXTRA1")
            template: 템플릿 딕셔너리 (subject, body)

        Returns:
            dict: 생성된 메시지 (subject, body)
        """
        # 변수 준비
        variables = self._prepare_variables(schedule_result)

        # 배치 관련 변수 추가
        variables["batch_name"] = batch_name

        # 배치 마감일 (DELIVERY Subtask의 due)
        tasks = schedule_result.get("tasks", {})
        if batch_name in tasks:
            batch_task = tasks[batch_name]
            if "subtasks" in batch_task and "DELIVERY" in batch_task["subtasks"]:
                delivery_due = batch_task["subtasks"]["DELIVERY"]["due"]
                variables["batch_due_date"] = self._format_date_korean(delivery_due)

        # 템플릿 치환
        subject = self.template_engine.substitute(template["subject"], variables)
        body = self.template_engine.substitute(template["body"], variables)

        return {
            "subject": subject,
            "body": body
        }

    def _prepare_variables(self, schedule_result):
        """일정 결과에서 변수 딕셔너리 생성

        Args:
            schedule_result: 일정 계산 결과

        Returns:
            dict: 변수 딕셔너리
        """
        variables = {
            "project": schedule_result.get("project", ""),
            "update_date": schedule_result.get("yymmdd", ""),
            "milestone": schedule_result.get("milestone", "")
        }

        # update_date_full 추가 (2025년 1월 15일 형식)
        update_date_obj = schedule_result.get("update_date")
        if update_date_obj:
            variables["update_date_full"] = f"{update_date_obj.year}년 {update_date_obj.month}월 {update_date_obj.day}일"

        # today 추가 (현재 날짜)
        from datetime import date as dt
        today = dt.today()
        variables["today"] = self._format_date_korean_from_date(today)

        # Tasks에서 날짜 변수 추출
        tasks = schedule_result.get("tasks", {})

        # 헤즈업 날짜
        if "헤즈업" in tasks:
            headsup_start = tasks["헤즈업"]["start"]
            variables["headsup_date"] = self._format_date_korean(headsup_start)

        # REGULAR, EXTRA0, EXTRA1 날짜 추출
        for batch_name in ["REGULAR", "EXTRA0", "EXTRA1"]:
            if batch_name in tasks:
                batch_prefix = batch_name.lower()
                self._extract_batch_dates(tasks[batch_name], batch_prefix, variables)

        # L10N 전용 변수 추가
        if schedule_result.get("project") == "L10N":
            self._add_l10n_variables(schedule_result, variables)

        return variables

    def _add_l10n_variables(self, schedule_result, variables):
        """L10N 전용 변수 추가

        Args:
            schedule_result: L10N 일정 계산 결과
            variables: 변수 딕셔너리 (업데이트됨)
        """
        year = schedule_result.get("year")
        month = schedule_result.get("month")
        settlement_date = schedule_result.get("settlement_date")

        if not all([year, month, settlement_date]):
            return

        # work_period_start: 전월 26일
        from calendar import monthrange
        prev_month = month - 1
        prev_year = year
        if prev_month < 1:
            prev_month = 12
            prev_year -= 1

        from datetime import date as dt
        work_start = dt(prev_year, prev_month, 26)
        variables["work_period_start"] = self._format_date_korean_short(work_start)

        # work_period_end: 당월 25일
        work_end = dt(year, month, 25)
        variables["work_period_end"] = self._format_date_korean_short(work_end)

        # settlement_date_formatted: 정산 마감일
        variables["settlement_date_formatted"] = self._format_date_korean_short(settlement_date)

        # estimate_deadline: M4 견적서 요청 Subtask 시작일
        tasks = schedule_result.get("tasks", {})
        if "M4" in tasks:
            m4_task = tasks["M4"]
            if "subtasks" in m4_task and "견적서 요청" in m4_task["subtasks"]:
                estimate_iso = m4_task["subtasks"]["견적서 요청"]["start"]
                variables["estimate_deadline"] = self._format_date_korean(estimate_iso)

    def _extract_batch_dates(self, batch_task, batch_prefix, variables):
        """배치 Task에서 날짜 변수 추출

        Args:
            batch_task: 배치 Task 딕셔너리
            batch_prefix: 배치 접두사 (예: "regular", "extra0")
            variables: 변수 딕셔너리 (업데이트됨)
        """
        if "subtasks" not in batch_task:
            return

        subtasks = batch_task["subtasks"]

        # HO&HB 날짜
        if "HO&HB" in subtasks:
            ho_start = subtasks["HO&HB"]["start"]
            variables[f"{batch_prefix}_ho_date"] = self._format_date_korean(ho_start)

        # DELIVERY 날짜
        if "DELIVERY" in subtasks:
            delivery_due = subtasks["DELIVERY"]["due"]
            variables[f"{batch_prefix}_delivery_date"] = self._format_date_korean(delivery_due)

    def _format_date_korean(self, iso_date_str):
        """ISO8601 날짜를 한국어 포맷으로 변환

        Args:
            iso_date_str: ISO8601 형식 문자열 (2025-01-08T09:30:00.000+0900)

        Returns:
            str: 한국어 날짜 형식 (1월 8일(수))
        """
        # ISO8601에서 날짜 부분 추출
        date_part = iso_date_str.split("T")[0]  # "2025-01-08"
        dt = datetime.strptime(date_part, "%Y-%m-%d")
        return self._format_date_korean_from_date(dt.date())

    def _format_date_korean_short(self, date_obj):
        """날짜를 짧은 한국어 포맷으로 변환

        Args:
            date_obj: date 객체

        Returns:
            str: 짧은 한국어 날짜 형식 (09/26(금))
        """
        # 요일 한글 변환
        weekdays = ["월", "화", "수", "목", "금", "토", "일"]
        weekday = weekdays[date_obj.weekday()]

        # 형식: 09/26(금)
        return f"{date_obj.month:02d}/{date_obj.day:02d}({weekday})"

    def _format_date_korean_from_date(self, date_obj):
        """date 객체를 한국어 포맷으로 변환

        Args:
            date_obj: date 객체

        Returns:
            str: 한국어 날짜 형식 (1월 10일(금))
        """
        # 요일 한글 변환
        weekdays = ["월", "화", "수", "목", "금", "토", "일"]
        weekday = weekdays[date_obj.weekday()]

        # 형식: 1월 10일(금)
        return f"{date_obj.month}월 {date_obj.day}일({weekday})"
