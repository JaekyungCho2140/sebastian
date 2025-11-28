"""Slack 메시지 생성"""
from datetime import date


class SlackMsgGenerator:
    """Slack MSG 메시지 생성 클래스"""

    # 요일 매핑 (0=월요일, 6=일요일)
    WEEKDAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]

    def format_message_1(self, target_date):
        """메시지 1 생성: MM/dd(요일) 업무 출근은 찍었나요?

        Args:
            target_date: 메시지 날짜 (date 객체)

        Returns:
            str: 포맷된 메시지
        """
        # PRD 5.5: 메시지 1 형식
        month = target_date.month
        day = target_date.day
        weekday = self.WEEKDAY_NAMES[target_date.weekday()]

        return f"{month:02d}/{day:02d}({weekday}) 업무 출근은 찍었나요?"

    def format_message_2(self, target_date):
        """메시지 2 생성: MM/dd(요일) ## 잡담

        Args:
            target_date: 메시지 날짜 (date 객체)

        Returns:
            str: 포맷된 메시지
        """
        # PRD 5.5: 메시지 2 형식
        month = target_date.month
        day = target_date.day
        weekday = self.WEEKDAY_NAMES[target_date.weekday()]

        return f"{month:02d}/{day:02d}({weekday}) ## 잡담"
