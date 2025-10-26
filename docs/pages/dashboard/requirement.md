# 대시보드 페이지 요구사항

## 1. 개요

대시보드는 사용자가 로그인 후 가장 먼저 접하는 페이지로, 사용자의 분석 이력을 한눈에 확인하고 새로운 분석을 시작할 수 있는 중심 허브 역할을 합니다.

**페이지 경로**: `/dashboard`

**접근 권한**: 로그인 필수 (Clerk 인증)

**관련 Use Case**: [UC-005] 대시보드 (분석 이력 조회)

## 2. 주요 기능

### 2.1 사용자 정보 및 구독 상태 표시

**목적**: 사용자가 자신의 구독 상태와 남은 분석 횟수를 명확히 인지

**화면 구성**:
- 환영 메시지: "{사용자 이름}님, 안녕하세요!"
- 구독 상태 뱃지:
  - 무료 회원: "무료 체험" (회색 뱃지)
  - Pro 회원: "Pro" (골드 뱃지)
- 남은 분석 횟수 표시:
  - 무료: "남은 무료 분석: X/3회"
  - Pro: "이번 달 남은 분석: X/10회"
- 다음 결제일 표시 (Pro 회원만):
  - "다음 결제일: YYYY-MM-DD"
- "새 분석하기" CTA 버튼

**데이터 소스**:
- API: `GET /api/dashboard/summary`
- Database: `users`, `subscriptions` 테이블

**사용자 행동**:
1. 페이지 진입 시 자동으로 요약 정보 로드
2. "새 분석하기" 버튼 클릭 → `/analysis/new` 페이지로 이동
3. 구독 상태 클릭 → `/subscription` 페이지로 이동

**데이터 변화**:
- 실시간 갱신 없음 (페이지 새로고침 시 업데이트)
- 분석 수행 후 남은 횟수 자동 감소
- 구독 상태 변경 시 즉시 반영

### 2.2 통계 정보 표시

**목적**: 사용자의 서비스 이용 현황 파악

**화면 구성**:
- 통계 카드 2개:
  - 총 분석 횟수: "총 N회 분석"
  - 이번 달 분석: "이번 달 N회"
- 카드 형태로 시각적 강조

**데이터 소스**:
- API: `GET /api/dashboard/stats`
- Database: `analyses` 테이블에서 집계

**사용자 행동**:
- 수동 새로고침 버튼 제공 (선택사항)
- 통계 카드 클릭 → 상세 통계 페이지 (향후 확장)

**데이터 변화**:
- 페이지 로드 시 자동 조회
- 캐시: 5분

### 2.3 분석 이력 목록

**목적**: 사용자의 모든 분석 이력을 조회하고 상세 결과로 이동

**화면 구성**:
- 분석 카드 그리드 (카드 형태):
  - 분석 대상 이름
  - 생년월일
  - 성별 (아이콘)
  - 분석 일시 (상대 시간: "3시간 전", "2일 전")
  - AI 모델 뱃지 (flash/pro)
  - 상태 표시:
    - 처리 중: 로딩 애니메이션
    - 완료: 체크마크
    - 실패: 경고 아이콘
  - 조회수 표시
- 페이지네이션 (10개씩)

**데이터 소스**:
- API: `GET /api/analyses`
- 쿼리 파라미터:
  - `period`: 기간 필터 (all/7days/30days/90days)
  - `sort`: 정렬 (latest/oldest)
  - `page`: 페이지 번호
  - `limit`: 페이지 크기 (기본 10)
- Database: `analyses` 테이블

**사용자 행동**:
1. 분석 카드 클릭 → `/analysis/{id}` 상세 페이지로 이동
2. 필터 옵션 변경 → API 재호출, 목록 업데이트
3. 정렬 옵션 변경 → API 재호출, 목록 업데이트
4. 페이지 번호 클릭 → 해당 페이지 데이터 로드

**데이터 변화**:
- 필터/정렬 변경 시:
  - 로딩 상태 표시
  - API 호출 (debounce 500ms)
  - 목록 새로고침
  - URL 쿼리 파라미터 업데이트
