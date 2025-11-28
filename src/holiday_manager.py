"""공휴일 관리"""
import json
import os


class HolidayManager:
    """holidays.json 관리 클래스"""

    def __init__(self, holidays_path):
        """
        Args:
            holidays_path: holidays.json 파일 경로
        """
        self.holidays_path = holidays_path

    def load_default(self):
        """holidays.json 기본 데이터 (2025-2027) 로드

        Returns:
            dict: 연도별 공휴일 딕셔너리
        """
        default_holidays = {
            "2025": [
                {"date": "2025-01-01", "name": "신정"},
                {"date": "2025-01-28", "name": "설날 연휴"},
                {"date": "2025-01-29", "name": "설날"},
                {"date": "2025-01-30", "name": "설날 연휴"},
                {"date": "2025-03-01", "name": "삼일절"},
                {"date": "2025-03-03", "name": "대체공휴일(삼일절)"},
                {"date": "2025-05-05", "name": "어린이날"},
                {"date": "2025-05-06", "name": "석가탄신일"},
                {"date": "2025-06-06", "name": "현충일"},
                {"date": "2025-08-15", "name": "광복절"},
                {"date": "2025-10-03", "name": "개천절"},
                {"date": "2025-10-06", "name": "추석 연휴"},
                {"date": "2025-10-07", "name": "추석"},
                {"date": "2025-10-08", "name": "추석 연휴"},
                {"date": "2025-10-09", "name": "한글날"}
            ],
            "2026": [
                {"date": "2026-01-01", "name": "신정"},
                {"date": "2026-02-16", "name": "설날 연휴"},
                {"date": "2026-02-17", "name": "설날"},
                {"date": "2026-02-18", "name": "설날 연휴"},
                {"date": "2026-03-01", "name": "삼일절"},
                {"date": "2026-05-05", "name": "어린이날"},
                {"date": "2026-05-24", "name": "석가탄신일"},
                {"date": "2026-05-25", "name": "대체공휴일(석가탄신일)"},
                {"date": "2026-06-06", "name": "현충일"},
                {"date": "2026-08-15", "name": "광복절"},
                {"date": "2026-09-24", "name": "추석 연휴"},
                {"date": "2026-09-25", "name": "추석"},
                {"date": "2026-09-26", "name": "추석 연휴"},
                {"date": "2026-10-03", "name": "개천절"},
                {"date": "2026-10-05", "name": "대체공휴일(개천절)"},
                {"date": "2026-10-09", "name": "한글날"}
            ],
            "2027": [
                {"date": "2027-01-01", "name": "신정"},
                {"date": "2027-02-06", "name": "설날 연휴"},
                {"date": "2027-02-07", "name": "설날"},
                {"date": "2027-02-08", "name": "설날 연휴"},
                {"date": "2027-03-01", "name": "삼일절"},
                {"date": "2027-05-05", "name": "어린이날"},
                {"date": "2027-05-13", "name": "석가탄신일"},
                {"date": "2027-06-06", "name": "현충일"},
                {"date": "2027-06-07", "name": "대체공휴일(현충일)"},
                {"date": "2027-08-15", "name": "광복절"},
                {"date": "2027-08-16", "name": "대체공휴일(광복절)"},
                {"date": "2027-09-14", "name": "추석 연휴"},
                {"date": "2027-09-15", "name": "추석"},
                {"date": "2027-09-16", "name": "추석 연휴"},
                {"date": "2027-10-03", "name": "개천절"},
                {"date": "2027-10-04", "name": "대체공휴일(개천절)"},
                {"date": "2027-10-09", "name": "한글날"}
            ]
        }

        # 파일로 저장
        os.makedirs(os.path.dirname(self.holidays_path), exist_ok=True)
        with open(self.holidays_path, "w", encoding="utf-8") as f:
            json.dump(default_holidays, f, indent=2, ensure_ascii=False)

        return default_holidays

    def get_holidays(self, year):
        """특정 연도의 공휴일 조회

        Args:
            year: 연도 (int)

        Returns:
            list: 공휴일 리스트, 없으면 빈 리스트
        """
        with open(self.holidays_path, "r", encoding="utf-8") as f:
            holidays = json.load(f)

        year_str = str(year)
        return holidays.get(year_str, [])

    def import_holidays(self, json_data):
        """공휴일 데이터 병합 (가져오기)

        Args:
            json_data: 가져올 공휴일 딕셔너리 (연도별)
        """
        # 기존 데이터 로드
        with open(self.holidays_path, "r", encoding="utf-8") as f:
            existing_holidays = json.load(f)

        # 새 데이터 병합 (연도별 덮어쓰기)
        existing_holidays.update(json_data)

        # 파일로 저장
        with open(self.holidays_path, "w", encoding="utf-8") as f:
            json.dump(existing_holidays, f, indent=2, ensure_ascii=False)
