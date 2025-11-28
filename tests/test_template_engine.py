"""템플릿 변수 시스템 테스트"""
import pytest
from datetime import datetime


class TestTemplateEngine:
    """TemplateEngine 클래스 테스트"""

    def test_substitute_replaces_project_variable(self):
        """{project} 변수를 치환해야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()
        template = "{project} 업데이트"
        variables = {"project": "M4GL"}

        result = engine.substitute(template, variables)

        assert result == "M4GL 업데이트", "{project} 변수가 올바르게 치환되지 않았습니다"

    def test_substitute_replaces_update_date_variable(self):
        """{update_date} 변수를 치환해야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()
        template = "{update_date} 일정"
        variables = {"update_date": "250115"}

        result = engine.substitute(template, variables)

        assert result == "250115 일정", "{update_date} 변수가 올바르게 치환되지 않았습니다"

    def test_substitute_replaces_multiple_variables(self):
        """여러 변수를 동시에 치환해야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()
        template = "{project} {update_date} {batch_name} 업데이트"
        variables = {
            "project": "M4GL",
            "update_date": "250115",
            "batch_name": "REGULAR"
        }

        result = engine.substitute(template, variables)

        assert result == "M4GL 250115 REGULAR 업데이트", "여러 변수가 올바르게 치환되지 않았습니다"

    def test_substitute_handles_undefined_variable(self):
        """정의되지 않은 변수는 [ERROR:변수명]으로 치환해야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()
        template = "{project} {undefined_var} 업데이트"
        variables = {"project": "M4GL"}

        result = engine.substitute(template, variables)

        assert result == "M4GL [ERROR:undefined_var] 업데이트", \
            "정의되지 않은 변수는 [ERROR:변수명]으로 치환되어야 합니다"

    def test_substitute_handles_multiple_undefined_variables(self):
        """여러 정의되지 않은 변수를 처리해야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()
        template = "{project} {unknown1} {update_date} {unknown2}"
        variables = {"project": "M4GL", "update_date": "250115"}

        result = engine.substitute(template, variables)

        assert "[ERROR:unknown1]" in result, "unknown1이 에러로 표시되어야 합니다"
        assert "[ERROR:unknown2]" in result, "unknown2가 에러로 표시되어야 합니다"
        assert "M4GL" in result, "정의된 변수는 정상 치환되어야 합니다"
        assert "250115" in result, "정의된 변수는 정상 치환되어야 합니다"


class TestTemplateEngineCustomVariables:
    """TemplateEngine 사용자 정의 변수 테스트"""

    def test_add_custom_variable_adds_new_variable(self):
        """사용자 정의 변수를 추가할 수 있어야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()

        # 사용자 정의 변수 추가
        engine.add_custom_variable("recipient_team", "번역팀")

        # 변수 사전에 추가되었는지 확인
        assert "recipient_team" in engine.custom_variables, "사용자 정의 변수가 추가되지 않았습니다"
        assert engine.custom_variables["recipient_team"] == "번역팀", "변수 값이 올바르지 않습니다"

    def test_substitute_uses_custom_variables(self):
        """사용자 정의 변수를 치환에 사용할 수 있어야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()

        # 사용자 정의 변수 추가
        engine.add_custom_variable("custom_var", "커스텀값")

        # 템플릿 치환 (시스템 변수 + 사용자 정의 변수)
        template = "{project} {custom_var} 메시지"
        variables = {"project": "M4GL"}

        result = engine.substitute(template, variables)

        assert result == "M4GL 커스텀값 메시지", "사용자 정의 변수가 치환되어야 합니다"

    def test_custom_variable_overrides_system_variable(self):
        """사용자 정의 변수가 시스템 변수보다 우선해야 함"""
        from src.template_engine import TemplateEngine

        engine = TemplateEngine()

        # 사용자 정의 변수로 기존 변수명 사용
        engine.add_custom_variable("project", "커스텀프로젝트")

        # 템플릿 치환
        template = "{project} 업데이트"
        variables = {"project": "M4GL"}  # 시스템 변수

        result = engine.substitute(template, variables)

        assert result == "커스텀프로젝트 업데이트", "사용자 정의 변수가 시스템 변수를 덮어써야 합니다"

