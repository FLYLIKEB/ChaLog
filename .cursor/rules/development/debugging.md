## Debugging Process (TDD-based)

### 1. Reproduce with Failing Test
- Write a **failing test** that reproduces the bug
- If reproduction fails, inform the user
- **Do not start fixing** until explicitly asked

### 2. Identify Root Cause
- Analyze possible causes and explain **why** and **when** it occurs
- Suggest verification methods (what to log, what to check)
- **Only explain**, don't execute yet

### 3. Fix with Ideal Flow
- Add test file to `.cursorignore`
- Create a **flowchart** of ideal behavior
- Fix code to make test pass
- Inform user if confirmation needed

### Key Principle
**Understand first, fix second** - Never fix without understanding root cause
