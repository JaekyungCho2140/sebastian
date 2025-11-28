"""JIRA 클라이언트 테스트"""
import pytest
from datetime import date


class TestJiraClient:
    """JiraClient 클래스 테스트"""

    def test_build_epic_payload_creates_correct_structure(self):
        """Epic 생성 Payload를 올바르게 구성해야 함"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # 일정 계산 결과 (간단한 구조)
        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "epic": {
                "summary": "250115 업데이트",
                "start": "2025-01-08T09:30:00.000+0900",
                "due": "2025-01-15T18:30:00.000+0900"
            }
        }

        payload = client.build_epic_payload(schedule_result, "L10NM4")

        # Payload 구조 확인
        assert "fields" in payload, "Payload에 fields가 있어야 합니다"
        fields = payload["fields"]

        # 필수 필드 확인
        assert fields["project"]["key"] == "L10NM4", "project key가 올바르지 않습니다"
        assert fields["summary"] == "250115 업데이트", "summary가 올바르지 않습니다"
        assert fields["issuetype"]["id"] == "10000", "Epic issuetype id가 10000이어야 합니다"
        assert fields["customfield_10569"] == "2025-01-08T09:30:00.000+0900", "Start Date가 올바르지 않습니다"
        assert fields["customfield_10570"] == "2025-01-15T18:30:00.000+0900", "Due Date가 올바르지 않습니다"

    def test_build_epic_payload_includes_assignee_and_reporter(self):
        """Epic Payload에 assignee와 reporter가 포함되어야 함"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "epic": {
                "summary": "250115 업데이트",
                "start": "2025-01-08T09:30:00.000+0900",
                "due": "2025-01-15T18:30:00.000+0900"
            }
        }

        # assignee 지정
        assignee_id = "test_account_id_123"

        payload = client.build_epic_payload(schedule_result, "L10NM4", assignee_id=assignee_id)

        fields = payload["fields"]
        assert "assignee" in fields, "Payload에 assignee가 있어야 합니다"
        assert fields["assignee"]["id"] == assignee_id, "assignee id가 올바르지 않습니다"
        assert "reporter" in fields, "Payload에 reporter가 있어야 합니다"
        assert fields["reporter"]["id"] == assignee_id, "reporter id가 올바르지 않습니다"

    def test_build_task_payload_creates_correct_structure(self):
        """Task 생성 Payload를 올바르게 구성해야 함 (Epic 링크 포함)"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # Task 일정
        task_schedule = {
            "summary": "250115 업데이트 헤즈업",
            "start": "2025-01-08T09:30:00.000+0900",
            "due": "2025-01-08T18:30:00.000+0900"
        }

        payload = client.build_task_payload(task_schedule, "L10NM4", "L10NM4-1234")

        # Payload 구조 확인
        fields = payload["fields"]
        assert fields["project"]["key"] == "L10NM4", "project key가 올바르지 않습니다"
        assert fields["summary"] == "250115 업데이트 헤즈업", "summary가 올바르지 않습니다"
        assert fields["issuetype"]["id"] == "10637", "Task issuetype id가 10637이어야 합니다"
        assert fields["parent"]["key"] == "L10NM4-1234", "parent key가 올바르지 않습니다"

    def test_build_subtask_payload_creates_correct_structure(self):
        """Subtask 생성 Payload를 올바르게 구성해야 함 (Task 링크 포함)"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # Subtask 일정
        subtask_schedule = {
            "summary": "250115 업데이트 REGULAR HO&HB",
            "start": "2025-01-08T18:00:00.000+0900",
            "due": "2025-01-09T11:00:00.000+0900"
        }

        payload = client.build_subtask_payload(subtask_schedule, "L10NM4", "L10NM4-1235")

        # Payload 구조 확인
        fields = payload["fields"]
        assert fields["project"]["key"] == "L10NM4", "project key가 올바르지 않습니다"
        assert fields["summary"] == "250115 업데이트 REGULAR HO&HB", "summary가 올바르지 않습니다"
        assert fields["issuetype"]["id"] == "10638", "Subtask issuetype id가 10638이어야 합니다"
        assert fields["parent"]["key"] == "L10NM4-1235", "parent key가 올바르지 않습니다"


class TestJiraClientAPI:
    """JiraClient API 호출 테스트"""

    def test_create_epic_returns_epic_key_on_success(self, mocker):
        """Epic 생성 성공 시 Epic Key를 반환해야 함"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # Mock API 응답
        mock_response = mocker.Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"key": "L10NM4-1234"}
        mock_post = mocker.patch("requests.post", return_value=mock_response)

        # Epic Payload
        payload = {"fields": {"summary": "Test Epic"}}

        # Epic 생성
        epic_key = client.create_epic(payload)

        assert epic_key == "L10NM4-1234", "Epic Key가 올바르게 반환되어야 합니다"
        mock_post.assert_called_once()

    def test_create_task_returns_task_key_on_success(self, mocker):
        """Task 생성 성공 시 Task Key를 반환해야 함"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # Mock API 응답
        mock_response = mocker.Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"key": "L10NM4-1235"}
        mock_post = mocker.patch("requests.post", return_value=mock_response)

        # Task Payload
        payload = {"fields": {"summary": "Test Task"}}

        # Task 생성
        task_key = client.create_task(payload)

        assert task_key == "L10NM4-1235", "Task Key가 올바르게 반환되어야 합니다"
        mock_post.assert_called_once()

    def test_create_subtask_returns_subtask_key_on_success(self, mocker):
        """Subtask 생성 성공 시 Subtask Key를 반환해야 함"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # Mock API 응답
        mock_response = mocker.Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"key": "L10NM4-1236"}
        mock_post = mocker.patch("requests.post", return_value=mock_response)

        # Subtask Payload
        payload = {"fields": {"summary": "Test Subtask"}}

        # Subtask 생성
        subtask_key = client.create_subtask(payload)

        assert subtask_key == "L10NM4-1236", "Subtask Key가 올바르게 반환되어야 합니다"
        mock_post.assert_called_once()

    def test_create_epic_returns_none_on_failure(self, mocker):
        """Epic 생성 실패 시 None을 반환해야 함"""
        from src.jira_client import JiraClient

        client = JiraClient("https://test.atlassian.net", "test@example.com", "test_token")

        # Mock API 응답 (실패)
        mock_response = mocker.Mock()
        mock_response.status_code = 400
        mock_post = mocker.patch("requests.post", return_value=mock_response)

        # Epic Payload
        payload = {"fields": {"summary": "Test Epic"}}

        # Epic 생성
        epic_key = client.create_epic(payload)

        assert epic_key is None, "생성 실패 시 None을 반환해야 합니다"

