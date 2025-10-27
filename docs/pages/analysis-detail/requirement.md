# 분석 상세보기 페이지 요구사항 정의

## 개요

분석 상세보기 페이지(`/analysis/[id]`)는 사용자가 생성한 사주 분석 결과를 상세하게 조회하고, 추가 액션(재분석, 공유, 삭제)을 수행할 수 있는 핵심 페이지입니다.

### 주요 목표
- 분석 결과의 명확하고 체계적인 정보 전달
- 오행 분포, 운세 흐름 등 복잡한 데이터의 시각화
- 마크다운 형식의 AI 해석 결과 렌더링
- Pro 회원 전용 재분석 기능 제공
- 향후 확장 가능한 공유/PDF 다운로드 인터페이스

---

## 기능 요구사항

### 1. 분석 결과 조회 및 표시

#### 1.1 기본 정보 섹션
**요구사항**:
- 분석 대상자 성함 표시
- 생년월일 (YYYY-MM-DD 형식)
- 성별 (남성/여성)
- 출생시간 (HH:mm 형식, 선택사항이므로 없을 수 있음)
- 분석 일시 (상대 시간: "3시간 전", "2일 전")
- 사용된 AI 모델 뱃지 (gemini-2.0-flash → "Flash", gemini-2.0-pro → "Pro")
- 조회수 표시

**화면 구성**:
```
┌─────────────────────────────────────────────┐
│  [← 뒤로가기]                    [더보기 ⋮] │
│                                             │
│  홍길동 님의 사주 분석 결과                  │
│                                             │
│  🗓️ 1990년 1월 15일                         │
│  ⏰ 14:30 (선택사항)                         │
│  👤 남성                                    │
│  📅 2025-10-27 (3시간 전)                   │
│  🤖 AI 모델: [Pro]                          │
│  👁️ 조회 5회                                │
└─────────────────────────────────────────────┘
```

#### 1.2 천간지지 (天干地支) 섹션
**요구사항**:
- 연주(年柱), 월주(月柱), 일주(日柱), 시주(時柱) 표시
- 각 기둥의 천간(天干)과 지지(地支) 한자 표시
- 출생시간이 없는 경우 시주는 "미상" 표시
- 4개 기둥을 가로로 나열하여 가독성 확보

**데이터 구조**:
```typescript
heavenly_stems: {
  year: "庚午",   // 년주
  month: "丙寅",  // 월주
  day: "辛卯",    // 일주
  hour: "甲申"    // 시주 (선택)
}
```

**화면 구성**:
```
┌───────────────────────────────────────┐
│       천간지지 (사주팔자)              │
│                                       │
│  年柱     月柱     日柱     時柱      │
│  庚午     丙寅     辛卯     甲申      │
│  (경오)   (병인)   (신묘)   (갑신)    │
└───────────────────────────────────────┘
```

