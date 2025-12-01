"""인증 관리"""
import keyring
import requests


class AuthManager:
    """인증 정보 관리 클래스"""

    SERVICE_NAME = "Sebastian"

    def store_jira_credentials(self, email, token):
        """JIRA 인증 정보 저장

        Args:
            email: JIRA 이메일
            token: JIRA API Token
        """
        keyring.set_password(self.SERVICE_NAME, "jira_email", email)
        keyring.set_password(self.SERVICE_NAME, "jira_token", token)

    def store_slack_credentials(self, token):
        """Slack 인증 정보 저장

        Args:
            token: Slack OAuth Token
        """
        keyring.set_password(self.SERVICE_NAME, "slack_token", token)

    def store_confluence_credentials(self, email, token):
        """Confluence 인증 정보 저장

        Args:
            email: Confluence 이메일
            token: Confluence API Token
        """
        keyring.set_password(self.SERVICE_NAME, "confluence_email", email)
        keyring.set_password(self.SERVICE_NAME, "confluence_token", token)

    def get_jira_credentials(self):
        """JIRA 인증 정보 조회

        Returns:
            tuple: (email, token), 없으면 (None, None)
        """
        email = keyring.get_password(self.SERVICE_NAME, "jira_email")
        token = keyring.get_password(self.SERVICE_NAME, "jira_token")
        return (email, token)

    def get_slack_credentials(self):
        """Slack 인증 정보 조회

        Returns:
            str: token, 없으면 None
        """
        return keyring.get_password(self.SERVICE_NAME, "slack_token")

    def get_confluence_credentials(self):
        """Confluence 인증 정보 조회

        Returns:
            tuple: (email, token) 또는 (None, None)
        """
        email = keyring.get_password(self.SERVICE_NAME, "confluence_email")
        token = keyring.get_password(self.SERVICE_NAME, "confluence_token")
        return (email, token)

    def test_jira_connection(self, email, token):
        """JIRA 연결 테스트

        Args:
            email: JIRA 이메일
            token: JIRA API Token

        Returns:
            bool: 연결 성공 시 True, 실패 시 False
        """
        try:
            response = requests.get(
                "https://wemade.atlassian.net/rest/api/3/myself",
                auth=(email, token),
                timeout=10
            )
            return response.status_code == 200
        except:
            return False

    def test_slack_connection(self, token):
        """Slack 연결 테스트

        Args:
            token: Slack OAuth Token

        Returns:
            bool: 연결 성공 시 True, 실패 시 False
        """
        try:
            response = requests.post(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            data = response.json()
            return response.status_code == 200 and data.get("ok", False)
        except:
            return False

    def test_confluence_connection(self, email, token):
        """Confluence 연결 테스트

        Args:
            email: Confluence 이메일
            token: Confluence API Token

        Returns:
            bool: 연결 성공 시 True, 실패 시 False
        """
        try:
            response = requests.get(
                "https://wemade.atlassian.net/wiki/rest/api/user/current",
                auth=(email, token),
                timeout=10
            )
            return response.status_code == 200
        except:
            return False
