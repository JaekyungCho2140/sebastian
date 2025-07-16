# Sebastian 릴리즈 가이드

## 자동 릴리즈 시스템

이 프로젝트는 GitHub Actions를 통한 자동 빌드 및 릴리즈 시스템을 사용합니다.

### 릴리즈 생성 방법

#### 1. 패치 버전 릴리즈 (버그 수정)
```bash
npm run release
```
- 패치 버전 증가 (예: 0.1.0 → 0.1.1)
- 자동으로 git 태그 생성 및 push
- GitHub Actions에서 자동 빌드 트리거

#### 2. 마이너 버전 릴리즈 (새 기능)
```bash
npm run version:minor
git push --follow-tags
```
- 마이너 버전 증가 (예: 0.1.0 → 0.2.0)

#### 3. 메이저 버전 릴리즈 (호환성 변경)
```bash
npm run version:major
git push --follow-tags
```
- 메이저 버전 증가 (예: 0.1.0 → 1.0.0)

### 릴리즈 프로세스

1. **코드 변경 사항 커밋**
   ```bash
   git add .
   git commit -m "feat: 새로운 기능 추가"
   ```

2. **릴리즈 실행**
   ```bash
   npm run release
   ```

3. **GitHub Actions 자동 실행**
   - Windows 환경에서 NSIS 설치 파일 빌드
   - 릴리즈 페이지에 자동 업로드
   - 아티팩트로 30일간 보관

### 빌드 결과물

- **NSIS 설치 파일**: `Sebastian-[버전]-Setup.exe`
- **GitHub 릴리즈 페이지**: 자동 업로드
- **아티팩트**: 30일간 보관

### 워크플로우 설명

#### release.yml
- **트리거**: `v*` 태그 push 시
- **실행 환경**: Windows Latest
- **결과물**: NSIS 설치 파일

#### ci.yml
- **트리거**: main/develop 브랜치 push 및 PR
- **실행 환경**: Ubuntu (빌드 테스트), Windows (패키징 테스트)
- **목적**: 코드 품질 검증

### 수동 릴리즈 (GitHub 웹에서)

1. GitHub 저장소의 "Releases" 탭 이동
2. "Create a new release" 클릭
3. 태그 이름: `v[버전]` (예: `v0.1.1`)
4. 릴리즈 제목 및 설명 작성
5. "Publish release" 클릭
6. GitHub Actions 자동 실행

### 주의사항

- 태그는 반드시 `v`로 시작해야 함 (예: `v0.1.1`)
- WSL2 환경에서는 NSIS 빌드 불가능 (GitHub Actions 필수)
- 릴리즈 생성 후 약 5-10분 소요 (빌드 + 업로드)
- 실패 시 "Actions" 탭에서 로그 확인 가능

### 버전 관리 규칙

- **패치 (x.x.X)**: 버그 수정, 문서 수정
- **마이너 (x.X.x)**: 새 기능 추가, 하위 호환성 유지
- **메이저 (X.x.x)**: 호환성 변경, 대규모 변경