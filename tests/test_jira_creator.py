"""JIRA 일감 생성기 테스트"""
import pytest
from datetime import date


class TestJiraCreator:
    """JiraCreator 클래스 테스트"""

    def test_create_all_issues_creates_epic_first(self, mocker):
        """Epic → Task → Subtask 순차 생성"""
        from src.jira_creator import JiraCreator
        from src.jira_client import JiraClient

        # Mock JiraClient
        mock_client = mocker.Mock(spec=JiraClient)
        mock_client.create_epic.return_value = "L10NM4-1234"
        mock_client.create_task.return_value = "L10NM4-1235"
        mock_client.create_subtask.return_value = "L10NM4-1236"

        creator = JiraCreator(mock_client)

        # 간단한 일정 결과
        schedule_result = {
            "project": "M4GL",
            "epic": {
                "summary": "250115 업데이트",
                "start": "2025-01-08T09:30:00.000+0900",
                "due": "2025-01-15T18:30:00.000+0900"
            },
            "tasks": {
                "헤즈업": {
                    "summary": "250115 업데이트 헤즈업",
                    "start": "2025-01-08T09:30:00.000+0900",
                    "due": "2025-01-08T18:30:00.000+0900",
                    "subtasks": {}
                }
            }
        }

        # 일감 생성
        result = creator.create_all_issues(schedule_result, "L10NM4")

        # Epic이 먼저 생성되었는지 확인
        assert mock_client.create_epic.called, "Epic이 생성되어야 합니다"
        assert mock_client.create_task.called, "Task가 생성되어야 합니다"

        # 생성된 Key 목록 확인
        assert "epic_key" in result, "결과에 epic_key가 있어야 합니다"
        assert result["epic_key"] == "L10NM4-1234", "Epic Key가 올바르지 않습니다"

    def test_create_all_issues_returns_created_keys(self, mocker):
        """생성된 일감 Key 목록을 반환해야 함"""
        from src.jira_creator import JiraCreator
        from src.jira_client import JiraClient

        mock_client = mocker.Mock(spec=JiraClient)
        mock_client.create_epic.return_value = "L10NM4-1234"
        mock_client.create_task.return_value = "L10NM4-1235"

        creator = JiraCreator(mock_client)

        schedule_result = {
            "epic": {
                "summary": "Test Epic",
                "start": "2025-01-08T09:30:00.000+0900",
                "due": "2025-01-15T18:30:00.000+0900"
            },
            "tasks": {
                "헤즈업": {
                    "summary": "Test Task",
                    "start": "2025-01-08T09:30:00.000+0900",
                    "due": "2025-01-08T18:30:00.000+0900",
                    "subtasks": {}
                }
            }
        }

        result = creator.create_all_issues(schedule_result, "L10NM4")

        # Key 목록 확인
        assert "created_keys" in result, "결과에 created_keys가 있어야 합니다"
        assert len(result["created_keys"]) > 0, "생성된 Key가 최소 1개 이상 있어야 합니다"

    def test_create_all_issues_handles_creation_failure(self, mocker):
        """일감 생성 실패 시 실패 정보를 반환해야 함"""
        from src.jira_creator import JiraCreator
        from src.jira_client import JiraClient

        mock_client = mocker.Mock(spec=JiraClient)
        mock_client.create_epic.return_value = None  # Epic 생성 실패

        creator = JiraCreator(mock_client)

        schedule_result = {
            "epic": {
                "summary": "Test Epic",
                "start": "2025-01-08T09:30:00.000+0900",
                "due": "2025-01-15T18:30:00.000+0900"
            },
            "tasks": {}
        }

        result = creator.create_all_issues(schedule_result, "L10NM4")

        # 실패 정보 확인
        assert result["epic_key"] is None, "Epic 생성 실패 시 epic_key가 None이어야 합니다"
        assert "success" in result, "결과에 success 플래그가 있어야 합니다"
        assert result["success"] is False, "생성 실패 시 success가 False여야 합니다"
