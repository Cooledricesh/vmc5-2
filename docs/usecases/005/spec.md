# Use Case: 대시보드 (분석 이력 조회)

## Primary Actor
로그인된 사용자 (무료 회원 또는 Pro 회원)

## Precondition
- 사용자가 Clerk를 통해 Google OAuth 로그인을 완료한 상태
- 사용자의 세션이 유효함
- 사용자가 대시보드 페이지(`/dashboard`)에 접근 가능

## Trigger
- 로그인 후 자동 리다이렉트로 대시보드 진입
- 또는 네비게이션 메뉴에서 "대시보드" 클릭

## Main Scenario

### 1. 대시보드 페이지 진입
- 사용자가 로그인 성공 후 자동으로 `/dashboard` 페이지로 리다이렉트
- 또는 네비게이션에서 "대시보드" 메뉴 클릭
- 시스템이 대시보드 페이지 표시

### 2. 사용자 인증 상태 확인 (Frontend)
- Frontend가 Clerk SDK를 통해 사용자 인증 상태 확인
- 세션 만료 시 자동으로 로그인 페이지로 리다이렉트
- 인증 성공 시 사용자 정보 추출 (user_id, name, email)

### 3. 대시보드 요약 정보 조회 (GET /api/dashboard/summary)
- Frontend가 대시보드 요약 정보 API 호출
- Backend가 사용자 기본 정보 및 구독 상태 조회
- 요청 본문 없음 (JWT 토큰으로 사용자 식별)

### 4. 사용자 정보 및 구독 상태 조회 (Service Layer)
- `users` 테이블에서 사용자 정보 조회:
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

### 5. 통계 정보 계산 (GET /api/dashboard/stats)
- 총 분석 횟수 계산:
  ```sql
  SELECT COUNT(*) as total_count
  FROM analyses
  WHERE user_id = $1;
  ```
- 이번 달 분석 횟수 계산:
  ```sql
  SELECT COUNT(*) as monthly_count
  FROM analyses
  WHERE user_id = $1
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
  ```

### 6. 분석 이력 목록 조회 (GET /api/analyses)
- Frontend가 분석 목록 API 호출
- 쿼리 파라미터:
  ```
  ?period=all&sort=latest&page=1&limit=10
  ```
- Service Layer가 필터 및 정렬 조건 적용하여 분석 목록 조회:
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

### 7. 대시보드 UI 렌더링
- **상단 요약 섹션**:
  - 환영 메시지 표시: "{사용자 이름}님, 안녕하세요!"
  - 구독 상태 뱃지:
    - 무료 회원: "무료 체험" (회색 뱃지)
    - Pro 회원: "Pro" (골드 뱃지)
  - 남은 분석 횟수 표시:
    - 무료: "남은 무료 분석: X/3회"
    - Pro: "이번 달 남은 분석: X/10회"
  - 다음 결제일 표시 (Pro 회원만):
    - "다음 결제일: YYYY-MM-DD"
  - "새 분석하기" CTA 버튼 (강조 스타일)

- **통계 카드**:
  - 총 분석 횟수: "총 N회 분석"
  - 이번 달 분석: "이번 달 N회"

- **분석 목록 섹션**:
  - 필터 옵션:
    - 기간: 전체 / 최근 7일 / 30일 / 90일
    - 정렬: 최신순 / 오래된순
  - 분석 카드 그리드 (카드 형태):
    - 분석 대상 이름
    - 생년월일
    - 분석 일시 (상대 시간 표시: "3시간 전", "2일 전")
    - AI 모델 뱃지 (flash/pro)
    - 상태 표시 (처리 중/완료/실패)
    - 클릭하여 상세보기
  - 페이지네이션 (10개씩)

- **빈 상태 (분석 이력 없음)**:
  - 안내 메시지: "아직 분석 이력이 없습니다"
  - 서브 메시지: "첫 사주 분석을 시작해보세요!"
  - "새 분석하기" 버튼

### 8. 분석 카드 클릭 (상세보기 이동)
- 사용자가 분석 카드 클릭
- Frontend가 `/analysis/{analysis_id}` 페이지로 이동
- 분석 상세 화면 표시 ([UC-002] 분석 결과 상세 조회)

### 9. 필터/정렬 변경 (클라이언트 상태 관리)
- 사용자가 필터 또는 정렬 옵션 변경
- Frontend가 쿼리 파라미터 업데이트
- API 재호출하여 목록 새로고침
- 로딩 상태 표시

