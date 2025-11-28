"""프로젝트 설정 관리"""
import json
import os


class ProjectManager:
    """projects.json 관리 클래스"""

    def __init__(self, projects_path):
        """
        Args:
            projects_path: projects.json 파일 경로
        """
        self.projects_path = projects_path

    def create_default(self):
        """projects.json 기본 구조 생성

        Returns:
            dict: 프로젝트 설정 딕셔너리
        """
        default_projects = {
            "M4GL": {
                "jira_key": "L10NM4",
                "nas_path": "\\\\nas\\m4gl\\l10n\\",
                "folder_structure": ["00_SOURCE", "01_HB", "02_REVIEW", "03_DELIVERY"],
                "languages": ["KO", "EN", "CT", "CS", "JA", "TH", "ES-LATAM", "PT-BR"],
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
                },
                "slack_channel": "C07BZA056M4"
            },
            "NCGL": {
                "jira_key": "L10NNC",
                "nas_path": "\\\\nas\\ncgl\\l10n\\",
                "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"],
                "languages": ["EN", "CT", "CS", "JA", "TH", "ES", "PT", "RU"],
                "schedule": {},
                "slack_channel": "C06BZA056E5"
            },
            "FBGL": {
                "jira_key": "L10NFB",
                "nas_path": "\\\\nas\\fbgl\\l10n\\",
                "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"],
                "regions": ["GL", "JP"],
                "languages_by_region": {
                    "GL": ["EN", "CT"],
                    "JP": ["EN", "JA"]
                },
                "deployment_types": ["CDN", "APP"],
                "schedule_by_deployment": {
                    "CDN": {},
                    "APP": {}
                },
                "slack_channel": "C06BZA056E6"
            },
            "LYGL": {
                "jira_key": "L10NLY",
                "nas_path": "\\\\nas\\lygl\\l10n\\",
                "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"],
                "languages": ["EN", "CT", "CS", "JA", "TH", "PT-BR", "RU"],
                "schedule": {},
                "slack_channel": "C06BZA056E7"
            },
            "L10N": {
                "type": "monthly_settlement",
                "jira_key": "L10N",
                "base_date_type": "settlement_deadline",
                "nas_path": None,
                "schedule": {}
            }
        }

        # 파일로 저장
        os.makedirs(os.path.dirname(self.projects_path), exist_ok=True)
        with open(self.projects_path, "w", encoding="utf-8") as f:
            json.dump(default_projects, f, indent=2, ensure_ascii=False)

        return default_projects

    def get_project(self, project_code):
        """특정 프로젝트 설정 로드

        Args:
            project_code: 프로젝트 코드 (예: "M4GL")

        Returns:
            dict: 프로젝트 설정 딕셔너리, 없으면 None
        """
        with open(self.projects_path, "r", encoding="utf-8") as f:
            projects = json.load(f)

        return projects.get(project_code)

    @staticmethod
    def validate_offset_days(value):
        """offset_days 값의 유효성 검증

        Args:
            value: 검증할 offset_days 값

        Returns:
            bool: -100 <= value <= 30 범위 내이면 True, 아니면 False
        """
        return -100 <= value <= 30
