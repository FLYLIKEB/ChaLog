# EC2 SSH 연결 문제 해결

현재 EC2 인스턴스에 SSH 연결이 "banner exchange" 단계에서 타임아웃되는 문제가 발생하고 있습니다.

## 현재 상황

- **EC2 인스턴스**: `i-048c3090835a4de5b`
- **Public IP**: `52.78.150.124`
- **상태**: running ✅
- **포트 22**: 열려있음 ✅ (nc 테스트 성공)
- **SSH 연결**: banner exchange 타임아웃 ❌

## 문제 원인

SSH 연결이 "Connection established"까지는 되지만 "banner exchange" 단계에서 타임아웃되는 것은:
1. EC2 인스턴스의 SSH 서비스가 응답하지 않음
2. 네트워크 지연 또는 방화벽 문제
3. EC2 인스턴스가 과부하 상태
4. SSH 서비스 설정 문제

## 해결 방법

### 방법 1: AWS 콘솔에서 EC2 Instance Connect 사용 (권장)

AWS 콘솔에서 직접 EC2에 접속하여 공개 키를 추가할 수 있습니다:

1. **AWS 콘솔 접속**
   - AWS 콘솔 → EC2 → Instances
   - 인스턴스 `i-048c3090835a4de5b` 선택

2. **EC2 Instance Connect 사용**
   - "Connect" 버튼 클릭
   - "EC2 Instance Connect" 탭 선택
   - "Connect" 클릭

3. **공개 키 추가**
   ```bash
   # 공개 키 추가
   echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions' >> ~/.ssh/authorized_keys
   
   # 권한 설정
   chmod 600 ~/.ssh/authorized_keys
   
   # 확인
   cat ~/.ssh/authorized_keys
   ```

### 방법 2: 다른 네트워크에서 시도

현재 네트워크에서 연결이 안 될 수 있으므로:
- 다른 네트워크(예: 모바일 핫스팟)에서 시도
- VPN 사용
- 다른 위치에서 시도

### 방법 3: GitHub Actions에서 직접 시도

GitHub Actions는 다른 네트워크 경로를 사용하므로, 공개 키가 없어도 연결이 시도될 수 있습니다. 하지만 인증 실패가 발생할 것입니다.

**권장**: 먼저 방법 1(AWS 콘솔)을 사용하여 공개 키를 추가한 후, GitHub Actions 워크플로우를 실행하세요.

### 방법 4: SSH 서비스 재시작 (EC2 Instance Connect 사용)

EC2 Instance Connect로 접속한 후:

```bash
# SSH 서비스 상태 확인
sudo systemctl status ssh

# SSH 서비스 재시작
sudo systemctl restart ssh

# 또는
sudo service ssh restart
```

## 공개 키 확인

로컬에서 공개 키 확인:

```bash
ssh-keygen -y -f ~/.ssh/ec2_deploy_key
```

출력:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDJyXXQSyKGppsMDl3sJQ5h0RBB95xuDKgfXMhAnKZnfhOFJUHAd11uutOqeJNoJnoklX6ZrW/WFsKydCUuSXhwInn29OIp1fq5yPRBsbqMT/eVxlYPFD+ZzLMreakefcT3uW45GQw6QbuAY0egg8Qi0W3QMlhwwwLWlAIigFa5UcAmYnNJDG2se+j5tp+8rqkS/sG4lo/O8+PhTg1650id7GBuHGTfer8DwBCCDlOJOpU3CA6PtQWIbVswKhyZzYstf572b6K0BMcbbclb9PYSnWjemJwAP649cpt7MV1+LqOkUiGq4E4+E0EpV+dwzuDukrlE6Zka2qND50kmE3KWY7E8nQwhTTYXA05q1mYuxGN58LKvqmCFrpgLS4XeMZrSRLZkYe7GzwxKTaZRE3wHpfpq60IY6ZX2+e/3orWbVSAjSGYGhCUfpZVgWepIa3dn79BSYKiJQ57VDPvH30mlefkrVduXJR3ixr6D73YbIredBMfBDVSVD/bNbMdvekdhCoQWWkX5FuyBIWMnDiFPFLJg5XNBIyf8xuY8JIjMFPSD2XLgO68VUi6leyWt921p6/Chqn7zEAvcKJRin541Y+S7rZRoa5E9RKaZEZ3EyeoDwwoiWMdQSeHDfh2cekzq47I3GEu5mdNdVjxX0RjEc4C6vrdpfHahbzrOPgFENw== deploy@github-actions
```

## 다음 단계

1. **AWS 콘솔에서 EC2 Instance Connect 사용**하여 공개 키 추가
2. **GitHub Actions 워크플로우 실행**하여 SSH 연결 테스트
3. 연결이 성공하면 배포 진행

## 참고

- EC2 Instance Connect는 브라우저에서 직접 EC2에 접속할 수 있는 AWS 서비스입니다
- SSH 키 없이도 접속 가능합니다
- 일시적인 접속 방법이지만, 공개 키 추가에는 충분합니다

