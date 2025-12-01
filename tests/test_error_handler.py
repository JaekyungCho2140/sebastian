"""에러 핸들러 테스트"""
import pytest


class TestErrorHandler:
    """ErrorHandler 클래스 테스트"""

    def test_handle_file_not_found_returns_error_message(self):
        """파일 없음 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.1: FILE_NOT_FOUND
        error_msg = handler.handle_file_not_found("D:/test/missing.xlsx")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "찾을 수 없습니다" in error_msg, "에러 메시지에 '찾을 수 없습니다'가 있어야 합니다"
        assert "missing.xlsx" in error_msg or "D:/test/missing.xlsx" in error_msg, "파일 경로가 포함되어야 합니다"

    def test_handle_file_access_denied_returns_error_message(self):
        """파일 접근 거부 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.1: FILE_ACCESS_DENIED
        error_msg = handler.handle_file_access_denied("D:/test/locked.xlsx")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "접근할 수 없습니다" in error_msg, "에러 메시지에 '접근할 수 없습니다'가 있어야 합니다"

    def test_handle_file_format_invalid_returns_error_message(self):
        """파일 형식 오류 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.1: FILE_FORMAT_INVALID
        error_msg = handler.handle_file_format_invalid("test.txt")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "지원하지 않는" in error_msg, "에러 메시지에 '지원하지 않는'이 있어야 합니다"
        assert ".xlsx" in error_msg or ".xls" in error_msg, "지원 형식이 포함되어야 합니다"


class TestErrorHandlerValidation:
    """ErrorHandler 데이터 검증 에러 테스트"""

    def test_handle_validation_missing_files_returns_error_message(self):
        """필수 파일 누락 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.2: VALIDATION_MISSING_FILES
        required = ["EN", "CT", "JA"]
        missing = ["CT", "JA"]

        error_msg = handler.handle_validation_missing_files(required, missing)

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "누락" in error_msg, "에러 메시지에 '누락'이 있어야 합니다"
        assert "CT" in error_msg and "JA" in error_msg, "누락된 파일 목록이 포함되어야 합니다"

    def test_handle_validation_duplicate_key_returns_error_message(self):
        """중복 KEY 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.2: VALIDATION_DUPLICATE_KEY
        error_msg = handler.handle_validation_duplicate_key("KEY_001", "test.xlsx")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "중복" in error_msg, "에러 메시지에 '중복'이 있어야 합니다"
        assert "KEY_001" in error_msg, "KEY가 포함되어야 합니다"

    def test_handle_validation_field_mismatch_returns_error_message(self):
        """필드 불일치 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.2: VALIDATION_FIELD_MISMATCH
        error_msg = handler.handle_validation_field_mismatch("KEY_001", "Table", "DIALOGUE", "STRING")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "불일치" in error_msg or "다릅니다" in error_msg, "에러 메시지에 불일치 내용이 있어야 합니다"
        assert "KEY_001" in error_msg, "KEY가 포함되어야 합니다"


class TestErrorHandlerAPI:
    """ErrorHandler API 에러 테스트"""

    def test_handle_api_auth_failed_returns_error_message(self):
        """API 인증 실패 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.3: API_AUTH_FAILED
        error_msg = handler.handle_api_auth_failed("JIRA")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "인증" in error_msg, "에러 메시지에 '인증'이 있어야 합니다"
        assert "JIRA" in error_msg, "서비스명이 포함되어야 합니다"

    def test_handle_api_permission_denied_returns_error_message(self):
        """API 권한 부족 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.3: API_PERMISSION_DENIED
        error_msg = handler.handle_api_permission_denied("JIRA", "일감 생성")

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "권한" in error_msg, "에러 메시지에 '권한'이 있어야 합니다"
        assert "JIRA" in error_msg, "서비스명이 포함되어야 합니다"

    def test_handle_network_offline_returns_error_message(self):
        """네트워크 오프라인 에러 메시지를 반환해야 함"""
        from src.error_handler import ErrorHandler

        handler = ErrorHandler()

        # PRD shared.md 14.2.4: NETWORK_OFFLINE
        error_msg = handler.handle_network_offline()

        assert error_msg is not None, "에러 메시지를 반환해야 합니다"
        assert "네트워크" in error_msg, "에러 메시지에 '네트워크'가 있어야 합니다"
