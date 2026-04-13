# 마법의 그림 스튜디오 — 보안·아키텍처·품질 개선 설계

**날짜:** 2026-04-10  
**범위:** P0 보안, P1 아키텍처, P2 코드 품질, P3 테스트  
**접근 방식:** 단계별 (P0 → P1 → P2 → P3), 각 단계 독립 커밋

---

## 1. P0: 보안

### 1.1 PIN 해싱 (bcryptjs)

**문제:** 학생 PIN 4자리가 `quotas.json`에 평문 저장되고, 관리자 API 응답에도 노출됨.

**해결:**
- 패키지: `bcryptjs` (순수 JS, Alpine Docker 호환)
- 신규 등록 시: `bcrypt.hash(pin, 10)` 저장
- PIN 검증 시: `bcrypt.compare(inputPin, storedHash)`
- **마이그레이션**: 기존 평문 PIN은 `$2b$` 접두사로 해시 여부 판별 → 다음 로그인 시 자동 해시 업그레이드 (평문 비교 후 통과하면 즉시 재해싱)
- 관리자 API 응답에서 `pin` 필드 완전 제거

**변경 파일:**
- `src/app/api/register/route.ts` — 등록 시 해싱
- `src/lib/quotaHelpers.ts` — bcrypt.compare로 검증 + 마이그레이션
- `src/app/api/admin/quotas/route.ts` — 응답에서 pin 제거

### 1.2 관리자 자격증명 필수화

**문제:** `ADMIN_ID || 'admin'`, `ADMIN_PASSWORD || 'admin'` 기본값으로 환경변수 미설정 시 누구나 관리자 로그인 가능.

**해결:**
```ts
// src/app/api/admin/login/route.ts
if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_ID and ADMIN_PASSWORD environment variables are required');
}
```
환경변수 미설정 시 서버 500 에러로 명확한 실패 유도. fallback 제거.

### 1.3 세션 검증 공통화

**문제:** 5개 admin route에서 `cookieStore.get('admin_session')` 존재만 확인, 값 검증 없음.

**해결:**
```ts
// src/lib/adminAuth.ts
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}
```
모든 admin route에서 이 함수 사용.

### 1.4 `/api/quota` 보호

**문제:** 닉네임만 알면 누구의 잔여 쿼터도 조회 가능.

**해결:** GET 요청에 `pin` 파라미터 추가, `validateUserQuota`로 검증 후 응답.  
프론트엔드 SWR URL: `/api/quota?nickname=...&pin=...`  
**주의:** HTTPS 환경이므로 전송 중 암호화됨. logger에서 URL 전체 로깅 금지.

---

## 2. P1: 아키텍처

### 2.1 GCS 조건부 쓰기 (멀티 인스턴스 경쟁 조건)

**문제:** Cloud Run 다중 인스턴스 환경에서 인메모리 Mutex가 인스턴스 간 경쟁 조건을 막지 못함.

**해결:** GCS `ifGenerationMatch` 낙관적 잠금:
1. GCS에서 파일 읽기 + 현재 `generation` 번호 획득
2. 업데이트 후 `{ ifGenerationMatch: generation }` 옵션으로 저장
3. 다른 인스턴스가 먼저 썼을 경우 409 → 최대 3회 재시도 (지수 백오프)
4. 로컬 파일은 캐시 역할 유지

**변경 파일:** `src/lib/quotaStore.ts`

### 2.2 `useUser()` 커스텀 훅

**문제:** `src/app/page.tsx`와 `src/app/photo/page.tsx`에 동일한 사용자 상태 관리 코드 중복 (~50줄).

**해결:**
```ts
// src/hooks/useUser.ts
export function useUser() {
  // - localStorage에서 사용자 복원
  // - SWR로 쿼터 폴링 (5초)
  // - handleLogin: /api/register 호출 후 localStorage 저장
  // - handleLogout: 상태·localStorage 초기화
  // - isMounted: hydration mismatch 방지
  return { user, currentQuota, isMounted, handleLogin, handleLogout };
}
```

### 2.3 API 공통 생성 핸들러

**문제:** `generate/route.ts`와 `generate-with-image/route.ts`에 검증·쿼터 증가·응답 로직 중복.

**해결:**
```ts
// src/lib/generateHelpers.ts
export async function handleGenerateRequest(
  userId: string,
  inputPin: string,
  generateFn: (config: GlobalConfig) => Promise<string>
): Promise<NextResponse>
```
두 route는 `generateFn`만 다르게 전달.

### 2.4 생성 이미지 GCS 저장

**문제:** AI 생성 이미지를 base64 data URL로 직접 응답 → 수 MB 응답, 재접근 불가.

**해결:**
1. 생성된 base64 이미지를 GCS 버킷에 `images/{nickname}/{timestamp}.png`로 저장
2. 서명된 URL (1시간 유효) 반환
3. 응답 크기 대폭 감소

**변경 파일:** `src/lib/imageStore.ts` (신규), `src/lib/generateHelpers.ts`

---

## 3. P2: 코드 품질

### 3.1 공통 상수 파일

```ts
// src/lib/constants.ts
export const DEFAULT_QUOTA = 20;
export const DEFAULT_RESOLUTION = '1024' as const;
export const PIN_LENGTH = 4;
export const BCRYPT_ROUNDS = 10;
export const QUOTA_POLL_INTERVAL = 5000;
```
매직 넘버 `20`이 흩어진 모든 파일에서 이 상수 참조.

### 3.2 Admin 페이지 컴포넌트 분리

현재 293줄 → 다음 구조로 분리:

