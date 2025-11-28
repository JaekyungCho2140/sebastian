"""Slack API 클라이언트"""
import requests


class SlackClient:
    """Slack API 클라이언트 클래스"""

    def __init__(self, email, token):
        """SlackClient 초기화

        Args:
            email: Slack 계정 이메일 (사용 안 함, 호환성 유지)
            token: Slack Bot Token
        """
        self.token = token
        self.base_url = "https://slack.com/api"

    def post_message(self, channel_id, text):
        """Slack 채널에 메시지 발송

        Args:
            channel_id: Slack 채널 ID
            text: 메시지 텍스트

        Returns:
            bool: 성공 시 True, 실패 시 False
        """
        try:
            # PRD 5.4: POST https://slack.com/api/chat.postMessage
            url = f"{self.base_url}/chat.postMessage"

            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }

            payload = {
                "channel": channel_id,
                "text": text
            }

            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                result = response.json()
                return result.get("ok", False)
            else:
                return False

        except Exception:
            return False
