"""설정 파일 관리"""
import json
import os


class ConfigManager:
    """config.json 관리 클래스"""

    def __init__(self, config_path):
        """
        Args:
            config_path: config.json 파일 경로
        """
        self.config_path = config_path

    @staticmethod
    def get_default_config():
        """기본 설정 딕셔너리 반환

        Returns:
            dict: 기본 설정 딕셔너리
        """
        return {
            "version": "1.0",
            "auth": {
                "jira": {"email": "", "token": ""},
                "slack": {"token": ""},
                "confluence": {"email": "", "token": ""}
            },
            "schedule": {
                "daily_task": {"enabled": True, "cron": "0 9 10 * *"},
                "daily_scrum": {"enabled": True, "cron": "0 9 * * 1-5"},
                "slack_msg": {"enabled": True, "cron": "0 7 * * 1-5"}
            },
            "last_execution": {
                "daily_task": "",
                "daily_scrum": "",
                "slack_msg": ""
            },
            "admin_slack_channel": ""
        }

    def load_or_create_default(self):
        """config.json 로드 또는 기본값 생성

        Returns:
            dict: 설정 딕셔너리
        """
        if os.path.exists(self.config_path):
            return self.load()

        default_config = self.get_default_config()
        self.save(default_config)
        return default_config

    def load(self):
        """config.json 읽기

        Returns:
            dict: 설정 딕셔너리
        """
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save(self, config):
        """config.json 쓰기

        Args:
            config: 저장할 설정 딕셔너리
        """
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)

        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