- 페이지네이션:
  - 새 페이지 데이터 로드
  - 스크롤 최상단 이동
  - 로딩 스켈레톤 표시

### 2.4 필터링

**목적**: 원하는 기간의 분석 이력만 조회

**화면 구성**:
- 기간 필터 드롭다운:
  - 전체 (기본값)
  - 최근 7일
  - 최근 30일
  - 최근 90일

**데이터 소스**:
- 클라이언트 상태 (URL 쿼리 파라미터)

**사용자 행동**:
1. 필터 드롭다운 클릭
2. 옵션 선택
3. API 재호출 with 선택한 period

**데이터 변화**:
- 선택한 필터 값이 URL에 반영
- 분석 목록이 필터 조건에 맞게 갱신
- 페이지네이션 초기화 (1페이지로)

### 2.5 정렬

**목적**: 원하는 순서로 분석 이력 정렬

**화면 구성**:
- 정렬 드롭다운:
  - 최신순 (기본값)
  - 오래된순

**데이터 소스**:
- 클라이언트 상태 (URL 쿼리 파라미터)

**사용자 행동**:
1. 정렬 드롭다운 클릭
2. 옵션 선택
3. API 재호출 with 선택한 sort

**데이터 변화**:
- 선택한 정렬 값이 URL에 반영
- 분석 목록이 정렬 조건에 맞게 갱신
- 페이지네이션 초기화

### 2.6 페이지네이션

**목적**: 대량 데이터를 효율적으로 표시

**화면 구성**:
- 페이지 번호 버튼 (1, 2, 3, ...)
- 이전/다음 버튼
- 현재 페이지 강조
- 전체 페이지 수 표시

**데이터 소스**:
- API 응답의 `pagination` 객체:
  - `current_page`
  - `total_pages`
  - `total_count`
  - `per_page`

**사용자 행동**:
1. 페이지 번호 또는 이전/다음 버튼 클릭
2. 해당 페이지 데이터 로드

**데이터 변화**:
- 새 페이지 데이터로 목록 교체
- 현재 페이지가 URL에 반영
- 스켈레톤 UI 표시 후 데이터 렌더링

### 2.7 빈 상태 처리

**목적**: 분석 이력이 없는 신규 사용자 유도

**화면 구성**:
- 안내 메시지: "아직 분석 이력이 없습니다"
- 서브 메시지: "첫 사주 분석을 시작해보세요!"
- "새 분석하기" 버튼
- 무료 체험 3회 안내

**표시 조건**:
- `analyses` 배열이 비어있음 (`length === 0`)
- 필터링 결과가 없는 경우 다른 메시지 표시

**사용자 행동**:
- "새 분석하기" 버튼 클릭 → `/analysis/new` 페이지로 이동

**데이터 변화**:
- 첫 분석 생성 후 목록에 표시

### 2.8 실시간 업데이트 (처리 중 분석)

**목적**: 분석 처리 중인 항목의 상태를 실시간으로 표시

**화면 구성**:
- 처리 중인 분석 카드에 로딩 애니메이션
- "분석 중" 텍스트 표시
- 5초마다 자동 새로고침 (최대 60초)

**데이터 소스**:
- API: `GET /api/analyses`
- `status = 'processing'`인 항목

**사용자 행동**:
- 자동 폴링으로 상태 업데이트
- 완료 시 자동으로 "완료" 상태로 변경

**데이터 변화**:
- 폴링 간격마다 API 호출
- 상태 변경 감지 시 UI 업데이트
- 완료 후 알림 표시

## 3. 데이터베이스 사용

### 3.1 테이블

#### users
- 사용자 기본 정보 및 구독 상태 조회
- 컬럼:
  - `id`: 사용자 ID
  - `clerk_user_id`: Clerk 사용자 ID
  - `name`: 사용자 이름
  - `email`: 이메일
  - `subscription_tier`: 구독 등급 (free/pro)
  - `free_analysis_count`: 남은 무료 분석 횟수
  - `monthly_analysis_count`: 이번 달 남은 분석 횟수

#### subscriptions
- Pro 회원의 구독 정보 조회
- 컬럼:
  - `user_id`: 사용자 ID (FK)
  - `subscription_status`: 구독 상태 (active/cancelled/suspended)
  - `next_payment_date`: 다음 결제일
  - `card_last_4digits`: 카드 마지막 4자리

