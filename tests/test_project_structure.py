"""프로젝트 구조 테스트"""
import os
import pytest


class TestProjectStructure:
    """프로젝트 기본 구조 검증"""

    def test_src_directory_exists(self):
        """src/ 디렉토리가 존재해야 함"""
        assert os.path.exists("src"), "src/ 디렉토리가 존재하지 않습니다"
        assert os.path.isdir("src"), "src/는 디렉토리여야 합니다"

    def test_requirements_txt_exists(self):
        """requirements.txt 파일이 존재해야 함"""
        assert os.path.exists("requirements.txt"), "requirements.txt 파일이 존재하지 않습니다"
        assert os.path.isfile("requirements.txt"), "requirements.txt는 파일이어야 합니다"

    def test_requirements_txt_contains_required_packages(self):
        """requirements.txt에 필수 패키지가 포함되어야 함"""
        with open("requirements.txt", "r", encoding="utf-8") as f:
            content = f.read()

        required_packages = ["PyQt6", "pytest", "openpyxl", "pandas", "requests", "APScheduler", "keyring"]

        for package in required_packages:
            assert package in content, f"requirements.txt에 {package}가 포함되어야 합니다"

    def test_pytest_ini_exists(self):
        """pytest.ini 파일이 존재해야 함"""
        assert os.path.exists("pytest.ini"), "pytest.ini 파일이 존재하지 않습니다"
        assert os.path.isfile("pytest.ini"), "pytest.ini는 파일이어야 합니다"

    def test_pytest_ini_contains_test_paths(self):
        """pytest.ini에 테스트 경로 설정이 포함되어야 함"""
        with open("pytest.ini", "r", encoding="utf-8") as f:
            content = f.read()

        assert "[pytest]" in content, "pytest.ini에 [pytest] 섹션이 있어야 합니다"
        assert "testpaths" in content, "pytest.ini에 testpaths 설정이 있어야 합니다"
        assert "tests" in content, "pytest.ini에 tests 디렉토리가 포함되어야 합니다"

    def test_gitignore_exists(self):
        """.gitignore 파일이 존재해야 함"""
        assert os.path.exists(".gitignore"), ".gitignore 파일이 존재하지 않습니다"
        assert os.path.isfile(".gitignore"), ".gitignore는 파일이어야 합니다"

    def test_gitignore_contains_python_patterns(self):
        """.gitignore에 Python 관련 패턴이 포함되어야 함"""
        with open(".gitignore", "r", encoding="utf-8") as f:
            content = f.read()

        required_patterns = ["__pycache__", "*.pyc", ".pytest_cache", "venv", ".env"]

        for pattern in required_patterns:
            assert pattern in content, f".gitignore에 {pattern} 패턴이 포함되어야 합니다"

    def test_can_import_pytest(self):
        """pytest를 import할 수 있어야 함 (의존성 설치 확인)"""
        try:
            import pytest as pt
            assert pt is not None, "pytest 모듈이 None입니다"
        except ImportError:
            pytest.fail("pytest를 import할 수 없습니다. pip install -r requirements.txt를 실행하세요")

    def test_can_import_required_packages(self):
        """requirements.txt의 모든 필수 패키지를 import할 수 있어야 함"""
        required_imports = [
            ("PyQt6", "PyQt6"),
            ("openpyxl", "openpyxl"),
            ("pandas", "pandas"),
            ("requests", "requests"),
            ("apscheduler", "APScheduler"),
            ("keyring", "keyring"),
        ]

        missing_packages = []
        for import_name, package_name in required_imports:
            try:
                __import__(import_name)
            except ImportError:
                missing_packages.append(package_name)

        assert len(missing_packages) == 0, f"다음 패키지를 설치해야 합니다: {', '.join(missing_packages)}"


class TestModuleStructure:
    """기본 모듈 구조 검증"""

    def test_src_init_exists(self):
        """src/__init__.py 파일이 존재해야 함"""
        assert os.path.exists("src/__init__.py"), "src/__init__.py 파일이 존재하지 않습니다"
        assert os.path.isfile("src/__init__.py"), "src/__init__.py는 파일이어야 합니다"

    def test_src_main_exists(self):
        """src/main.py 파일이 존재해야 함"""
        assert os.path.exists("src/main.py"), "src/main.py 파일이 존재하지 않습니다"
        assert os.path.isfile("src/main.py"), "src/main.py는 파일이어야 합니다"

    def test_src_main_has_main_guard(self):
        """src/main.py에 if __name__ == '__main__': 가드가 있어야 함"""
        with open("src/main.py", "r", encoding="utf-8") as f:
            content = f.read()

        assert "if __name__ == '__main__':" in content or 'if __name__ == "__main__":' in content, \
            "src/main.py에 if __name__ == '__main__': 가드가 있어야 합니다"

    def test_tests_init_exists(self):
        """tests/__init__.py 파일이 존재해야 함"""
        assert os.path.exists("tests/__init__.py"), "tests/__init__.py 파일이 존재하지 않습니다"
        assert os.path.isfile("tests/__init__.py"), "tests/__init__.py는 파일이어야 합니다"

    def test_pytest_runs_successfully(self):
        """pytest가 정상적으로 실행되어야 함"""
        import subprocess
        result = subprocess.run(
            ["python", "-m", "pytest", "tests/", "--collect-only"],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"pytest 실행 실패: {result.stderr}"
        assert "collected" in result.stdout, "pytest가 테스트를 수집하지 못했습니다"
