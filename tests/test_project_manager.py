"""프로젝트 설정 관리 테스트"""
import os
import json
import tempfile
import shutil
import pytest


class TestProjectManager:
    """ProjectManager 클래스 테스트"""

    @pytest.fixture
    def temp_config_dir(self):
        """임시 설정 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_create_default_creates_projects_json(self, temp_config_dir):
        """projects.json 기본 구조를 생성해야 함"""
        from src.project_manager import ProjectManager

        projects_path = os.path.join(temp_config_dir, "projects.json")
        project_manager = ProjectManager(projects_path)

        projects = project_manager.create_default()

        # projects.json 파일이 생성되었는지 확인
        assert os.path.exists(projects_path), "projects.json 파일이 생성되지 않았습니다"

        # 지원 프로젝트가 포함되어야 함
        assert "M4GL" in projects, "projects에 M4GL이 있어야 합니다"
        assert "NCGL" in projects, "projects에 NCGL이 있어야 합니다"
        assert "FBGL" in projects, "projects에 FBGL이 있어야 합니다"
        assert "LYGL" in projects, "projects에 LYGL이 있어야 합니다"
        assert "L10N" in projects, "projects에 L10N이 있어야 합니다"

        # M4GL 프로젝트 구조 확인
        m4gl = projects["M4GL"]
        assert "jira_key" in m4gl, "M4GL에 jira_key가 있어야 합니다"
        assert "nas_path" in m4gl, "M4GL에 nas_path가 있어야 합니다"
        assert "folder_structure" in m4gl, "M4GL에 folder_structure가 있어야 합니다"
        assert "schedule" in m4gl, "M4GL에 schedule이 있어야 합니다"
        assert "slack_channel" in m4gl, "M4GL에 slack_channel이 있어야 합니다"

    def test_get_project_returns_project_config(self, temp_config_dir):
        """특정 프로젝트 설정을 로드할 수 있어야 함"""
        from src.project_manager import ProjectManager

        projects_path = os.path.join(temp_config_dir, "projects.json")
        project_manager = ProjectManager(projects_path)

        # 기본 프로젝트 생성
        project_manager.create_default()

        # M4GL 프로젝트 로드
        m4gl_config = project_manager.get_project("M4GL")

        assert m4gl_config is not None, "M4GL 설정을 찾을 수 없습니다"
        assert m4gl_config["jira_key"] == "L10NM4", "M4GL의 jira_key가 올바르지 않습니다"
        assert m4gl_config["nas_path"] == "\\\\172.17.255.21\\nas_wm\\WM_L10n팀\\01_MIR4", "M4GL의 nas_path가 올바르지 않습니다"

    def test_get_project_returns_none_for_unknown_project(self, temp_config_dir):
        """존재하지 않는 프로젝트는 None을 반환해야 함"""
        from src.project_manager import ProjectManager

        projects_path = os.path.join(temp_config_dir, "projects.json")
        project_manager = ProjectManager(projects_path)

        # 기본 프로젝트 생성
        project_manager.create_default()

        # 존재하지 않는 프로젝트 로드
        unknown_config = project_manager.get_project("UNKNOWN")

        assert unknown_config is None, "존재하지 않는 프로젝트는 None을 반환해야 합니다"

    def test_validate_offset_days_accepts_valid_range(self):
        """offset_days가 -100~30 범위 내에 있으면 True를 반환해야 함"""
        from src.project_manager import ProjectManager

        assert ProjectManager.validate_offset_days(-100) is True, "-100은 유효한 값이어야 합니다"
        assert ProjectManager.validate_offset_days(0) is True, "0은 유효한 값이어야 합니다"
        assert ProjectManager.validate_offset_days(30) is True, "30은 유효한 값이어야 합니다"
        assert ProjectManager.validate_offset_days(-50) is True, "-50은 유효한 값이어야 합니다"
        assert ProjectManager.validate_offset_days(15) is True, "15는 유효한 값이어야 합니다"

    def test_validate_offset_days_rejects_invalid_range(self):
        """offset_days가 -100~30 범위를 벗어나면 False를 반환해야 함"""
        from src.project_manager import ProjectManager

        assert ProjectManager.validate_offset_days(-101) is False, "-101은 유효하지 않은 값이어야 합니다"
        assert ProjectManager.validate_offset_days(31) is False, "31은 유효하지 않은 값이어야 합니다"
        assert ProjectManager.validate_offset_days(-200) is False, "-200은 유효하지 않은 값이어야 합니다"
        assert ProjectManager.validate_offset_days(100) is False, "100은 유효하지 않은 값이어야 합니다"


class TestProjectManagerFBGL:
    """ProjectManager FBGL 프로젝트 검증"""

    @pytest.fixture
    def temp_config_dir(self):
        """임시 설정 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_fbgl_has_regions_and_languages_by_region(self, temp_config_dir):
        """FBGL 프로젝트에 regions와 languages_by_region이 있어야 함"""
        from src.project_manager import ProjectManager

        projects_path = os.path.join(temp_config_dir, "projects.json")
        project_manager = ProjectManager(projects_path)

        projects = project_manager.create_default()
        fbgl = projects["FBGL"]

        # regions 확인
        assert "regions" in fbgl, "FBGL에 regions가 있어야 합니다"
        assert "GL" in fbgl["regions"], "FBGL regions에 GL이 있어야 합니다"
        assert "JP" in fbgl["regions"], "FBGL regions에 JP가 있어야 합니다"

        # languages_by_region 확인
        assert "languages_by_region" in fbgl, "FBGL에 languages_by_region이 있어야 합니다"
        assert "GL" in fbgl["languages_by_region"], "languages_by_region에 GL이 있어야 합니다"
        assert "JP" in fbgl["languages_by_region"], "languages_by_region에 JP가 있어야 합니다"
        assert fbgl["languages_by_region"]["GL"] == ["EN", "CT"], "GL 언어가 올바르지 않습니다"
        assert fbgl["languages_by_region"]["JP"] == ["EN", "JA"], "JP 언어가 올바르지 않습니다"

    def test_fbgl_has_deployment_types(self, temp_config_dir):
        """FBGL 프로젝트에 deployment_types가 있어야 함"""
        from src.project_manager import ProjectManager

        projects_path = os.path.join(temp_config_dir, "projects.json")
        project_manager = ProjectManager(projects_path)

        projects = project_manager.create_default()
        fbgl = projects["FBGL"]

        assert "deployment_types" in fbgl, "FBGL에 deployment_types가 있어야 합니다"
        assert "CDN" in fbgl["deployment_types"], "deployment_types에 CDN이 있어야 합니다"
        assert "APP" in fbgl["deployment_types"], "deployment_types에 APP가 있어야 합니다"

    def test_fbgl_has_schedule_by_deployment(self, temp_config_dir):
        """FBGL 프로젝트에 schedule_by_deployment 구조가 있어야 함"""
        from src.project_manager import ProjectManager

        projects_path = os.path.join(temp_config_dir, "projects.json")
        project_manager = ProjectManager(projects_path)

        projects = project_manager.create_default()
        fbgl = projects["FBGL"]

        # schedule_by_deployment 확인
        assert "schedule_by_deployment" in fbgl, "FBGL에 schedule_by_deployment가 있어야 합니다"
        assert "CDN" in fbgl["schedule_by_deployment"], "schedule_by_deployment에 CDN이 있어야 합니다"
        assert "APP" in fbgl["schedule_by_deployment"], "schedule_by_deployment에 APP가 있어야 합니다"

        # schedule 키는 없어야 함
        assert "schedule" not in fbgl, "FBGL은 schedule 대신 schedule_by_deployment를 사용해야 합니다"