#### analyses
- 분석 이력 목록 조회
- 컬럼:
  - `id`: 분석 ID
  - `user_id`: 사용자 ID (FK)
  - `subject_name`: 분석 대상 이름
  - `birth_date`: 생년월일
  - `gender`: 성별
  - `ai_model`: AI 모델 (gemini-2.0-flash/gemini-2.0-pro)
  - `status`: 상태 (processing/completed/failed)
  - `created_at`: 생성 일시
  - `view_count`: 조회수

### 3.2 주요 쿼리

#### 사용자 정보 및 구독 상태 조회
```sql
SELECT
  u.id,
  u.name,
  u.email,
  u.subscription_tier,
  u.free_analysis_count,
  u.monthly_analysis_count,
  s.subscription_status,
  s.next_payment_date,
  s.card_last_4digits
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.subscription_status = 'active'
WHERE u.clerk_user_id = $1;
```

#### 통계 정보 계산
```sql
-- 총 분석 횟수
SELECT COUNT(*) as total_count
FROM analyses
WHERE user_id = $1;

-- 이번 달 분석 횟수
SELECT COUNT(*) as monthly_count
FROM analyses
WHERE user_id = $1
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
```

#### 분석 이력 목록 조회
```sql
SELECT
  id,
  subject_name,
  birth_date,
  gender,
  ai_model,
  status,
  created_at,
  view_count
FROM analyses
WHERE user_id = $1
  AND (
    -- 기간 필터
    CASE
      WHEN $2 = '7days' THEN created_at >= CURRENT_DATE - INTERVAL '7 days'
      WHEN $2 = '30days' THEN created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHEN $2 = '90days' THEN created_at >= CURRENT_DATE - INTERVAL '90 days'
      ELSE true
    END
  )
ORDER BY
  CASE
    WHEN $3 = 'latest' THEN created_at
    WHEN $3 = 'oldest' THEN created_at
  END DESC
LIMIT $4 OFFSET $5;
```

## 4. API 명세

### 4.1 GET /api/dashboard/summary

**설명**: 대시보드 요약 정보 조회

**인증**: 필수 (Clerk JWT)

