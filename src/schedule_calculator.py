"""일정 계산기"""
from datetime import datetime, date, timedelta
from src.date_calculator import DateCalculator
from src.project_manager import ProjectManager
import json


class ScheduleCalculator:
    """일정 계산 클래스"""

    def __init__(self, project_manager=None):
        """일정 계산기 초기화

        Args:
            project_manager: ProjectManager 인스턴스 (선택적)
        """
        self.date_calculator = DateCalculator()
        self.project_manager = project_manager

    def calculate_m4gl(self, update_date, holidays):
        """M4GL 프로젝트 일정 계산

        Args:
            update_date: 업데이트일 (date 객체)
            holidays: 공휴일 리스트

        Returns:
            dict: 일정 계산 결과 (ScheduleResult 구조)
        """
        # ProjectManager에서 설정 로드 (없으면 기본값 사용)
        if self.project_manager:
            project_config = self.project_manager.get_project("M4GL")
            m4gl_schedule = project_config.get("schedule", {})
        else:
            # 기본 스케줄 (테스트용)
            m4gl_schedule = self._get_default_m4gl_schedule()

        return self._calculate_schedule("M4GL", update_date, m4gl_schedule, holidays)

    def calculate_ncgl(self, update_date, milestone, holidays):
        """NCGL 프로젝트 일정 계산

        Args:
            update_date: 업데이트일 (date 객체)
            milestone: 마일스톤 (예: "M42")
            holidays: 공휴일 리스트

        Returns:
            dict: 일정 계산 결과 (ScheduleResult 구조)
        """
        # NCGL 스케줄 로드
        if self.project_manager:
            project_config = self.project_manager.get_project("NCGL")
            ncgl_schedule = project_config.get("schedule", {})
        else:
            ncgl_schedule = self._get_default_ncgl_schedule()

        # 마일스톤 포함 계산
        result = self._calculate_schedule("NCGL", update_date, ncgl_schedule, holidays, milestone=milestone)

        # NCGL 결과에 milestone 필드 추가
        result["milestone"] = milestone

        return result

    def calculate_fbgl(self, update_date, deployment_type, holidays):
        """FBGL 프로젝트 일정 계산

        Args:
            update_date: 업데이트일 (date 객체)
            deployment_type: 배포 유형 ("CDN" 또는 "APP")
            holidays: 공휴일 리스트

        Returns:
            dict: 일정 계산 결과 (ScheduleResult 구조)
        """
        # FBGL 스케줄 로드 (배포 유형별)
        if self.project_manager:
            project_config = self.project_manager.get_project("FBGL")
            schedule_by_deployment = project_config.get("schedule_by_deployment", {})
            fbgl_schedule = schedule_by_deployment.get(deployment_type, {})
        else:
            fbgl_schedule = self._get_default_fbgl_schedule(deployment_type)

        return self._calculate_schedule("FBGL", update_date, fbgl_schedule, holidays)

    def calculate_lygl(self, update_date, holidays):
        """LYGL 프로젝트 일정 계산

        Args:
            update_date: 업데이트일 (date 객체)
            holidays: 공휴일 리스트

        Returns:
            dict: 일정 계산 결과 (ScheduleResult 구조)
        """
        # LYGL 스케줄 로드
        if self.project_manager:
            project_config = self.project_manager.get_project("LYGL")
            lygl_schedule = project_config.get("schedule", {})
        else:
            lygl_schedule = self._get_default_lygl_schedule()

        return self._calculate_schedule("LYGL", update_date, lygl_schedule, holidays)

    def calculate_l10n(self, settlement_date, holidays):
        """L10N 프로젝트 일정 계산 (월간 정산)

        Args:
            settlement_date: 정산 마감일 (date 객체)
            holidays: 공휴일 리스트

        Returns:
            dict: 일정 계산 결과
        """
        year = settlement_date.year
        month = settlement_date.month

        # Epic 일정 계산
        epic_start = self.date_calculator.eomonth_workday(
            settlement_date, -2, 24, -1, holidays
        )
        epic_due = settlement_date

        epic = {
            "summary": f"{year}년 {month}월 작업 정산",
            "start": self._combine_date_time(epic_start, "09:30"),
            "due": self._combine_date_time(epic_due, "18:30")
        }

        # Tasks 계산 (M4, NC, FB, LY, 견적서 크로스체크)
        tasks = {}

        # M4, NC, FB, LY Task (구조가 동일)
        for project_name in ["M4", "NC", "FB", "LY"]:
            tasks[project_name] = self._create_l10n_project_task(
                project_name, year, month, epic_start, epic_due, settlement_date, holidays
            )

        # 견적서 크로스체크 Task
        crosscheck_date = self.date_calculator.workday(settlement_date, -4, holidays)
        tasks["견적서 크로스체크"] = {
            "summary": f"{year}년 {month}월 견적서 크로스체크",
            "start": self._combine_date_time(crosscheck_date, "09:30"),
            "due": self._combine_date_time(crosscheck_date, "18:30"),
            "subtasks": {}
        }

        return {
            "project": "L10N",
            "settlement_date": settlement_date,
            "year": year,
            "month": month,
            "epic": epic,
            "tasks": tasks
        }

    def _create_l10n_project_task(self, project_name, year, month, task_start, task_due, settlement_date, holidays):
        """L10N 프로젝트별 Task 생성 (M4, NC, FB, LY)

        Args:
            project_name: 프로젝트명 ("M4", "NC", "FB", "LY")
            year: 연도
            month: 월
            task_start: Task 시작일
            task_due: Task 종료일
            settlement_date: 정산 마감일
            holidays: 공휴일 리스트

        Returns:
            dict: Task 딕셔너리 (summary, start, due, subtasks)
        """
        subtasks = {}

        # 견적서 요청
        estimate_date = self.date_calculator.eomonth_workday(
            settlement_date, -2, 26, -1, holidays
        )
        subtasks["견적서 요청"] = {
            "summary": f"[{project_name}] {month}월 견적서 요청",
            "start": self._combine_date_time(estimate_date, "09:30"),
            "due": self._combine_date_time(estimate_date, "18:30")
        }

        # 세금계산서 요청
        tax_date = self.date_calculator.workday(settlement_date, -3, holidays)
        subtasks["세금계산서 요청"] = {
            "summary": f"[{project_name}] {month}월 세금계산서 요청",
            "start": self._combine_date_time(tax_date, "09:30"),
            "due": self._combine_date_time(tax_date, "18:30")
        }

        # 지결 상신
        payment_date = self.date_calculator.workday(settlement_date, -2, holidays)
        subtasks["지결 상신"] = {
            "summary": f"[{project_name}] {month}월 지결 상신",
            "start": self._combine_date_time(payment_date, "09:30"),
            "due": self._combine_date_time(payment_date, "18:30")
        }

        return {
            "summary": f"{project_name} {year}년 {month}월 정산",
            "start": self._combine_date_time(task_start, "09:30"),
            "due": self._combine_date_time(task_due, "18:30"),
            "subtasks": subtasks
        }

    def _get_default_lygl_schedule(self):
        """LYGL 기본 스케줄 반환 (테스트용)

        Returns:
            dict: LYGL 스케줄 설정
        """
        return {
            "헤즈업": {
                "start_offset_days": -7,
                "start_time": "09:30",
                "end_offset_days": -7,
                "end_time": "18:30"
            },
            "REGULAR": {
                "start_offset_days": -4,
                "start_time": "12:00",
                "end_offset_days": -3,
                "end_time": "16:00",
                "subtasks": {
                    "HO&HB": {
                        "start_offset_days": -4,
                        "start_time": "13:00",
                        "end_offset_days": -3,
                        "end_time": "15:00"
                    },
                    "DELIVERY": {
                        "start_offset_days": -3,
                        "start_time": "16:00",
                        "end_offset_days": -3,
                        "end_time": "16:00"
                    }
                }
            },
            "EXTRA0": {
                "start_offset_days": -4,
                "start_time": "15:00",
                "end_offset_days": -2,
                "end_time": "15:00",
                "subtasks": {
                    "HO&HB": {
                        "start_offset_days": -4,
                        "start_time": "16:00",
                        "end_offset_days": -2,
                        "end_time": "14:00"
                    },
                    "DELIVERY": {
                        "start_offset_days": -2,
                        "start_time": "15:00",
                        "end_offset_days": -2,
                        "end_time": "15:00"
                    }
                }
            },
            "EXTRA1": {
                "start_offset_days": -4,
                "start_time": "17:00",
                "end_offset_days": -2,
                "end_time": "18:00",
                "subtasks": {
                    "HO&HB": {
                        "start_offset_days": -4,
                        "start_time": "18:00",
                        "end_offset_days": -2,
                        "end_time": "17:00"
                    },
                    "DELIVERY": {
                        "start_offset_days": -2,
                        "start_time": "18:00",
                        "end_offset_days": -2,
                        "end_time": "18:00"
                    }
                }
            }
        }

    def _get_default_fbgl_schedule(self, deployment_type):
        """FBGL 기본 스케줄 반환 (테스트용)

        Args:
            deployment_type: "CDN" 또는 "APP"

        Returns:
            dict: FBGL 스케줄 설정
        """
        if deployment_type == "CDN":
            return {
                "헤즈업": {
                    "start_offset_days": -12,
                    "start_time": "09:30",
                    "end_offset_days": -12,
                    "end_time": "18:30"
                },
                "REGULAR": {
                    "start_offset_days": -9,
                    "start_time": "14:00",
                    "end_offset_days": -6,
                    "end_time": "17:00",
                    "subtasks": {
                        "HO&HB": {
                            "start_offset_days": -9,
                            "start_time": "15:30",
                            "end_offset_days": -6,
                            "end_time": "16:00"
                        },
                        "DELIVERY": {
                            "start_offset_days": -6,
                            "start_time": "17:00",
                            "end_offset_days": -6,
                            "end_time": "17:00"
                        }
                    }
                },
                "EXTRA0": {
                    "start_offset_days": -8,
                    "start_time": "14:00",
                    "end_offset_days": -6,
                    "end_time": "17:00",
                    "subtasks": {
                        "HO&HB": {
                            "start_offset_days": -8,
                            "start_time": "15:30",
                            "end_offset_days": -6,
                            "end_time": "16:00"
                        },
                        "DELIVERY": {
                            "start_offset_days": -6,
                            "start_time": "17:00",
                            "end_offset_days": -6,
                            "end_time": "17:00"
                        }
                    }
                },
                "EXTRA1": {
                    "start_offset_days": -6,
                    "start_time": "14:00",
                    "end_offset_days": -4,
                    "end_time": "17:00",
                    "subtasks": {
                        "HO&HB": {
                            "start_offset_days": -6,
                            "start_time": "15:30",
                            "end_offset_days": -4,
                            "end_time": "16:00"
                        },
                        "DELIVERY": {
                            "start_offset_days": -4,
                            "start_time": "17:00",
                            "end_offset_days": -4,
                            "end_time": "17:00"
                        }
                    }
                }
            }
        else:  # APP
            return {
                "헤즈업": {
                    "start_offset_days": -15,
                    "start_time": "09:30",
                    "end_offset_days": -15,
                    "end_time": "18:30"
                },
                "REGULAR": {
                    "start_offset_days": -12,
                    "start_time": "14:00",
                    "end_offset_days": -9,
                    "end_time": "17:00",
                    "subtasks": {
                        "HO&HB": {
                            "start_offset_days": -12,
                            "start_time": "15:30",
                            "end_offset_days": -9,
                            "end_time": "16:00"
                        },
                        "DELIVERY": {
                            "start_offset_days": -9,
                            "start_time": "17:00",
                            "end_offset_days": -9,
                            "end_time": "17:00"
                        }
                    }
                },
                "EXTRA0": {
                    "start_offset_days": -11,
                    "start_time": "14:00",
                    "end_offset_days": -8,
                    "end_time": "17:00",
                    "subtasks": {
                        "HO&HB": {
                            "start_offset_days": -11,
                            "start_time": "15:30",
                            "end_offset_days": -8,
                            "end_time": "16:00"
                        },
                        "DELIVERY": {
                            "start_offset_days": -8,
                            "start_time": "17:00",
                            "end_offset_days": -8,
                            "end_time": "17:00"
                        }
                    }
                },
                "EXTRA1": {
                    "start_offset_days": -8,
                    "start_time": "14:00",
                    "end_offset_days": -3,
                    "end_time": "17:00",
                    "subtasks": {
                        "HO&HB": {
                            "start_offset_days": -8,
                            "start_time": "15:30",
                            "end_offset_days": -3,
                            "end_time": "16:00"
                        },
                        "DELIVERY": {
                            "start_offset_days": -3,
                            "start_time": "17:00",
                            "end_offset_days": -3,
                            "end_time": "17:00"
                        }
                    }
                }
            }

    def _get_default_ncgl_schedule(self):
        """NCGL 기본 스케줄 반환 (테스트용)

        Returns:
            dict: NCGL 스케줄 설정
        """
        return {
            "헤즈업": {
                "start_offset_days": -7,
                "start_time": "09:30",
                "end_offset_days": -7,
                "end_time": "18:30"
            },
            "REGULAR": {
                "start_offset_days": -6,
                "start_time": "15:00",
                "end_offset_days": -4,
                "end_time": "12:00",
                "subtasks": {
                    "HO&HB": {
                        "start_offset_days": -6,
                        "start_time": "15:00",
                        "end_offset_days": -4,
                        "end_time": "12:00"
                    },
                    "DELIVERY": {
                        "start_offset_days": -4,
                        "start_time": "12:00",
                        "end_offset_days": -4,
                        "end_time": "12:00"
                    }
                }
            },
            "EXTRA0": {
                "start_offset_days": -4,
                "start_time": "15:00",
                "end_offset_days": -2,
                "end_time": "12:00",
                "subtasks": {
                    "HO&HB": {
                        "start_offset_days": -4,
                        "start_time": "15:00",
                        "end_offset_days": -2,
                        "end_time": "12:00"
                    },
                    "DELIVERY": {
                        "start_offset_days": -2,
                        "start_time": "12:00",
                        "end_offset_days": -2,
                        "end_time": "12:00"
                    }
                }
            },
            "EXTRA1": {
                "start_offset_days": -3,
                "start_time": "15:00",
                "end_offset_days": -1,
                "end_time": "12:00",
                "subtasks": {
                    "HO&HB": {
                        "start_offset_days": -3,
                        "start_time": "15:00",
                        "end_offset_days": -1,
                        "end_time": "12:00"
                    },
                    "DELIVERY": {
                        "start_offset_days": -1,
                        "start_time": "12:00",
                        "end_offset_days": -1,
                        "end_time": "12:00"
                    }
                }
            }
        }

    def _get_default_m4gl_schedule(self):
        """M4GL 기본 스케줄 반환 (테스트용)

        Returns:
            dict: M4GL 스케줄 설정
        """
        return {
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

    def _calculate_schedule(self, project_code, update_date, schedule_config, holidays, milestone=None):
        """공통 일정 계산 로직

        Args:
            project_code: 프로젝트 코드
            update_date: 업데이트일
            schedule_config: 스케줄 설정
            holidays: 공휴일 리스트
            milestone: 마일스톤 (선택적, NCGL 전용)

        Returns:
            dict: 일정 계산 결과
        """
        # yymmdd 형식 생성
        yymmdd = update_date.strftime("%y%m%d")

        # Tasks 계산
        tasks = {}
        for task_name, task_config in schedule_config.items():
            # Task 일정 계산
            start_date = self.date_calculator.workday(
                update_date,
                task_config["start_offset_days"],
                holidays
            )
            end_date = self.date_calculator.workday(
                update_date,
                task_config["end_offset_days"],
                holidays
            )

            # Summary 생성 (마일스톤 포함 여부)
            if milestone:
                summary = f"{yymmdd} {milestone} 업데이트 {task_name}"
            else:
                summary = f"{yymmdd} 업데이트 {task_name}"

            task_schedule = {
                "summary": summary,
                "start": self._combine_date_time(start_date, task_config["start_time"]),
                "due": self._combine_date_time(end_date, task_config["end_time"]),
                "subtasks": {}
            }

            # Subtasks 계산
            if "subtasks" in task_config:
                for subtask_name, subtask_config in task_config["subtasks"].items():
                    subtask_start = self.date_calculator.workday(
                        update_date,
                        subtask_config["start_offset_days"],
                        holidays
                    )
                    subtask_end = self.date_calculator.workday(
                        update_date,
                        subtask_config["end_offset_days"],
                        holidays
                    )

                    # Subtask Summary 생성 (마일스톤 포함 여부)
                    if milestone:
                        subtask_summary = f"{yymmdd} {milestone} 업데이트 {task_name} {subtask_name}"
                    else:
                        subtask_summary = f"{yymmdd} 업데이트 {task_name} {subtask_name}"

                    task_schedule["subtasks"][subtask_name] = {
                        "summary": subtask_summary,
                        "start": self._combine_date_time(subtask_start, subtask_config["start_time"]),
                        "due": self._combine_date_time(subtask_end, subtask_config["end_time"])
                    }

            tasks[task_name] = task_schedule

        # Epic 계산 (헤즈업 시작 ~ 마지막 Task 종료)
        headsup_start = tasks["헤즈업"]["start"]
        last_task_end = tasks["EXTRA1"]["due"]

        # Epic Summary 생성 (마일스톤 포함 여부)
        if milestone:
            epic_summary = f"{yymmdd} {milestone} 업데이트"
        else:
            epic_summary = f"{yymmdd} 업데이트"

        epic = {
            "summary": epic_summary,
            "start": headsup_start,
            "due": last_task_end
        }

        return {
            "project": project_code,
            "update_date": update_date,
            "yymmdd": yymmdd,
            "epic": epic,
            "tasks": tasks
        }

    def _combine_date_time(self, date_obj, time_str):
        """날짜와 시간을 결합하여 ISO8601 형식으로 변환

        Args:
            date_obj: date 객체
            time_str: 시간 문자열 (HH:MM)

        Returns:
            str: ISO8601 형식 문자열 (YYYY-MM-DDTHH:MM:00.000+0900)
        """
        hour, minute = map(int, time_str.split(":"))
        dt = datetime.combine(date_obj, datetime.min.time().replace(hour=hour, minute=minute))
        return dt.strftime("%Y-%m-%dT%H:%M:00.000+0900")
