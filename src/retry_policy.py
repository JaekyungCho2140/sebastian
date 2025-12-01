"""재시도 정책"""
import time


class RetryPolicy:
    """재시도 정책 클래스"""

    def calculate_backoff(self, attempt):
        """재시도 간격 계산

        Args:
            attempt: 시도 횟수 (1, 2, 3, ...)

        Returns:
            int: 대기 시간 (초)
        """
        # PRD shared.md 13.3: 재시도 간격 5초
        return 5

    def execute_with_retry(self, func, max_attempts=3):
        """재시도를 포함하여 함수 실행

        Args:
            func: 실행할 함수
            max_attempts: 최대 시도 횟수

        Returns:
            함수 실행 결과

        Raises:
            Exception: 모든 재시도 실패 시
        """
        # PRD shared.md 13.3: 최대 3회 재시도
        last_exception = None

        for attempt in range(1, max_attempts + 1):
            try:
                return func()
            except Exception as e:
                last_exception = e

                if attempt < max_attempts:
                    # 재시도 간격 대기
                    backoff = self.calculate_backoff(attempt)
                    time.sleep(backoff)
                else:
                    # 마지막 시도 실패 시 예외 발생
                    raise last_exception
