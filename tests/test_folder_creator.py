"""폴더 생성기 테스트"""
import os
import tempfile
import shutil
import pytest
from datetime import date


class TestFolderCreator:
    """FolderCreator 클래스 테스트"""

    @pytest.fixture
    def temp_nas_dir(self):
        """임시 NAS 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_build_folder_structure_for_m4gl(self):
        """M4GL 폴더 구조 생성 (02_REVIEW 포함)"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        # 일정 계산 결과
        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "REGULAR": {"start": "2025-01-08T15:00:00.000+0900"},
                "EXTRA0": {"start": "2025-01-10T15:00:00.000+0900"},
                "EXTRA1": {"start": "2025-01-13T15:00:00.000+0900"}
            }
        }

        # M4GL 프로젝트 설정 (02_REVIEW 포함)
        project_config = {
            "folder_structure": ["00_SOURCE", "01_HB", "02_REVIEW", "03_DELIVERY"]
        }

        folder_list = creator.build_folder_structure(schedule_result, project_config)

        # 최상위 폴더 확인
        assert "250115_UPDATE" in folder_list[0], "최상위 폴더는 {yymmdd}_UPDATE 형식이어야 합니다"

        # 02_REVIEW 포함 확인
        review_folders = [f for f in folder_list if "02_REVIEW" in f]
        assert len(review_folders) > 0, "M4GL은 02_REVIEW 폴더가 포함되어야 합니다"

        # 배치별 폴더 확인 (HO&HB Subtask 시작일 기준)
        assert any("250108_REGULAR" in f for f in folder_list), "250108_REGULAR 폴더가 있어야 합니다"
        assert any("250110_EXTRA0" in f for f in folder_list), "250110_EXTRA0 폴더가 있어야 합니다"
        assert any("250113_EXTRA1" in f for f in folder_list), "250113_EXTRA1 폴더가 있어야 합니다"

    def test_build_folder_structure_uses_ho_subtask_date(self):
        """배치 폴더명은 HO&HB Subtask 시작일을 사용해야 함 (Task 시작일과 다를 때)"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        # REGULAR Task 시작일: 01/07, HO&HB Subtask 시작일: 01/08 (다른 날!)
        schedule_result = {
            "project": "M4GL",
            "yymmdd": "250115",
            "tasks": {
                "REGULAR": {
                    "start": "2025-01-07T15:00:00.000+0900",  # Task 시작: 01/07
                    "subtasks": {
                        "HO&HB": {
                            "start": "2025-01-08T18:00:00.000+0900"  # HO&HB 시작: 01/08
                        }
                    }
                },
                "EXTRA0": {
                    "start": "2025-01-09T15:00:00.000+0900",  # Task 시작: 01/09
                    "subtasks": {
                        "HO&HB": {
                            "start": "2025-01-10T18:00:00.000+0900"  # HO&HB 시작: 01/10
                        }
                    }
                }
            }
        }

        project_config = {
            "folder_structure": ["00_SOURCE"]
        }

        folder_list = creator.build_folder_structure(schedule_result, project_config)

        # HO&HB Subtask 시작일(01/08, 01/10)을 사용해야 함 (Task 시작일 아님!)
        assert any("250108_REGULAR" in f for f in folder_list), "REGULAR 폴더는 HO&HB 시작일(01/08)을 사용해야 합니다 (Task 시작일 01/07 아님)"
        assert any("250110_EXTRA0" in f for f in folder_list), "EXTRA0 폴더는 HO&HB 시작일(01/10)을 사용해야 합니다 (Task 시작일 01/09 아님)"

        # Task 시작일을 사용하면 안 됨
        assert not any("250107_REGULAR" in f for f in folder_list), "REGULAR 폴더에 Task 시작일(01/07)을 사용하면 안 됩니다"
        assert not any("250109_EXTRA0" in f for f in folder_list), "EXTRA0 폴더에 Task 시작일(01/09)을 사용하면 안 됩니다"

    def test_build_folder_structure_for_ncgl(self):
        """NCGL 폴더 구조 생성 (02_REVIEW 미포함)"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        schedule_result = {
            "project": "NCGL",
            "yymmdd": "250115",
            "tasks": {
                "REGULAR": {"start": "2025-01-09T15:00:00.000+0900"}
            }
        }

        project_config = {
            "folder_structure": ["00_SOURCE", "01_HB", "02_DELIVERY"]
        }

        folder_list = creator.build_folder_structure(schedule_result, project_config)

        # 02_REVIEW 미포함 확인
        review_folders = [f for f in folder_list if "02_REVIEW" in f]
        assert len(review_folders) == 0, "NCGL은 02_REVIEW 폴더가 없어야 합니다"

        # 02_DELIVERY 포함 확인
        delivery_folders = [f for f in folder_list if "02_DELIVERY" in f]
        assert len(delivery_folders) > 0, "NCGL은 02_DELIVERY 폴더가 있어야 합니다"


