# Node.js 버전 설정 가이드

## 현재 상황

- 현재 Node.js 버전: v23.10.0
- 권장 버전: v20 (LTS) 또는 v22 (LTS)
- Jest 호환성: v18, v20, v22, v24 이상 권장

## 방법 1: nvm 설치 및 사용 (권장)

### 1. nvm 설치

```bash
# nvm 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 또는 Homebrew 사용 (macOS)
brew install nvm
```

### 2. 쉘 설정 파일에 nvm 추가

터미널을 다시 시작하거나 다음 명령어 실행:

```bash
# zsh 사용 시
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.zshrc
source ~/.zshrc

# bash 사용 시
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Node.js LTS 버전 설치 및 사용

```bash
# Node.js v22 LTS 설치
nvm install 22

# 또는 Node.js v20 LTS 설치
nvm install 20

# 프로젝트 디렉토리에서 .nvmrc 파일이 있으면 자동으로 해당 버전 사용
cd /Users/jwp/Documents/programming/ChaLog
nvm use

# 기본 버전으로 설정 (선택사항)
nvm alias default 22
```

### 4. 확인

```bash
node --version  # v22.x.x 또는 v20.x.x 확인
npm --version
```

## 방법 2: 현재 버전 유지 (임시)

현재 v23.10.0도 작동하지만 경고가 표시됩니다. 프로덕션 환경에서는 LTS 버전 사용을 권장합니다.

## 프로젝트 설정

프로젝트에 다음 파일들이 추가되었습니다:

- `.nvmrc`: nvm이 자동으로 사용할 Node.js 버전 (22)
- `package.json`: `engines` 필드에 권장 버전 명시

프로젝트 디렉토리에서 `nvm use`를 실행하면 `.nvmrc` 파일의 버전을 자동으로 사용합니다.

## 참고사항

- **로컬 개발**: nvm을 사용하여 LTS 버전으로 전환 권장
- **CI/CD**: GitHub Actions 등에서도 동일한 Node.js 버전 사용 권장
- **프로덕션**: 서버 환경에서도 LTS 버전 사용 권장

## 문제 해결

### nvm이 작동하지 않는 경우

```bash
# nvm이 제대로 로드되었는지 확인
command -v nvm

# 수동으로 nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 특정 프로젝트에서만 버전 변경

```bash
# 프로젝트 디렉토리로 이동
cd /Users/jwp/Documents/programming/ChaLog

# .nvmrc에 지정된 버전 사용
nvm use

# 또는 특정 버전 직접 지정
nvm use 22
```

