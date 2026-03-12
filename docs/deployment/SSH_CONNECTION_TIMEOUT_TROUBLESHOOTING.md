# SSH 포트 22 타임아웃 해결 (GitHub Actions 배포)

GitHub Actions 배포 시 **"포트 22 닫힘 또는 타임아웃"** 이 나오면, Lightsail 인스턴스 방화벽에서 SSH(22)가 GitHub Actions IP로부터 허용되지 않은 상태입니다.

## 증상

- `❌ 포트 22 닫힘 또는 타임아웃`
- `Error: Process completed with exit code 255`
- SSH 키는 정상인데 연결만 안 됨

## 해결: Lightsail에서 SSH(22) 허용

### 1. Lightsail 방화벽 규칙 확인/추가

1. **AWS Lightsail 콘솔** 접속
  [https://lightsail.aws.amazon.com/](https://lightsail.aws.amazon.com/)
2. 해당 **인스턴스** 선택 → **네트워킹(Networking)** 탭
3. **방화벽 규칙**에서 SSH(22) 확인:
  - **애플리케이션**: `SSH` 또는 Custom  
  - **프로토콜**: TCP  
  - **포트**: 22  
  - **소스(Source)**:
    - **권장(간단)**: `Anywhere (0.0.0.0/0)`  
    → GitHub Actions를 포함한 모든 IP에서 SSH 허용
    - **제한적**: GitHub IP 대역만 허용 (아래 2번 참고)
4. **규칙이 없거나 포트 22가 없으면**:
  - "Add rule" 또는 "규칙 추가"
  - 애플리케이션: **SSH**
  - 포트: **22**
  - 소스: **Anywhere (0.0.0.0/0)**
  - 저장
5. 변경 후 1~2분 기다린 뒤 GitHub Actions 워크플로를 다시 실행해 보세요.

### 2. (선택) GitHub Actions IP만 허용하기

보안을 위해 GitHub에서 공개하는 IP 대역만 열고 싶다면:

- GitHub Meta API: [https://api.github.com/meta](https://api.github.com/meta)  
  - `actions` 항목에 GitHub Actions 호스트 IP 대역이 있음 (CIDR 목록).
- **주의**: 이 목록은 비영구적이며, 일부 트래픽은 공개 목록에 없을 수 있어, **실무에서는 보통 SSH는 Anywhere(0.0.0.0/0)** 로 두고, 인스턴스 보안은 SSH 키·비밀번호 비활성화 등으로 보완합니다.

Lightsail에서는 규칙을 여러 개 둘 수 있으므로, "Custom"으로 위 API에서 받은 각 CIDR을 소스로 추가하는 방식으로 사용할 수 있습니다.

## 추가로 확인할 것

- **인스턴스 상태**: Running 인지 확인  
- **EC2_SSH_KEY**: GitHub Secrets에 Lightsail SSH 키 전체 내용이 올바르게 들어가 있는지  
- **EC2_HOST / EC2_USER**: Public IP와 사용자(예: `ubuntu`)가 맞는지

자세한 SSH 문제(키, 브라우저 SSH 등)는 아래 문서를 참고하세요.

- [SSH 연결 문제 해결 가이드](deployment/SSH_CONNECTION_TROUBLESHOOTING.md)
- [GitHub Actions 배포 단계](deployment/GITHUB_ACTIONS_DEPLOY_STEPS.md)

