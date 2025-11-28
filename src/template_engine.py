"""템플릿 변수 시스템"""
import re


class TemplateEngine:
    """템플릿 변수 치환 엔진"""

    def __init__(self):
        """템플릿 엔진 초기화"""
        self.custom_variables = {}

    def add_custom_variable(self, name, value):
        """사용자 정의 변수 추가

        Args:
            name: 변수명
            value: 변수값
        """
        self.custom_variables[name] = value

    def substitute(self, template, variables):
        """템플릿 변수 치환

        Args:
            template: 템플릿 문자열
            variables: 변수 딕셔너리

        Returns:
            str: 변수가 치환된 문자열
        """
        # 사용자 정의 변수와 시스템 변수 병합 (사용자 정의가 우선)
        merged_variables = {**variables, **self.custom_variables}

        # {변수명} 패턴을 찾아서 치환
        def replace_variable(match):
            var_name = match.group(1)
            if var_name in merged_variables:
                return str(merged_variables[var_name])
            else:
                return f"[ERROR:{var_name}]"

        # 정규식으로 {변수명} 패턴 찾아서 치환
        result = re.sub(r'\{(\w+)\}', replace_variable, template)
        return result
