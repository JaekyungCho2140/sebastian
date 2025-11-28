"""Confluence API 클라이언트 테스트"""
import pytest
from unittest.mock import Mock, patch


class TestConfluenceClient:
    """ConfluenceClient 클래스 테스트"""

    @patch("requests.get")
    def test_get_page_retrieves_page_content(self, mock_get):
        """페이지 내용을 조회해야 함"""
        from src.confluence_client import ConfluenceClient

        # Mock 응답 설정
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "id": "190906620",
            "title": "Daily Task",
            "body": {"atlas_doc_format": {"value": '{"type": "doc"}'}},
            "version": {"number": 42}
        }

        client = ConfluenceClient("test@example.com", "test_token")
        result = client.get_page("190906620")

        # PRD 3.3: GET /wiki/api/v2/pages/{id}
        assert mock_get.called, "requests.get이 호출되어야 합니다"
        assert result is not None, "페이지 데이터를 반환해야 합니다"
        assert "body" in result, "body가 있어야 합니다"
        assert "version" in result, "version이 있어야 합니다"

    @patch("requests.get")
    def test_get_labels_retrieves_page_labels(self, mock_get):
        """페이지 라벨을 조회해야 함"""
        from src.confluence_client import ConfluenceClient

        # Mock 응답 설정
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "results": [
                {"name": "daily_task_01"},
                {"name": "daily_task_02"}
            ]
        }

        client = ConfluenceClient("test@example.com", "test_token")
        result = client.get_labels("190906620")

        # PRD 3.3: GET /wiki/api/v2/pages/{id}/labels
        assert mock_get.called, "requests.get이 호출되어야 합니다"
        assert isinstance(result, list), "라벨 목록을 반환해야 합니다"
        assert len(result) == 2, "2개 라벨이 있어야 합니다"

    @patch("requests.put")
    def test_update_page_updates_content(self, mock_put):
        """페이지 본문을 업데이트해야 함"""
        from src.confluence_client import ConfluenceClient

        # Mock 응답 설정
        mock_put.return_value.status_code = 200
        mock_put.return_value.json.return_value = {"id": "190906620", "version": {"number": 43}}

        client = ConfluenceClient("test@example.com", "test_token")
        result = client.update_page("190906620", {"type": "doc"}, 42)

        # PRD 3.3: PUT /wiki/api/v2/pages/{id}
        assert mock_put.called, "requests.put이 호출되어야 합니다"
        assert result is True, "성공 시 True를 반환해야 합니다"

    @patch("requests.delete")
    def test_delete_label_removes_label(self, mock_delete):
        """라벨을 삭제해야 함"""
        from src.confluence_client import ConfluenceClient

        # Mock 응답 설정
        mock_delete.return_value.status_code = 204

        client = ConfluenceClient("test@example.com", "test_token")
        result = client.delete_label("190906620", "daily_task_01")

        # PRD 3.3: DELETE /wiki/rest/api/content/{id}/label/{name}
        assert mock_delete.called, "requests.delete가 호출되어야 합니다"
        assert result is True, "성공 시 True를 반환해야 합니다"

    @patch("requests.post")
    def test_add_label_adds_new_label(self, mock_post):
        """새 라벨을 추가해야 함"""
        from src.confluence_client import ConfluenceClient

        # Mock 응답 설정
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"results": [{"name": "daily_task_02"}]}

        client = ConfluenceClient("test@example.com", "test_token")
        result = client.add_label("190906620", "daily_task_02")

        # PRD 3.3: POST /wiki/rest/api/content/{id}/label
        assert mock_post.called, "requests.post가 호출되어야 합니다"
        assert result is True, "성공 시 True를 반환해야 합니다"

    @patch("requests.get")
    def test_get_page_uses_basic_auth(self, mock_get):
        """Basic 인증을 사용해야 함"""
        from src.confluence_client import ConfluenceClient

        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"id": "123"}

        client = ConfluenceClient("user@example.com", "api_token")
        client.get_page("123")

        # Basic Auth 확인
        call_kwargs = mock_get.call_args[1]
        assert "auth" in call_kwargs, "auth가 있어야 합니다"
        assert call_kwargs["auth"] == ("user@example.com", "api_token"), "Basic Auth가 일치해야 합니다"
