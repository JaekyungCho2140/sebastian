"""Confluence API 클라이언트"""
import requests


class ConfluenceClient:
    """Confluence API 클라이언트 클래스"""

    def __init__(self, email, token):
        """ConfluenceClient 초기화

        Args:
            email: Confluence 계정 이메일
            token: Confluence API Token
        """
        self.email = email
        self.token = token
        self.base_url = "https://wemade.atlassian.net"

    def get_page(self, page_id):
        """페이지 내용 조회

        Args:
            page_id: 페이지 ID

        Returns:
            dict: 페이지 데이터 (id, title, body, version 포함)
                  실패 시 None
        """
        try:
            # PRD 3.3: GET /wiki/api/v2/pages/{id}
            url = f"{self.base_url}/wiki/api/v2/pages/{page_id}"

            response = requests.get(
                url,
                auth=(self.email, self.token),
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                return None

        except Exception:
            return None

    def get_labels(self, page_id):
        """페이지 라벨 조회

        Args:
            page_id: 페이지 ID

        Returns:
            list: 라벨 목록 (dict의 리스트)
                  실패 시 빈 리스트
        """
        try:
            # PRD 3.3: GET /wiki/api/v2/pages/{id}/labels
            url = f"{self.base_url}/wiki/api/v2/pages/{page_id}/labels"

            response = requests.get(
                url,
                auth=(self.email, self.token),
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            else:
                return []

        except Exception:
            return []

    def update_page(self, page_id, content, version):
        """페이지 본문 업데이트

        Args:
            page_id: 페이지 ID
            content: 새 페이지 내용 (dict, atlas_doc_format)
            version: 현재 버전 번호

        Returns:
            bool: 성공 시 True, 실패 시 False
        """
        try:
            # PRD 3.3, 4.3: PUT /wiki/api/v2/pages/{id}
            url = f"{self.base_url}/wiki/api/v2/pages/{page_id}"

            payload = {
                "id": page_id,
                "status": "current",
                "body": {
                    "representation": "atlas_doc_format",
                    "value": content
                },
                "version": {
                    "number": version + 1
                }
            }

            response = requests.put(
                url,
                json=payload,
                auth=(self.email, self.token),
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            return response.status_code == 200

        except Exception:
            return False

    def delete_label(self, page_id, label_name):
        """라벨 삭제

        Args:
            page_id: 페이지 ID
            label_name: 삭제할 라벨 이름

        Returns:
            bool: 성공 시 True, 실패 시 False
        """
        try:
            # PRD 3.3: DELETE /wiki/rest/api/content/{id}/label/{name}
            url = f"{self.base_url}/wiki/rest/api/content/{page_id}/label/{label_name}"

            response = requests.delete(
                url,
                auth=(self.email, self.token),
                timeout=30
            )

            return response.status_code == 204

        except Exception:
            return False

    def add_label(self, page_id, label_name):
        """라벨 추가

        Args:
            page_id: 페이지 ID
            label_name: 추가할 라벨 이름

        Returns:
            bool: 성공 시 True, 실패 시 False
        """
        try:
            # PRD 3.3: POST /wiki/rest/api/content/{id}/label
            url = f"{self.base_url}/wiki/rest/api/content/{page_id}/label"

            payload = [{"name": label_name}]

            response = requests.post(
                url,
                json=payload,
                auth=(self.email, self.token),
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            return response.status_code == 200

        except Exception:
            return False
