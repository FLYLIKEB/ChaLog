# AWS 콘솔에서 EC2 접속 가이드

AWS 콘솔에서 EC2 인스턴스에 접속하는 방법입니다.

## 방법 1: EC2 Instance Connect (가장 쉬움) ⭐ 권장

### 로그인 정보
- **AWS 콘솔 로그인**: AWS 계정으로 로그인 (SSH 키 불필요)
- **EC2 Instance Connect**: 브라우저에서 직접 접속 (별도 로그인 정보 없음)

### 단계별 가이드

1. **AWS 콘솔 접속**
   - https://console.aws.amazon.com 접속
   - AWS 계정으로 로그인

2. **EC2 콘솔 이동**
   - 서비스 검색에서 "EC2" 입력
   - EC2 대시보드로 이동

3. **인스턴스 선택**
   - 왼쪽 메뉴에서 "Instances" 클릭
   - 인스턴스 `i-048c3090835a4de5b` 선택 (또는 Public IP: `52.78.150.124`)

4. **Connect 버튼 클릭**
   - 상단의 "Connect" 버튼 클릭

5. **EC2 Instance Connect 선택**
   - "EC2 Instance Connect" 탭 선택
   - "Connect" 버튼 클릭
   - 브라우저에서 터미널이 열립니다

6. **공개 키 추가**
   ```bash
   echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions' >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

## 방법 2: SSH 클라이언트 (브라우저 기반)

### 로그인 정보
- **사용자명**: `ubuntu` (Ubuntu 인스턴스인 경우)
- **SSH 키**: `~/.ssh/summy.pem` (로컬에 있는 키 파일)
- **호스트**: `52.78.150.124`

### 단계별 가이드

1. **Connect 버튼 클릭**
   - EC2 인스턴스 선택 → "Connect" 버튼 클릭

2. **SSH 클라이언트 탭 선택**
   - "SSH client" 탭 선택

3. **표시된 명령어 복사**
   - 예시:
     ```bash
     ssh -i "summy.pem" ubuntu@ec2-52-78-150-124.ap-northeast-2.compute.amazonaws.com
     ```

4. **로컬 터미널에서 실행**
   - 키 파일 경로를 절대 경로로 수정:
     ```bash
     ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124
     ```

## 사용자명 확인

인스턴스 타입에 따라 사용자명이 다릅니다:

| AMI 타입 | 사용자명 |
|---------|---------|
| Ubuntu | `ubuntu` |
| Amazon Linux 2 | `ec2-user` |
| Amazon Linux 2023 | `ec2-user` |
| Debian | `admin` |
| CentOS | `centos` |
| RHEL | `ec2-user` |

현재 인스턴스: **Ubuntu** → 사용자명: **`ubuntu`**

## 공개 키 추가 명령어 (전체)

EC2 Instance Connect로 접속한 후:

```bash
# 공개 키 추가
echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions' >> ~/.ssh/authorized_keys

# 권한 설정
chmod 600 ~/.ssh/authorized_keys

# 확인
cat ~/.ssh/authorized_keys
```

## 문제 해결

### EC2 Instance Connect가 보이지 않는 경우

1. **IAM 권한 확인**
   - `ec2-instance-connect:SendSSHPublicKey` 권한 필요
   - 일반적으로 기본 권한으로 충분합니다

2. **인스턴스 타입 확인**
   - 일부 오래된 인스턴스 타입은 지원하지 않을 수 있습니다
   - 현재 인스턴스: 확인 필요

### SSH 클라이언트로 접속이 안 되는 경우

- 보안 그룹에서 현재 IP가 허용되어 있는지 확인
- SSH 키 파일 권한 확인: `chmod 400 ~/.ssh/summy.pem`

## 요약

**EC2 Instance Connect 사용 시:**
- ✅ AWS 콘솔 로그인만 하면 됩니다
- ✅ SSH 키 불필요
- ✅ 사용자명 불필요
- ✅ 브라우저에서 바로 접속 가능

**SSH 클라이언트 사용 시:**
- 사용자명: `ubuntu`
- SSH 키: `~/.ssh/summy.pem`
- 호스트: `52.78.150.124`