```
src/components/admin/
  AdminLogin.tsx        # 로그인 폼 (순수 UI)
  AdminSettings.tsx     # 전체 설정 패널 (한도/화질 선택)
  AdminStudentTable.tsx # 학생 목록 테이블 + 개별 관리 버튼
```
`src/app/admin/page.tsx`는 상태·API 호출만 담당 (~80줄).

### 3.3 경량 로거

```ts
// src/lib/logger.ts
export const logger = {
  info:  (msg: string, ...args: unknown[]) => console.log(`[INFO]  ${msg}`, ...args),
  warn:  (msg: string, ...args: unknown[]) => console.warn(`[WARN]  ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
};
```
모든 `console.log/warn/error` → `logger.*`로 교체. 추후 구조화 로그로 교체 가능한 인터페이스.

### 3.4 Toast + ConfirmModal UI 컴포넌트

```
src/components/ui/
  Toast.tsx        # 성공/오류 알림 (3초 자동 사라짐, Tailwind)
  ConfirmModal.tsx # confirm() 대체 모달 (비동기 Promise 반환)
  ToastContext.tsx # 전역 Toast 상태 관리
```
추가 패키지 없음, 기존 Tailwind 스타일 활용.  
`alert()` → Toast, `confirm()` → ConfirmModal로 교체.

### 3.5 데드코드 제거

- `src/app/api/admin/quotas/update/route.ts` 삭제

---

## 4. P3: 테스트

**프레임워크:** Vitest + `@testing-library/react`  
**커버리지 목표:** 80%+  
**AI 호출:** `aiService.ts`는 전체 mock

### 테스트 파일 구조

```
src/__tests__/
  lib/
    quotaStore.test.ts      # GCS mock, 파일 I/O, 조건부 쓰기 재시도
    quotaHelpers.test.ts    # PIN 검증, 마이그레이션, 쿼터 계산
    generateHelpers.test.ts # 공통 핸들러 흐름
    constants.test.ts       # 상수 타입·값 검증
  api/
    register.test.ts        # 신규 등록, 기존 로그인, 잘못된 PIN
    generate.test.ts        # 정상 생성, 쿼터 초과, 인증 실패
    generate-with-image.test.ts
    quota.test.ts           # 잔여 쿼터 조회, PIN 검증
    admin/
      login.test.ts         # 성공, 실패, env 미설정
      quotas.test.ts        # 인증, 목록 조회 (pin 미포함 확인)
      config.test.ts        # GET/POST, 인증
      reset.test.ts         # 개별/전체 초기화, ADD, DELETE
  hooks/
    useUser.test.ts         # localStorage 복원, 로그인·로그아웃
  components/
    Login.test.tsx          # 폼 제출, 유효성 검사
    Studio.test.tsx         # 쿼터 표시, 버튼 비활성화
```

### 핵심 테스트 케이스

| 영역 | 케이스 |
|------|--------|
| PIN 해싱 | 신규: 해시 저장 확인, 기존: 마이그레이션 확인 |
| 쿼터 초과 | `usage >= maxQuota` 시 429 반환 |
| GCS 재시도 | 409 응답 시 3회 재시도 후 성공 |
| 관리자 env | 미설정 시 500, 잘못된 자격증명 시 401 |
| API 응답 | PIN 필드 미포함 확인 |

---

## 5. 구현 순서

| 단계 | 내용 | 커밋 |
|------|------|------|
| 1 | P0: bcryptjs 설치, PIN 해싱, admin auth | `fix: harden security - pin hashing and admin auth` |
| 2 | P1: GCS 조건부 쓰기, useUser 훅, 공통 핸들러, 이미지 GCS | `feat: improve architecture - GCS locking and shared hooks` |
| 3 | P2: constants, admin 분리, logger, Toast/Modal, 데드코드 제거 | `refactor: improve code quality` |
| 4 | P3: Vitest 설정, 전체 테스트 작성 | `test: add 80%+ coverage with Vitest` |

---

## 6. 영향받는 파일 목록

**신규 생성:**
- `src/lib/constants.ts`
- `src/lib/adminAuth.ts`
- `src/lib/generateHelpers.ts`
- `src/lib/imageStore.ts`
- `src/lib/logger.ts`
- `src/hooks/useUser.ts`
- `src/components/admin/AdminLogin.tsx`
- `src/components/admin/AdminSettings.tsx`
- `src/components/admin/AdminStudentTable.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/ConfirmModal.tsx`
- `src/components/ui/ToastContext.tsx`
- `src/__tests__/**` (다수)
- `vitest.config.ts`

**수정:**
- `src/lib/quotaStore.ts` — GCS 조건부 쓰기
- `src/lib/quotaHelpers.ts` — bcrypt 검증 + 마이그레이션
- `src/services/aiService.ts` — logger 교체
- `src/app/api/register/route.ts` — PIN 해싱
- `src/app/api/admin/login/route.ts` — env 필수화
- `src/app/api/admin/quotas/route.ts` — pin 제거
- `src/app/api/admin/quotas/reset/route.ts` — adminAuth 사용
- `src/app/api/admin/config/route.ts` — adminAuth 사용
- `src/app/api/generate/route.ts` — 공통 핸들러
- `src/app/api/generate-with-image/route.ts` — 공통 핸들러
- `src/app/api/quota/route.ts` — PIN 검증
- `src/app/page.tsx` — useUser 훅 사용
- `src/app/photo/page.tsx` — useUser 훅 사용
- `src/app/admin/page.tsx` — 컴포넌트 분리
- `src/components/Studio.tsx` — Toast 사용, constants
- `src/components/PhotoStudio.tsx` — Toast 사용, constants
- `package.json` — bcryptjs, vitest 추가

**삭제:**
- `src/app/api/admin/quotas/update/route.ts`
