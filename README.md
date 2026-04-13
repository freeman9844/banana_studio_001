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
  - 전체 학생의 실시간 사용량을 목록 형태로 한눈에 조회합니다. (PIN은 bcrypt 해싱으로 안전하게 저장되며 표시되지 않습니다.)
  - 개별 학생에게 마법(5번 추가, 가득 충전)을 충전해 주거나, 학생 정보를 삭제할 수 있습니다.
  - 전체 학생 횟수 일괄 초기화 버튼을 제공합니다.

---

## 🏗 아키텍처 및 기술 스택

- **프론트엔드 (Frontend):** React, Next.js (App Router), Tailwind CSS, SWR
- **백엔드 (Backend):** Next.js API Routes
- **데이터베이스 (DB) 및 스토리지:** 로컬 파일 시스템 (JSON 기반) + **Google Cloud Storage (GCS)** 하이브리드. `fs/promises`와 In-memory Mutex Lock을 적용하여 동시성 문제를 방지하고, 서버리스 환경(Cloud Run)의 Stateless 제약을 극복하기 위해 GCS에 데이터를 자동 동기화(백업 및 복구)합니다. GCS 조건부 쓰기(낙관적 잠금)로 다중 인스턴스 환경에서의 충돌을 방지합니다.
- **보안:** `bcryptjs`를 사용한 PIN 번호 해싱 저장 (평문 저장 없음)
- **AI 연동:** `@google/genai` (Gemini 3.1 Flash Image Preview)
- **테스트:** Vitest + Testing Library (54개 테스트, 주요 모듈 커버)

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

# 클라우드 스토리지 데이터 백업 설정 (Cloud Run 배포 시 필요)
GCS_BUCKET_NAME=your-gcs-bucket-name

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

## ☁️ 클라우드 런(Cloud Run) 배포 방법

프로젝트에 포함된 `deploy.sh` 스크립트를 사용하여 Google Cloud Run에 쉽게 배포할 수 있습니다. 해당 스크립트는 컨테이너 빌드, 배포뿐만 아니라 데이터 영속성을 위한 GCS 버킷 생성까지 자동화합니다.

```bash
# 기본 설정으로 배포
./deploy.sh
```

- **주의:** 스크립트 실행 전 `gcloud` CLI 설치 및 인증(`gcloud auth login`)이 완료되어 있어야 합니다.

---

## 🛠 최근 개선 사항 (Changelog)

### 보안 (Security)
- **PIN bcrypt 해싱:** 학생 PIN 번호를 `bcryptjs`로 해싱 저장. 평문 PIN이 데이터에 남지 않으며, 기존 평문 PIN은 최초 로그인 시 자동 마이그레이션됩니다.
- **GCS 조건부 쓰기 (낙관적 잠금):** Cloud Run 다중 인스턴스 환경에서 quota 데이터 충돌을 방지하는 Generation-number 기반 낙관적 잠금 적용. 충돌 시 최대 3회 자동 재시도합니다.
- **관리자 인증 강화:** 환경 변수 누락 시 서버 시작 단계에서 즉시 에러 처리. 관리자 세션 검증 헬퍼(`adminAuth.ts`) 분리.

### 아키텍처 (Architecture)
- **useUser 커스텀 훅:** 중복된 사용자 인증 및 쿼터 폴링 로직을 `src/hooks/useUser.ts`로 통합. 폴링 주기는 `QUOTA_POLL_INTERVAL` 상수로 관리.
- **관리자 페이지 컴포넌트 분리:** 단일 파일이던 관리자 페이지를 `AdminLogin`, `AdminSettings`, `AdminStudentTable` 세 컴포넌트로 분리.
- **이미지 GCS 저장:** 생성된 이미지를 GCS에 자동 저장(`src/lib/imageStore.ts`). 추후 히스토리 기능 기반 마련.

### 품질 (Quality)
- **Toast / ConfirmModal UI:** 브라우저 기본 `alert()` / `confirm()` 대화상자를 커스텀 Toast 알림과 ConfirmModal로 교체.
- **공통 생성 핸들러:** text-to-image와 image-to-image 라우트의 중복 로직을 `generateHelpers.ts`로 통합.
- **공통 상수 및 로거:** `src/lib/constants.ts`, `src/lib/logger.ts` 추가로 매직 넘버 및 `console.*` 직접 호출 제거.

### 테스트 (Testing)
- **Vitest 테스트 스위트 구축:** 54개 테스트 작성 (lib, hooks, API routes, components). 주요 비즈니스 로직 및 API 엔드포인트 커버.

### 이전 개선 사항
- **서버리스 데이터 영속성 (GCS 하이브리드):** Cloud Run과 같은 Stateless 환경에서도 학생 데이터 및 설정이 초기화되지 않도록 Local File + GCS 동기화 로직 추가.
- **클라우드 런 배포 자동화:** 손쉬운 GCP 배포를 위한 `deploy.sh` 스크립트 제공.
- **동시성 문제(Race Condition) 해결:** JSON 파일 쓰기 시 Node.js 메모리 뮤텍스를 적용하여 다수 사용자의 동시 호출 시 파일 덮어쓰기 문제 해결.
- **SWR 라이브러리 도입:** `setInterval` 폴링 대신 SWR로 지능적인 실시간 할당량 UI 업데이트 구현.
- **AI API 최적화 (DRY 원칙):** 서비스 레이어 분리 및 Exponential Backoff 재시도 로직 도입.
- **선생님 전역 설정 기능 추가:** 화질 제어(1k / 0.5k) 및 하루 최대 한도(Max Quota) 설정 패널 추가.

---

## 📝 데이터 구조 (Data Location)
- 이 프로젝트는 DB 구축의 복잡함을 덜기 위해 `data/quotas.json` 및 `data/config.json` 파일을 사용하여 사용량 및 환경 설정을 관리합니다.
- 변경된 데이터는 자동으로 GCS 버킷에 동기화되므로 컨테이너가 재시작되어도 기존 데이터를 GCS에서 복원하여 안전하게 유지합니다.