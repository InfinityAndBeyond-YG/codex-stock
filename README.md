# Stock Flow

현재 버전은 기능 구현 전, 화면 구조와 위치를 먼저 정한 레이아웃 시안입니다.

## 이번 시안의 핵심 구조

- 왼쪽 위: `내 평단 금액`
- 왼쪽 아래: 자산 비율 원그래프
- 오른쪽 패널: `전체 보기 / 계좌별 / 주식별` 선택
- 하단: 다음 단계용 자리만 확보

## 보기 기준

### 전체 보기

- 전체 자산에서 `KRW 현금`, `USD 현금`, `국내주식`, `해외주식` 구조를 봅니다.

### 계좌별

- 오른쪽에서 계좌를 누르면
- 왼쪽 원그래프가 그 계좌의 `현금`, 그다음 `주식 종목 비율`로 바뀝니다.

### 주식별

- 전체 자산 기준으로
- `현금`과 각 `주식 종목별 퍼센트`를 같이 봅니다.

## 실행 방법

```bash
cd /Users/yeginkim/Desktop/stockflow
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`로 열면 됩니다.

## 파일

- `/Users/yeginkim/Desktop/stockflow/index.html`
- `/Users/yeginkim/Desktop/stockflow/styles.css`
- `/Users/yeginkim/Desktop/stockflow/app.js`

## 다음 단계

구조가 괜찮으면 다음 순서로 붙이면 됩니다.

1. 월별 막대 그래프
2. 계좌별 상세 흐름 표
3. 스크린샷 업로드와 자동 입력
automation test
automation test
automation test
