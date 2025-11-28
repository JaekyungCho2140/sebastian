"""인증 관리 테스트"""
import pytest
import keyring


class TestAuthManager:
    """AuthManager 클래스 테스트"""

    @pytest.fixture(autouse=True)
    def cleanup_keyring(self):
        """테스트 전후 키링 정리"""
        # 테스트 전 정리
        try:
            keyring.delete_password("Sebastian", "jira_email")
            keyring.delete_password("Sebastian", "jira_token")
            keyring.delete_password("Sebastian", "slack_token")
            keyring.delete_password("Sebastian", "confluence_email")
            keyring.delete_password("Sebastian", "confluence_token")
        except:
            pass

        yield

        # 테스트 후 정리
        try:
            keyring.delete_password("Sebastian", "jira_email")
            keyring.delete_password("Sebastian", "jira_token")
            keyring.delete_password("Sebastian", "slack_token")
            keyring.delete_password("Sebastian", "confluence_email")
            keyring.delete_password("Sebastian", "confluence_token")
        except:
            pass

    def test_store_jira_credentials_saves_to_keyring(self):
        """JIRA 인증 정보를 키링에 저장해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # JIRA 인증 정보 저장
        auth_manager.store_jira_credentials("test@example.com", "test_token")

        # 키링에서 조회하여 확인
        stored_email = keyring.get_password("Sebastian", "jira_email")
        stored_token = keyring.get_password("Sebastian", "jira_token")

        assert stored_email == "test@example.com", "JIRA email이 올바르게 저장되지 않았습니다"
        assert stored_token == "test_token", "JIRA token이 올바르게 저장되지 않았습니다"

    def test_store_slack_credentials_saves_to_keyring(self):
        """Slack 인증 정보를 키링에 저장해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Slack 인증 정보 저장
        auth_manager.store_slack_credentials("slack_test_token")

        # 키링에서 조회하여 확인
        stored_token = keyring.get_password("Sebastian", "slack_token")

        assert stored_token == "slack_test_token", "Slack token이 올바르게 저장되지 않았습니다"

    def test_store_confluence_credentials_saves_to_keyring(self):
        """Confluence 인증 정보를 키링에 저장해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Confluence 인증 정보 저장
        auth_manager.store_confluence_credentials("conf@example.com", "conf_token")

        # 키링에서 조회하여 확인
        stored_email = keyring.get_password("Sebastian", "confluence_email")
        stored_token = keyring.get_password("Sebastian", "confluence_token")

        assert stored_email == "conf@example.com", "Confluence email이 올바르게 저장되지 않았습니다"
        assert stored_token == "conf_token", "Confluence token이 올바르게 저장되지 않았습니다"


class TestAuthManagerRetrieval:
    """AuthManager 인증 정보 조회 테스트"""

    @pytest.fixture(autouse=True)
    def cleanup_keyring(self):
        """테스트 전후 키링 정리"""
        # 테스트 전 정리
        try:
            keyring.delete_password("Sebastian", "jira_email")
            keyring.delete_password("Sebastian", "jira_token")
            keyring.delete_password("Sebastian", "slack_token")
        except:
            pass

        yield

        # 테스트 후 정리
        try:
            keyring.delete_password("Sebastian", "jira_email")
            keyring.delete_password("Sebastian", "jira_token")
            keyring.delete_password("Sebastian", "slack_token")
        except:
            pass

    def test_a_get_jira_credentials_returns_none_when_missing(self):
        """인증 정보가 없을 때 None을 반환해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # 저장하지 않고 조회
        result = auth_manager.get_jira_credentials()

        assert result == (None, None), "인증 정보가 없을 때 (None, None)을 반환해야 합니다"

    def test_b_get_slack_credentials_returns_none_when_missing(self):
        """Slack 인증 정보가 없을 때 None을 반환해야 함"""
        from src.auth_manager import AuthManager

        # cleanup이 제대로 실행되었는지 명시적으로 확인
        auth_manager = AuthManager()

        # 명시적으로 삭제 (cleanup_keyring이 실행되었어야 하지만 확인)
        try:
            keyring.delete_password("Sebastian", "slack_token")
        except:
            pass

        # 저장하지 않고 조회
        token = auth_manager.get_slack_credentials()

        assert token is None, "인증 정보가 없을 때 None을 반환해야 합니다"

    def test_c_get_jira_credentials_returns_stored_data(self):
        """저장된 JIRA 인증 정보를 조회할 수 있어야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # JIRA 인증 정보 저장
        auth_manager.store_jira_credentials("jira@example.com", "jira_secret")

        # 조회
        email, token = auth_manager.get_jira_credentials()

        assert email == "jira@example.com", "JIRA email이 올바르게 조회되지 않았습니다"
        assert token == "jira_secret", "JIRA token이 올바르게 조회되지 않았습니다"

    def test_d_get_slack_credentials_returns_stored_token(self):
        """저장된 Slack 인증 정보를 조회할 수 있어야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Slack 인증 정보 저장
        auth_manager.store_slack_credentials("slack_secret")

        # 조회
        token = auth_manager.get_slack_credentials()

        assert token == "slack_secret", "Slack token이 올바르게 조회되지 않았습니다"


class TestAuthManagerConnection:
    """AuthManager 연결 테스트"""

    def test_test_jira_connection_returns_true_on_success(self, mocker):
        """JIRA 연결 테스트가 성공하면 True를 반환해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Mock requests.get
        mock_response = mocker.Mock()
        mock_response.status_code = 200
        mock_get = mocker.patch("requests.get", return_value=mock_response)

        # 연결 테스트
        result = auth_manager.test_jira_connection("test@example.com", "test_token")

        assert result is True, "JIRA 연결 성공 시 True를 반환해야 합니다"
        mock_get.assert_called_once()

    def test_test_jira_connection_returns_false_on_failure(self, mocker):
        """JIRA 연결 테스트가 실패하면 False를 반환해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Mock requests.get (401 Unauthorized)
        mock_response = mocker.Mock()
        mock_response.status_code = 401
        mock_get = mocker.patch("requests.get", return_value=mock_response)

        # 연결 테스트
        result = auth_manager.test_jira_connection("test@example.com", "wrong_token")

        assert result is False, "JIRA 연결 실패 시 False를 반환해야 합니다"

    def test_test_slack_connection_returns_true_on_success(self, mocker):
        """Slack 연결 테스트가 성공하면 True를 반환해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Mock requests.post
        mock_response = mocker.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"ok": True}
        mock_post = mocker.patch("requests.post", return_value=mock_response)

        # 연결 테스트
        result = auth_manager.test_slack_connection("test_token")

        assert result is True, "Slack 연결 성공 시 True를 반환해야 합니다"
        mock_post.assert_called_once()

    def test_test_confluence_connection_returns_true_on_success(self, mocker):
        """Confluence 연결 테스트가 성공하면 True를 반환해야 함"""
        from src.auth_manager import AuthManager

        auth_manager = AuthManager()

        # Mock requests.get
        mock_response = mocker.Mock()
        mock_response.status_code = 200
        mock_get = mocker.patch("requests.get", return_value=mock_response)

        # 연결 테스트
        result = auth_manager.test_confluence_connection("test@example.com", "test_token")

        assert result is True, "Confluence 연결 성공 시 True를 반환해야 합니다"
        mock_get.assert_called_once()


