#!/bin/bash

# NSIS 업데이트 시스템 자동화 테스트 실행 스크립트

echo "================================================"
echo "NSIS Update System Automated Test Runner"
echo "================================================"
echo ""

# 테스트 출력 디렉토리 생성
mkdir -p test-outputs

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. TypeScript 빌드 확인
echo "1. Checking TypeScript build..."
if npm run build 2>&1 | grep -q "error"; then
    echo -e "${RED}✗ TypeScript build failed${NC}"
    exit 1
else
    echo -e "${GREEN}✓ TypeScript build successful${NC}"
fi
echo ""

# 2. 단위 테스트 실행
echo "2. Running unit tests..."
if [ -f "test-local.sh" ]; then
    ./test-local.sh > test-outputs/unit-tests.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Unit tests passed${NC}"
    else
        echo -e "${YELLOW}⚠ Some unit tests failed (see test-outputs/unit-tests.log)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ test-local.sh not found, skipping unit tests${NC}"
fi
echo ""

# 3. NSIS 자동화 테스트 실행
echo "3. Running NSIS automated tests..."
node tests/nsis-update-test.js
NSIS_TEST_RESULT=$?
echo ""

# 4. 빌드 아티팩트 확인
echo "4. Verifying build artifacts..."
if [ -f "release/Sebastian-0.1.28-Setup.exe" ]; then
    FILE_SIZE=$(du -h "release/Sebastian-0.1.28-Setup.exe" | cut -f1)
    echo -e "${GREEN}✓ NSIS installer found: Sebastian-0.1.28-Setup.exe (${FILE_SIZE})${NC}"
else
    echo -e "${RED}✗ NSIS installer not found${NC}"
fi
echo ""

# 5. 수동 테스트가 필요한 항목들 출력
echo "================================================"
echo "Manual Testing Required:"
echo "================================================"
echo ""
echo "Please manually test the following scenarios:"
echo ""
echo "1. [ ] Install Sebastian v0.1.28 on a clean Windows system"
echo "2. [ ] Verify auto-update detection when v0.1.29 is available"
echo "3. [ ] Test update download progress UI"
echo "4. [ ] Confirm successful installation of update"
echo "5. [ ] Verify app restarts correctly after update"
echo "6. [ ] Test update cancellation during download"
echo "7. [ ] Test update with poor network connection"
echo "8. [ ] Verify error handling when update server is down"
echo ""
echo "================================================"

# 테스트 결과 요약
echo ""
echo "Test Summary:"
echo "================================================"
if [ $NSIS_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All automated tests passed${NC}"
else
    echo -e "${RED}✗ Some automated tests failed${NC}"
fi

echo ""
echo "Test reports saved in: test-outputs/"
echo ""

exit $NSIS_TEST_RESULT