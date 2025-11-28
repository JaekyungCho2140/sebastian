"""일정 계산기 테스트"""
import pytest
from datetime import datetime, date


class TestScheduleCalculatorM4GL:
    """ScheduleCalculator M4GL 테스트"""

    def test_calculate_m4gl_headsup_schedule(self):
        """M4GL 헤즈업 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        # 2025-01-15 업데이트
        update_date = date(2025, 1, 15)
        holidays = []

        result = calculator.calculate_m4gl(update_date, holidays)

        # 헤즈업 확인 (offset: -18 영업일)
        assert "헤즈업" in result["tasks"], "헤즈업 Task가 있어야 합니다"
        headsup = result["tasks"]["헤즈업"]
        assert headsup is not None, "헤즈업 일정이 계산되어야 합니다"

    def test_calculate_m4gl_regular_schedule(self):
        """M4GL REGULAR 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        holidays = []

        result = calculator.calculate_m4gl(update_date, holidays)

        # REGULAR Task 확인
        assert "REGULAR" in result["tasks"], "REGULAR Task가 있어야 합니다"
        regular = result["tasks"]["REGULAR"]
        assert regular is not None, "REGULAR 일정이 계산되어야 합니다"

        # REGULAR Subtasks 확인
        assert "subtasks" in regular, "REGULAR에 subtasks가 있어야 합니다"
        assert "HO&HB" in regular["subtasks"], "REGULAR에 HO&HB Subtask가 있어야 합니다"
        assert "DELIVERY" in regular["subtasks"], "REGULAR에 DELIVERY Subtask가 있어야 합니다"

    def test_calculate_m4gl_extra_schedules(self):
        """M4GL EXTRA0, EXTRA1 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        holidays = []

        result = calculator.calculate_m4gl(update_date, holidays)

        # EXTRA0 확인
        assert "EXTRA0" in result["tasks"], "EXTRA0 Task가 있어야 합니다"
        extra0 = result["tasks"]["EXTRA0"]
        assert "subtasks" in extra0, "EXTRA0에 subtasks가 있어야 합니다"

        # EXTRA1 확인
        assert "EXTRA1" in result["tasks"], "EXTRA1 Task가 있어야 합니다"
        extra1 = result["tasks"]["EXTRA1"]
        assert "subtasks" in extra1, "EXTRA1에 subtasks가 있어야 합니다"

    def test_calculate_m4gl_result_structure(self):
        """M4GL 결과 구조 확인"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        holidays = []

        result = calculator.calculate_m4gl(update_date, holidays)

        # 기본 구조 확인
        assert "project" in result, "결과에 project가 있어야 합니다"
        assert result["project"] == "M4GL", "project가 M4GL이어야 합니다"
        assert "update_date" in result, "결과에 update_date가 있어야 합니다"
        assert "yymmdd" in result, "결과에 yymmdd가 있어야 합니다"
        assert result["yymmdd"] == "250115", "yymmdd가 250115여야 합니다"
        assert "epic" in result, "결과에 epic이 있어야 합니다"
        assert "tasks" in result, "결과에 tasks가 있어야 합니다"


class TestScheduleCalculatorNCGL:
    """ScheduleCalculator NCGL 테스트"""

    def test_calculate_ncgl_includes_milestone_in_summary(self):
        """NCGL 일정 계산 시 마일스톤이 Summary에 포함되어야 함"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        milestone = "M42"
        holidays = []

        result = calculator.calculate_ncgl(update_date, milestone, holidays)

        # Epic Summary에 마일스톤 포함 확인
        assert result["epic"]["summary"] == "250115 M42 업데이트", \
            "Epic Summary에 마일스톤이 포함되어야 합니다"

        # Task Summary에 마일스톤 포함 확인
        headsup = result["tasks"]["헤즈업"]
        assert "M42" in headsup["summary"], "Task Summary에 마일스톤이 포함되어야 합니다"

        # 결과에 milestone 필드 포함 확인
        assert "milestone" in result, "NCGL 결과에 milestone 필드가 있어야 합니다"
        assert result["milestone"] == "M42", "milestone 값이 올바르지 않습니다"

    def test_calculate_ncgl_all_tasks(self):
        """NCGL 모든 Task 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        milestone = "M42"
        holidays = []

        result = calculator.calculate_ncgl(update_date, milestone, holidays)

        # 모든 Task 확인
        assert "헤즈업" in result["tasks"], "헤즈업 Task가 있어야 합니다"
        assert "REGULAR" in result["tasks"], "REGULAR Task가 있어야 합니다"
        assert "EXTRA0" in result["tasks"], "EXTRA0 Task가 있어야 합니다"
        assert "EXTRA1" in result["tasks"], "EXTRA1 Task가 있어야 합니다"


