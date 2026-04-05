# 🎨 마법의 그림 스튜디오 (Banana Studio)

초등학생들을 위해 특별히 설계된 직관적이고 안전한 AI 그림 생성 웹 애플리케이션입니다. Google Cloud의 강력한 **Vertex AI (Gemini 3.1 Flash Image)** 모델을 사용하여 학생들이 입력한 한글 프롬프트대로 멋진 이미지를 만들어냅니다.

## 주요 특징 (Features)

*   **초간편 로그인 (기록 유지):** 이메일이나 복잡한 가입 절차 없이, '자신만의 별명'과 '비밀번호 4자리(숫자)'만으로 로그인합니다. 브라우저를 닫았다가 다시 열어도 재로그인할 필요 없이 로컬 스토리지(`localStorage`)를 통해 기존 세션이 유지됩니다.
*   **완전 자율 입력 (단순함 극대화):** "어떤 그림을 그리고 싶나요?" 라는 직관적인 질문 하나와 큰 텍스트 입력창만 제공합니다. 복잡한 모델 파라미터는 모두 백엔드에서 자동 처리됩니다.
*   **한글 프롬프트 완벽 지원:** `gemini-3.1-flash-image-preview` 모델의 강력한 다국어 이해 능력을 바탕으로 한글 지시어를 있는 그대로 자연스럽게 처리합니다.
*   **하루 20번의 마법 (할당량 관리):** 무분별한 사용을 막기 위해 학생당 하루에 20번만 이미지를 생성할 수 있습니다. (할당량 소진 시 지수 백오프 방식의 429 에러 핸들링이 적용되어 있습니다.)
*   **선생님용 관리자 대시보드 (`/admin`):**
    *   보안 로그인 기능 탑재 (기본 아이디/비밀번호: `admin` / `admin`).
    *   **실시간 출석 체크:** 학생이 로그인하는 즉시(그림을 한 장도 그리지 않았더라도) 관리자 화면에 해당 학생의 이름과 비밀번호가 실시간으로 나타납니다.
    *   학생들의 사용 횟수와 남은 횟수를 실시간(5초 단위 갱신)으로 모니터링합니다.
    *   비밀번호를 잊어버린 학생의 비밀번호를 바로 확인해 줄 수 있습니다.
    *   학생별 횟수 100% 충전, 전체 데이터 초기화, 사용하지 않는 학생 계정 삭제 기능이 포함되어 있습니다.
*   **초고속 생성 및 렌더링:** `thinkingBudget: 0` 설정을 통해 모델의 Chain-of-Thought(고민 과정)을 건너뛰어 생성 시간을 절반으로 단축시켰으며, 귀여운 대기 애니메이션을 제공하여 지루함을 없앴습니다.
*   **안전한 로컬 데이터 보존:** 서버 메모리(In-memory) 대신 로컬 파일 시스템(`data/quotas.json`) 기반 스토리지를 채택하여, 서버나 컴퓨터를 껐다 켜도 학생들의 접속 정보와 할당량이 그대로 보존됩니다.

## 기술 스택 (Tech Stack)

*   **Frontend:** Next.js (App Router), React, Tailwind CSS
*   **Backend:** Next.js Route Handlers
*   **AI Integration:** `@google/genai` SDK v1.48.0+ (Vertex AI 환경)
    *   이미지 생성: `gemini-3.1-flash-image-preview` (`generateContent` API의 `responseModalities: ["IMAGE"]` 방식 사용)
*   **Storage:** Local JSON File Storage (`src/lib/quotaStore.ts`를 통한 `data/quotas.json` 영구 보존)

## 로컬 실행 방법 (How to run)

1.  **Google Cloud 인증:**
    Vertex AI를 사용하므로, 터미널 환경에서 Google Cloud ADC(Application Default Credentials) 로그인이 되어 있어야 합니다.
    ```bash
    gcloud auth application-default login
    gcloud config set project [YOUR_PROJECT_ID]
    ```

2.  **환경 변수 설정 (옵션):**
    기본적으로 현재 설정된 GCP 프로젝트와 `global` 리전을 사용하지만, 필요시 `.env.local` 파일에 명시적으로 지정할 수도 있습니다.
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
*   **관리자 화면:** 선생님 로그인 후, 우리 반 학생들의 비밀번호와 마법 횟수 현황을 한눈에 보고 횟수 재충전이나 계정 삭제를 관리!
