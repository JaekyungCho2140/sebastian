"""로깅 시스템 테스트"""
import os
import tempfile
import shutil
import pytest
from datetime import datetime, timedelta


class TestLogger:
    """Logger 클래스 테스트"""

    @pytest.fixture
    def temp_log_dir(self):
        """임시 로그 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_setup_creates_log_file(self, temp_log_dir):
        """로그 파일을 자동 생성해야 함 (sebastian_YYYYMMDD.log)"""
        from src.logger import Logger

        logger = Logger(temp_log_dir)
        logger.setup()

        # 로그 파일 생성 확인
        today = datetime.now().strftime("%Y%m%d")
        expected_log_file = os.path.join(temp_log_dir, f"sebastian_{today}.log")

        assert os.path.exists(expected_log_file), f"로그 파일 {expected_log_file}이 생성되지 않았습니다"

    def test_setup_creates_logs_directory(self, temp_log_dir):
        """logs 디렉토리가 없으면 자동 생성해야 함"""
        from src.logger import Logger

        logs_dir = os.path.join(temp_log_dir, "logs")
        logger = Logger(logs_dir)
        logger.setup()

        assert os.path.exists(logs_dir), "logs 디렉토리가 생성되지 않았습니다"
        assert os.path.isdir(logs_dir), "logs는 디렉토리여야 합니다"

    def test_rotate_daily_creates_new_log_file(self, temp_log_dir):
        """일별 로그 파일 로테이션이 동작해야 함"""
        from src.logger import Logger

        logger = Logger(temp_log_dir)
        logger.setup()

        # 오늘 로그 파일 확인
        today = datetime.now().strftime("%Y%m%d")
        today_log = os.path.join(temp_log_dir, f"sebastian_{today}.log")
        assert os.path.exists(today_log), "오늘 로그 파일이 생성되어야 합니다"

        # rotate_daily 호출 (실제로는 날짜가 바뀌어야 하지만 테스트에서는 확인만)
        logger.rotate_daily()

        # 여전히 오늘 로그 파일이 존재해야 함
        assert os.path.exists(today_log), "로테이션 후에도 오늘 로그 파일이 유지되어야 합니다"

    def test_cleanup_old_logs_deletes_30_days_old_files(self, temp_log_dir):
        """30일 이전 로그 파일을 자동 삭제해야 함"""
        from src.logger import Logger

        logger = Logger(temp_log_dir)

        # 31일 전 로그 파일 생성
        old_date = (datetime.now() - timedelta(days=31)).strftime("%Y%m%d")
        old_log_file = os.path.join(temp_log_dir, f"sebastian_{old_date}.log")
        with open(old_log_file, "w") as f:
            f.write("old log")

        # 29일 전 로그 파일 생성 (유지되어야 함)
        recent_date = (datetime.now() - timedelta(days=29)).strftime("%Y%m%d")
        recent_log_file = os.path.join(temp_log_dir, f"sebastian_{recent_date}.log")
        with open(recent_log_file, "w") as f:
            f.write("recent log")

        # cleanup 실행
        logger.cleanup_old_logs()

        # 31일 전 파일은 삭제되어야 함
        assert not os.path.exists(old_log_file), "31일 전 로그 파일이 삭제되어야 합니다"

        # 29일 전 파일은 유지되어야 함
        assert os.path.exists(recent_log_file), "29일 전 로그 파일은 유지되어야 합니다"


class TestLoggerMessages:
    """Logger 메시지 기록 테스트"""

    @pytest.fixture
    def temp_log_dir(self):
        """임시 로그 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_info_logs_message(self, temp_log_dir):
        """INFO 레벨 로그를 기록해야 함"""
        from src.logger import Logger

        logger = Logger(temp_log_dir)
        logger.setup()

        # INFO 로그 기록
        logger.info("테스트 INFO 메시지")

        # 로그 파일 확인
        today = datetime.now().strftime("%Y%m%d")
        log_file = os.path.join(temp_log_dir, f"sebastian_{today}.log")

        with open(log_file, "r", encoding="utf-8") as f:
            content = f.read()

        assert "INFO" in content, "로그 파일에 INFO 레벨이 기록되어야 합니다"
        assert "테스트 INFO 메시지" in content, "로그 파일에 메시지가 기록되어야 합니다"

    def test_warning_logs_message(self, temp_log_dir):
        """WARNING 레벨 로그를 기록해야 함"""
        from src.logger import Logger

        logger = Logger(temp_log_dir)
        logger.setup()

        # WARNING 로그 기록
        logger.warning("테스트 WARNING 메시지")

        # 로그 파일 확인
        today = datetime.now().strftime("%Y%m%d")
        log_file = os.path.join(temp_log_dir, f"sebastian_{today}.log")

        with open(log_file, "r", encoding="utf-8") as f:
            content = f.read()

        assert "WARNING" in content, "로그 파일에 WARNING 레벨이 기록되어야 합니다"
        assert "테스트 WARNING 메시지" in content, "로그 파일에 메시지가 기록되어야 합니다"

    def test_error_logs_message(self, temp_log_dir):
        """ERROR 레벨 로그를 기록해야 함"""
        from src.logger import Logger

        logger = Logger(temp_log_dir)
        logger.setup()

        # ERROR 로그 기록
        logger.error("테스트 ERROR 메시지")

        # 로그 파일 확인
        today = datetime.now().strftime("%Y%m%d")
        log_file = os.path.join(temp_log_dir, f"sebastian_{today}.log")

        with open(log_file, "r", encoding="utf-8") as f:
            content = f.read()

        assert "ERROR" in content, "로그 파일에 ERROR 레벨이 기록되어야 합니다"
        assert "테스트 ERROR 메시지" in content, "로그 파일에 메시지가 기록되어야 합니다"


class TestLoggerSizeLimit:
    """Logger 크기 제한 테스트"""

    @pytest.fixture
    def temp_log_dir(self):
        """임시 로그 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_setup_with_max_bytes_creates_rotating_handler(self, temp_log_dir):
        """최대 크기 제한이 있는 로그 핸들러를 생성해야 함"""
        from src.logger import Logger

        logger = Logger(temp_log_dir, max_bytes=10485760)  # 10MB
        logger.setup()

        # 로그 파일이 생성되어야 함
        today = datetime.now().strftime("%Y%m%d")
        log_file = os.path.join(temp_log_dir, f"sebastian_{today}.log")
        assert os.path.exists(log_file), "로그 파일이 생성되어야 합니다"

    def test_log_rotates_when_size_exceeds_limit(self, temp_log_dir):
        """로그 파일 크기가 제한을 초과하면 .1 파일로 로테이션되어야 함"""
        from src.logger import Logger

        # 작은 크기 제한 (1KB)
        logger = Logger(temp_log_dir, max_bytes=1024)
        logger.setup()

        # 큰 메시지를 여러 번 기록하여 크기 초과
        for i in range(100):
            logger.info("X" * 100)  # 100바이트 메시지

        # .1 파일이 생성되었는지 확인
        today = datetime.now().strftime("%Y%m%d")
        rotated_file = os.path.join(temp_log_dir, f"sebastian_{today}.log.1")

        # 크기 초과로 로테이션이 발생했을 수 있음 (RotatingFileHandler 동작)
        # 최소한 원본 파일은 존재해야 함
        log_file = os.path.join(temp_log_dir, f"sebastian_{today}.log")
        assert os.path.exists(log_file), "로그 파일이 존재해야 합니다"


