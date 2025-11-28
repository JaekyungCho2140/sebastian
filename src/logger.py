"""로깅 시스템"""
import os
import logging
from datetime import datetime, timedelta
from logging.handlers import RotatingFileHandler


class Logger:
    """로그 관리 클래스"""

    def __init__(self, log_dir, max_bytes=10485760):
        """
        Args:
            log_dir: 로그 파일이 저장될 디렉토리
            max_bytes: 로그 파일 최대 크기 (기본값: 10MB)
        """
        self.log_dir = log_dir
        self.max_bytes = max_bytes
        self.logger = None

    def setup(self):
        """로그 시스템 초기화 및 로그 파일 생성"""
        # 로그 디렉토리 생성
        os.makedirs(self.log_dir, exist_ok=True)

        # 오늘 날짜 로그 파일명
        today = datetime.now().strftime("%Y%m%d")
        log_file = os.path.join(self.log_dir, f"sebastian_{today}.log")

        # 로거 설정
        self.logger = logging.getLogger("Sebastian")
        self.logger.setLevel(logging.INFO)

        # 크기 제한이 있는 파일 핸들러 생성 (10MB 초과 시 .1, .2 분할)
        handler = RotatingFileHandler(
            log_file,
            maxBytes=self.max_bytes,
            backupCount=5,
            encoding="utf-8"
        )
        handler.setLevel(logging.INFO)

        # 포맷 설정
        formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
        handler.setFormatter(formatter)

        # 핸들러 추가
        self.logger.addHandler(handler)

    def rotate_daily(self):
        """일별 로그 파일 로테이션"""
        # setup()이 이미 날짜별 파일을 생성하므로 추가 작업 불필요
        pass

    def cleanup_old_logs(self):
        """30일 이전 로그 파일 자동 삭제"""
        if not os.path.exists(self.log_dir):
            return

        cutoff_date = datetime.now() - timedelta(days=30)

        for filename in os.listdir(self.log_dir):
            if not filename.startswith("sebastian_") or not filename.endswith(".log"):
                continue

            # 파일명에서 날짜 추출 (sebastian_YYYYMMDD.log)
            try:
                date_str = filename.replace("sebastian_", "").replace(".log", "")
                file_date = datetime.strptime(date_str, "%Y%m%d")

                # 30일 이전이면 삭제
                if file_date < cutoff_date:
                    file_path = os.path.join(self.log_dir, filename)
                    os.remove(file_path)
            except:
                # 날짜 파싱 실패 시 건너뛰기
                continue

    def info(self, message):
        """INFO 레벨 로그 기록

        Args:
            message: 로그 메시지
        """
        if self.logger:
            self.logger.info(message)

    def warning(self, message):
        """WARNING 레벨 로그 기록

        Args:
            message: 로그 메시지
        """
        if self.logger:
            self.logger.warning(message)

    def error(self, message):
        """ERROR 레벨 로그 기록

        Args:
            message: 로그 메시지
        """
        if self.logger:
            self.logger.error(message)
