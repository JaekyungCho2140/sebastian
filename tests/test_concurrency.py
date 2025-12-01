"""동시성 처리 테스트"""
import pytest


class TestMutexManager:
    """뮤텍스 관리자 테스트"""

    def test_mutex_manager_creates_mutex(self):
        """뮤텍스를 생성할 수 있어야 함"""
        from src.mutex_manager import MutexManager

        manager = MutexManager()

        # PRD l10n-admin.md 9.1: 뮤텍스 생성
        result = manager.create_mutex("Sebastian_SingleInstance")

        assert result is True, "뮤텍스를 생성할 수 있어야 합니다"

    def test_mutex_manager_detects_existing_mutex(self):
        """이미 존재하는 뮤텍스를 감지해야 함"""
        from src.mutex_manager import MutexManager

        manager1 = MutexManager()
        manager2 = MutexManager()

        # 첫 번째 뮤텍스 생성
        manager1.create_mutex("Sebastian_Test")

        # 두 번째 시도
        result = manager2.create_mutex("Sebastian_Test")

        # PRD l10n-admin.md 9.1: 이미 존재하면 False
        assert result is False, "이미 존재하는 뮤텍스는 False를 반환해야 합니다"

        # 정리
        manager1.release_mutex()

    def test_mutex_manager_releases_mutex(self):
        """뮤텍스를 해제할 수 있어야 함"""
        from src.mutex_manager import MutexManager

        manager = MutexManager()

        # 뮤텍스 생성
        manager.create_mutex("Sebastian_Release_Test")

        # 해제
        manager.release_mutex()

        # 다시 생성 가능해야 함
        result = manager.create_mutex("Sebastian_Release_Test")
        assert result is True, "해제 후 다시 생성할 수 있어야 합니다"

        manager.release_mutex()


class TestTaskLock:
    """작업 잠금 테스트"""

    def test_task_lock_prevents_concurrent_execution(self):
        """작업 실행 중 재실행을 방지해야 함"""
        from src.task_lock import TaskLock

        lock = TaskLock()

        # PRD l10n-admin.md 9.2: 작업 잠금 획득
        acquired1 = lock.acquire("daily_task")
        assert acquired1 is True, "첫 번째 잠금은 성공해야 합니다"

        # 재시도
        acquired2 = lock.acquire("daily_task")
        assert acquired2 is False, "이미 실행 중인 작업은 잠금 실패해야 합니다"

        # 해제
        lock.release("daily_task")

        # 다시 획득 가능
        acquired3 = lock.acquire("daily_task")
        assert acquired3 is True, "해제 후 다시 잠금할 수 있어야 합니다"

        lock.release("daily_task")

    def test_task_lock_supports_multiple_tasks(self):
        """여러 작업을 독립적으로 잠글 수 있어야 함"""
        from src.task_lock import TaskLock

        lock = TaskLock()

        # PRD l10n-admin.md 9.2: 작업별 독립적 잠금
        lock.acquire("daily_task")
        lock.acquire("daily_scrum")

        assert lock.is_locked("daily_task") is True, "daily_task가 잠겨야 합니다"
        assert lock.is_locked("daily_scrum") is True, "daily_scrum이 잠겨야 합니다"
        assert lock.is_locked("slack_msg") is False, "slack_msg는 잠기지 않아야 합니다"

        lock.release("daily_task")
        lock.release("daily_scrum")

    def test_task_lock_context_manager(self):
        """컨텍스트 매니저로 사용할 수 있어야 함"""
        from src.task_lock import TaskLock

        lock = TaskLock()

        # with 문으로 자동 해제
        with lock.lock("test_task") as acquired:
            assert acquired is True, "잠금을 획득해야 합니다"
            assert lock.is_locked("test_task") is True, "with 블록 내에서 잠겨야 합니다"

        # with 블록 종료 후 자동 해제
        assert lock.is_locked("test_task") is False, "with 블록 종료 후 해제되어야 합니다"
