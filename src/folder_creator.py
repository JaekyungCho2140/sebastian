"""폴더 생성기"""
import os
from datetime import datetime


class FolderCreator:
    """NAS 폴더 구조 생성 클래스"""

    def build_folder_structure(self, schedule_result, project_config):
        """폴더 구조 생성

        Args:
            schedule_result: 일정 계산 결과 딕셔너리
            project_config: 프로젝트 설정 딕셔너리

        Returns:
            list: 생성할 폴더 경로 목록
        """
        folder_list = []
        yymmdd = schedule_result["yymmdd"]

        # Level 2: {yymmdd}_UPDATE
        level2 = f"{yymmdd}_UPDATE"

        # Level 3: 프로젝트별 폴더 구조 (00_SOURCE, 01_HB, 02_REVIEW, 03_DELIVERY 등)
        folder_structure = project_config["folder_structure"]

        # Level 4: 배치별 폴더 ({yymmdd}_{batch})
        # 헤즈업 제외, REGULAR/EXTRA0/EXTRA1만 폴더 생성
        batch_folders = []
        for task_name, task_schedule in schedule_result.get("tasks", {}).items():
            if task_name == "헤즈업":
                continue

            # HO&HB Subtask 시작일에서 yymmdd 추출 (PRD scheduler.md 4.2절)
            # HO&HB가 없으면 Task 시작일 사용 (fallback)
            if "subtasks" in task_schedule and "HO&HB" in task_schedule["subtasks"]:
                start_datetime_str = task_schedule["subtasks"]["HO&HB"]["start"]
            else:
                start_datetime_str = task_schedule["start"]

            start_date_str = start_datetime_str.split("T")[0]  # "2025-01-08"
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            batch_yymmdd = start_date.strftime("%y%m%d")

            batch_folder_name = f"{batch_yymmdd}_{task_name}"
            batch_folders.append(batch_folder_name)

        # 전체 폴더 경로 생성
        for level3_folder in folder_structure:
            for batch_folder in batch_folders:
                folder_path = os.path.join(level2, level3_folder, batch_folder)
                folder_list.append(folder_path)

        return folder_list

    def create_folders(self, nas_path, folder_list):
        """NAS 경로에 폴더 생성

        Args:
            nas_path: NAS 기본 경로
            folder_list: 생성할 폴더 경로 목록

        Returns:
            dict: 생성 결과 (success, created_count, error)
        """
        created_count = 0

        try:
            for folder_path in folder_list:
                full_path = os.path.join(nas_path, folder_path)
                os.makedirs(full_path, exist_ok=True)
                created_count += 1

            return {
                "success": True,
                "created_count": created_count
            }
        except PermissionError as e:
            return {
                "success": False,
                "created_count": created_count,
                "error": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "created_count": created_count,
                "error": str(e)
            }

    def preview(self, folder_list):
        """폴더 구조 미리보기 텍스트 생성

        Args:
            folder_list: 폴더 경로 목록

        Returns:
            str: 미리보기 텍스트
        """
        if not folder_list:
            return "생성할 폴더가 없습니다."

        lines = []
        lines.append(f"총 {len(folder_list)}개 폴더 생성 예정\n")

        # 폴더 경로를 트리 구조로 표시
        for folder_path in folder_list:
            lines.append(folder_path)

        return "\n".join(lines)
