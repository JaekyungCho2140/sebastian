"""메시지 생성기 테스트"""
import pytest
from datetime import date


class TestMessageGenerator:
    """MessageGenerator 클래스 테스트"""

    def test_generate_headsup_substitutes_variables(self):
        """헤즈업 템플릿에 일정 변수를 치환해야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        # 일정 계산 결과
        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "헤즈업": {
                    "start": "2025-01-08T09:30:00.000+0900"
                },
                "REGULAR": {
                    "subtasks": {
                        "HO&HB": {"start": "2025-01-08T18:00:00.000+0900"},
                        "DELIVERY": {"due": "2025-01-10T17:00:00.000+0900"}
                    }
                }
            }
        }

        # 템플릿
        template = {
            "subject": "{project} {update_date} 업데이트",
            "body": "헤즈업: {headsup_date}\nREGULAR HO: {regular_ho_date}"
        }

        result = generator.generate_headsup(schedule_result, template)

        # 결과 확인
        assert "subject" in result, "결과에 subject가 있어야 합니다"
        assert "body" in result, "결과에 body가 있어야 합니다"

        # 변수 치환 확인
        assert result["subject"] == "M4GL 250115 업데이트", "subject 변수가 치환되어야 합니다"
        assert "1월" in result["body"], "body에 날짜가 한국어로 포맷되어야 합니다"

    def test_generate_headsup_formats_dates_correctly(self):
        """날짜를 한국어 포맷으로 변환해야 함 (1월 8일(수))"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "헤즈업": {
                    "start": "2025-01-08T09:30:00.000+0900"
                }
            }
        }

        template = {
            "subject": "제목",
            "body": "{headsup_date}"
        }

        result = generator.generate_headsup(schedule_result, template)

        # 날짜 포맷 확인 (1월 8일(수))
        assert "1월" in result["body"] or "01월" in result["body"], "월이 포함되어야 합니다"
        assert "8일" in result["body"] or "08일" in result["body"], "일이 포함되어야 합니다"

    def test_generate_headsup_includes_title_and_body(self):
        """제목과 본문을 분리하여 출력해야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "헤즈업": {"start": "2025-01-08T09:30:00.000+0900"}
            }
        }

        template = {
            "subject": "제목 테스트",
            "body": "본문 테스트"
        }

        result = generator.generate_headsup(schedule_result, template)

        assert result["subject"] == "제목 테스트", "subject가 분리되어야 합니다"
        assert result["body"] == "본문 테스트", "body가 분리되어야 합니다"

    def test_generate_headsup_for_ncgl_includes_milestone(self):
        """NCGL 헤즈업 메시지는 마일스톤을 포함해야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "NCGL",
            "yymmdd": "250115",
            "milestone": "M42",
            "tasks": {
                "헤즈업": {"start": "2025-01-08T09:30:00.000+0900"}
            }
        }

        template = {
            "subject": "{project} {milestone} {update_date}",
            "body": "마일스톤: {milestone}"
        }

        result = generator.generate_headsup(schedule_result, template)

        assert "M42" in result["subject"], "NCGL subject에 마일스톤이 포함되어야 합니다"
        assert "M42" in result["body"], "NCGL body에 마일스톤이 포함되어야 합니다"


class TestMessageGeneratorHandoff:
    """MessageGenerator HO 메시지 테스트"""

    def test_generate_handoff_substitutes_batch_variables(self):
        """HO 메시지에 배치 변수를 치환해야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "REGULAR": {
                    "subtasks": {
                        "DELIVERY": {"due": "2025-01-10T17:00:00.000+0900"}
                    }
                }
            }
        }

        template = {
            "subject": "{project} {update_date} {batch_name} HO",
            "body": "배치: {batch_name}\n마감일: {batch_due_date}"
        }

        batch_name = "REGULAR"

        result = generator.generate_handoff(schedule_result, batch_name, template)

        # 변수 치환 확인
        assert result["subject"] == "M4GL 250115 REGULAR HO", "subject 변수가 치환되어야 합니다"
        assert "REGULAR" in result["body"], "body에 배치명이 있어야 합니다"
        assert "1월" in result["body"], "body에 마감일이 한국어로 포맷되어야 합니다"

    def test_generate_handoff_uses_delivery_due_date(self):
        """HO 메시지는 DELIVERY Subtask의 due 날짜를 사용해야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "EXTRA0": {
                    "subtasks": {
                        "DELIVERY": {"due": "2025-01-13T17:00:00.000+0900"}
                    }
                }
            }
        }

        template = {
            "subject": "제목",
            "body": "{batch_due_date}"
        }

        result = generator.generate_handoff(schedule_result, "EXTRA0", template)

        # EXTRA0 DELIVERY 날짜 확인 (1월 13일)
        assert "1월" in result["body"], "마감일이 포맷되어야 합니다"
        assert "13일" in result["body"], "EXTRA0 DELIVERY 날짜가 맞아야 합니다"


