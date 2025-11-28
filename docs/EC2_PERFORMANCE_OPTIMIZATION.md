# EC2 성능 최적화 가이드

## t2.micro → t3.small 업그레이드 완료 ✅

### 현재 인스턴스 사양

**t3.small** (업그레이드 완료):
- **2GB RAM**: 충분한 메모리 확보
- **2 vCPU (버스트)**: 더 나은 성능
- **버스트 크레딧 시스템**: t2보다 더 많은 크레딧

### 적용된 최적화 설정

#### 1. 데이터베이스 연결 풀 조정
- **t2.micro**: `connectionLimit: 5` (메모리 절약)
- **t3.small**: `connectionLimit: 8` (성능 향상)
- **효과**: 동시 연결 처리 능력 향상

#### 2. PM2 메모리 제한 조정
- **t2.micro**: `max_memory_restart: '400M'`
- **t3.small**: `max_memory_restart: '600M'`
- **효과**: 더 많은 메모리 활용, 시스템 여유 메모리 1.4GB

#### 3. Node.js 힙 메모리 제한 설정

`ecosystem.config.js`에 Node.js 힙 메모리 제한 추가:

```javascript
node_args: '--require=reflect-metadata --max-old-space-size=500',
```

**효과**: Node.js 가비지 컬렉션 최적화, 메모리 누수 방지

#### 2. 프로덕션 로깅 비활성화

`typeorm.config.ts`에서 이미 설정되어 있지만 확인:
- `logging: false` (프로덕션 환경)
- 불필요한 로그 출력 최소화

#### 3. 스왑 메모리 추가 (임시 해결책)

```bash
# EC2에 SSH 접속 후 실행
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구적으로 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

⚠️ **주의**: 스왑은 디스크 I/O를 사용하므로 성능이 느려집니다. 임시 해결책일 뿐입니다.

### 장기적인 해결책: 인스턴스 업그레이드

#### 추천 인스턴스 타입

| 인스턴스 타입 | vCPU | RAM | 비용/월 | 추천도 |
|-------------|------|-----|---------|--------|
| t2.micro | 1 (버스트) | 1GB | $8-10 | ❌ 부족 |
| **t3.small** | **2 (버스트)** | **2GB** | **$15-18** | ✅ **권장** |
| t3.medium | 2 (버스트) | 4GB | $30-35 | ✅ 여유 있음 |
| t3.large | 2 (버스트) | 8GB | $60-70 | ⚠️ 과도함 |

#### 인스턴스 업그레이드 방법

##### 방법 1: 인스턴스 타입 변경 (권장)

1. **EC2 콘솔 접속**
   - AWS Console → EC2 → Instances
   - 현재 인스턴스 선택

2. **인스턴스 중지**
   ```
   Actions → Instance State → Stop
   ```
   ⚠️ **주의**: 인스턴스 중지 시 Public IP가 변경될 수 있습니다. Elastic IP 사용 권장.

3. **인스턴스 타입 변경**
   ```
   Actions → Instance Settings → Change Instance Type
   → t3.small 선택 → Apply
   ```

4. **인스턴스 시작**
   ```
   Actions → Instance State → Start
   ```

5. **배포 스크립트 재실행**
   - Public IP가 변경되었다면 GitHub Secrets 업데이트 필요
   - 또는 Elastic IP를 할당하여 고정 IP 사용

##### 방법 2: 새 인스턴스 생성 후 마이그레이션

1. **새 t3.small 인스턴스 생성**
   - 기존 보안 그룹 설정 복사
   - 같은 VPC/Subnet 사용

2. **애플리케이션 배포**
   ```bash
   # GitHub Actions로 자동 배포 또는
   # 수동 배포 스크립트 실행
   ```

3. **기존 인스턴스 종료**
   - 모든 것이 정상 작동하는지 확인 후
   - 기존 t2.micro 인스턴스 종료

### 성능 모니터링

#### CloudWatch 메트릭 확인

```bash
# EC2에 SSH 접속 후
# CPU 사용률 확인
top
htop  # 설치 필요: sudo apt install htop

# 메모리 사용량 확인
free -h

# PM2 모니터링
pm2 monit
pm2 status
```

#### CloudWatch 알람 설정

1. AWS Console → CloudWatch → Alarms
2. Create Alarm
3. 메트릭 선택:
   - CPUUtilization > 80%
   - MemoryUtilization > 85%
4. 알림 설정 (SNS 또는 이메일)

### 비용 최적화 팁

#### 1. Elastic IP 사용
- 인스턴스 중지/재시작 시 IP 변경 방지
- 첫 번째 Elastic IP는 무료 (인스턴스에 연결된 경우)

#### 2. 예약 인스턴스 (Reserved Instance)
- 1년 약정 시 약 30-40% 할인
- t3.small 1년 약정: 약 $10-12/월

#### 3. 스팟 인스턴스 (비권장)
- 프로덕션 환경에는 부적합 (중단 가능)

### 체크리스트

#### 완료된 항목 ✅
- [x] t3.small로 업그레이드 (완료)
- [x] 데이터베이스 연결 풀 최적화 (8개)
- [x] PM2 메모리 제한 조정 (600M)
- [x] Node.js 힙 메모리 제한 설정 (500M)

#### 즉시 확인 사항
- [ ] 변경사항 배포 및 적용
- [ ] CPU 사용률 모니터링 (예상: 30-50%로 감소)
- [ ] 메모리 사용률 모니터링 (예상: 50-60% 사용)
- [ ] 애플리케이션 성능 확인

#### 단기 (1주일 내)
- [ ] CloudWatch 알람 설정 (CPU > 70%, Memory > 80%)
- [ ] 성능 벤치마크 테스트
- [ ] 로그 모니터링

#### 장기 (1개월 내)
- [ ] Elastic IP 할당 (IP 변경 방지)
- [ ] 예약 인스턴스 고려 (비용 절감, 약 $10-12/월)
- [ ] Auto Scaling Group 고려 (트래픽 증가 시)

### 참고 자료

- [AWS EC2 인스턴스 타입 비교](https://aws.amazon.com/ec2/instance-types/)
- [t2/t3 인스턴스 크레딧 시스템](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html)
- [PM2 성능 최적화](https://pm2.keymetrics.io/docs/usage/cluster-mode/)

