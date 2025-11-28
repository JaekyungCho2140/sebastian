"""JIRA API 클라이언트"""
import requests


class JiraClient:
    """JIRA REST API 클라이언트"""

    def __init__(self, base_url, email, token):
        """
        Args:
            base_url: JIRA 베이스 URL (예: https://wemade.atlassian.net)
            email: JIRA 이메일
            token: JIRA API Token
        """
        self.base_url = base_url
        self.email = email
        self.token = token
        self.auth = (email, token)

    def build_epic_payload(self, schedule_result, project_key, assignee_id=None, description=""):
        """Epic 생성 Payload 구성

        Args:
            schedule_result: 일정 계산 결과 딕셔너리
            project_key: JIRA 프로젝트 키 (예: "L10NM4")
            assignee_id: 담당자 Account ID (선택적)
            description: Epic 설명 (선택적, 기본값: 빈 문자열)

        Returns:
            dict: JIRA API Payload
        """
        epic = schedule_result["epic"]
        return self._build_issue_payload(
            project_key=project_key,
            summary=epic["summary"],
            issuetype_id="10000",
            start=epic["start"],
            due=epic["due"],
            assignee_id=assignee_id,
            description=description
        )

    def build_task_payload(self, task_schedule, project_key, parent_key, assignee_id=None, description=""):
        """Task 생성 Payload 구성

        Args:
            task_schedule: Task 일정 딕셔너리
            project_key: JIRA 프로젝트 키
            parent_key: 상위 Epic Key (예: "L10NM4-1234")
            assignee_id: 담당자 Account ID (선택적)
            description: Task 설명 (선택적, 기본값: 빈 문자열)

        Returns:
            dict: JIRA API Payload
        """
        return self._build_issue_payload(
            project_key=project_key,
            summary=task_schedule["summary"],
            issuetype_id="10637",
            start=task_schedule["start"],
            due=task_schedule["due"],
            parent_key=parent_key,
            assignee_id=assignee_id,
            description=description
        )

    def build_subtask_payload(self, subtask_schedule, project_key, parent_key, assignee_id=None, description=""):
        """Subtask 생성 Payload 구성

        Args:
            subtask_schedule: Subtask 일정 딕셔너리
            project_key: JIRA 프로젝트 키
            parent_key: 상위 Task Key (예: "L10NM4-1235")
            assignee_id: 담당자 Account ID (선택적)
            description: Subtask 설명 (선택적, 기본값: 빈 문자열)

        Returns:
            dict: JIRA API Payload
        """
        return self._build_issue_payload(
            project_key=project_key,
            summary=subtask_schedule["summary"],
            issuetype_id="10638",
            start=subtask_schedule["start"],
            due=subtask_schedule["due"],
            parent_key=parent_key,
            assignee_id=assignee_id,
            description=description
        )

    def _build_issue_payload(self, project_key, summary, issuetype_id, start, due, parent_key=None,
                            assignee_id=None, description=""):
        """공통 이슈 Payload 구성

        Args:
            project_key: JIRA 프로젝트 키
            summary: 이슈 요약
            issuetype_id: 이슈 타입 ID
            start: 시작일 (ISO8601)
            due: 종료일 (ISO8601)
            parent_key: 상위 이슈 Key (선택적)
            assignee_id: 담당자 Account ID (선택적)
            description: 이슈 설명 (선택적, 기본값: 빈 문자열)

        Returns:
            dict: JIRA API Payload
        """
        payload = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "issuetype": {"id": issuetype_id},
                "customfield_10569": start,
                "customfield_10570": due,
                "description": description
            }
        }

        if parent_key:
            payload["fields"]["parent"] = {"key": parent_key}

        if assignee_id:
            payload["fields"]["assignee"] = {"id": assignee_id}
            payload["fields"]["reporter"] = {"id": assignee_id}

        return payload

    def create_epic(self, payload):
        """Epic 생성 API 호출

        Args:
            payload: Epic 생성 Payload

        Returns:
            str: Epic Key, 실패 시 None
        """
        return self._create_issue(payload)

    def create_task(self, payload):
        """Task 생성 API 호출

        Args:
            payload: Task 생성 Payload

        Returns:
            str: Task Key, 실패 시 None
        """
        return self._create_issue(payload)

    def create_subtask(self, payload):
        """Subtask 생성 API 호출

        Args:
            payload: Subtask 생성 Payload

        Returns:
            str: Subtask Key, 실패 시 None
        """
        return self._create_issue(payload)

    def _create_issue(self, payload):
        """공통 이슈 생성 API 호출

        Args:
            payload: 이슈 생성 Payload

        Returns:
            str: Issue Key, 실패 시 None
        """
        try:
            url = f"{self.base_url}/rest/api/3/issue"
            response = requests.post(
                url,
                json=payload,
                auth=self.auth,
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            if response.status_code == 201:
                data = response.json()
                return data.get("key")
            else:
                return None
        except:
            return None
