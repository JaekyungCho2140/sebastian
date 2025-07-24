- It is **strongly recommended** that you adhere to the following Methodology and Process **before taking any action**.
- using Subagents are **strongly recommended** only if it does not negatively affect the quality of the output.
- Communicate in Korean with your user.
- '-해', '-해라'체의 말투를 사용해.
- 코드를 작성/수정할 때는 항상 Google Style의 Docstring으로 주석을 상세하게 한국어로 작성해. 코드를 제거할 때에는 연계된 주석도 함께 제거해.

# Methodology
1. **System 2 Thinking**: Approach the problem with analytical rigor. Break down the requirements into smaller, manageable parts and thoroughly consider each step before implementation.
2. **Tree of Thoughts**: Evaluate multiple possible solutions and their consequences. Use a structured approach to explore different paths and select the optimal one.
3. **Iterative Refinement**: Before finalizing the code, consider improvements, edge cases, and optimizations. Iterate through potential enhancements to ensure the final solution is robust.

# Process
1. **Deep Dive Analysis**: Begin by conducting a thorough analysis of the task at hand, considering the technical requirements and constraints.
2. **Planning**: Develop a clear plan that outlines the architectural structure and flow of the solution, using <PLANNING> tags if necessary.
3. **Implementation**: Implement the solution step-by-step, ensuring that each part adheres to the specified best practices.
4. **Review and Optimize**: Perform a review of the code, looking for areas of potential optimization and improvement.
5. **Finalization**: Finalize the code by ensuring it meets all requirements, is secure, and is performant.

# 참고 문서 일람 (Claude Code 관리)
** Claude Code가 관리하는 참고 문서는 유효하지 않은 정보나 중복된 정보는 제거하고, 항상 작업 공간의 최신 정보를 담는다. ** 
1. .claude/docs/progress.md:
- 콘텍스트가 얼마 남지 않아 다음 콘텍스트로 전환한다면, 현재 문서 내 내용을 모두 삭제하고 지금까지의 작업 내역 및 현재 콘텍스트의 특기사항을 새로 기재한다.
- 새로운 콘텍스트가 시작하면 이 문서를 확인하고 작업을 재개한다.
- 업데이트 시점을 기록할 땐 시각까지 함께 기록해, 동일한 날 작업 이력 순서를 구분할 수 있도록 한다.
2. .claude/docs/nottodo.md: 동일한 오류가 3회 이상 발생했으나 해결할 수 없다면, 본 문서에 기록하고 향후 작업에 참고할 수 있도록 mitigation을 작성한다.
3. .claude/docs/codebase-reference.md는 개발 과정에서 지속적으로 업데이트되어야 해. 새로운 함수나 타입을 추가할 때마다 이 문서에 반영해.

# Using Tools
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
- 작업 중 공식 기술 정보가 필요하다면, use context7.
- 복잡한 문제를 해결해야 할 땐, use sequential thinking, and ultrathink

# Additional Memories
- 해결 방식을 선택해야 하는 상황에선 가장 안정적이고 근본적인 해결책을 찾는다.
- Date & Time을 작성할 때는 추측에 따르지 말고, 외부 명령어를 사용해서 정확한 시간을 확인 후 기록한다.
- 테스트의 목표는 의도한 기능의 정상 작동 검증이다. 테스트가 실패했을 때 기준을 낮추거나 검증 조건을 완화해서 테스트가 통과하는 것은 옳지 못한 방향이다.
- 대화형 프롬프트가 등장하면 사용자에게 다른 터미널에서 실행해서 진행하라고 지침과 함께 요청한다.
- Windows 환경에서 프로세스 종료 시 taskkill 명령어 대신 PowerShell 명령어를 사용한다:
  - Node.js 프로세스 종료: `powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"`
  - 특정 포트 사용 프로세스 찾기: `powershell -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -Property OwningProcess"`