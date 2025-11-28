"""날짜 계산 테스트"""
import pytest
from datetime import datetime, date


class TestDateCalculator:
    """DateCalculator 클래스 테스트"""

    def test_workday_calculates_n_business_days_before_without_holidays(self):
        """기준일로부터 N 영업일 전 계산 (공휴일 없음)"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-01-15 (수)로부터 5 영업일 전
        # 예상: 2025-01-08 (수)
        base_date = date(2025, 1, 15)
        result = calculator.workday(base_date, -5, holidays=[])

        assert result == date(2025, 1, 8), "5 영업일 전 계산이 올바르지 않습니다"

    def test_workday_excludes_weekends(self):
        """주말(토/일)을 제외한 영업일 계산"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-01-15 (수)로부터 3 영업일 전
        # 2025-01-14 (화), 2025-01-13 (월), 2025-01-10 (금) - 주말(11,12) 건너뜀
        base_date = date(2025, 1, 15)
        result = calculator.workday(base_date, -3, holidays=[])

        assert result == date(2025, 1, 10), "주말을 제외한 영업일 계산이 올바르지 않습니다"

    def test_workday_excludes_holidays(self):
        """공휴일을 제외한 영업일 계산"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-01-15 (수)로부터 5 영업일 전, 2025-01-09 (목)가 공휴일
        # 예상: 2025-01-07 (화) - 공휴일 1일 건너뜀
        base_date = date(2025, 1, 15)
        holidays = [{"date": "2025-01-09", "name": "테스트 공휴일"}]

        result = calculator.workday(base_date, -5, holidays=holidays)

        assert result == date(2025, 1, 7), "공휴일을 제외한 영업일 계산이 올바르지 않습니다"

    def test_workday_handles_positive_offset(self):
        """양수 offset으로 미래 영업일 계산"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-01-15 (수)로부터 3 영업일 후
        # 예상: 2025-01-20 (월) - 주말(18,19) 건너뜀
        base_date = date(2025, 1, 15)
        result = calculator.workday(base_date, 3, holidays=[])

        assert result == date(2025, 1, 20), "양수 offset 계산이 올바르지 않습니다"

    def test_workday_handles_zero_offset(self):
        """0 offset은 기준일 그대로 반환 (영업일이 아니면 다음 영업일)"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-01-15 (수) - 평일
        base_date = date(2025, 1, 15)
        result = calculator.workday(base_date, 0, holidays=[])

        assert result == date(2025, 1, 15), "0 offset은 기준일을 반환해야 합니다"


class TestDateCalculatorComplex:
    """DateCalculator 복합 계산 테스트"""

    def test_eomonth_workday_calculates_complex_offset(self):
        """EOMONTH + day_adjustment + WORKDAY 복합 계산"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 예시: 2025-11-13 (정산 마감일)로부터
        # EOMONTH(base, -2) = 2025-09-30
        # + 24일 = 2025-10-24
        # WORKDAY(..., -1) = 2025-10-23 (1 영업일 전)
        base_date = date(2025, 11, 13)
        result = calculator.eomonth_workday(
            base_date=base_date,
            eomonth_offset=-2,
            day_adjustment=24,
            workday_offset=-1,
            holidays=[]
        )

        assert result == date(2025, 10, 23), "EOMONTH + day_adjustment + WORKDAY 계산이 올바르지 않습니다"

    def test_eomonth_workday_with_holidays(self):
        """EOMONTH + WORKDAY 계산 시 공휴일 제외"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-11-13으로부터
        # EOMONTH(base, -2) = 2025-09-30
        # + 24일 = 2025-10-24
        # WORKDAY(..., -1) = 원래 2025-10-23이지만, 10-23이 공휴일이면 10-22
        base_date = date(2025, 11, 13)
        holidays = [{"date": "2025-10-23", "name": "테스트 공휴일"}]

        result = calculator.eomonth_workday(
            base_date=base_date,
            eomonth_offset=-2,
            day_adjustment=24,
            workday_offset=-1,
            holidays=holidays
        )

        assert result == date(2025, 10, 22), "공휴일을 제외한 복합 계산이 올바르지 않습니다"

    def test_eomonth_workday_handles_month_boundaries(self):
        """월 경계를 넘는 EOMONTH 계산"""
        from src.date_calculator import DateCalculator

        calculator = DateCalculator()

        # 2025-03-15로부터
        # EOMONTH(base, -1) = 2025-02-28 (2월 말)
        # + 5일 = 2025-03-05
        # WORKDAY(..., -2) = 2025-03-03 (2 영업일 전)
        base_date = date(2025, 3, 15)
        result = calculator.eomonth_workday(
            base_date=base_date,
            eomonth_offset=-1,
            day_adjustment=5,
            workday_offset=-2,
            holidays=[]
        )

        assert result == date(2025, 3, 3), "월 경계를 넘는 EOMONTH 계산이 올바르지 않습니다"

