"""Daily Scrum 업데이터"""
import json
import copy


class DailyScrumUpdater:
    """Daily Scrum Confluence 페이지 업데이트 클래스"""

    # 요일 매핑
    WEEKDAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]

    def update_cql_label(self, content, old_label, new_label):
        """CQL 파라미터에서 라벨 조건 교체

        Args:
            content: Confluence 페이지 content (dict)
            old_label: 이전 라벨
            new_label: 새 라벨

        Returns:
            dict: 업데이트된 content
        """
        # Deep copy to avoid modifying original
        updated_content = copy.deepcopy(content)

        # PRD 4.5: CQL 라벨 조건 교체
        # 재귀적으로 content를 순회하며 cql 필드 찾기
        def update_cql_recursive(obj):
            if isinstance(obj, dict):
                if "parameters" in obj and "cql" in obj["parameters"]:
                    # CQL 문자열에서 라벨 교체
                    cql = obj["parameters"]["cql"]
                    obj["parameters"]["cql"] = cql.replace(f'"{old_label}"', f'"{new_label}"')

                # 모든 값에 대해 재귀
                for value in obj.values():
                    update_cql_recursive(value)

            elif isinstance(obj, list):
                for item in obj:
                    update_cql_recursive(item)

        update_cql_recursive(updated_content)
        return updated_content

    def update_date_display(self, content, new_date_text, new_id=None):
        """Details Summary 매크로의 firstcolumn 및 id 값 업데이트

        Args:
            content: Confluence 페이지 content (dict)
            new_date_text: 새 날짜 텍스트 (예: "1월 10일(금)")
            new_id: 새 ID 값 (선택적, 예: "DAILY_TASK_MK2_20250110")

        Returns:
            dict: 업데이트된 content
        """
        # Deep copy
        updated_content = copy.deepcopy(content)

        # PRD 4.6: firstcolumn 및 id 값 업데이트
        def update_date_recursive(obj):
            if isinstance(obj, dict):
                if "parameters" in obj:
                    params = obj["parameters"]

                    # firstcolumn 업데이트
                    if "firstcolumn" in params:
                        params["firstcolumn"] = new_date_text

                    # id 값 업데이트 (선택적)
                    if new_id and "id" in params and isinstance(params["id"], dict):
                        if "value" in params["id"]:
                            params["id"]["value"] = new_id

                # 모든 값에 대해 재귀
                for value in obj.values():
                    update_date_recursive(value)

            elif isinstance(obj, list):
                for item in obj:
                    update_date_recursive(item)

        update_date_recursive(updated_content)
        return updated_content

    def format_date_korean(self, target_date):
        """한국어 날짜 형식 생성 (M월 DD일(요일))

        Args:
            target_date: 대상 날짜 (date 객체)

        Returns:
            str: 한국어 날짜 문자열
        """
        # PRD 4.6: "1월 10일(금)" 형식
        month = target_date.month
        day = target_date.day
        weekday = self.WEEKDAY_NAMES[target_date.weekday()]

        return f"{month}월 {day}일({weekday})"
