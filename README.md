# 사주풀이 AI - 구독제 사주 분석 서비스

> Gemini API를 활용한 AI 기반 사주 분석 서비스. 사용자의 생년월일과 출생시간을 바탕으로 천간지지, 오행분석, 대운/세운 해석을 통한 개인 맞춤형 사주 분석을 제공하는 웹 애플리케이션입니다.

## 주요 특징

- **🤖 AI 기반 분석**: Google Gemini API를 활용한 전문적인 사주 해석
- **💳 유연한 구독 시스템**: 무료 체험(3회) → Pro 구독(월 10회)
- **🔐 안전한 인증**: Clerk를 통한 Google OAuth 로그인
- **💰 자동 결제**: 토스페이먼츠를 통한 정기결제 자동화
- **📱 반응형 디자인**: 모든 기기에서 최적화된 UI/UX

## 기술 스택

### Frontend
- **Framework**: [Next.js](https://nextjs.org) 14+
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **State Management**: [Zustand](https://zustand-demo.vercel.app), [React Query](https://tanstack.com/query/latest)
- **Forms**: [React Hook Form](https://react-hook-form.com), [Zod](https://zod.dev)

### Backend
- **Database**: [Supabase](https://supabase.com) (PostgreSQL)
- **Authentication**: [Clerk](https://clerk.com) + Google OAuth
- **API Framework**: [Hono](https://hono.dev)
- **AI**: [Google Gemini API](https://ai.google.dev)
- **Payment**: [Toss Payments](https://toss.payments) (정기결제)

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Utilities**: date-fns, ts-pattern, react-use, es-toolkit

## 시작하기

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase 계정 및 API 키
- Clerk 계정 및 API 키
- Google Gemini API 키
- Toss Payments 계정 및 API 키

### 환경 설정

1. **프로젝트 클론**
```bash
git clone <repository-url>
cd vmc5-2
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env.local` 파일을 생성하고 다음 정보를 입력합니다:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Google Gemini
NEXT_PUBLIC_GEMINI_API_KEY=<your-gemini-api-key>

# Toss Payments
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=<your-toss-client-key>
TOSS_PAYMENTS_SECRET_KEY=<your-toss-secret-key>
```

4. **개발 서버 실행**
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 서비스를 확인합니다.

## 주요 기능

### 📄 홈 (랜딩페이지)
- 서비스 소개 및 주요 특징 설명
- 무료 체험 및 Pro 구독 혜택 안내
- 로그인/회원가입 CTA

### 🎯 대시보드
- 사용자의 모든 분석 이력 목록 표시
- 남은 분석 횟수 표시
- 최근 분석 결과 요약 카드

### 🔍 새 분석하기
- 성함, 생년월일, 출생시간(선택), 성별 입력
- AI 기반 사주 분석 실행
- 분석 결과 저장

### 📊 분석 상세보기
- 천간지지 계산 결과
- 오행(목, 화, 토, 금, 수) 분포도 및 해석
- 대운/세운 흐름도
- 성격, 재운, 건강운, 연애운 종합 분석
- 결과 다운로드/공유 기능

### 💳 구독 관리
- 현재 구독 상태 표시
- Pro 구독 신청/해지
- 결제 정보 관리
- 결제 내역 확인
- 구독 재활성화

## 프로젝트 구조

```
src/
├── app/                           # Next.js App Router
│   ├── api/                       # API 라우트 (Hono)
│   ├── (auth)/                    # 인증 관련 페이지
│   ├── dashboard/                 # 대시보드 페이지
│   ├── analysis/                  # 분석 관련 페이지
│   ├── subscription/              # 구독 관리 페이지
│   └── page.tsx                   # 홈 페이지
├── backend/                       # 백엔드 로직
│   ├── hono/                      # Hono 애플리케이션
│   ├── middleware/                # 공통 미들웨어
│   ├── supabase/                  # Supabase 클라이언트
│   ├── config/                    # 환경 변수 설정
│   └── http/                      # HTTP 응답 헬퍼
├── features/                      # 기능별 모듈
│   ├── [featureName]/
│   │   ├── components/            # 컴포넌트
│   │   ├── hooks/                 # 커스텀 훅
│   │   ├── backend/               # 백엔드 로직
│   │   ├── lib/                   # 유틸리티
│   │   └── constants/             # 상수
├── components/
│   └── ui/                        # shadcn/ui 컴포넌트
├── constants/                     # 전역 상수
├── hooks/                         # 전역 커스텀 훅
├── lib/                           # 전역 유틸리티
└── remote/                        # HTTP 클라이언트
```

## 사용 가능한 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 실행
npm run start

# 코드 린팅
npm run lint

# 코드 포맷팅
npm run format

# 타입 체크
npm run type-check
```

## 핵심 비즈니스 로직

### 구독 시스템
- **무료 회원**: 가입 시 3회 제공, 소진 후 Pro 구독 유도
- **Pro 회원**: 월 10회, 매월 1일 초기화
- **정기결제**: 매일 02:00에 Supabase cron으로 자동 처리
- **실패 처리**: 결제 실패 시 즉시 구독 해지

### AI 분석
- **무료 회원**: `gemini-2.5-flash` 모델 사용
- **Pro 회원**: `gemini-2.5-pro` 모델 사용
- **분석 내용**: 천간지지, 오행분석, 대운/세운, 성격/재운/건강운/연애운 분석
- **Rate Limiting**: 분당 최대 5회 요청 제한

## 데이터베이스

Supabase를 사용하여 다음 데이터를 관리합니다:
- 사용자 정보 (Clerk 연동)
- 분석 이력 및 결과
- 구독 정보
- 결제 이력

마이그레이션 파일은 `supabase/migrations/` 디렉토리에 저장됩니다.

## 배포

### Vercel 배포
```bash
npm install -g vercel
vercel login
vercel deploy
```

## 개발 가이드

### 코드 스타일
- TypeScript를 사용한 타입 안정성
- ESLint와 Prettier를 통한 일관된 코드 포맷팅
- Tailwind CSS를 사용한 유틸리티-퍼스트 스타일링
- Client Component(`use client`)를 기본으로 사용

### 커밋 컨벤션
[Conventional Commits](https://www.conventionalcommits.org/ko/)를 따릅니다:
```bash
feat(feature-name): 새로운 기능 설명
fix(bug-name): 버그 수정 설명
docs: 문서 업데이트
refactor: 코드 리팩토링
```

## 문서

프로젝트 관련 상세 문서는 `/docs` 디렉토리에 있습니다:
- `prd.md` - 제품 요구사항 정의서
- `requirements.md` - 기능 요구사항
- `database.md` - 데이터베이스 스키마
- `userflow.md` - 사용자 여정
- `/docs/pages/` - 페이지별 상세 스펙
- `/docs/usecases/` - 기능별 유스케이스

## 라이센스

비공개 프로젝트

## 문의 및 지원

프로젝트에 관한 문의사항이 있으시면 프로젝트 담당자에게 연락해주세요.