class TestMessageGeneratorL10N:
    """MessageGenerator L10N 전용 변수 테스트"""

    def test_generate_headsup_includes_l10n_variables(self):
        """L10N 프로젝트는 전용 변수를 포함해야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        # L10N 일정 계산 결과
        schedule_result = {
            "project": "L10N",
            "year": 2025,
            "month": 11,
            "settlement_date": date(2025, 11, 13),
            "tasks": {}
        }

        template = {
            "subject": "제목",
            "body": "{work_period_start} ~ {work_period_end}\n견적서: {estimate_deadline}\n정산: {settlement_date_formatted}"
        }

        result = generator.generate_headsup(schedule_result, template)

        # L10N 변수 치환 확인 (2025년 11월 정산 → work_period: 10/26 ~ 11/25)
        body = result["body"]
        assert "10/26" in body, "work_period_start가 포함되어야 합니다 (전월 26일)"
        assert "11/25" in body, "work_period_end가 포함되어야 합니다 (당월 25일)"
        assert "11/13" in body, "settlement_date_formatted가 포함되어야 합니다"
        # estimate_deadline은 tasks가 비어있어 계산 안 됨 (정상)

    def test_l10n_variables_format_correctly(self):
        """L10N 변수가 올바른 형식으로 포맷되어야 함 (MM/DD(요일))"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "L10N",
            "year": 2025,
            "month": 11,
            "settlement_date": date(2025, 11, 13),
            "tasks": {
                "M4": {
                    "subtasks": {
                        "견적서 요청": {"start": "2025-10-27T09:30:00.000+0900"}
                    }
                }
            }
        }

        template = {
            "subject": "제목",
            "body": "{estimate_deadline}"
        }

        result = generator.generate_headsup(schedule_result, template)

        # MM/DD(요일) 형식 확인
        assert "10/" in result["body"] or "10월" in result["body"], "월이 포함되어야 합니다"
        assert "27" in result["body"], "일이 포함되어야 합니다"


class TestMessageGeneratorSystemVariables:
    """MessageGenerator 시스템 변수 테스트"""

    def test_update_date_full_variable_is_available(self):
        """{update_date_full} 변수를 사용할 수 있어야 함 (2025년 1월 15일)"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "update_date": date(2025, 1, 15),
            "tasks": {}
        }

        template = {
            "subject": "제목",
            "body": "{update_date_full}"
        }

        result = generator.generate_headsup(schedule_result, template)

        # 2025년 1월 15일 형식 확인
        assert "2025년" in result["body"], "연도가 포함되어야 합니다"
        assert "1월" in result["body"], "월이 포함되어야 합니다"
        assert "15일" in result["body"], "일이 포함되어야 합니다"

    def test_today_variable_is_available(self):
        """{today} 변수를 사용할 수 있어야 함 (1월 10일(금))"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {}
        }

        template = {
            "subject": "제목",
            "body": "오늘: {today}"
        }

        result = generator.generate_headsup(schedule_result, template)

        # 오늘 날짜 형식 확인 (현재 시스템 날짜)
        from datetime import date as dt
        today = dt.today()
        expected_month = f"{today.month}월"
        expected_day = f"{today.day}일"

        assert expected_month in result["body"], "오늘 날짜의 월이 포함되어야 합니다"
        assert expected_day in result["body"], "오늘 날짜의 일이 포함되어야 합니다"
        assert "(" in result["body"], "요일이 포함되어야 합니다"

    def test_handoff_uses_today_variable(self):
        """HO 메시지에서 {today} 변수를 사용할 수 있어야 함"""
        from src.message_generator import MessageGenerator

        generator = MessageGenerator()

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "REGULAR": {
                    "subtasks": {
                        "DELIVERY": {"due": "2025-01-10T17:00:00.000+0900"}
                    }
                }
            }
        }

        template = {
            "subject": "제목",
            "body": "전달일: {today}"
        }

        result = generator.generate_handoff(schedule_result, "REGULAR", template)

        # today 변수 확인
        assert "[ERROR:today]" not in result["body"], "today 변수가 치환되어야 합니다"