### 10. 페이지네이션
- 사용자가 페이지 번호 클릭
- Frontend가 `page` 파라미터 업데이트
- API 호출하여 해당 페이지 데이터 조회
- 목록 새로고침

## Edge Cases

### 1. 로그인 세션 만료
- **상황**: 사용자의 Clerk 세션이 만료된 상태에서 대시보드 접근
- **처리**:
  - Frontend가 Clerk SDK를 통해 세션 만료 감지
  - 자동으로 `/sign-in` 페이지로 리다이렉트
  - 리다이렉트 URL에 현재 페이지 정보 포함
  - 로그인 후 대시보드로 자동 복귀

### 2. 분석 이력 없음 (신규 사용자)
- **상황**: 사용자가 아직 분석을 한 번도 하지 않음
- **처리**:
  - 빈 상태 UI 표시
  - "아직 분석 이력이 없습니다" 메시지
  - "새 분석하기" CTA 버튼 강조
  - 무료 체험 3회 안내

### 3. 처리 중인 분석 표시
- **상황**: 사용자의 분석 요청이 아직 처리 중 (`status = 'processing'`)
- **처리**:
  - 분석 카드에 "분석 중" 상태 표시
  - 로딩 애니메이션 표시
  - 5초마다 자동 새로고침 (최대 60초)
  - 클릭 시 "분석이 진행 중입니다" 메시지 표시

### 4. 분석 실패 건 표시
- **상황**: 분석이 실패한 상태 (`status = 'failed'`)
- **처리**:
  - 분석 카드에 "분석 실패" 뱃지 표시 (빨간색)
  - 클릭 시 에러 상세 페이지로 이동
  - "재분석 요청" 버튼 제공
  - 차감된 분석 횟수가 복구되었음을 안내

### 5. 네트워크 오류
- **상황**: API 호출 실패 (타임아웃, 서버 오류 등)
- **처리**:
  - Frontend가 3회 재시도 (1초, 2초, 4초 간격)
  - 최종 실패 시 에러 메시지 표시
  - "다시 시도" 버튼 제공
  - 캐시된 데이터가 있으면 오래된 데이터 표시 (안내 포함)

### 6. 대량 데이터 (100개 이상)
- **상황**: 사용자가 많은 분석 이력을 보유
- **처리**:
  - 페이지네이션으로 10개씩 분할 표시
  - 무한 스크롤 대신 페이지 번호 버튼 사용
  - 각 페이지 로딩 시 스켈레톤 UI 표시
  - 필터 및 정렬로 원하는 데이터 빠르게 찾기

### 7. Pro 구독 만료 (당일)
- **상황**: Pro 구독이 오늘 만료 예정
- **처리**:
  - 대시보드 상단에 경고 배너 표시
  - "구독이 오늘 만료됩니다" 안내
  - "구독 갱신하기" 버튼 제공
  - 만료 후 자동으로 무료 회원 전환 안내

### 8. 데이터베이스 오류
- **상황**: Supabase 연결 실패 또는 쿼리 오류
- **처리**:
  - Backend가 에러 로깅
  - `500 Internal Server Error` 응답
  - Frontend가 "일시적 오류가 발생했습니다" 메시지 표시
  - 재시도 버튼 제공
  - 모니터링 시스템에 알람 전송

### 9. 권한 검증 실패
- **상황**: JWT 토큰이 변조되었거나 다른 사용자의 데이터 접근 시도
- **처리**:
  - Backend가 `403 Forbidden` 응답
  - Frontend가 자동으로 로그아웃 처리
  - "권한이 없습니다" 메시지 표시
  - 보안 이벤트 로깅

### 10. 필터 조합 결과 없음
- **상황**: 사용자가 선택한 필터 조건에 해당하는 분석이 없음
- **처리**:
  - "조건에 맞는 분석이 없습니다" 메시지 표시
  - "필터 초기화" 버튼 제공
  - 전체 분석 개수 안내

## Business Rules

### 분석 이력 표시 정책
- 모든 분석 이력은 영구 보관 (사용자 탈퇴 시 CASCADE 삭제)
- 삭제된 분석은 목록에서 제외
- 처리 중인 분석도 목록에 표시 (상태 구분)
- 실패한 분석도 표시 (재분석 유도)

### 구독 상태 표시
- **무료 회원**:
  - "무료 체험" 뱃지
  - "남은 무료 분석: X/3회" 표시
  - 0회 남은 경우 Pro 구독 유도 배너
