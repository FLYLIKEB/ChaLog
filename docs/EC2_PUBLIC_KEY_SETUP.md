# EC2 공개 키 추가 가이드

GitHub Actions 자동 배포를 위해 EC2 인스턴스에 공개 키를 추가하는 방법입니다.

## 현재 상황

- **EC2 Host**: `52.78.150.124`
- **EC2 User**: `ubuntu`
- **기존 키**: `~/.ssh/summy.pem`
- **배포 키**: `~/.ssh/ec2_deploy_key`
- **공개 키**: 아래 참조

## 공개 키 내용

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions
```

## 방법 1: 원라인 명령어 (권장)

EC2에 접속할 수 있을 때 다음 명령어를 실행하세요:

```bash
ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124 "echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo '공개 키 추가 완료'"
```

## 방법 2: EC2에 접속 후 수동 추가

1. **EC2에 접속**:
   ```bash
   ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124
   ```

2. **공개 키 추가**:
   ```bash
   echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions' >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **확인**:
   ```bash
   cat ~/.ssh/authorized_keys
   ```

## 방법 3: 스크립트 사용

로컬에서 스크립트를 실행하여 명령어를 확인:

```bash
./scripts/add-public-key-command.sh
```

## 방법 4: 공개 키 추출 후 추가

로컬에서 공개 키를 추출하여 추가:

```bash
# 공개 키 추출
ssh-keygen -y -f ~/.ssh/ec2_deploy_key

# EC2에 추가 (위에서 추출한 공개 키를 사용)
ssh-keygen -y -f ~/.ssh/ec2_deploy_key | \
  ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124 \
  'cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

## 확인

공개 키를 추가한 후, 새 키로 SSH 연결 테스트:

```bash
ssh -i ~/.ssh/ec2_deploy_key ubuntu@52.78.150.124 "echo '연결 성공!'"
```

## GitHub Secrets 확인

공개 키를 추가한 후, GitHub Secrets의 `EC2_SSH_KEY`가 올바르게 설정되어 있는지 확인:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `EC2_SSH_KEY` Secret 확인
3. 다음 내용과 일치하는지 확인:
   - 첫 줄: `-----BEGIN OPENSSH PRIVATE KEY-----`
   - 마지막 줄: `-----END OPENSSH PRIVATE KEY-----`
   - 키 파일 크기: 약 3389 bytes

로컬 키 파일 확인:
```bash
cat ~/.ssh/ec2_deploy_key
```

## 문제 해결

### EC2 연결 타임아웃

현재 EC2 연결이 타임아웃되는 경우:

1. **보안 그룹 확인**:
   - AWS 콘솔 → EC2 → Security Groups
   - SSH (22) 포트가 현재 IP에서 허용되는지 확인
   - 또는 임시로 `0.0.0.0/0` 허용 (테스트용)

2. **네트워크 ACL 확인**:
   - VPC의 네트워크 ACL이 SSH 트래픽을 허용하는지 확인

3. **EC2 인스턴스 상태 확인**:
   - 인스턴스가 실행 중인지 확인
   - Public IP가 올바른지 확인

### 공개 키가 이미 존재하는 경우

공개 키가 이미 `authorized_keys`에 있는 경우, 중복 추가해도 문제없습니다. SSH는 첫 번째 일치하는 키를 사용합니다.

## 참고

- SSH 키 형식: OpenSSH Private Key
- 키 크기: 3389 bytes
- 키 주석: `deploy@github-actions`

