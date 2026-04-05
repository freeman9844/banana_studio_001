# 🎨 마법의 그림 스튜디오 (Banana Studio)

초등학생들을 위해 특별히 설계된 직관적이고 안전한 AI 그림 생성 웹 애플리케이션입니다. Google Cloud의 강력한 **Vertex AI (Gemini 3.1 Flash Image)** 모델을 사용하여 학생들이 입력한 한글 프롬프트대로 멋진 이미지를 만들어냅니다.

## 주요 특징 (Features)

*   **초간편 로그인:** 이메일이나 복잡한 가입 절차 없이, '자신만의 별명'과 '비밀번호 4자리(숫자)'만으로 로그인하고 그림을 모아볼 수 있습니다.
*   **완전 자율 입력 (단순함 극대화):** "어떤 그림을 그리고 싶나요?" 라는 직관적인 질문 하나와 큰 텍스트 입력창만 제공합니다.
*   **한글 프롬프트 완벽 지원:** 학생들이 한글로 그림을 설명해도, 보이지 않는 곳에서 Gemini 2.5 모델이 똑똑하게 영어로 번역하여 최고 품질의 결과물을 이끌어냅니다.
*   **하루 20번의 마법 (할당량 관리):** 무분별한 사용을 막기 위해 학생당 하루에 20번만 이미지를 생성할 수 있습니다.
*   **선생님용 관리자 대시보드 (`/admin`):**
    *   학생들의 사용 횟수와 남은 횟수를 실시간으로 모니터링합니다.
    *   비밀번호를 잊어버린 학생의 비밀번호를 확인해 줄 수 있습니다.
    *   학생별 횟수 충전, 전체 초기화, 그리고 사용하지 않는 학생 계정 삭제 기능이 포함되어 있습니다. (기본 비밀번호: `admin` / `admin`)
*   **초고속 생성:** Gemini 3.1의 Chain-of-Thought(고민 과정)을 최소화하여 초등학생들이 지루해하지 않게 단 10~15초 만에 이미지를 만들어냅니다.

## 기술 스택 (Tech Stack)

*   **Frontend:** Next.js (App Router), React, Tailwind CSS
*   **Backend:** Next.js Route Handlers
*   **AI Integration:** `@google/genai` SDK (Vertex AI 환경)
    *   이미지 생성: `gemini-3.1-flash-image-preview`
*   **Storage (MVP):** 현재 버전은 별도의 외부 DB 연결 없이 서버 메모리(In-memory Map)를 사용하여 할당량을 관리하고 이미지를 Base64 형태로 반환합니다.

## 로컬 실행 방법 (How to run)

1.  **Google Cloud 인증:**
    Vertex AI를 사용하므로, 터미널 환경에서 Google Cloud ADC(Application Default Credentials) 로그인이 되어 있어야 합니다.
    ```bash
    gcloud auth application-default login
    gcloud config set project [YOUR_PROJECT_ID]
    ```

2.  **환경 변수 설정 (옵션):**
    기본적으로 현재 설정된 GCP 프로젝트와 `global` 리전을 사용하지만, `.env.local` 파일에 명시적으로 지정할 수도 있습니다.
    ```env
    GOOGLE_CLOUD_PROJECT=your-project-id
    GOOGLE_CLOUD_LOCATION=global
    ```

3.  **패키지 설치 및 실행:**
    ```bash
    npm install
    npm run dev
    ```

4.  **접속:**
    *   학생용 스튜디오: [http://localhost:3000](http://localhost:3000)
    *   선생님 관리자: [http://localhost:3000/admin](http://localhost:3000/admin)

## 화면 미리보기

*   **스튜디오 로그인:** 닉네임과 PIN으로 빠르고 간편하게 입장!
*   **그림 만들기:** 만들고 싶은 그림을 한글로 자유롭게 적고 "그림 만들기! 🪄" 버튼 클릭!
*   **관리자 화면:** 선생님 로그인 후, 우리 반 학생들의 마법 횟수 현황을 한눈에 보고 관리!
