"""Slack MSG 생성 테스트"""
import pytest
from datetime import date


class TestSlackMsgGenerator:
    """SlackMsgGenerator 클래스 테스트"""

    def test_format_message_1_creates_correct_format(self):
        """메시지 1 포맷: MM/dd(요일) 업무 출근은 찍었나요?"""
        from src.slack_msg_generator import SlackMsgGenerator

        generator = SlackMsgGenerator()
        test_date = date(2025, 1, 10)  # 2025년 1월 10일 (금요일)

        message = generator.format_message_1(test_date)

        # PRD 5.5: 메시지 1 형식
        assert "01/10(금)" in message, "날짜 형식이 일치해야 합니다"
        assert "업무 출근은 찍었나요?" in message, "메시지 내용이 일치해야 합니다"

    def test_format_message_2_creates_correct_format(self):
        """메시지 2 포맷: MM/dd(요일) ## 잡담"""
        from src.slack_msg_generator import SlackMsgGenerator

        generator = SlackMsgGenerator()
        test_date = date(2025, 1, 10)  # 2025년 1월 10일 (금요일)

        message = generator.format_message_2(test_date)

        # PRD 5.5: 메시지 2 형식
        assert "01/10(금)" in message, "날짜 형식이 일치해야 합니다"
        assert "## 잡담" in message, "메시지 내용이 일치해야 합니다"

    def test_format_message_handles_different_weekdays(self):
        """다양한 요일을 올바르게 처리해야 함"""
        from src.slack_msg_generator import SlackMsgGenerator

        generator = SlackMsgGenerator()

        # 월요일
        monday = date(2025, 1, 6)
        msg = generator.format_message_1(monday)
        assert "01/06(월)" in msg, "월요일 형식이 일치해야 합니다"

        # 수요일
        wednesday = date(2025, 1, 8)
        msg = generator.format_message_1(wednesday)
        assert "01/08(수)" in msg, "수요일 형식이 일치해야 합니다"


class TestDateCalculatorBusinessDay:
    """DateCalculator 영업일 확인 테스트"""

    def test_is_weekend_returns_true_for_saturday(self):
        """토요일은 주말이어야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()
        saturday = date(2025, 1, 11)  # 토요일

        assert calc.is_weekend(saturday) is True, "토요일은 주말이어야 합니다"

    def test_is_weekend_returns_true_for_sunday(self):
        """일요일은 주말이어야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()
        sunday = date(2025, 1, 12)  # 일요일

        assert calc.is_weekend(sunday) is True, "일요일은 주말이어야 합니다"

    def test_is_weekend_returns_false_for_weekday(self):
        """평일은 주말이 아니어야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()
        friday = date(2025, 1, 10)  # 금요일

        assert calc.is_weekend(friday) is False, "평일은 주말이 아니어야 합니다"

    def test_is_holiday_returns_true_for_holiday(self):
        """공휴일을 올바르게 감지해야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()
        new_year = date(2025, 1, 1)
        holidays = [
            {"date": "2025-01-01", "name": "신정"},
            {"date": "2025-03-01", "name": "삼일절"}
        ]

        assert calc.is_holiday(new_year, holidays) is True, "공휴일이어야 합니다"

    def test_is_holiday_returns_false_for_regular_day(self):
        """일반 날짜는 공휴일이 아니어야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()
        regular_day = date(2025, 1, 10)
        holidays = [{"date": "2025-01-01", "name": "신정"}]

        assert calc.is_holiday(regular_day, holidays) is False, "공휴일이 아니어야 합니다"

    def test_is_business_day_combines_weekend_and_holiday(self):
        """영업일은 주말도 아니고 공휴일도 아니어야 함"""
        from src.date_calculator import DateCalculator

        calc = DateCalculator()
        holidays = [{"date": "2025-01-01", "name": "신정"}]

        # 평일, 공휴일 아님 → 영업일
        friday = date(2025, 1, 10)
        assert calc.is_business_day(friday, holidays) is True, "영업일이어야 합니다"

        # 토요일 → 영업일 아님
        saturday = date(2025, 1, 11)
        assert calc.is_business_day(saturday, holidays) is False, "주말은 영업일이 아니어야 합니다"

        # 공휴일 → 영업일 아님
        new_year = date(2025, 1, 1)
        assert calc.is_business_day(new_year, holidays) is False, "공휴일은 영업일이 아니어야 합니다"
