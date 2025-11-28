"""Daily Scrum 업데이터 테스트"""
import pytest
import json


class TestDailyScrumUpdater:
    """DailyScrumUpdater 클래스 테스트"""

    def test_update_cql_label_replaces_label_condition(self):
        """CQL 라벨 조건을 교체해야 함"""
        from src.daily_scrum_updater import DailyScrumUpdater

        updater = DailyScrumUpdater()

        # PRD 4.5: CQL 파라미터 예시
        content = {
            "content": [
                {
                    "type": "extension",
                    "attrs": {
                        "parameters": {
                            "cql": 'label = "daily_task_01" and space = "L10N"'
                        }
                    }
                }
            ]
        }

        result = updater.update_cql_label(content, "daily_task_01", "daily_task_02")

        # 라벨이 교체되어야 함
        cql = result["content"][0]["attrs"]["parameters"]["cql"]
        assert "daily_task_02" in cql, "새 라벨이 있어야 합니다"
        assert "daily_task_01" not in cql, "이전 라벨이 없어야 합니다"

    def test_update_date_display_updates_firstcolumn(self):
        """날짜 표시를 업데이트해야 함"""
        from src.daily_scrum_updater import DailyScrumUpdater

        updater = DailyScrumUpdater()

        # PRD 4.6: Details Summary 매크로 예시
        content = {
            "content": [
                {
                    "type": "extension",
                    "attrs": {
                        "parameters": {
                            "firstcolumn": "1월 9일(목)"
                        }
                    }
                }
            ]
        }

        new_date_text = "1월 10일(금)"
        result = updater.update_date_display(content, new_date_text)

        # 날짜가 업데이트되어야 함
        first_column = result["content"][0]["attrs"]["parameters"]["firstcolumn"]
        assert first_column == "1월 10일(금)", "날짜가 업데이트되어야 합니다"

    def test_update_date_display_updates_id_value(self):
        """ID 값도 업데이트해야 함"""
        from src.daily_scrum_updater import DailyScrumUpdater

        updater = DailyScrumUpdater()

        # PRD 4.6: ID 값 업데이트
        content = {
            "content": [
                {
                    "type": "extension",
                    "attrs": {
                        "parameters": {
                            "id": {
                                "value": "DAILY_TASK_MK2_20250109"
                            },
                            "firstcolumn": "1월 9일(목)"
                        }
                    }
                }
            ]
        }

        new_date_text = "1월 10일(금)"
        new_id = "DAILY_TASK_MK2_20250110"

        result = updater.update_date_display(content, new_date_text, new_id)

        # ID가 업데이트되어야 함
        id_value = result["content"][0]["attrs"]["parameters"]["id"]["value"]
        assert id_value == "DAILY_TASK_MK2_20250110", "ID가 업데이트되어야 합니다"

    def test_format_date_korean_creates_correct_format(self):
        """한국어 날짜 형식을 생성해야 함 (M월 DD일(요일))"""
        from src.daily_scrum_updater import DailyScrumUpdater
        from datetime import date

        updater = DailyScrumUpdater()

        test_date = date(2025, 1, 10)  # 금요일

        result = updater.format_date_korean(test_date)

        # PRD 4.6: "1월 10일(금)" 형식
        assert result == "1월 10일(금)", "날짜 형식이 일치해야 합니다"

    def test_format_date_korean_handles_different_dates(self):
        """다양한 날짜를 올바르게 포맷해야 함"""
        from src.daily_scrum_updater import DailyScrumUpdater
        from datetime import date

        updater = DailyScrumUpdater()

        # 2월 3일 월요일
        assert updater.format_date_korean(date(2025, 2, 3)) == "2월 3일(월)"

        # 12월 25일
        assert updater.format_date_korean(date(2025, 12, 25)) == "12월 25일(목)"
