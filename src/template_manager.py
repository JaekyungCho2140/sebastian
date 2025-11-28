"""템플릿 관리"""
import json
import os


class TemplateManager:
    """templates.json 관리 클래스"""

    def __init__(self, templates_path):
        """
        Args:
            templates_path: templates.json 파일 경로
        """
        self.templates_path = templates_path

    def create_default(self):
        """templates.json 기본 구조 생성

        Returns:
            dict: 템플릿 딕셔너리
        """
        default_templates = {
            "variables": {
                "system": [
                    "project",
                    "update_date",
                    "update_date_full",
                    "milestone",
                    "batch_name",
                    "today",
                    "headsup_date",
                    "regular_ho_date",
                    "regular_delivery_date",
                    "extra0_ho_date",
                    "extra0_delivery_date",
                    "extra1_ho_date",
                    "extra1_delivery_date",
                    "batch_due_date"
                ],
                "custom": []
            },
            "templates": {
                "M4GL": {
                    "headsup": {
                        "subject": "",
                        "body": ""
                    },
                    "handoff": {
                        "subject": "",
                        "body": ""
                    }
                },
                "NCGL": {
                    "headsup": {
                        "subject": "",
                        "body": ""
                    },
                    "handoff": {
                        "subject": "",
                        "body": ""
                    }
                },
                "FBGL": {
                    "headsup": {
                        "subject": "",
                        "body": ""
                    },
                    "handoff": {
                        "subject": "",
                        "body": ""
                    }
                },
                "LYGL": {
                    "headsup": {
                        "subject": "",
                        "body": ""
                    },
                    "handoff": {
                        "subject": "",
                        "body": ""
                    }
                }
            }
        }

        # 파일로 저장
        os.makedirs(os.path.dirname(self.templates_path), exist_ok=True)
        with open(self.templates_path, "w", encoding="utf-8") as f:
            json.dump(default_templates, f, indent=2, ensure_ascii=False)

        return default_templates

    def get_template(self, project, template_type):
        """프로젝트별 템플릿 로드

        Args:
            project: 프로젝트 코드 (예: "M4GL")
            template_type: 템플릿 유형 ("headsup" 또는 "handoff")

        Returns:
            dict: 템플릿 딕셔너리 (subject, body), 없으면 None
        """
        with open(self.templates_path, "r", encoding="utf-8") as f:
            templates = json.load(f)

        project_templates = templates.get("templates", {}).get(project)
        if project_templates is None:
            return None

        return project_templates.get(template_type)
