"""설정 관리 테스트"""
import os
import json
import tempfile
import shutil
import pytest


class TestConfigManager:
    """ConfigManager 클래스 테스트"""

    @pytest.fixture
    def temp_config_dir(self):
        """임시 설정 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_load_or_create_default_creates_config_when_missing(self, temp_config_dir):
        """config.json이 없을 때 기본값을 생성해야 함"""
        from src.config_manager import ConfigManager

        config_path = os.path.join(temp_config_dir, "config.json")
        config_manager = ConfigManager(config_path)

        config = config_manager.load_or_create_default()

        # config.json 파일이 생성되었는지 확인
        assert os.path.exists(config_path), "config.json 파일이 생성되지 않았습니다"

        # 기본 구조가 포함되어야 함
        assert "version" in config, "config에 version이 있어야 합니다"
        assert "auth" in config, "config에 auth가 있어야 합니다"
        assert "schedule" in config, "config에 schedule이 있어야 합니다"
        assert "last_execution" in config, "config에 last_execution이 있어야 합니다"
        assert "admin_slack_channel" in config, "config에 admin_slack_channel이 있어야 합니다"

    def test_load_reads_existing_config(self, temp_config_dir):
        """존재하는 config.json을 읽을 수 있어야 함"""
        from src.config_manager import ConfigManager

        config_path = os.path.join(temp_config_dir, "config.json")

        # 테스트용 config.json 생성
        test_config = {
            "version": "1.0",
            "auth": {
                "jira": {"email": "test@example.com", "token": "test_token"}
            }
        }

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(test_config, f)

        # 읽기 테스트
        config_manager = ConfigManager(config_path)
        loaded_config = config_manager.load()

        assert loaded_config["version"] == "1.0", "version이 올바르게 로드되지 않았습니다"
        assert loaded_config["auth"]["jira"]["email"] == "test@example.com", "jira email이 올바르게 로드되지 않았습니다"
        assert loaded_config["auth"]["jira"]["token"] == "test_token", "jira token이 올바르게 로드되지 않았습니다"

    def test_save_writes_config(self, temp_config_dir):
        """config.json을 올바르게 저장해야 함"""
        from src.config_manager import ConfigManager

        config_path = os.path.join(temp_config_dir, "config.json")
        config_manager = ConfigManager(config_path)

        # 설정 저장
        test_config = {
            "version": "1.0",
            "auth": {
                "slack": {"token": "saved_token"}
            }
        }

        config_manager.save(test_config)

        # 파일이 생성되었는지 확인
        assert os.path.exists(config_path), "config.json 파일이 생성되지 않았습니다"

        # 저장된 내용 확인
        with open(config_path, "r", encoding="utf-8") as f:
            saved_config = json.load(f)

        assert saved_config["version"] == "1.0", "version이 올바르게 저장되지 않았습니다"
        assert saved_config["auth"]["slack"]["token"] == "saved_token", "slack token이 올바르게 저장되지 않았습니다"

    def test_load_handles_invalid_json(self, temp_config_dir):
        """잘못된 JSON 형식을 처리해야 함"""
        from src.config_manager import ConfigManager

        config_path = os.path.join(temp_config_dir, "config.json")

        # 잘못된 JSON 파일 생성
        with open(config_path, "w", encoding="utf-8") as f:
            f.write("{ invalid json }")

        config_manager = ConfigManager(config_path)

        # JSONDecodeError 예외가 발생해야 함
        with pytest.raises(json.JSONDecodeError):
            config_manager.load()
