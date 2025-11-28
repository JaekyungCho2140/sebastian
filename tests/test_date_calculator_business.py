"""DateCalculator 영업일 관련 추가 테스트"""
import pytest
from datetime import date


class TestDateCalculatorFirstBusinessDay:
    """월 첫 영업일 계산 테스트"""

    def test_get_first_business_day_when_first_is_weekday(self):
        """1일이 평일이면 1일을 반환해야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()

        # 2025년 1월 1일 = 수요일
        result = calc.get_first_business_day(2025, 1)

        assert result == date(2025, 1, 1), "1일이 평일이면 1일이어야 합니다"

    def test_get_first_business_day_when_first_is_saturday(self):
        """1일이 토요일이면 3일(월요일)을 반환해야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()

        # 2025년 2월 1일 = 토요일
        result = calc.get_first_business_day(2025, 2)

        assert result == date(2025, 2, 3), "1일이 토요일이면 3일(월요일)이어야 합니다"

    def test_get_first_business_day_when_first_is_sunday(self):
        """1일이 일요일이면 2일(월요일)을 반환해야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()

        # 2025년 6월 1일 = 일요일
        result = calc.get_first_business_day(2025, 6)

        assert result == date(2025, 6, 2), "1일이 일요일이면 2일(월요일)이어야 합니다"


class TestDateCalculatorBusinessDays:
    """영업일 목록 계산 테스트"""

    def test_get_business_days_returns_weekdays_only(self):
        """주말을 제외한 평일만 반환해야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()

        # 2025년 1월 (1일=수요일, 31일=금요일)
        # 주말: 4-5, 11-12, 18-19, 25-26
        # 평일: 23개
        result = calc.get_business_days(2025, 1, [])

        # 주말 제외 확인
        for business_day in result:
            assert business_day.weekday() not in [5, 6], f"{business_day}는 주말이 아니어야 합니다"

        # 개수 확인 (대략 22-23개)
        assert len(result) >= 20, "최소 20개 영업일이 있어야 합니다"

    def test_get_business_days_excludes_holidays(self):
        """공휴일을 제외해야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()

        holidays = [
            {"date": "2025-01-01", "name": "신정"},
            {"date": "2025-01-27", "name": "설날 연휴"},
            {"date": "2025-01-28", "name": "설날"},
            {"date": "2025-01-29", "name": "설날 연휴"}
        ]

        result = calc.get_business_days(2025, 1, holidays)

        # 공휴일이 포함되지 않아야 함
        result_dates = [d.strftime("%Y-%m-%d") for d in result]
        assert "2025-01-01" not in result_dates, "신정이 제외되어야 합니다"
        assert "2025-01-28" not in result_dates, "설날이 제외되어야 합니다"

    def test_get_business_days_returns_sorted_dates(self):
        """날짜가 정렬되어 반환되어야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()

        result = calc.get_business_days(2025, 2, [])

        # 날짜가 오름차순이어야 함
        for i in range(len(result) - 1):
            assert result[i] < result[i + 1], "날짜가 오름차순이어야 합니다"
