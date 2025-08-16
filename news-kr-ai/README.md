# 3대 특검 뉴스 브리핑

한국의 3대 특별검사 수사(내란특검, 김건희특검, 채상병특검) 관련 뉴스를 실시간으로 수집하고 AI로 분석하여 제공하는 Next.js 웹 애플리케이션입니다.

## ✨ 핵심 기능 미리보기

- 🔥 **AI 기반 실시간 뉴스 분석** - OpenAI GPT를 활용한 기사 중요도 자동 평가
- 📊 **일일 특검 동향 요약** - 매일 아침 핵심 이슈를 한눈에 파악
- 🎯 **스마트 키워드 필터링** - AI가 추출한 핵심 키워드로 즉시 기사 필터링
- ⚡ **고성능 캐싱** - Supabase 기반 지능형 캐시로 빠른 응답 속도
- 🔍 **통합 검색** - 제목, 내용, 키워드 통합 검색으로 원하는 정보 빠르게 탐색

## 주요 기능

### 📰 뉴스 수집 및 분석

- **실시간 뉴스 수집**: Naver News API를 통한 3대 특검 관련 뉴스 자동 수집
- **AI 기사 분석**: OpenAI GPT-5-nano를 사용한 기사 관련성 분석 및 중요도 평가
- **중복 제거**: 여러 카테고리에 나타나는 동일 기사 자동 중복 제거
- **관련성 아이콘**: 🔥 이모지로 기사 중요도 시각화

### 📊 일일 요약

- **AI 요약**: OpenAI GPT-5-mini를 사용한 하루 특검 동향 요약
- **특검별 현황**: 각 특검(내란, 김건희, 채상병)별 주요 진행사항
- **핵심 키워드**: 당일 가장 중요한 키워드 3개 추출 및 필터링 기능
- **주요 발전사항**: 하루의 핵심 이슈 요약

### 🔍 검색 및 필터링

- **키워드 검색**: 기사 제목 및 내용 기반 실시간 검색
- **카테고리 필터**: 특검별 기사 필터링
- **핵심 키워드 필터**: AI가 추출한 중요 키워드 클릭으로 즉시 필터링
- **페이지네이션**: 10개 기사씩 페이지 단위로 표시

### 💾 캐싱 시스템

- **Supabase 외부 캐시**: 파일 시스템 대신 Supabase 데이터베이스 사용
- **차별화된 만료 정책**:
  - 뉴스 브리핑: 1시간
  - AI 분석: 영구 보존
  - 일일 요약: 6시간

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (캐싱)
- **AI**: OpenAI GPT-5-nano, GPT-5-mini
- **External API**: Naver News API
- **HTTP Client**: Axios

## 환경 설정

### 필수 환경 변수

```bash
# Naver API
CLIENT_ID=your_naver_client_id
CLIENT_SECRET=your_naver_client_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Supabase 테이블 설정

```sql
CREATE TABLE cache_entries (
  cache_key TEXT PRIMARY KEY,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('news_briefing', 'analysis', 'summary')),
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start

# 린트 검사
npm run lint
```

## API 엔드포인트

### GET /api/briefing

뉴스 브리핑 데이터를 반환합니다.

**응답 예시:**

```json
{
  "briefing": {
    "timestamp": "2025-08-16T10:00:00.000Z",
    "totalArticles": 25,
    "keywords": ["내란특검", "김건희특검", "채상병특검"],
    "articles": [...]
  }
}
```

### POST /api/analyze

기사 배열을 받아 AI 분석 결과를 반환합니다.

**요청 본문:**

```json
{
  "articles": [...]
}
```

### POST /api/summary

기사 배열을 받아 일일 요약을 생성합니다.

**응답 예시:**

```json
{
  "summary": {
    "overall": "오늘의 전체적인 특검 수사 동향...",
    "by_investigation": {
      "내란특검": "내란 특검 관련 주요 진행사항...",
      "김건희특검": "김건희 특검 관련 주요 진행사항...",
      "채상병특검": "채상병 특검 관련 주요 진행사항..."
    },
    "key_developments": ["발전사항1", "발전사항2", "발전사항3"],
    "top_keywords": ["키워드1", "키워드2", "키워드3"],
    "tone": "normal",
    "article_count": 25,
    "generated_at": "2025-08-16T10:00:00.000Z"
  }
}
```

## 프로젝트 구조

```text
src/
├── app/
│   ├── api/
│   │   ├── briefing/route.ts    # 뉴스 수집 API
│   │   ├── analyze/route.ts     # AI 분석 API
│   │   └── summary/route.ts     # 요약 생성 API
│   ├── page.tsx                 # 메인 페이지
│   ├── layout.tsx              # 레이아웃 컴포넌트
│   └── globals.css             # 전역 스타일
└── lib/
    └── supabase-cache.ts       # Supabase 캐시 서비스
```

## 유지보수 가이드

### 캐시 관리

- 뉴스 브리핑 캐시는 1시간마다 자동 갱신
- AI 분석 결과는 영구 보존되어 동일 기사 재분석 방지
- 요약 캐시는 6시간마다 갱신

### 모니터링

- OpenAI API 사용량 모니터링 필요
- Naver API 호출 제한 확인
- Supabase 스토리지 사용량 점검

### 성능 최적화

- Next.js 캐싱 전략 활용 (revalidate: 3600)
- 기사 중복 제거로 데이터 최적화
- 비동기 요약 생성으로 사용자 경험 개선

## 배포

### Vercel 배포

1. Vercel 대시보드에서 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 실행

### 기타 플랫폼

- Next.js 표준 배포 가이드 참조
- 환경 변수 정확히 설정 필요
- Supabase 연결 설정 확인

## 라이선스

MIT License

## 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성
3. 커밋 및 푸시
4. Pull Request 생성

## 문의사항

프로젝트 관련 문의사항이 있으시면 Issues를 통해 연락해 주세요.
