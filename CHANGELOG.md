# Changelog

All notable changes to Sebastian will be documented in this file.

## [0.2.2] - 2025-07-19

### Fixed
- 자동 업데이트 시 설치 프로세스가 중단되는 문제 수정
  - NSIS 설치 프로세스를 독립적으로 실행하도록 개선 (detached mode)
  - 앱 종료 타이밍을 조정하여 설치가 완료될 수 있도록 보장
  - cleanup 시 설치 프로세스를 강제 종료하지 않도록 수정
  - 설치 완료 후 자동으로 새 버전을 실행하도록 NSIS 설정 추가 (runAfterFinish)

## [0.2.1] - 2025-07-19

### Added
- M4 프로세서 스트리밍 성능 개선

## [0.2.0] - 2025-07-18

### Added
- 완전한 자동 업데이트 시스템
- 에러 리포팅 시스템

## [0.1.31] - Previous Version
- 초기 버전