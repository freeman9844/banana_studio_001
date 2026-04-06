# 🍌 바나나 스튜디오 (Banana Studio)

바나나 스튜디오는 Next.js App Router와 구글의 **Gemini 3.1 Flash Image** API를 기반으로 구축된 학생용 AI 이미지 생성 및 관리 플랫폼입니다.
학생들이 텍스트나 이미지를 통해 상상하는 그림을 자유롭게 그리고, 선생님(관리자)은 전체 학생의 마법(이미지 생성) 사용량과 그림 화질을 제어할 수 있는 MVP 버전입니다.

## ✨ 주요 기능 (Key Features)

### 🧑‍🎓 학생 모드 (Student Portal)
- **간편 로그인:** 별명(Nickname)과 간단한 PIN 번호를 사용해 빠르게 접속합니다. 최초 로그인 시 자동으로 계정이 등록되며, PIN 번호 불일치 시 타인의 접근을 차단합니다.
- **텍스트 그림 생성:** "우주에서 자전거를 타는 고양이" 등 텍스트 프롬프트를 입력하여 그림을 생성합니다. (Text-to-Image)
- **마법 사진관:** 참고용(Reference) 이미지를 업로드하고 텍스트 프롬프트를 추가하여 새로운 이미지를 합성(Multi-Modal)합니다.
- **실시간 남은 마법 동기화:** SWR 폴링(Polling)을 통해 화면을 새로고침하지 않아도 실시간으로 본인의 하루 남은 한도가 업데이트됩니다.
- **직접 저장:** 완성된 그림은 다운로드 버튼을 눌러 로컬 PC에 직접 보관할 수 있습니다.

### 👩‍🏫 선생님(관리자) 모드 (Admin Dashboard)
- **서버사이드 인증:** 보안이 강화된 쿠키(Cookie) 기반의 HTTP-Only 인증으로 선생님 페이지(`http://localhost:3000/admin`)를 보호합니다.
- **전체 한도/화질 즉각 제어:** 
  - 마법 한도(1번, 5번, 10번, 20번) 설정으로 하루에 학생들이 만들 수 있는 그림 횟수를 제어합니다.
  - 그림 화질(1k 고화질, 0.5k 저화질)을 전환하여 트래픽 및 퀄리티를 관리합니다. 변경 시 학생들에게 즉시 반영됩니다.
- **개별 학생 관리:**
  - 전체 학생의 실시간 사용량과 핀 번호를 목록 형태로 한눈에 조회합니다.
  - 개별 학생에게 마법(5번 추가, 가득 충전)을 충전해 주거나, 학생 정보를 삭제할 수 있습니다.
  - 전체 학생 횟수 일괄 초기화 버튼을 제공합니다.

---

## 🏗 아키텍처 및 기술 스택

- **프론트엔드 (Frontend):** React, Next.js (App Router), Tailwind CSS, SWR
- **백엔드 (Backend):** Next.js API Routes
- **데이터베이스 (DB):** 로컬 파일 시스템 (JSON 기반). `fs/promises`와 In-memory Mutex Lock을 적용하여 동시 생성 요청 시의 데이터 유실(Race Condition)을 방지했습니다.
- **AI 연동:** `@google/genai` (Gemini 3.1 Flash Image Preview)

---

## 🚀 설치 및 실행 방법 (Getting Started)

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 항목들을 입력합니다.

```env
# Google Cloud Vertex AI 설정
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=global

# 관리자(선생님) 페이지 로그인 설정 (선택 사항, 기본값은 admin / admin)
ADMIN_ID=your_admin_id
ADMIN_PASSWORD=your_admin_password
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 로 접속하시면 학생 화면을, `http://localhost:3000/admin` 으로 접속하시면 관리자 화면을 보실 수 있습니다.

---

## 🛠 최근 개선 사항 (Changelog)

- **보안 및 인증 강화:** 관리자 페이지 무단 접근 방지 로직 (Server-side Session) 및 PIN 번호 기반의 학생 로그인 검증 로직 추가.
- **동시성 문제(Race Condition) 해결:** JSON 파일 쓰기 시 Node.js 메모리 뮤텍스를 적용하여 다수 사용자의 동시 호출 시 파일 덮어쓰기 문제 해결.
- **SWR 라이브러리 도입:** 비효율적인 `setInterval` 폴링 대신 SWR을 활용하여 지능적이고 실시간인 할당량 UI 업데이트 구현.
- **AI API 최적화 (DRY 원칙):** 서비스 레이어(`src/services/aiService.ts`)를 분리하고 `for` 루프 기반의 안전한 Exponential Backoff 재시도 로직 도입. API 라우트 공통 검증 로직(`src/lib/quotaHelpers.ts`) 분리.
- **선생님 전역 설정 기능 추가:** 학생 개별이 아닌 전체 시스템 차원의 화질 제어(1k / 0.5k) 및 하루 최대 한도(Max Quota) 설정 패널 추가.

---

## 📝 데이터 구조 (Data Location)
- 이 프로젝트는 DB 연동 없이 빠르고 가볍게 사용하기 위해 `data/quotas.json` 및 `data/config.json` 파일을 사용하여 사용량 및 환경 설정을 저장합니다. 
- 배포(Serverless 환경 등) 시 데이터 영속성을 원하신다면, Vercel KV(Redis)나 Supabase 등으로의 DB 연동 마이그레이션이 필요합니다.