"""작업 잠금"""
from contextlib import contextmanager
import threading


class TaskLock:
    """작업 동시 실행 방지를 위한 잠금"""

    def __init__(self):
        """TaskLock 초기화"""
        self._locks = {}
        self._lock = threading.Lock()

    def acquire(self, task_name):
        """작업 잠금 획득

        Args:
            task_name: 작업 이름

        Returns:
            bool: 잠금 성공 시 True, 이미 잠겨있으면 False
        """
        with self._lock:
            if task_name in self._locks and self._locks[task_name]:
                return False

            self._locks[task_name] = True
            return True

    def release(self, task_name):
        """작업 잠금 해제

        Args:
            task_name: 작업 이름
        """
        with self._lock:
            if task_name in self._locks:
                self._locks[task_name] = False

    def is_locked(self, task_name):
        """작업 잠금 상태 확인

        Args:
            task_name: 작업 이름

        Returns:
            bool: 잠겨있으면 True, 아니면 False
        """
        with self._lock:
            return self._locks.get(task_name, False)

    @contextmanager
    def lock(self, task_name):
        """컨텍스트 매니저로 사용

        Args:
            task_name: 작업 이름

        Yields:
            bool: 잠금 획득 여부
        """
        acquired = self.acquire(task_name)
        try:
            yield acquired
        finally:
            if acquired:
                self.release(task_name)
