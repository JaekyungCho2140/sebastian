"""JIRA 일감 생성기"""


class JiraCreator:
    """JIRA 일감 순차 생성 클래스"""

    def __init__(self, jira_client):
        """
        Args:
            jira_client: JiraClient 인스턴스
        """
        self.jira_client = jira_client

    def create_all_issues(self, schedule_result, project_key):
        """Epic → Task → Subtask 순차 생성

        Args:
            schedule_result: 일정 계산 결과 딕셔너리
            project_key: JIRA 프로젝트 키 (예: "L10NM4")

        Returns:
            dict: 생성 결과 (epic_key, task_keys, created_keys, success)
        """
        created_keys = []

        # 1. Epic 생성
        epic_payload = self.jira_client.build_epic_payload(schedule_result, project_key)
        epic_key = self.jira_client.create_epic(epic_payload)

        if epic_key is None:
            return {
                "epic_key": None,
                "created_keys": created_keys,
                "success": False
            }

        created_keys.append(epic_key)

        # 2. Tasks 생성
        task_keys = {}
        for task_name, task_schedule in schedule_result.get("tasks", {}).items():
            task_payload = self.jira_client.build_task_payload(task_schedule, project_key, epic_key)
            task_key = self.jira_client.create_task(task_payload)

            if task_key is None:
                # Task 생성 실패 시 중단
                return {
                    "epic_key": epic_key,
                    "created_keys": created_keys,
                    "success": False
                }

            created_keys.append(task_key)
            task_keys[task_name] = task_key

            # 3. Subtasks 생성
            for subtask_name, subtask_schedule in task_schedule.get("subtasks", {}).items():
                subtask_payload = self.jira_client.build_subtask_payload(subtask_schedule, project_key, task_key)
                subtask_key = self.jira_client.create_subtask(subtask_payload)

                if subtask_key is None:
                    # Subtask 생성 실패 시 중단
                    return {
                        "epic_key": epic_key,
                        "created_keys": created_keys,
                        "success": False
                    }

                created_keys.append(subtask_key)

        return {
            "epic_key": epic_key,
            "task_keys": task_keys,
            "created_keys": created_keys,
            "success": True
        }