**응답**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "홍길동",
      "email": "user@example.com",
      "subscription_tier": "pro"
    },
    "subscription": {
      "status": "active",
      "next_payment_date": "2025-11-26",
      "card_last_4digits": "1234",
      "remaining_count": 7
    }
  }
}
```

### 4.2 GET /api/dashboard/stats

**설명**: 통계 정보 조회

**인증**: 필수 (Clerk JWT)

**응답**:
```json
{
  "success": true,
  "data": {
    "total_count": 25,
    "monthly_count": 8,
    "this_week_count": 3
  }
}
```

### 4.3 GET /api/analyses

**설명**: 분석 목록 조회

**인증**: 필수 (Clerk JWT)

**쿼리 파라미터**:
- `period`: all | 7days | 30days | 90days (기본: all)
- `sort`: latest | oldest (기본: latest)
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지 크기 (기본: 10, 최대: 50)

**응답**:
```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "uuid",
        "subject_name": "홍길동",
        "birth_date": "1990-01-15",
        "gender": "male",
        "ai_model": "gemini-2.0-pro",
        "status": "completed",
        "created_at": "2025-10-26T14:30:00Z",
        "view_count": 5
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 25,
      "per_page": 10
    }
  }
}
```

## 5. 엣지 케이스

### 5.1 로그인 세션 만료
- **상황**: 사용자의 Clerk 세션이 만료된 상태
- **처리**:
  - Clerk SDK가 세션 만료 감지
  - 자동으로 `/sign-in` 페이지로 리다이렉트
  - 리다이렉트 URL에 현재 페이지 정보 포함
  - 로그인 후 대시보드로 복귀

### 5.2 분석 이력 없음
- **상황**: 신규 사용자로 분석 이력이 없음
- **처리**:
  - 빈 상태 UI 표시
  - "아직 분석 이력이 없습니다" 메시지
  - "새 분석하기" CTA 버튼 강조
  - 무료 체험 3회 안내

### 5.3 처리 중인 분석
- **상황**: `status = 'processing'`인 분석 존재
- **처리**:
  - 분석 카드에 "분석 중" 상태 표시
  - 로딩 애니메이션
  - 5초마다 자동 새로고침 (최대 60초)
  - 완료 시 자동으로 "완료" 상태로 변경

### 5.4 분석 실패
- **상황**: `status = 'failed'`인 분석 존재
- **처리**:
  - 분석 카드에 "분석 실패" 뱃지 (빨간색)
  - 클릭 시 에러 상세 페이지로 이동
  - "재분석 요청" 버튼 제공
  - 차감된 분석 횟수 복구 안내

### 5.5 네트워크 오류
- **상황**: API 호출 실패 (타임아웃, 서버 오류)
- **처리**:
  - 3회 재시도 (1초, 2초, 4초 간격)
  - 최종 실패 시 에러 메시지 표시
  - "다시 시도" 버튼 제공
  - 캐시된 데이터 표시 (오래된 데이터 안내)

### 5.6 대량 데이터
- **상황**: 100개 이상의 분석 이력
- **처리**:
  - 페이지네이션 (10개씩)
  - 스켈레톤 UI 표시
  - 무한 스크롤 대신 페이지 번호 사용
  - 필터/정렬로 빠른 검색 유도

### 5.7 Pro 구독 만료 당일
- **상황**: Pro 구독이 오늘 만료 예정
- **처리**:
  - 대시보드 상단에 경고 배너 표시
  - "구독이 오늘 만료됩니다" 안내
  - "구독 갱신하기" 버튼 제공
  - 만료 후 자동 무료 회원 전환 안내

### 5.8 필터 결과 없음
- **상황**: 선택한 필터 조건에 맞는 분석 없음
- **처리**:
  - "조건에 맞는 분석이 없습니다" 메시지
  - "필터 초기화" 버튼 제공
  - 전체 분석 개수 안내

## 6. 성능 요구사항

### 6.1 초기 로딩
- 목표: 1초 이내
- 병렬 API 호출 (summary, stats, analyses)
- 스켈레톤 UI로 로딩 상태 표시

### 6.2 캐싱
- 요약 정보: 5분
- 통계 정보: 5분
- 분석 목록: 1분
- React Query 사용

### 6.3 이미지 최적화
- 분석 카드 이미지 lazy loading
- Next.js Image 컴포넌트 사용
- Placeholder 블러 적용

### 6.4 Debouncing
- 필터/정렬 변경 시: 500ms
- 검색 입력 시: 300ms (향후 확장)

## 7. 보안 요구사항

### 7.1 인증
- 모든 API 요청에 Clerk JWT 토큰 필요
- 토큰 만료 시 자동 로그아웃

### 7.2 권한 검증
- 사용자는 본인의 분석 이력만 조회 가능
- Backend에서 user_id 검증

### 7.3 Rate Limiting
- 동일 사용자 분당 최대 60회 요청

## 8. UI/UX 가이드라인

### 8.1 레이아웃
- 반응형 디자인 (모바일, 태블릿, 데스크톱)
- 좌우 여백: 16px (모바일), 32px (데스크톱)
- 상단 네비게이션 고정

### 8.2 컬러
- 무료 회원 뱃지: gray-500
- Pro 회원 뱃지: gold (yellow-600)
- 처리 중: blue-500
- 완료: green-500
- 실패: red-500

### 8.3 애니메이션
- 카드 호버: scale(1.02), shadow 증가
- 로딩 스피너: 회전 애니메이션
- 페이지 전환: fade-in
- 스켈레톤 UI: 펄스 애니메이션

### 8.4 접근성
- 모든 버튼에 aria-label 제공
- 키보드 네비게이션 지원
- 색맹 대응 (아이콘 병행 사용)
- 스크린 리더 지원

## 9. 향후 확장 계획

- 분석 결과 통계 차트
- 자주 분석한 날짜/시간대
- 추천 분석 시간
- 분석 결과 공유 기능
- 검색 기능
- 분석 결과 비교 기능