- **Pro 회원**:
  - "Pro" 골드 뱃지
  - "이번 달 남은 분석: X/10회" 표시
  - 다음 결제일 안내
  - 구독 관리 링크 제공

### 페이지네이션 정책
- 기본 페이지 크기: 10개
- 최대 페이지 크기: 50개 (쿼리 파라미터로 조정 가능)
- 페이지 번호는 1부터 시작
- 마지막 페이지 초과 시 마지막 페이지로 자동 이동

### 필터링 옵션
- **기간 필터**:
  - `all`: 전체 (기본값)
  - `7days`: 최근 7일
  - `30days`: 최근 30일
  - `90days`: 최근 90일
- **정렬 옵션**:
  - `latest`: 최신순 (기본값, `created_at DESC`)
  - `oldest`: 오래된순 (`created_at ASC`)

### External Service Integration

#### Clerk SDK (Frontend)
- **라이브러리**: `@clerk/nextjs`
- **버전**: v6 이상 (2025년 기준 최신 안정 버전)
- **사용 메서드**:
  - `useAuth()`: 클라이언트 컴포넌트에서 인증 상태 확인
  - `auth()`: 서버 컴포넌트에서 인증 상태 확인 (비동기, `await` 필수)
- **인증 확인**:
  ```typescript
  // 클라이언트 컴포넌트
  const { userId, isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    redirect('/sign-in');
  }
  ```
- **세션 관리**:
  - Clerk가 자동으로 세션 갱신
  - 세션 만료 시 자동 로그아웃 및 리다이렉트
  - JWT 토큰은 Clerk SDK가 자동으로 관리
- **참고 문서**: `/docs/external/clerkSDK.md`

### 데이터 캐싱
- React Query를 사용한 서버 상태 관리
- 대시보드 요약 정보: 5분 캐시
- 분석 목록: 1분 캐시
- 통계 정보: 5분 캐시
- 필터/정렬 변경 시 캐시 무효화

### 성능 최적화
- 분석 카드 이미지 lazy loading
- 무한 스크롤 대신 페이지네이션 사용 (성능 및 UX 고려)
- 스켈레톤 UI로 로딩 상태 표시
- Debounce 적용 (필터 변경 시 500ms)

### 보안 및 권한
- 모든 API 요청은 Clerk JWT 토큰 인증 필요
- 사용자는 본인의 분석 이력만 조회 가능
- Backend에서 user_id 검증 (JWT에서 추출한 값과 일치 확인)
- Rate Limiting: 동일 사용자 분당 최대 60회 요청

### 모니터링
- 대시보드 로딩 시간 추적 (목표: 1초 이내)
- API 응답 시간 로깅
- 에러 발생률 모니터링 (5% 이하 목표)
- 사용자 활동 로그 (방문 빈도, 체류 시간)

## API Specification

### GET /api/dashboard/summary

대시보드 요약 정보 조회 (사용자 정보, 구독 상태)

**Request Headers:**
```
Authorization: Bearer {clerk_jwt_token}
```

**Success Response (200 OK):**
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

**Success Response (무료 회원):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "홍길동",
      "email": "user@example.com",
      "subscription_tier": "free"
    },
    "subscription": {
      "status": null,
      "remaining_count": 3
    }
  }
}
```

**Error Responses:**

- **401 Unauthorized** (인증 실패):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다"
  }
}
```

### GET /api/dashboard/stats

통계 정보 조회 (총 분석 횟수, 이번 달 분석 횟수)

**Request Headers:**
```
Authorization: Bearer {clerk_jwt_token}
```

**Success Response (200 OK):**
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

### GET /api/analyses

분석 목록 조회 (필터, 정렬, 페이지네이션)

**Request Headers:**
```
Authorization: Bearer {clerk_jwt_token}
```

**Query Parameters:**
```
period: 'all' | '7days' | '30days' | '90days' (default: 'all')
sort: 'latest' | 'oldest' (default: 'latest')
page: number (default: 1)
limit: number (default: 10, max: 50)
```

**Success Response (200 OK):**
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

**Error Responses:**

- **401 Unauthorized** (인증 실패):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다"
  }
}
```

- **400 Bad Request** (유효성 검증 실패):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "잘못된 요청입니다",
    "details": {
      "page": "페이지 번호는 1 이상이어야 합니다"
    }
  }
}
```

## Sequence Diagram

