"""에러 핸들러"""


class ErrorHandler:
    """에러 메시지 생성 및 처리"""

    def handle_file_not_found(self, path):
        """파일 없음 에러 메시지 생성

        Args:
            path: 파일 경로

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.1: FILE_NOT_FOUND
        return f"""선택한 파일을 찾을 수 없습니다.

파일 경로: {path}

파일이 이동되었거나 삭제되었을 수 있습니다."""

    def handle_file_access_denied(self, path):
        """파일 접근 거부 에러 메시지 생성

        Args:
            path: 파일 경로

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.1: FILE_ACCESS_DENIED
        return f"""파일에 접근할 수 없습니다.

파일이 다른 프로그램에서 사용 중이거나 읽기 권한이 없을 수 있습니다.

파일을 닫고 다시 시도해주세요."""

    def handle_file_format_invalid(self, filename):
        """파일 형식 오류 에러 메시지 생성

        Args:
            filename: 파일명

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.1: FILE_FORMAT_INVALID
        return """지원하지 않는 파일 형식입니다.

.xlsx 또는 .xls 파일만 선택해주세요."""

    def handle_validation_missing_files(self, required, missing):
        """필수 파일 누락 에러 메시지 생성

        Args:
            required: 필요한 파일 목록
            missing: 누락된 파일 목록

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.2: VALIDATION_MISSING_FILES
        required_str = ", ".join(required)
        missing_str = ", ".join(missing)

        return f"""필수 언어 파일이 누락되었습니다.

필요: {required_str}
누락: {missing_str}

모든 언어 파일을 선택해주세요."""

    def handle_validation_duplicate_key(self, key, file):
        """중복 KEY 에러 메시지 생성

        Args:
            key: 중복된 KEY
            file: 파일명

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.2: VALIDATION_DUPLICATE_KEY
        return f"""중복된 KEY가 발견되었습니다.

KEY: '{key}'
파일: {file}

KEY는 파일 내에서 고유해야 합니다."""

    def handle_validation_field_mismatch(self, key, field, en_value, lang_value):
        """필드 불일치 에러 메시지 생성

        Args:
            key: KEY
            field: 필드명
            en_value: EN 파일의 값
            lang_value: 다른 언어 파일의 값

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.2: VALIDATION_FIELD_MISMATCH
        return f"""KEY '{key}'의 {field} 값이 언어별로 다릅니다.

EN: '{en_value}'
다른 언어: '{lang_value}'

{field}는 모든 언어에서 동일해야 합니다."""

    def handle_api_auth_failed(self, service):
        """API 인증 실패 에러 메시지 생성

        Args:
            service: 서비스명

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.3: API_AUTH_FAILED
        return f"""{service} 인증에 실패했습니다.

원인:
- API Token이 유효하지 않거나 만료됨
- Email 주소가 계정과 일치하지 않음

해결 방법:
1. 설정에서 인증 정보 확인
2. API Token 재생성 후 업데이트
3. Email 주소 확인"""

    def handle_api_permission_denied(self, service, operation):
        """API 권한 부족 에러 메시지 생성

        Args:
            service: 서비스명
            operation: 작업명

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.3: API_PERMISSION_DENIED
        return f"""{service} 권한이 부족합니다.

작업: {operation}

관리자에게 권한을 요청하거나, 다른 계정으로 재시도해주세요."""

    def handle_network_offline(self):
        """네트워크 오프라인 에러 메시지 생성

        Returns:
            str: 에러 메시지
        """
        # PRD shared.md 14.2.4: NETWORK_OFFLINE
        return """네트워크에 연결되어 있지 않습니다.

인터넷 연결을 확인하고 다시 시도해주세요."""