class TestScheduleCalculatorFBGL:
    """ScheduleCalculator FBGL 테스트"""

    def test_calculate_fbgl_cdn_deployment(self):
        """FBGL CDN 배포 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        deployment_type = "CDN"
        holidays = []

        result = calculator.calculate_fbgl(update_date, deployment_type, holidays)

        # 기본 구조 확인
        assert result["project"] == "FBGL", "project가 FBGL이어야 합니다"
        assert "tasks" in result, "결과에 tasks가 있어야 합니다"

        # CDN 스케줄 적용 확인 (헤즈업 offset: -12)
        # 실제 날짜 검증보다는 구조 확인
        assert "헤즈업" in result["tasks"], "헤즈업 Task가 있어야 합니다"

    def test_calculate_fbgl_app_deployment(self):
        """FBGL APP 배포 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        deployment_type = "APP"
        holidays = []

        result = calculator.calculate_fbgl(update_date, deployment_type, holidays)

        # 기본 구조 확인
        assert result["project"] == "FBGL", "project가 FBGL이어야 합니다"
        assert "tasks" in result, "결과에 tasks가 있어야 합니다"

        # APP 스케줄 적용 확인
        assert "헤즈업" in result["tasks"], "헤즈업 Task가 있어야 합니다"


class TestScheduleCalculatorLYGL:
    """ScheduleCalculator LYGL 테스트"""

    def test_calculate_lygl_schedule(self):
        """LYGL 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        update_date = date(2025, 1, 15)
        holidays = []

        result = calculator.calculate_lygl(update_date, holidays)

        # 기본 구조 확인
        assert result["project"] == "LYGL", "project가 LYGL이어야 합니다"
        assert "tasks" in result, "결과에 tasks가 있어야 합니다"

        # 모든 Task 확인
        assert "헤즈업" in result["tasks"], "헤즈업 Task가 있어야 합니다"
        assert "REGULAR" in result["tasks"], "REGULAR Task가 있어야 합니다"
        assert "EXTRA0" in result["tasks"], "EXTRA0 Task가 있어야 합니다"
        assert "EXTRA1" in result["tasks"], "EXTRA1 Task가 있어야 합니다"


class TestScheduleCalculatorL10N:
    """ScheduleCalculator L10N 테스트"""

    def test_calculate_l10n_epic_schedule(self):
        """L10N Epic 일정 계산"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        # 정산 마감일: 2025-11-13
        settlement_date = date(2025, 11, 13)
        holidays = []

        result = calculator.calculate_l10n(settlement_date, holidays)

        # 기본 구조 확인
        assert result["project"] == "L10N", "project가 L10N이어야 합니다"
        assert "epic" in result, "결과에 epic이 있어야 합니다"
        assert "tasks" in result, "결과에 tasks가 있어야 합니다"

        # Epic 확인
        epic = result["epic"]
        assert "summary" in epic, "epic에 summary가 있어야 합니다"
        assert "2025년 11월 작업 정산" in epic["summary"], "Epic summary가 올바르지 않습니다"

    def test_calculate_l10n_all_tasks(self):
        """L10N 모든 Task 일정 계산 (M4, NC, FB, LY, 견적서 크로스체크)"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        settlement_date = date(2025, 11, 13)
        holidays = []

        result = calculator.calculate_l10n(settlement_date, holidays)

        # 5개 Task 확인
        assert "M4" in result["tasks"], "M4 Task가 있어야 합니다"
        assert "NC" in result["tasks"], "NC Task가 있어야 합니다"
        assert "FB" in result["tasks"], "FB Task가 있어야 합니다"
        assert "LY" in result["tasks"], "LY Task가 있어야 합니다"
        assert "견적서 크로스체크" in result["tasks"], "견적서 크로스체크 Task가 있어야 합니다"

    def test_calculate_l10n_task_subtasks(self):
        """L10N Task의 Subtask 계산 (견적서/세금계산서/지결)"""
        from src.schedule_calculator import ScheduleCalculator

        calculator = ScheduleCalculator()

        settlement_date = date(2025, 11, 13)
        holidays = []

        result = calculator.calculate_l10n(settlement_date, holidays)

        # M4 Task의 Subtasks 확인
        m4_task = result["tasks"]["M4"]
        assert "subtasks" in m4_task, "M4 Task에 subtasks가 있어야 합니다"
        assert "견적서 요청" in m4_task["subtasks"], "견적서 요청 Subtask가 있어야 합니다"
        assert "세금계산서 요청" in m4_task["subtasks"], "세금계산서 요청 Subtask가 있어야 합니다"
        assert "지결 상신" in m4_task["subtasks"], "지결 상신 Subtask가 있어야 합니다"

        # 견적서 크로스체크는 Subtask 없음
        crosscheck = result["tasks"]["견적서 크로스체크"]
        assert len(crosscheck["subtasks"]) == 0, "견적서 크로스체크는 Subtask가 없어야 합니다"

