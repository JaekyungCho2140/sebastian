"""날짜 계산"""
from datetime import date, timedelta
from calendar import monthrange


class DateCalculator:
    """날짜 계산 클래스"""

    def workday(self, base_date, offset_days, holidays=None):
        """WORKDAY 함수 구현 - 기준일로부터 N 영업일 전/후 계산

        Args:
            base_date: 기준일 (date 객체)
            offset_days: 영업일 수 (음수: 과거, 양수: 미래, 0: 기준일)
            holidays: 공휴일 리스트 (dict의 리스트, 각 dict는 'date' 키 포함)

        Returns:
            date: 계산된 날짜
        """
        if holidays is None:
            holidays = []

        # 공휴일 날짜 문자열 집합 생성
        holiday_dates = {h["date"] for h in holidays}

        # offset_days가 0이면 기준일 반환
        if offset_days == 0:
            return base_date

        # 방향 결정 (음수: 과거, 양수: 미래)
        direction = -1 if offset_days < 0 else 1
        days_to_count = abs(offset_days)

        current_date = base_date
        counted_days = 0

        while counted_days < days_to_count:
            # 하루 이동
            current_date += timedelta(days=direction)

            # 영업일인지 확인 (주말 아님 + 공휴일 아님)
            if self._is_business_day(current_date, holiday_dates):
                counted_days += 1

        return current_date

    def _is_business_day(self, check_date, holiday_dates):
        """영업일 여부 확인

        Args:
            check_date: 확인할 날짜
            holiday_dates: 공휴일 날짜 문자열 집합

        Returns:
            bool: 영업일이면 True
        """
        # 주말 확인 (토요일=5, 일요일=6)
        if check_date.weekday() in [5, 6]:
            return False

        # 공휴일 확인
        date_str = check_date.strftime("%Y-%m-%d")
        if date_str in holiday_dates:
            return False

        return True

    def eomonth_workday(self, base_date, eomonth_offset, day_adjustment, workday_offset, holidays=None):
        """EOMONTH + day_adjustment + WORKDAY 복합 계산

        Args:
            base_date: 기준일 (date 객체)
            eomonth_offset: EOMONTH 월 offset (예: -2 = 2개월 전 월말)
            day_adjustment: 월말에서 조정할 일수 (예: 24 = 월말 + 24일)
            workday_offset: WORKDAY offset (예: -1 = 1 영업일 전)
            holidays: 공휴일 리스트

        Returns:
            date: 계산된 날짜
        """
        if holidays is None:
            holidays = []

        # 1. EOMONTH 계산: eomonth_offset 개월 후/전의 월말
        target_year = base_date.year
        target_month = base_date.month + eomonth_offset

        # 월이 12를 넘거나 1보다 작으면 연도 조정
        while target_month > 12:
            target_month -= 12
            target_year += 1
        while target_month < 1:
            target_month += 12
            target_year -= 1

        # 해당 월의 마지막 날 구하기
        last_day = monthrange(target_year, target_month)[1]
        eomonth_date = date(target_year, target_month, last_day)

        # 2. day_adjustment 적용
        adjusted_date = eomonth_date + timedelta(days=day_adjustment)

        # 3. WORKDAY 적용
        result = self.workday(adjusted_date, workday_offset, holidays=holidays)

        return result