```plantuml
@startuml
actor User
participant "FE\n(React)" as FE
participant "Clerk SDK" as Clerk
participant "Hono Router\n(/api/dashboard)" as Router
participant "Service Layer\n(Supabase)" as Service
database "Database\n(Supabase)" as DB

User -> FE: 로그인 후 대시보드 접속
FE -> Clerk: useAuth() 호출
Clerk --> FE: {userId, isSignedIn}

alt 세션 만료
    FE -> FE: /sign-in으로 리다이렉트
    FE -> User: 로그인 페이지 표시
else 세션 유효
    FE -> FE: 대시보드 페이지 렌더링
    FE -> FE: 스켈레톤 UI 표시

    par 병렬 API 호출
        FE -> Router: GET /api/dashboard/summary
        Router -> Router: Clerk JWT 토큰 검증
        Router -> Service: 사용자 정보 및 구독 상태 조회
        Service -> DB: SELECT users, subscriptions
        DB --> Service: 사용자 데이터
        Service --> Router: 요약 정보
        Router --> FE: 200 OK {user, subscription}
    and
        FE -> Router: GET /api/dashboard/stats
        Router -> Service: 통계 정보 조회
        Service -> DB: SELECT COUNT(*) FROM analyses\nWHERE user_id=$1
        DB --> Service: 통계 데이터
        Service --> Router: 통계 정보
        Router --> FE: 200 OK {total_count, monthly_count}
    and
        FE -> Router: GET /api/analyses\n?period=all&sort=latest&page=1&limit=10
        Router -> Router: 쿼리 파라미터 검증
        Router -> Service: 분석 목록 조회
        Service -> DB: SELECT * FROM analyses\nWHERE user_id=$1\nORDER BY created_at DESC\nLIMIT 10 OFFSET 0
        DB --> Service: 분석 목록
        Service -> DB: SELECT COUNT(*) FROM analyses\nWHERE user_id=$1
        DB --> Service: 전체 개수
        Service --> Router: 분석 목록 + 페이지네이션
        Router --> FE: 200 OK {analyses, pagination}
    end

    FE -> FE: 대시보드 UI 업데이트
    FE -> User: 요약 정보, 통계, 분석 목록 표시

    alt 분석 이력 없음
        FE -> User: 빈 상태 UI 표시\n"첫 분석을 시작해보세요"
    else 분석 이력 있음
        FE -> User: 분석 카드 그리드 표시
    end

    User -> FE: 필터 변경 (예: "최근 7일")
    FE -> Router: GET /api/analyses\n?period=7days&sort=latest&page=1
    Router -> Service: 필터링된 분석 목록 조회
    Service -> DB: SELECT * FROM analyses\nWHERE user_id=$1\nAND created_at >= CURRENT_DATE - INTERVAL '7 days'
    DB --> Service: 필터링된 목록
    Service --> Router: 분석 목록
    Router --> FE: 200 OK {analyses, pagination}
    FE -> User: 목록 새로고침

    User -> FE: 분석 카드 클릭
    FE -> FE: /analysis/{id} 페이지로 이동

    User -> FE: 페이지 번호 클릭 (2페이지)
    FE -> Router: GET /api/analyses\n?page=2&limit=10
    Router -> Service: 2페이지 데이터 조회
    Service -> DB: SELECT * FROM analyses\nLIMIT 10 OFFSET 10
    DB --> Service: 2페이지 목록
    Service --> Router: 분석 목록
    Router --> FE: 200 OK {analyses, pagination}
    FE -> User: 2페이지 목록 표시
end

@enduml
```

## Related Use Cases
- [UC-001] 새 사주 분석하기
- [UC-002] 분석 결과 상세 조회
- [UC-003] Pro 구독 신청
- [UC-004] Pro 구독 해지

## Notes
- 이 유스케이스는 사용자가 가장 자주 방문하는 페이지로, 초기 로딩 성능이 매우 중요합니다.
- React Query를 활용한 적절한 캐싱 전략으로 불필요한 API 호출을 최소화해야 합니다.
- 대시보드는 사용자의 서비스 이용 현황을 한눈에 파악할 수 있어야 하므로, 직관적인 UI/UX 디자인이 필수입니다.
- Pro 구독 유도를 위한 적절한 CTA 배치가 비즈니스 성과에 중요한 영향을 미칩니다.
- 향후 확장 시 대시보드에 추가할 수 있는 기능: 분석 결과 통계 차트, 자주 분석한 날짜/시간대, 추천 분석 시간 등.
