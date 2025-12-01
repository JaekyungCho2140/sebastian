"""일정/메시지 탭 테스트"""
import pytest
from PyQt6.QtWidgets import QApplication
import sys


@pytest.fixture(scope="session")
def qapp():
    """QApplication 인스턴스 생성"""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


class TestSchedulerTab:
    """SchedulerTab 클래스 테스트"""

    def test_scheduler_tab_has_project_dropdown(self, qapp):
        """프로젝트 드롭다운이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        # PRD wireframes.md 3.1: 프로젝트 드롭다운
        project_dropdown = tab.findChild(QComboBox, "project_dropdown")
        assert project_dropdown is not None, "프로젝트 드롭다운이 있어야 합니다"

    def test_scheduler_tab_has_date_picker(self, qapp):
        """업데이트일 날짜 선택기가 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QDateEdit

        tab = SchedulerTab()

        # PRD wireframes.md 3.1: 업데이트일 날짜 선택기
        date_picker = tab.findChild(QDateEdit, "date_picker")
        assert date_picker is not None, "날짜 선택기가 있어야 합니다"

    def test_scheduler_tab_has_calculate_button(self, qapp):
        """계산 버튼이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        # PRD wireframes.md 3.1: 계산 버튼
        calc_button = tab.findChild(QPushButton, "calculate_button")
        assert calc_button is not None, "계산 버튼이 있어야 합니다"
        assert "계산" in calc_button.text(), "버튼 텍스트에 '계산'이 있어야 합니다"

    def test_scheduler_tab_project_dropdown_has_options(self, qapp):
        """프로젝트 드롭다운에 5개 옵션이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        project_dropdown = tab.findChild(QComboBox, "project_dropdown")

        # PRD wireframes.md 3.1: M4GL, NCGL, FBGL, LYGL, L10N
        assert project_dropdown.count() == 5, "5개 프로젝트 옵션이 있어야 합니다"

        items = [project_dropdown.itemText(i) for i in range(project_dropdown.count())]
        assert "M4GL" in items, "M4GL 옵션이 있어야 합니다"
        assert "NCGL" in items, "NCGL 옵션이 있어야 합니다"
        assert "FBGL" in items, "FBGL 옵션이 있어야 합니다"
        assert "LYGL" in items, "LYGL 옵션이 있어야 합니다"
        assert "L10N" in items, "L10N 옵션이 있어야 합니다"

    def test_scheduler_tab_shows_milestone_for_ncgl(self, qapp):
        """NCGL 선택 시 마일스톤 입력이 표시되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QLineEdit

        tab = SchedulerTab()
        tab.show()  # 위젯을 표시해야 isVisible()이 정상 작동

        milestone_input = tab.findChild(QLineEdit, "milestone_input")
        milestone_label = tab.milestone_label

        assert milestone_input is not None, "마일스톤 입력이 있어야 합니다"

        # 초기 상태는 숨김
        assert milestone_input.isVisible() is False, "초기에는 숨겨져야 합니다"
        assert milestone_label.isVisible() is False, "라벨도 숨겨져야 합니다"

        # NCGL 선택 - 직접 메서드 호출
        tab._on_project_changed("NCGL")

        # PRD wireframes.md 3.1: NCGL 선택 시 마일스톤 표시
        assert milestone_input.isVisible() is True, "NCGL 선택 시 마일스톤이 보여야 합니다"
        assert milestone_label.isVisible() is True, "라벨도 보여야 합니다"

    def test_scheduler_tab_hides_milestone_for_m4gl(self, qapp):
        """M4GL 선택 시 마일스톤이 숨겨져야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QLineEdit

        tab = SchedulerTab()

        milestone_input = tab.findChild(QLineEdit, "milestone_input")

        # M4GL 선택
        tab._on_project_changed("M4GL")

        # PRD wireframes.md 3.1: M4GL은 마일스톤 없음
        assert milestone_input.isVisible() is False, "M4GL 선택 시 마일스톤이 숨겨져야 합니다"

    def test_scheduler_tab_has_result_table(self, qapp):
        """일정 결과 테이블이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QTableWidget

        tab = SchedulerTab()

        # PRD wireframes.md 3.2: 일정 결과 테이블
        result_table = tab.findChild(QTableWidget, "result_table")
        assert result_table is not None, "결과 테이블이 있어야 합니다"

    def test_scheduler_tab_displays_schedule_result(self, qapp):
        """일정 계산 결과를 테이블에 표시해야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QTableWidget
        from datetime import datetime

        tab = SchedulerTab()
        result_table = tab.findChild(QTableWidget, "result_table")

        # 샘플 일정 결과
        schedule_result = {
            "project": "M4GL",
            "update_date": datetime(2025, 1, 15),
            "yymmdd": "250115",
            "epic": {
                "summary": "250115 업데이트",
                "start": "2025-01-08T09:30:00.000+0900",
                "due": "2025-01-14T17:00:00.000+0900"
            },
            "tasks": {
                "헤즈업": {
                    "summary": "250115 업데이트 일정 헤즈업",
                    "start": "2025-01-08T09:30:00.000+0900",
                    "due": "2025-01-08T18:30:00.000+0900",
                    "subtasks": {}
                },
                "REGULAR": {
                    "summary": "250115 업데이트 REGULAR",
                    "start": "2025-01-08T15:00:00.000+0900",
                    "due": "2025-01-10T17:00:00.000+0900",
                    "subtasks": {
                        "HO&HB": {
                            "summary": "250115 업데이트 REGULAR HO&HB",
                            "start": "2025-01-08T18:00:00.000+0900",
                            "due": "2025-01-09T11:00:00.000+0900"
                        },
                        "DELIVERY": {
                            "summary": "250115 업데이트 REGULAR DELIVERY",
                            "start": "2025-01-10T17:00:00.000+0900",
                            "due": "2025-01-10T17:00:00.000+0900"
                        }
                    }
                }
            }
        }

        # 결과 표시
        tab.display_schedule_result(schedule_result)

        # PRD wireframes.md 3.2: 테이블에 데이터가 표시되어야 함
        assert result_table.rowCount() > 0, "테이블에 행이 있어야 합니다"
        assert result_table.columnCount() == 3, "테이블에 3개 열이 있어야 합니다 (마일스톤, 시작일, 종료일)"

    def test_scheduler_tab_calculate_connects_to_scheduler(self, qapp, tmp_path):
        """계산 버튼이 ScheduleCalculator와 연결되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.schedule_calculator import ScheduleCalculator
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from PyQt6.QtCore import QDate
        from datetime import date
        import json

        # 테스트용 projects.json 생성 (완전한 M4GL 스케줄)
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {
                        "start_offset_days": -18,
                        "start_time": "09:30",
                        "end_offset_days": -18,
                        "end_time": "18:30"
                    },
                    "REGULAR": {
                        "start_offset_days": -12,
                        "start_time": "15:00",
                        "end_offset_days": -5,
                        "end_time": "17:00",
                        "subtasks": {
                            "HO&HB": {
                                "start_offset_days": -12,
                                "start_time": "18:00",
                                "end_offset_days": -6,
                                "end_time": "11:00"
                            },
                            "DELIVERY": {
                                "start_offset_days": -5,
                                "start_time": "17:00",
                                "end_offset_days": -5,
                                "end_time": "17:00"
                            }
                        }
                    },
                    "EXTRA0": {
                        "start_offset_days": -10,
                        "start_time": "15:00",
                        "end_offset_days": -5,
                        "end_time": "17:00",
                        "subtasks": {
                            "HO&HB": {
                                "start_offset_days": -10,
                                "start_time": "18:00",
                                "end_offset_days": -6,
                                "end_time": "11:00"
                            },
                            "DELIVERY": {
                                "start_offset_days": -5,
                                "start_time": "17:00",
                                "end_offset_days": -5,
                                "end_time": "17:00"
                            }
                        }
                    },
                    "EXTRA1": {
                        "start_offset_days": -7,
                        "start_time": "15:00",
                        "end_offset_days": -1,
                        "end_time": "17:00",
                        "subtasks": {
                            "HO&HB": {
                                "start_offset_days": -7,
                                "start_time": "18:00",
                                "end_offset_days": -2,
                                "end_time": "11:00"
                            },
                            "DELIVERY": {
                                "start_offset_days": -1,
                                "start_time": "17:00",
                                "end_offset_days": -1,
                                "end_time": "17:00"
                            }
                        }
                    }
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        # 테스트용 holidays.json 생성
        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # 의존성 생성
        project_manager = ProjectManager(str(projects_path))
        holiday_manager = HolidayManager(str(holidays_path))

        # SchedulerTab 생성 및 의존성 주입
        tab = SchedulerTab()
        tab.project_manager = project_manager
        tab.holiday_manager = holiday_manager
        tab.show()  # Qt 위젯을 표시해야 visibility가 정상 작동

        # M4GL 프로젝트, 2025-01-15 업데이트일 설정
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))

        # 계산 버튼 클릭
        tab._on_calculate()

        # PRD wireframes.md 3.2: 결과 테이블에 데이터가 표시되어야 함
        assert tab.result_table.isVisible() is True, "결과 테이블이 보여야 합니다"
        assert tab.result_table.rowCount() > 0, "테이블에 행이 있어야 합니다"

    def test_scheduler_tab_has_jira_button(self, qapp):
        """JIRA 일감 생성 버튼이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        # PRD wireframes.md 3.2: JIRA 일감 생성 버튼
        jira_button = tab.findChild(QPushButton, "jira_button")
        assert jira_button is not None, "JIRA 일감 생성 버튼이 있어야 합니다"
        assert "JIRA" in jira_button.text(), "버튼 텍스트에 'JIRA'가 있어야 합니다"

    def test_scheduler_tab_jira_button_disabled_initially(self, qapp):
        """JIRA 버튼은 초기에 비활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        jira_button = tab.findChild(QPushButton, "jira_button")
        # PRD scheduler.md 3.6: 계산 전에는 비활성화
        assert jira_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

    def test_scheduler_tab_jira_button_enabled_after_calculation(self, qapp, tmp_path):
        """계산 후 JIRA 버튼이 활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from PyQt6.QtCore import QDate
        from PyQt6.QtWidgets import QPushButton
        import json

        # 테스트용 설정 파일 생성
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.show()

        jira_button = tab.findChild(QPushButton, "jira_button")

        # 초기 상태: 비활성화
        assert jira_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # PRD scheduler.md 3.6: 계산 후 활성화
        assert jira_button.isEnabled() is True, "계산 후 활성화되어야 합니다"

    def test_scheduler_tab_creates_jira_issues_on_button_click(self, qapp, tmp_path, mocker):
        """JIRA 버튼 클릭 시 일감을 생성해야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from src.auth_manager import AuthManager
        from PyQt6.QtCore import QDate
        import json

        # 테스트용 설정 파일 생성
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.show()

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # AuthManager Mock
        mock_auth_get_jira = mocker.patch('src.auth_manager.AuthManager.get_jira_credentials')
        mock_auth_get_jira.return_value = ("test@example.com", "test_token")

        # JiraCreator.create_all_issues() Mock
        mock_create_all = mocker.patch('src.jira_creator.JiraCreator.create_all_issues')
        mock_create_all.return_value = (True, ["L10NM4-1234"])

        # JIRA 버튼 클릭
        tab._on_create_jira()

        # PRD scheduler.md 3.6: JiraCreator가 호출되어야 함
        assert mock_create_all.called is True, "JiraCreator.create_all_issues()가 호출되어야 합니다"

    def test_scheduler_tab_has_folder_button(self, qapp):
        """폴더 생성 버튼이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        # PRD wireframes.md 3.2: 폴더 생성 버튼
        folder_button = tab.findChild(QPushButton, "folder_button")
        assert folder_button is not None, "폴더 생성 버튼이 있어야 합니다"
        assert "폴더" in folder_button.text(), "버튼 텍스트에 '폴더'가 있어야 합니다"

    def test_scheduler_tab_folder_button_disabled_initially(self, qapp):
        """폴더 버튼은 초기에 비활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        folder_button = tab.findChild(QPushButton, "folder_button")
        # PRD scheduler.md 4.5: 계산 전에는 비활성화
        assert folder_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

    def test_scheduler_tab_folder_button_enabled_after_calculation(self, qapp, tmp_path):
        """계산 후 폴더 버튼이 활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from PyQt6.QtCore import QDate
        from PyQt6.QtWidgets import QPushButton
        import json

        # 테스트용 설정 파일 생성
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "nas_path": "\\\\nas\\m4gl\\l10n\\",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                },
                "folder_structure": ["00_SOURCE", "01_HB", "02_REVIEW", "03_DELIVERY"]
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.show()

        folder_button = tab.findChild(QPushButton, "folder_button")

        # 초기 상태: 비활성화
        assert folder_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # PRD scheduler.md 4.5: 계산 후 활성화
        assert folder_button.isEnabled() is True, "계산 후 활성화되어야 합니다"

    def test_scheduler_tab_creates_folders_on_button_click(self, qapp, tmp_path, mocker):
        """폴더 버튼 클릭 시 폴더를 생성해야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from PyQt6.QtCore import QDate
        import json

        # 테스트용 설정 파일 생성
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "nas_path": str(tmp_path / "nas"),
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                },
                "folder_structure": ["00_SOURCE", "01_HB", "02_REVIEW", "03_DELIVERY"]
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.show()

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # FolderCreator.create_folders() Mock
        mock_create_folders = mocker.patch('src.folder_creator.FolderCreator.create_folders')
        mock_create_folders.return_value = True

        # 폴더 버튼 클릭
        tab._on_create_folder()

        # PRD scheduler.md 4.5: FolderCreator가 호출되어야 함
        assert mock_create_folders.called is True, "FolderCreator.create_folders()가 호출되어야 합니다"

    def test_scheduler_tab_has_headsup_button(self, qapp):
        """헤즈업 버튼이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        # PRD messaging.md 4.3: 헤즈업 버튼
        headsup_button = tab.findChild(QPushButton, "headsup_button")
        assert headsup_button is not None, "헤즈업 버튼이 있어야 합니다"
        assert "헤즈업" in headsup_button.text(), "버튼 텍스트에 '헤즈업'이 있어야 합니다"

    def test_scheduler_tab_headsup_button_disabled_initially(self, qapp):
        """헤즈업 버튼은 초기에 비활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        headsup_button = tab.findChild(QPushButton, "headsup_button")
        assert headsup_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

    def test_scheduler_tab_headsup_button_enabled_after_calculation(self, qapp, tmp_path):
        """계산 후 헤즈업 버튼이 활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from PyQt6.QtCore import QDate
        from PyQt6.QtWidgets import QPushButton
        import json

        # 테스트용 설정
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.show()

        headsup_button = tab.findChild(QPushButton, "headsup_button")

        # 초기 상태: 비활성화
        assert headsup_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # PRD messaging.md 4.3: 계산 후 활성화
        assert headsup_button.isEnabled() is True, "계산 후 활성화되어야 합니다"

    def test_scheduler_tab_generates_headsup_message_on_button_click(self, qapp, tmp_path, mocker):
        """헤즈업 버튼 클릭 시 메시지를 생성해야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from src.template_manager import TemplateManager
        from PyQt6.QtCore import QDate
        import json

        # 테스트용 설정
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        templates_path = tmp_path / "templates.json"
        templates_data = {
            "templates": {
                "M4GL": {
                    "headsup": {
                        "subject": "{project} {update_date} 업데이트",
                        "body": "안녕하세요"
                    }
                }
            }
        }
        templates_path.write_text(json.dumps(templates_data))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.template_manager = TemplateManager(str(templates_path))
        tab.show()

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # MessageGenerator.generate_headsup() Mock
        mock_generate = mocker.patch('src.message_generator.MessageGenerator.generate_headsup')
        mock_generate.return_value = {"subject": "M4GL 250115 업데이트", "body": "안녕하세요"}

        # 헤즈업 버튼 클릭
        tab._on_show_headsup()

        # PRD messaging.md 4.3: MessageGenerator가 호출되어야 함
        assert mock_generate.called is True, "MessageGenerator.generate_headsup()가 호출되어야 합니다"

    def test_scheduler_tab_has_ho_button(self, qapp):
        """HO 버튼이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        # PRD messaging.md 5.3: HO 버튼
        ho_button = tab.findChild(QPushButton, "ho_button")
        assert ho_button is not None, "HO 버튼이 있어야 합니다"
        assert "HO" in ho_button.text(), "버튼 텍스트에 'HO'가 있어야 합니다"

    def test_scheduler_tab_ho_button_disabled_initially(self, qapp):
        """HO 버튼은 초기에 비활성화되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QPushButton

        tab = SchedulerTab()

        ho_button = tab.findChild(QPushButton, "ho_button")
        assert ho_button.isEnabled() is False, "초기에는 비활성화되어야 합니다"

    def test_scheduler_tab_has_deployment_type_dropdown(self, qapp):
        """FBGL 배포 유형 드롭다운이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        # PRD scheduler.md 2.2: 배포 유형 드롭다운
        deployment_dropdown = tab.findChild(QComboBox, "deployment_type_dropdown")
        assert deployment_dropdown is not None, "배포 유형 드롭다운이 있어야 합니다"

    def test_scheduler_tab_shows_deployment_type_for_fbgl(self, qapp):
        """FBGL 선택 시 배포 유형이 표시되어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()
        tab.show()

        deployment_dropdown = tab.findChild(QComboBox, "deployment_type_dropdown")
        deployment_label = tab.deployment_type_label

        # 초기 상태 (M4GL): 숨김
        assert deployment_dropdown.isVisible() is False, "초기에는 숨겨져야 합니다"
        assert deployment_label.isVisible() is False, "라벨도 숨겨져야 합니다"

        # FBGL 선택
        tab._on_project_changed("FBGL")

        # PRD scheduler.md 2.2: FBGL 선택 시 배포 유형 표시
        assert deployment_dropdown.isVisible() is True, "FBGL 선택 시 배포 유형이 보여야 합니다"
        assert deployment_label.isVisible() is True, "라벨도 보여야 합니다"

    def test_scheduler_tab_hides_deployment_type_for_m4gl(self, qapp):
        """M4GL 선택 시 배포 유형이 숨겨져야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        deployment_dropdown = tab.findChild(QComboBox, "deployment_type_dropdown")

        # FBGL 선택 후 M4GL로 변경
        tab._on_project_changed("FBGL")
        tab._on_project_changed("M4GL")

        # PRD scheduler.md 2.2: M4GL은 배포 유형 없음
        assert deployment_dropdown.isVisible() is False, "M4GL 선택 시 배포 유형이 숨겨져야 합니다"

    def test_scheduler_tab_deployment_type_has_cdn_and_app(self, qapp):
        """배포 유형 드롭다운에 CDN과 APP 옵션이 있어야 함"""
        from src.scheduler_tab import SchedulerTab
        from PyQt6.QtWidgets import QComboBox

        tab = SchedulerTab()

        deployment_dropdown = tab.findChild(QComboBox, "deployment_type_dropdown")

        # PRD scheduler.md 2.2: CDN, APP 옵션
        assert deployment_dropdown.count() == 2, "2개 옵션이 있어야 합니다"

        items = [deployment_dropdown.itemText(i) for i in range(deployment_dropdown.count())]
        assert "CDN" in items, "CDN 옵션이 있어야 합니다"
        assert "APP" in items, "APP 옵션이 있어야 합니다"

    def test_scheduler_tab_ho_button_shows_batch_menu(self, qapp, tmp_path, mocker):
        """HO 버튼 클릭 시 배치 선택 메뉴를 표시해야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from PyQt6.QtCore import QDate
        from PyQt6.QtWidgets import QMenu
        import json

        # 테스트용 설정
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.show()

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # QMenu Mock
        mock_menu = mocker.patch('PyQt6.QtWidgets.QMenu.exec')
        mock_action = mocker.Mock()
        mock_action.text.return_value = "REGULAR"
        mock_menu.return_value = mock_action

        # HO 버튼 클릭
        tab._on_show_ho_menu()

        # PRD messaging.md 6.1: 배치 선택 메뉴가 표시되어야 함
        assert mock_menu.called is True, "배치 선택 메뉴가 표시되어야 합니다"

    def test_scheduler_tab_ho_generates_message_for_selected_batch(self, qapp, tmp_path, mocker):
        """선택한 배치의 HO 메시지를 생성해야 함"""
        from src.scheduler_tab import SchedulerTab
        from src.project_manager import ProjectManager
        from src.holiday_manager import HolidayManager
        from src.template_manager import TemplateManager
        from PyQt6.QtCore import QDate
        import json

        # 테스트용 설정
        projects_path = tmp_path / "projects.json"
        project_data = {
            "M4GL": {
                "jira_key": "L10NM4",
                "schedule": {
                    "헤즈업": {"start_offset_days": -18, "start_time": "09:30", "end_offset_days": -18, "end_time": "18:30"},
                    "REGULAR": {"start_offset_days": -12, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -12, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA0": {"start_offset_days": -10, "start_time": "15:00", "end_offset_days": -5, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -10, "start_time": "18:00", "end_offset_days": -6, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -5, "start_time": "17:00", "end_offset_days": -5, "end_time": "17:00"}}},
                    "EXTRA1": {"start_offset_days": -7, "start_time": "15:00", "end_offset_days": -1, "end_time": "17:00", "subtasks": {"HO&HB": {"start_offset_days": -7, "start_time": "18:00", "end_offset_days": -2, "end_time": "11:00"}, "DELIVERY": {"start_offset_days": -1, "start_time": "17:00", "end_offset_days": -1, "end_time": "17:00"}}}
                }
            }
        }
        projects_path.write_text(json.dumps(project_data))

        holidays_path = tmp_path / "holidays.json"
        holidays_path.write_text(json.dumps({"2025": []}))

        templates_path = tmp_path / "templates.json"
        templates_data = {
            "templates": {
                "M4GL": {
                    "handoff": {
                        "subject": "{project} {update_date} {batch_name} HO",
                        "body": "HO 메시지"
                    }
                }
            }
        }
        templates_path.write_text(json.dumps(templates_data))

        # SchedulerTab 생성
        tab = SchedulerTab()
        tab.project_manager = ProjectManager(str(projects_path))
        tab.holiday_manager = HolidayManager(str(holidays_path))
        tab.template_manager = TemplateManager(str(templates_path))
        tab.show()

        # 일정 계산
        tab.project_dropdown.setCurrentText("M4GL")
        tab.date_picker.setDate(QDate(2025, 1, 15))
        tab._on_calculate()

        # MessageGenerator.generate_handoff() Mock
        mock_generate = mocker.patch('src.message_generator.MessageGenerator.generate_handoff')
        mock_generate.return_value = {"subject": "M4GL 250115 REGULAR HO", "body": "HO 메시지"}

        # 배치 선택 메뉴 Mock
        mock_menu_exec = mocker.patch('PyQt6.QtWidgets.QMenu.exec')
        mock_action = mocker.Mock()
        mock_action.text.return_value = "REGULAR"
        mock_menu_exec.return_value = mock_action

        # HO 버튼 클릭
        tab._on_show_ho_menu()

        # PRD messaging.md 5.2: MessageGenerator.generate_handoff()가 호출되어야 함
        assert mock_generate.called is True, "MessageGenerator.generate_handoff()가 호출되어야 합니다"

        # 배치명이 전달되어야 함
        call_args = mock_generate.call_args[0]
        assert "REGULAR" in str(call_args), "REGULAR 배치가 전달되어야 합니다"
