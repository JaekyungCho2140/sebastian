"""공휴일 관리 테스트"""
import os
import json
import tempfile
import shutil
import pytest


class TestHolidayManager:
    """HolidayManager 클래스 테스트"""

    @pytest.fixture
    def temp_config_dir(self):
        """임시 설정 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_load_default_creates_holidays_json(self, temp_config_dir):
        """holidays.json 기본 데이터(2025-2027)를 생성해야 함"""
        from src.holiday_manager import HolidayManager

        holidays_path = os.path.join(temp_config_dir, "holidays.json")
        holiday_manager = HolidayManager(holidays_path)

        holidays = holiday_manager.load_default()

        # holidays.json 파일이 생성되었는지 확인
        assert os.path.exists(holidays_path), "holidays.json 파일이 생성되지 않았습니다"

        # 2025-2027년 데이터가 포함되어야 함
        assert "2025" in holidays, "holidays에 2025년이 있어야 합니다"
        assert "2026" in holidays, "holidays에 2026년이 있어야 합니다"
        assert "2027" in holidays, "holidays에 2027년이 있어야 합니다"

        # 2025년 데이터 확인
        holidays_2025 = holidays["2025"]
        assert isinstance(holidays_2025, list), "2025년 데이터는 리스트여야 합니다"
        assert len(holidays_2025) > 0, "2025년 공휴일이 최소 1개 이상 있어야 합니다"

        # 첫 번째 공휴일 구조 확인
        first_holiday = holidays_2025[0]
        assert "date" in first_holiday, "공휴일에 date가 있어야 합니다"
        assert "name" in first_holiday, "공휴일에 name이 있어야 합니다"

        # 신정(1월 1일) 포함 확인
        dates = [h["date"] for h in holidays_2025]
        assert "2025-01-01" in dates, "2025년 신정이 포함되어야 합니다"

    def test_get_holidays_returns_year_holidays(self, temp_config_dir):
        """특정 연도의 공휴일을 조회할 수 있어야 함"""
        from src.holiday_manager import HolidayManager

        holidays_path = os.path.join(temp_config_dir, "holidays.json")
        holiday_manager = HolidayManager(holidays_path)

        # 기본 데이터 생성
        holiday_manager.load_default()

        # 2025년 공휴일 조회
        holidays_2025 = holiday_manager.get_holidays(2025)

        assert holidays_2025 is not None, "2025년 공휴일을 찾을 수 없습니다"
        assert isinstance(holidays_2025, list), "공휴일은 리스트여야 합니다"
        assert len(holidays_2025) > 0, "2025년 공휴일이 최소 1개 이상 있어야 합니다"

        # 신정 확인
        dates = [h["date"] for h in holidays_2025]
        assert "2025-01-01" in dates, "2025년 신정이 포함되어야 합니다"

    def test_get_holidays_returns_empty_list_for_unknown_year(self, temp_config_dir):
        """존재하지 않는 연도는 빈 리스트를 반환해야 함"""
        from src.holiday_manager import HolidayManager

        holidays_path = os.path.join(temp_config_dir, "holidays.json")
        holiday_manager = HolidayManager(holidays_path)

        # 기본 데이터 생성
        holiday_manager.load_default()

        # 2028년 공휴일 조회 (존재하지 않음)
        holidays_2028 = holiday_manager.get_holidays(2028)

        assert holidays_2028 == [], "존재하지 않는 연도는 빈 리스트를 반환해야 합니다"

    def test_import_holidays_merges_new_year_data(self, temp_config_dir):
        """새로운 연도의 공휴일 데이터를 병합해야 함"""
        from src.holiday_manager import HolidayManager

        holidays_path = os.path.join(temp_config_dir, "holidays.json")
        holiday_manager = HolidayManager(holidays_path)

        # 기본 데이터 생성 (2025-2027)
        holiday_manager.load_default()

        # 2028년 데이터 가져오기
        new_data = {
            "2028": [
                {"date": "2028-01-01", "name": "신정"}
            ]
        }

        holiday_manager.import_holidays(new_data)

        # 2028년 데이터 확인
        holidays_2028 = holiday_manager.get_holidays(2028)
        assert len(holidays_2028) == 1, "2028년 공휴일이 1개 있어야 합니다"
        assert holidays_2028[0]["date"] == "2028-01-01", "2028년 신정이 포함되어야 합니다"

        # 기존 2025년 데이터는 유지되어야 함
        holidays_2025 = holiday_manager.get_holidays(2025)
        assert len(holidays_2025) > 0, "2025년 공휴일이 유지되어야 합니다"

    def test_import_holidays_overwrites_existing_year(self, temp_config_dir):
        """기존 연도의 데이터는 덮어써야 함"""
        from src.holiday_manager import HolidayManager

        holidays_path = os.path.join(temp_config_dir, "holidays.json")
        holiday_manager = HolidayManager(holidays_path)

        # 기본 데이터 생성
        holiday_manager.load_default()

        # 2025년 데이터가 원래 여러 개 있음
        original_count = len(holiday_manager.get_holidays(2025))
        assert original_count > 1, "기본 2025년 공휴일이 여러 개 있어야 합니다"

        # 2025년 데이터를 새로운 데이터로 교체
        new_data = {
            "2025": [
                {"date": "2025-01-01", "name": "신정만"}
            ]
        }

        holiday_manager.import_holidays(new_data)

        # 2025년 데이터가 덮어씌워졌는지 확인
        holidays_2025 = holiday_manager.get_holidays(2025)
        assert len(holidays_2025) == 1, "2025년 공휴일이 1개로 교체되어야 합니다"
        assert holidays_2025[0]["name"] == "신정만", "2025년 데이터가 덮어씌워져야 합니다"
