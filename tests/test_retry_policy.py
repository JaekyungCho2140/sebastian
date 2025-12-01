"""재시도 정책 테스트"""
import pytest


class TestRetryPolicy:
    """RetryPolicy 클래스 테스트"""

    def test_calculate_backoff_returns_correct_intervals(self):
        """재시도 간격을 올바르게 계산해야 함"""
        from src.retry_policy import RetryPolicy

        policy = RetryPolicy()

        # PRD shared.md 13.3: 재시도 간격 (5초 간격)
        interval1 = policy.calculate_backoff(1)
        interval2 = policy.calculate_backoff(2)
        interval3 = policy.calculate_backoff(3)

        assert interval1 == 5, "첫 번째 재시도는 5초여야 합니다"
        assert interval2 == 5, "두 번째 재시도는 5초여야 합니다"
        assert interval3 == 5, "세 번째 재시도는 5초여야 합니다"

    def test_execute_with_retry_succeeds_on_first_attempt(self):
        """첫 시도에 성공하면 재시도하지 않아야 함"""
        from src.retry_policy import RetryPolicy

        policy = RetryPolicy()
        call_count = 0

        def success_func():
            nonlocal call_count
            call_count += 1
            return "success"

        # PRD shared.md 13.3: 재시도 정책
        result = policy.execute_with_retry(success_func, max_attempts=3)

        assert result == "success", "성공 값을 반환해야 합니다"
        assert call_count == 1, "첫 시도에만 호출되어야 합니다"

    def test_execute_with_retry_retries_on_failure(self):
        """실패 시 재시도해야 함"""
        from src.retry_policy import RetryPolicy

        policy = RetryPolicy()
        call_count = 0

        def fail_then_success():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("임시 에러")
            return "success"

        # PRD shared.md 13.3: 최대 3회 재시도
        result = policy.execute_with_retry(fail_then_success, max_attempts=3)

        assert result == "success", "최종적으로 성공해야 합니다"
        assert call_count == 3, "3번 호출되어야 합니다"

    def test_execute_with_retry_fails_after_max_attempts(self):
        """최대 재시도 후 실패해야 함"""
        from src.retry_policy import RetryPolicy

        policy = RetryPolicy()
        call_count = 0

        def always_fail():
            nonlocal call_count
            call_count += 1
            raise Exception("영구 에러")

        # PRD shared.md 13.3: 최대 3회 후 실패
        with pytest.raises(Exception):
            policy.execute_with_retry(always_fail, max_attempts=3)

        assert call_count == 3, "3번 시도 후 실패해야 합니다"