#### 1.3 오행(五行) 분석 섹션
**요구사항**:
- 목(木), 화(火), 토(土), 금(金), 수(水)의 개수 표시
- 레이더 차트 또는 바 차트로 시각화
- 각 오행의 강약에 대한 AI 해석 표시
- 색상 코드:
  - 목(木): 초록색 (#10B981)
  - 화(火): 빨간색 (#EF4444)
  - 토(土): 갈색 (#D97706)
  - 금(金): 회색 (#6B7280)
  - 수(水): 파란색 (#3B82F6)

**데이터 구조**:
```typescript
five_elements: {
  wood: 3,   // 목
  fire: 2,   // 화
  earth: 1,  // 토
  metal: 2,  // 금
  water: 1   // 수
}
```

**화면 구성**:
```
┌────────────────────────────────────────┐
│         오행(五行) 분포                 │
│                                        │
│   [레이더 차트 또는 바 차트]            │
│                                        │
│   木 (목): 3개  ████████████           │
│   火 (화): 2개  ████████               │
│   土 (토): 1개  ████                   │
│   金 (금): 2개  ████████               │
│   水 (수): 1개  ████                   │
│                                        │
│   AI 해석:                             │
│   목(木)이 강하여 성장과 확장의 에너지가 │
│   풍부합니다...                         │
└────────────────────────────────────────┘
```

#### 1.4 대운(大運)과 세운(歲運) 섹션
**요구사항**:
- 대운(10년 주기 운세) 흐름 표시
- 세운(연도별 운세) 흐름 표시
- 타임라인 형태로 시각화
- 각 시기의 주요 특징 요약
- 현재 운세 강조 표시

**데이터 구조**:
```typescript
fortune_flow: {
  major_fortune: "대운 해석 (마크다운 텍스트)...",
  yearly_fortune: "세운 해석 (마크다운 텍스트)..."
}
```

**화면 구성**:
```
┌────────────────────────────────────────┐
│         대운(大運) 흐름                 │
│                                        │
│   [타임라인 차트]                       │
│   2020-2030: 갑자(甲子) - 성장기        │
│   2030-2040: 을축(乙丑) - 안정기        │
│   ...                                  │
│                                        │
│   AI 해석: (마크다운)                   │
│   현재는 갑자 대운으로...               │
└────────────────────────────────────────┘
```

#### 1.5 종합 해석 섹션
**요구사항**:
- 4가지 영역별 상세 해석:
  1. **성격 분석**: 성향, 장단점, 대인관계
  2. **재운 분석**: 금전운, 사업운, 투자 성향
  3. **건강운 분석**: 주의해야 할 건강 부위, 예방법
  4. **연애운 분석**: 연애 스타일, 배우자운, 궁합
- 각 영역은 마크다운 형식으로 작성됨
- 제목, 강조, 목록 등 마크다운 문법 지원
- XSS 공격 방지를 위한 sanitization 적용

**데이터 구조**:
```typescript
interpretation: {
  personality: "# 성격 분석\n\n## 전반적 성향\n...",
  wealth: "# 재운 분석\n\n## 금전운\n...",
  health: "# 건강운 분석\n\n## 주의사항\n...",
  love: "# 연애운 분석\n\n## 연애 스타일\n..."
}
```

**화면 구성**:
```
┌────────────────────────────────────────┐
│         종합 해석                       │
│                                        │
│  [탭] 성격  재운  건강  연애           │
│                                        │
│  [선택된 탭 내용 - 마크다운 렌더링]     │
│                                        │
│  # 성격 분석                            │
│  ## 전반적 성향                         │
│  - 적극적이고 진취적인 성격             │
│  - 리더십이 강하며...                   │
│  ...                                   │
└────────────────────────────────────────┘
```

### 2. 재분석 기능 (Pro 회원 전용)

#### 2.1 재분석 버튼
**요구사항**:
- Free 회원: 버튼 비활성화 + Pro 구독 유도 툴팁
- Pro 회원: 재분석 가능
- 재분석 시 동일한 입력값(성함, 생년월일, 출생시간, 성별) 사용
- 최신 AI 모델로 재분석 (gemini-2.0-pro)
- 분석 횟수 1회 차감
- 새 분석 ID로 결과 저장
- 재분석 완료 후 새 분석 페이지로 리다이렉트

**화면 구성**:
```
┌────────────────────────────────────────┐
│  [🔄 재분석하기] (Pro 전용)             │
│                                        │
│  💡 더 정확한 분석 결과를 원하시나요?    │
│     최신 AI 모델로 다시 분석해보세요!    │
│                                        │
│  ⚠️ 재분석 시 Pro 분석 횟수 1회가       │
│     차감됩니다.                         │
└────────────────────────────────────────┘
```

#### 2.2 재분석 확인 모달
**요구사항**:
- "재분석하기" 버튼 클릭 시 확인 모달 표시
- 남은 분석 횟수 표시
- 재분석 진행 확인
- 취소 버튼

**화면 구성**:
```
┌────────────────────────────────────────┐
│  재분석 확인                            │
│                                        │
│  다음 정보로 재분석을 진행하시겠습니까?  │
│                                        │
│  • 성함: 홍길동                         │
│  • 생년월일: 1990-01-15                 │
│  • 출생시간: 14:30                      │
│  • 성별: 남성                           │
│                                        │
│  남은 Pro 분석 횟수: 7/10회             │
│                                        │
│  [취소]  [재분석 시작]                  │
└────────────────────────────────────────┘
```

### 3. 조회수 증가

#### 3.1 자동 조회수 증가
**요구사항**:
- 페이지 진입 시 자동으로 조회수 1 증가
- 동일 사용자가 여러 번 조회해도 모두 카운트 (제한 없음)
- `last_viewed_at` 필드에 마지막 조회 시간 기록
- 백엔드에서 트랜잭션으로 처리

**SQL 쿼리**:
```sql
UPDATE analyses
SET view_count = view_count + 1,
    last_viewed_at = NOW(),
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING view_count;
```

### 4. 분석 삭제 기능

#### 4.1 삭제 버튼
**요구사항**:
- "더보기(⋮)" 메뉴에 "삭제" 옵션 추가
- 삭제 확인 모달 표시
- 삭제 시 복구 불가 경고
- 삭제 성공 시 대시보드로 리다이렉트

**화면 구성**:
```
┌────────────────────────────────────────┐
│  분석 삭제 확인                         │
│                                        │
│  ⚠️ 이 분석 결과를 삭제하시겠습니까?    │
│                                        │
│  삭제된 분석은 복구할 수 없습니다.       │
│                                        │
│  [취소]  [삭제]                         │
└────────────────────────────────────────┘
```

### 5. 공유 기능 (향후 구현)

#### 5.1 공유 링크 생성
**요구사항** (MVP에서는 UI만 준비):
- "더보기(⋮)" 메뉴에 "공유" 옵션 추가
- 공유 링크 생성 (토큰 기반, 만료 시간 설정)
- 카카오톡, URL 복사 옵션
- 공유된 링크는 비로그인 사용자도 조회 가능 (읽기 전용)

**화면 구성**:
```
┌────────────────────────────────────────┐
│  분석 결과 공유                         │
│                                        │
│  [URL 복사]  [카카오톡 공유]            │
│                                        │
│  공유 링크는 7일 동안 유효합니다.        │
└────────────────────────────────────────┘
```

### 6. PDF 다운로드 (향후 구현)

#### 6.1 PDF 생성
**요구사항** (MVP에서는 UI만 준비):
- "더보기(⋮)" 메뉴에 "PDF 다운로드" 옵션 추가
- 분석 결과 전체를 PDF 파일로 생성
- 파일명: `사주분석_홍길동_20251027.pdf`
- 차트 이미지 포함

**기술 스택**:
- `react-to-pdf` 또는 `jspdf` + `html2canvas`
- 서버 사이드 PDF 생성: `puppeteer` 또는 `pdfkit`

---

## 비기능 요구사항

### 1. 성능

#### 1.1 로딩 속도
- 분석 결과 조회 API 응답 시간: **500ms 이내**
- 초기 페이지 렌더링: **1초 이내**
- 차트 렌더링: **300ms 이내**

#### 1.2 최적화
- 마크다운 렌더링 결과 메모이제이션
- 차트 데이터 캐싱 (5분)
- 이미지 lazy loading (향후 추가되는 이미지)
- SSR/ISR 적용 고려 (SEO 및 성능 향상)

### 2. 보안

#### 2.1 인증/인가
- **필수**: Clerk JWT 토큰 검증
- **권한 확인**: 분석 결과 소유자만 조회 가능 (`user_id` 검증)
- **에러 처리**:
  - 401 Unauthorized: 로그인 페이지로 리다이렉트
  - 403 Forbidden: "접근 권한이 없습니다" 메시지 표시 후 대시보드로 이동
  - 404 Not Found: "분석 결과를 찾을 수 없습니다" 메시지 표시

#### 2.2 XSS 방지
- 마크다운 렌더링 시 **sanitization 필수**
- `react-markdown`의 `rehype-sanitize` 플러그인 사용
- `<script>`, `<iframe>`, `onclick` 등 위험한 태그/속성 제거

#### 2.3 SQL Injection 방지
- Supabase ORM 사용 (Prepared Statements)
- 사용자 입력값 직접 쿼리에 삽입 금지

### 3. 사용자 경험 (UX)

#### 3.1 로딩 상태
- API 호출 중 스켈레톤 UI 표시
- 차트 로딩 중 스피너 표시
- 마크다운 렌더링 중 Placeholder 표시

#### 3.2 에러 처리
- 네트워크 오류: "네트워크 오류가 발생했습니다. 다시 시도해주세요." + 재시도 버튼
- 권한 오류: "이 분석 결과에 접근할 권한이 없습니다." + 대시보드 이동 버튼
- 404 오류: "분석 결과를 찾을 수 없습니다." + 대시보드 이동 버튼

#### 3.3 반응형 디자인
- 모바일: 1컬럼 레이아웃
- 태블릿: 2컬럼 레이아웃
- 데스크탑: 2-3컬럼 레이아웃
- 차트는 화면 크기에 맞게 자동 조정

#### 3.4 접근성 (Accessibility)
- 시맨틱 HTML 사용 (`<header>`, `<main>`, `<section>`)
- ARIA 레이블 추가 (차트, 버튼 등)
- 키보드 네비게이션 지원
- 색상 대비 비율: WCAG AA 기준 4.5:1 이상

### 4. SEO (향후 고려)

#### 4.1 메타 태그
- `<title>`: "홍길동 님의 사주 분석 결과 | 서비스명"
- `<meta name="description">`: "홍길동 님의 사주팔자 분석 결과입니다. AI가 분석한 성격, 재운, 건강운, 연애운을 확인하세요."
- Open Graph 태그 (소셜 미디어 공유용)

#### 4.2 SSR/ISR
- Next.js `generateStaticParams`로 주요 분석 결과 사전 렌더링
- ISR로 주기적 재생성 (예: 1시간마다)

---

## 데이터 모델

### 1. 분석 결과 (analyses 테이블)

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  ai_model TEXT NOT NULL,
  analysis_result JSONB,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
```

### 2. analysis_result JSON 구조

```typescript
type AnalysisResult = {
  heavenly_stems: {
    year: string;   // 년주
    month: string;  // 월주
    day: string;    // 일주
    hour?: string;  // 시주 (선택)
  };
  five_elements: {
    wood: number;   // 목
    fire: number;   // 화
    earth: number;  // 토
    metal: number;  // 금
    water: number;  // 수
  };
  fortune_flow: {
    major_fortune: string;   // 대운 해석 (마크다운)
    yearly_fortune: string;  // 세운 해석 (마크다운)
  };
  interpretation: {
    personality: string;  // 성격 분석 (마크다운)
    wealth: string;       // 재운 분석 (마크다운)
    health: string;       // 건강운 분석 (마크다운)
    love: string;         // 연애운 분석 (마크다운)
  };
};
```

---

## API 명세

### GET /api/analyses/:id

**설명**: 분석 결과 조회 (조회수 자동 증가)

**Request**:
```
Headers:
  Authorization: Bearer {clerk_jwt_token}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject_name": "홍길동",
    "birth_date": "1990-01-15",
    "birth_time": "14:30",
    "gender": "male",
    "ai_model": "gemini-2.0-flash",
    "analysis_result": { /* AnalysisResult 구조 */ },
    "status": "completed",
    "view_count": 5,
    "created_at": "2025-10-27T10:00:00Z",
    "last_viewed_at": "2025-10-27T15:00:00Z"
  }
}
```

**Error Responses**:
- 401 Unauthorized: 로그인 필요
- 403 Forbidden: 권한 없음
- 404 Not Found: 분석 없음

### DELETE /api/analyses/:id

**설명**: 분석 결과 삭제

**Request**:
```
Headers:
  Authorization: Bearer {clerk_jwt_token}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "분석 결과가 삭제되었습니다"
}
```

### POST /api/analyses/reanalyze

**설명**: 재분석 요청 (Pro 회원 전용)

**Request**:
```json
{
  "original_analysis_id": "uuid",
  "subject_name": "홍길동",
  "birth_date": "1990-01-15",
  "birth_time": "14:30",
  "gender": "male"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "new_analysis_id": "new_uuid",
    "status": "processing",
    "remaining_count": 7
  }
}
```

---

## 화면 흐름도

```
[대시보드]
    ↓ (분석 카드 클릭)
[분석 상세보기 페이지]
    ├─ [기본 정보 섹션]
    ├─ [천간지지 섹션]
    ├─ [오행 분석 섹션]
    │   └─ 레이더 차트
    ├─ [운세 흐름 섹션]
    │   └─ 타임라인 차트
    └─ [종합 해석 섹션]
        ├─ [성격] 탭
        ├─ [재운] 탭
        ├─ [건강] 탭
        └─ [연애] 탭
    ↓ (사용자 액션)
    ├─ [뒤로가기] → [대시보드]
    ├─ [재분석] → [새 분석 생성] → [새 분석 결과 페이지]
    ├─ [공유] → [공유 모달] (향후 구현)
    ├─ [PDF 다운로드] → [PDF 생성] (향후 구현)
    └─ [삭제] → [확인 모달] → [대시보드]
```

---

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router), React 19
- **상태 관리**: Context + useReducer (Level 2)
- **차트**: Recharts 또는 Chart.js
- **마크다운**: `react-markdown` + `rehype-sanitize`
- **UI**: Shadcn-ui, Tailwind CSS
- **아이콘**: Lucide React
- **날짜**: date-fns (상대 시간 표시)

### Backend
- **Framework**: Hono (Next.js API Routes)
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **인증**: Clerk (JWT 토큰 검증)

---

## 우선순위

### MVP (필수)
- ✅ 분석 결과 조회 및 표시
- ✅ 천간지지, 오행, 운세, 종합 해석 섹션
- ✅ 조회수 증가
- ✅ 재분석 기능 (Pro 전용)
- ✅ 분석 삭제 기능

### Phase 2 (향후 구현)
- ⏳ 공유 기능 (링크 생성, 카카오톡 공유)
- ⏳ PDF 다운로드
- ⏳ SEO 최적화 (SSR/ISR)
- ⏳ 소셜 미디어 공유 (Open Graph)

---

## 참고 문서

- [UC-004] 분석 결과 조회 (`/docs/usecases/004/spec.md`)
- [Database Schema] `/docs/database.md`
- [PRD] `/docs/prd.md`
