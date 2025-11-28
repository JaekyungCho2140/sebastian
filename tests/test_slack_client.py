"""Slack API 클라이언트 테스트"""
import pytest
from unittest.mock import Mock, patch


class TestSlackClient:
    """SlackClient 클래스 테스트"""

    @patch("requests.post")
    def test_post_message_sends_to_slack_api(self, mock_post):
        """Slack API로 메시지를 발송해야 함"""
        from src.slack_client import SlackClient

        # Mock 응답 설정
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"ok": True}

        client = SlackClient("test_email@example.com", "test_token")
        result = client.post_message("C06BZA056E4", "테스트 메시지")

        # API 호출 확인
        assert mock_post.called, "requests.post가 호출되어야 합니다"
        assert result is True, "성공 시 True를 반환해야 합니다"

        # 올바른 URL로 호출되었는지 확인
        call_args = mock_post.call_args
        assert "https://slack.com/api/chat.postMessage" in call_args[0][0], "Slack API URL이어야 합니다"

    @patch("requests.post")
    def test_post_message_returns_false_on_failure(self, mock_post):
        """API 실패 시 False를 반환해야 함"""
        from src.slack_client import SlackClient

        # Mock 실패 응답
        mock_post.return_value.status_code = 400
        mock_post.return_value.json.return_value = {"ok": False, "error": "invalid_auth"}

        client = SlackClient("test_email@example.com", "test_token")
        result = client.post_message("C06BZA056E4", "테스트 메시지")

        assert result is False, "실패 시 False를 반환해야 합니다"

    @patch("requests.post")
    def test_post_message_includes_channel_and_text(self, mock_post):
        """채널 ID와 메시지 텍스트를 포함해야 함"""
        from src.slack_client import SlackClient

        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"ok": True}

        client = SlackClient("test_email@example.com", "test_token")
        client.post_message("C12345678", "Hello World")

        # POST body 확인
        call_kwargs = mock_post.call_args[1]
        assert "json" in call_kwargs, "JSON body가 있어야 합니다"
        assert call_kwargs["json"]["channel"] == "C12345678", "채널 ID가 일치해야 합니다"
        assert call_kwargs["json"]["text"] == "Hello World", "메시지 텍스트가 일치해야 합니다"

    @patch("requests.post")
    def test_post_message_uses_bearer_token_auth(self, mock_post):
        """Bearer 토큰 인증을 사용해야 함"""
        from src.slack_client import SlackClient

        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"ok": True}

        client = SlackClient("test_email@example.com", "xoxb-test-token")
        client.post_message("C12345678", "Test")

        # Authorization 헤더 확인
        call_kwargs = mock_post.call_args[1]
        assert "headers" in call_kwargs, "헤더가 있어야 합니다"
        assert "Authorization" in call_kwargs["headers"], "Authorization 헤더가 있어야 합니다"
        assert call_kwargs["headers"]["Authorization"] == "Bearer xoxb-test-token", "Bearer 토큰이 일치해야 합니다"