class TestFolderCreatorExecution:
    """FolderCreator 폴더 생성 실행 테스트"""

    @pytest.fixture
    def temp_nas_dir(self):
        """임시 NAS 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_create_folders_creates_all_directories(self, temp_nas_dir):
        """NAS 경로에 모든 폴더를 생성해야 함"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        # 폴더 목록
        folder_list = [
            "250115_UPDATE\\00_SOURCE\\250108_REGULAR",
            "250115_UPDATE\\00_SOURCE\\250110_EXTRA0",
            "250115_UPDATE\\01_HB\\250108_REGULAR"
        ]

        # 폴더 생성
        result = creator.create_folders(temp_nas_dir, folder_list)

        # 모든 폴더가 생성되었는지 확인
        for folder in folder_list:
            full_path = os.path.join(temp_nas_dir, folder)
            assert os.path.exists(full_path), f"폴더 {full_path}가 생성되지 않았습니다"
            assert os.path.isdir(full_path), f"{full_path}는 디렉토리여야 합니다"

        # 결과 확인
        assert result["success"] is True, "폴더 생성이 성공해야 합니다"
        assert result["created_count"] == 3, "3개 폴더가 생성되어야 합니다"

    def test_create_folders_skips_existing_folders(self, temp_nas_dir):
        """폴더가 이미 존재하면 건너뛰어야 함"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        # 기존 폴더 생성
        existing_folder = os.path.join(temp_nas_dir, "250115_UPDATE", "00_SOURCE", "250108_REGULAR")
        os.makedirs(existing_folder, exist_ok=True)

        folder_list = [
            "250115_UPDATE\\00_SOURCE\\250108_REGULAR",
            "250115_UPDATE\\00_SOURCE\\250110_EXTRA0"
        ]

        # 폴더 생성
        result = creator.create_folders(temp_nas_dir, folder_list)

        # 기존 폴더는 유지되고 새 폴더만 생성
        assert result["success"] is True, "폴더 생성이 성공해야 합니다"
        assert os.path.exists(existing_folder), "기존 폴더는 유지되어야 합니다"

    def test_create_folders_returns_failure_on_permission_error(self, mocker):
        """권한 오류 시 실패 정보를 반환해야 함"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        # os.makedirs를 모킹하여 PermissionError 발생
        mocker.patch("os.makedirs", side_effect=PermissionError("Permission denied"))

        folder_list = ["250115_UPDATE\\00_SOURCE\\250108_REGULAR"]

        result = creator.create_folders("/invalid/path", folder_list)

        # 실패 정보 확인
        assert result["success"] is False, "권한 오류 시 success가 False여야 합니다"
        assert "error" in result, "결과에 error 정보가 있어야 합니다"


class TestFolderCreatorPreview:
    """FolderCreator 미리보기 기능 테스트"""

    def test_preview_generates_folder_tree_text(self):
        """폴더 구조 미리보기 텍스트를 생성해야 함"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        folder_list = [
            "250115_UPDATE\\00_SOURCE\\250108_REGULAR",
            "250115_UPDATE\\00_SOURCE\\250110_EXTRA0",
            "250115_UPDATE\\01_HB\\250108_REGULAR"
        ]

        preview_text = creator.preview(folder_list)

        # 미리보기 텍스트 확인
        assert isinstance(preview_text, str), "미리보기는 문자열이어야 합니다"
        assert "250115_UPDATE" in preview_text, "최상위 폴더가 포함되어야 합니다"
        assert "00_SOURCE" in preview_text, "하위 폴더가 포함되어야 합니다"
        assert "250108_REGULAR" in preview_text, "배치 폴더가 포함되어야 합니다"

    def test_preview_shows_folder_count(self):
        """미리보기에 총 폴더 개수가 표시되어야 함"""
        from src.folder_creator import FolderCreator

        creator = FolderCreator()

        folder_list = [
            "250115_UPDATE\\00_SOURCE\\250108_REGULAR",
            "250115_UPDATE\\00_SOURCE\\250110_EXTRA0"
        ]

        preview_text = creator.preview(folder_list)

        # 폴더 개수 표시 확인
        assert "2" in preview_text or "개" in preview_text, "폴더 개수가 표시되어야 합니다"


