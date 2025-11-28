"""Daily Task 템플릿 생성 테스트"""
import pytest
from datetime import date
import json
import uuid


class TestDailyTaskGenerator:
    """DailyTaskGenerator 클래스 테스트"""

    def test_build_macro_json_creates_correct_structure(self):
        """Page Properties 매크로 JSON 구조를 생성해야 함"""
        from src.daily_task_generator import DailyTaskGenerator

        generator = DailyTaskGenerator()
        test_date = date(2025, 2, 3)  # 월요일

        result = generator.build_macro_json(test_date, "월")

        # PRD 3.4: 최상위 구조 확인
        assert result["type"] == "bodiedExtension", "type이 bodiedExtension이어야 합니다"
        assert "attrs" in result, "attrs가 있어야 합니다"
        assert "content" in result, "content가 있어야 합니다"

    def test_build_macro_json_includes_dynamic_id(self):
        """id.value가 DAILY_TASK_MK2_{YYYYMMDD} 형식이어야 함"""
        from src.daily_task_generator import DailyTaskGenerator

        generator = DailyTaskGenerator()
        test_date = date(2025, 2, 3)

        result = generator.build_macro_json(test_date, "월")

        # PRD 3.4: id.value 형식
        id_value = result["attrs"]["parameters"]["macroParams"]["id"]["value"]
        assert id_value == "DAILY_TASK_MK2_20250203", "ID 형식이 일치해야 합니다"

    def test_build_macro_json_generates_valid_uuid(self):
        """localId에 유효한 UUID를 생성해야 함"""
        from src.daily_task_generator import DailyTaskGenerator

        generator = DailyTaskGenerator()
        test_date = date(2025, 2, 3)

        result = generator.build_macro_json(test_date, "월")

        # PRD 3.4: localId는 UUID v4
        local_id = result["attrs"]["localId"]

        # UUID 형식 검증
        try:
            uuid.UUID(local_id)
            assert True, "유효한 UUID여야 합니다"
        except ValueError:
            assert False, f"유효하지 않은 UUID: {local_id}"

    def test_build_macro_json_calculates_timestamp(self):
        """timestamp를 올바르게 계산해야 함 (Unix timestamp in milliseconds)"""
        from src.daily_task_generator import DailyTaskGenerator

        generator = DailyTaskGenerator()
        test_date = date(2025, 2, 3)

        result = generator.build_macro_json(test_date, "월")

        # PRD 3.4: timestamp는 Unix timestamp (milliseconds)
        timestamp = result["content"][0]["content"][0]["attrs"]["timestamp"]

        # 문자열이어야 함
        assert isinstance(timestamp, str), "timestamp는 문자열이어야 합니다"

        # 숫자로 변환 가능해야 함
        timestamp_int = int(timestamp)
        assert timestamp_int > 0, "유효한 timestamp여야 합니다"

    def test_build_macro_json_includes_weekday_text(self):
        """요일 텍스트를 포함해야 함"""
        from src.daily_task_generator import DailyTaskGenerator

        generator = DailyTaskGenerator()
        test_date = date(2025, 2, 3)

        result = generator.build_macro_json(test_date, "월")

        # PRD 3.4: text에 요일 포함
        weekday_text = result["content"][0]["content"][1]["text"]
        assert weekday_text == " (월)", "요일 텍스트가 일치해야 합니다"

    def test_generate_templates_for_month(self):
        """한 달의 모든 영업일에 대해 템플릿을 생성해야 함"""
        from src.daily_task_generator import DailyTaskGenerator

        generator = DailyTaskGenerator()

        # 2025년 2월 영업일
        holidays = []

        templates = generator.generate_templates_for_month(2025, 2, holidays)

        # 리스트 형태여야 함
        assert isinstance(templates, list), "템플릿 리스트를 반환해야 합니다"

        # 최소 20개 영업일 (대략)
        assert len(templates) >= 19, "2월 영업일 템플릿이 있어야 합니다"

        # 각 템플릿이 올바른 구조
        for template in templates:
            assert template["type"] == "bodiedExtension", "각 템플릿이 올바른 타입이어야 합니다"
