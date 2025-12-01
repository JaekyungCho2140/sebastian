"""뮤텍스 관리자"""
import sys


class MutexManager:
    """다중 인스턴스 방지를 위한 뮤텍스 관리자"""

    def __init__(self):
        """MutexManager 초기화"""
        self.mutex = None
        self.mutex_name = None

    def create_mutex(self, name):
        """뮤텍스 생성

        Args:
            name: 뮤텍스 이름

        Returns:
            bool: 생성 성공 시 True, 이미 존재하면 False
        """
        # Windows 전용 구현
        if sys.platform == "win32":
            try:
                import win32event
                import win32api
                import winerror

                # 뮤텍스 생성 시도
                self.mutex = win32event.CreateMutex(None, False, f"Global\\{name}")
                last_error = win32api.GetLastError()

                # 이미 존재하는지 확인
                if last_error == winerror.ERROR_ALREADY_EXISTS:
                    return False

                self.mutex_name = name
                return True

            except ImportError:
                # pywin32가 없으면 True 반환 (단일 인스턴스 체크 비활성화)
                return True
        else:
            # Windows가 아니면 True 반환
            return True

    def release_mutex(self):
        """뮤텍스 해제"""
        if self.mutex and sys.platform == "win32":
            try:
                import win32api
                win32api.CloseHandle(self.mutex)
                self.mutex = None
                self.mutex_name = None
            except:
                pass
