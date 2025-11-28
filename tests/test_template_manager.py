"""템플릿 관리 테스트"""
import os
import json
import tempfile
import shutil
import pytest


class TestTemplateManager:
    """TemplateManager 클래스 테스트"""

    @pytest.fixture
    def temp_config_dir(self):
        """임시 설정 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_create_default_creates_templates_json(self, temp_config_dir):
        """templates.json 기본 구조를 생성해야 함"""
        from src.template_manager import TemplateManager

        templates_path = os.path.join(temp_config_dir, "templates.json")
        template_manager = TemplateManager(templates_path)

        templates = template_manager.create_default()

        # templates.json 파일이 생성되었는지 확인
        assert os.path.exists(templates_path), "templates.json 파일이 생성되지 않았습니다"

        # 기본 구조 확인
        assert "variables" in templates, "templates에 variables가 있어야 합니다"
        assert "templates" in templates, "templates에 templates가 있어야 합니다"

        # 변수 구조 확인
        assert "system" in templates["variables"], "variables에 system이 있어야 합니다"
        assert "custom" in templates["variables"], "variables에 custom이 있어야 합니다"

        # 시스템 변수 확인
        system_vars = templates["variables"]["system"]
        assert "project" in system_vars, "system 변수에 project가 있어야 합니다"
        assert "update_date" in system_vars, "system 변수에 update_date가 있어야 합니다"

        # 프로젝트별 템플릿 확인
        assert "M4GL" in templates["templates"], "templates에 M4GL이 있어야 합니다"
        assert "NCGL" in templates["templates"], "templates에 NCGL이 있어야 합니다"
        assert "FBGL" in templates["templates"], "templates에 FBGL이 있어야 합니다"
        assert "LYGL" in templates["templates"], "templates에 LYGL이 있어야 합니다"

        # M4GL 템플릿 구조 확인
        m4gl_templates = templates["templates"]["M4GL"]
        assert "headsup" in m4gl_templates, "M4GL에 headsup 템플릿이 있어야 합니다"
        assert "handoff" in m4gl_templates, "M4GL에 handoff 템플릿이 있어야 합니다"

        # headsup 템플릿 구조 확인
        headsup = m4gl_templates["headsup"]
        assert "subject" in headsup, "headsup에 subject가 있어야 합니다"
        assert "body" in headsup, "headsup에 body가 있어야 합니다"

    def test_get_template_returns_project_template(self, temp_config_dir):
        """특정 프로젝트의 특정 유형 템플릿을 로드할 수 있어야 함"""
        from src.template_manager import TemplateManager

        templates_path = os.path.join(temp_config_dir, "templates.json")
        template_manager = TemplateManager(templates_path)

        # 기본 템플릿 생성
        template_manager.create_default()

        # M4GL headsup 템플릿 로드
        headsup_template = template_manager.get_template("M4GL", "headsup")

        assert headsup_template is not None, "M4GL headsup 템플릿을 찾을 수 없습니다"
        assert "subject" in headsup_template, "템플릿에 subject가 있어야 합니다"
        assert "body" in headsup_template, "템플릿에 body가 있어야 합니다"

    def test_get_template_returns_none_for_unknown_project(self, temp_config_dir):
        """존재하지 않는 프로젝트는 None을 반환해야 함"""
        from src.template_manager import TemplateManager

        templates_path = os.path.join(temp_config_dir, "templates.json")
        template_manager = TemplateManager(templates_path)

        # 기본 템플릿 생성
        template_manager.create_default()

        # 존재하지 않는 프로젝트 템플릿 로드
        unknown_template = template_manager.get_template("UNKNOWN", "headsup")

        assert unknown_template is None, "존재하지 않는 프로젝트는 None을 반환해야 합니다"

    def test_get_template_returns_none_for_unknown_type(self, temp_config_dir):
        """존재하지 않는 템플릿 유형은 None을 반환해야 함"""
        from src.template_manager import TemplateManager

        templates_path = os.path.join(temp_config_dir, "templates.json")
        template_manager = TemplateManager(templates_path)

        # 기본 템플릿 생성
        template_manager.create_default()

        # 존재하지 않는 템플릿 유형 로드
        unknown_type = template_manager.get_template("M4GL", "unknown_type")

        assert unknown_type is None, "존재하지 않는 템플릿 유형은 None을 반환해야 합니다"

