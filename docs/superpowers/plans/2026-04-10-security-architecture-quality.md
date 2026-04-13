# 보안·아키텍처·품질 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** P0 보안 취약점 해결, P1 아키텍처 개선, P2 코드 품질 향상, P3 Vitest 80%+ 커버리지 달성

**Architecture:** bcryptjs PIN 해싱 + GCS 조건부 쓰기(낙관적 잠금) + useUser 커스텀 훅으로 중복 제거 + 생성 이미지 GCS 저장. 단계별(P0→P1→P2→P3) 순서로 각 단계를 독립 커밋.

**Tech Stack:** Next.js 16.2.2, bcryptjs 3.0.3, vitest 4.1.4, @vitejs/plugin-react 6.0.1, @testing-library/react, @google-cloud/storage (기존)

---

## 파일 맵

**신규 생성:**
- `src/lib/constants.ts` — 공통 상수
- `src/lib/logger.ts` — 경량 로거
- `src/lib/adminAuth.ts` — 관리자 세션 검증 헬퍼
- `src/lib/imageStore.ts` — 생성 이미지 GCS 저장
- `src/lib/generateHelpers.ts` — 이미지 생성 공통 핸들러
- `src/hooks/useUser.ts` — 사용자 상태 + 쿼터 폴링 훅
- `src/components/ui/ToastContext.tsx` — Toast 전역 상태
- `src/components/ui/Toast.tsx` — Toast 렌더러
- `src/components/ui/ConfirmModal.tsx` — confirm() 대체 모달
- `src/components/admin/AdminLogin.tsx` — 관리자 로그인 폼
- `src/components/admin/AdminSettings.tsx` — 전역 설정 패널
- `src/components/admin/AdminStudentTable.tsx` — 학생 목록 테이블
- `vitest.config.ts`
- `src/__tests__/setup.ts`
- `src/__tests__/lib/quotaHelpers.test.ts`
- `src/__tests__/lib/quotaStore.test.ts`
- `src/__tests__/lib/generateHelpers.test.ts`
- `src/__tests__/api/register.test.ts`
- `src/__tests__/api/quota.test.ts`
- `src/__tests__/api/admin/login.test.ts`
- `src/__tests__/api/admin/quotas.test.ts`
- `src/__tests__/api/admin/config.test.ts`
- `src/__tests__/api/admin/reset.test.ts`
- `src/__tests__/hooks/useUser.test.ts`
- `src/__tests__/components/Login.test.tsx`
- `src/__tests__/components/Studio.test.tsx`

**수정:**
- `package.json`
- `src/lib/quotaStore.ts` — GCS 조건부 쓰기
- `src/lib/quotaHelpers.ts` — bcrypt PIN 검증 + 마이그레이션
- `src/services/aiService.ts` — `{base64, mimeType}` 반환
- `src/app/api/register/route.ts` — PIN 해싱
- `src/app/api/admin/login/route.ts` — env 필수화
- `src/app/api/admin/quotas/route.ts` — PIN 제거
- `src/app/api/admin/quotas/reset/route.ts` — adminAuth 사용
- `src/app/api/admin/config/route.ts` — adminAuth 사용
- `src/app/api/quota/route.ts` — logger 사용
- `src/app/api/generate/route.ts` — 공통 핸들러
- `src/app/api/generate-with-image/route.ts` — 공통 핸들러
- `src/app/page.tsx` — useUser 훅
- `src/app/photo/page.tsx` — useUser 훅
- `src/app/layout.tsx` — Provider 추가
- `src/app/admin/page.tsx` — 컴포넌트 분리
- `src/components/Studio.tsx` — Toast 사용
- `src/components/PhotoStudio.tsx` — Toast 사용

**삭제:**
- `src/app/api/admin/quotas/update/route.ts`

---

## Task 1: 의존성 설치 및 Vitest 설정

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`

- [ ] **Step 1: 패키지 설치**

```bash
cd /home/admin_/gemini/banana_studio_001
npm install bcryptjs
npm install -D @types/bcryptjs vitest@4.1.4 @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

- [ ] **Step 2: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"` 블록을 다음으로 교체:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
},
```

- [ ] **Step 3: vitest.config.ts 생성**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/app/layout.tsx',
        'src/app/globals.css',
      ],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: 테스트 setup 파일 생성**

```ts
// src/__tests__/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Vitest 동작 확인**

```bash
npm run test:run
```

Expected: "No test files found" (테스트 파일 없으나 에러 없이 종료)

- [ ] **Step 6: 커밋**

```bash
git add package.json vitest.config.ts src/__tests__/setup.ts
git commit -m "chore: add vitest and bcryptjs dependencies"
```

---

## Task 2: 공통 상수 및 로거

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/logger.ts`

- [ ] **Step 1: constants.ts 생성**

```ts
// src/lib/constants.ts
export const DEFAULT_QUOTA = 20;
export const DEFAULT_RESOLUTION = '1024' as const;
export const PIN_LENGTH = 4;
export const BCRYPT_ROUNDS = 10;
export const QUOTA_POLL_INTERVAL = 5000;
```

- [ ] **Step 2: logger.ts 생성**

```ts
// src/lib/logger.ts
export const logger = {
  info: (msg: string, ...args: unknown[]) =>
    console.log(`[INFO]  ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) =>
    console.warn(`[WARN]  ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) =>
    console.error(`[ERROR] ${msg}`, ...args),
};
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/constants.ts src/lib/logger.ts
git commit -m "chore: add shared constants and logger"
```

---

## Task 3: 관리자 세션 헬퍼 및 admin 라우트 통일

**Files:**
- Create: `src/lib/adminAuth.ts`
- Modify: `src/app/api/admin/quotas/reset/route.ts`
- Modify: `src/app/api/admin/config/route.ts`
- Modify: `src/app/api/admin/quotas/route.ts`

- [ ] **Step 1: adminAuth.ts 생성**

```ts
// src/lib/adminAuth.ts
import { cookies } from 'next/headers';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}
```

- [ ] **Step 2: admin/quotas/reset/route.ts 업데이트**

```ts
// src/app/api/admin/quotas/reset/route.ts
import { NextResponse } from 'next/server';
import { updateAllQuotasSafely, getConfig } from '@/lib/quotaStore';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nickname, action, amount } = await request.json();
    const config = await getConfig();
    const targetAmount = amount === undefined ? config.maxQuota : amount;
    const targetUsage = config.maxQuota - targetAmount;

    if (nickname === 'ALL') {
      await updateAllQuotasSafely((quotas) => {
        Object.keys(quotas).forEach(key => {
          quotas[key].usage = targetUsage;
        });
      });
      return NextResponse.json({ success: true, message: `All quotas reset to ${targetAmount}` });
    }

    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    if (action === 'DELETE') {
      await updateAllQuotasSafely((quotas) => {
        delete quotas[nickname];
      });
      return NextResponse.json({ success: true, message: `Student ${nickname} removed` });
    }

    if (action === 'ADD') {
      await updateAllQuotasSafely((quotas) => {
        const existing = quotas[nickname];
        if (existing) {
          quotas[nickname] = { usage: Math.max(0, existing.usage - targetAmount), pin: existing.pin };
        }
      });
      return NextResponse.json({ success: true, message: `Added ${targetAmount} quota to ${nickname}` });
    }

    await updateAllQuotasSafely((quotas) => {
      const existing = quotas[nickname];
      if (existing) {
        quotas[nickname] = { usage: targetUsage, pin: existing.pin };
      }
    });
    return NextResponse.json({ success: true, message: `Quota reset for ${nickname}` });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
```

- [ ] **Step 3: admin/config/route.ts 업데이트**

```ts
// src/app/api/admin/config/route.ts
import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/quotaStore';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const newConfig = await request.json();
    await saveConfig(newConfig);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/adminAuth.ts \
  src/app/api/admin/quotas/reset/route.ts \
  src/app/api/admin/config/route.ts
git commit -m "fix: centralize admin session validation with isAdminAuthenticated"
```

---

## Task 4: 관리자 로그인 환경변수 필수화

**Files:**
- Modify: `src/app/api/admin/login/route.ts`

- [ ] **Step 1: admin/login/route.ts 전체 교체**

```ts
// src/app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    logger.error('ADMIN_ID and ADMIN_PASSWORD environment variables are required');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { id, password } = await request.json();

    if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/admin/login/route.ts
git commit -m "fix: require ADMIN_ID and ADMIN_PASSWORD env vars, remove default fallbacks"
```

---

## Task 5: PIN 해싱 — quotaHelpers.ts

**Files:**
- Modify: `src/lib/quotaHelpers.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/__tests__/lib/quotaHelpers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  getConfig: vi.fn(),
  updateQuotaSafely: vi.fn(),
}));

import { validateUserQuota } from '@/lib/quotaHelpers';
import { getQuotas, getConfig, updateQuotaSafely } from '@/lib/quotaStore';

const mockGetQuotas = vi.mocked(getQuotas);
const mockGetConfig = vi.mocked(getConfig);
const mockUpdateQuotaSafely = vi.mocked(updateQuotaSafely);

describe('validateUserQuota', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error for unknown user', async () => {
    mockGetQuotas.mockResolvedValue({});
    mockGetConfig.mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const result = await validateUserQuota('unknown', '1234');

    expect(result.error).toBe('등록되지 않은 사용자입니다.');
    expect(result.status).toBe(401);
  });

  it('validates hashed PIN correctly', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: hashedPin } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });

    const result = await validateUserQuota('alice', '1234');

    expect(result.error).toBeNull();
    expect(result.userData).toBeDefined();
  });

  it('rejects wrong PIN', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: hashedPin } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });

    const result = await validateUserQuota('alice', 'wrong');

    expect(result.error).toBe('잘못된 PIN 번호입니다.');
    expect(result.status).toBe(401);
  });

  it('accepts plain-text PIN and triggers migration', async () => {
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: '1234' } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });
    mockUpdateQuotaSafely.mockResolvedValue({ usage: 0, pin: 'hashed' });

    const result = await validateUserQuota('alice', '1234');

    expect(result.error).toBeNull();
    expect(mockUpdateQuotaSafely).toHaveBeenCalledWith('alice', expect.any(Function));
  });

  it('rejects wrong plain-text PIN without migration', async () => {
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: '1234' } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });

    const result = await validateUserQuota('alice', 'wrong');

    expect(result.error).toBe('잘못된 PIN 번호입니다.');
    expect(mockUpdateQuotaSafely).not.toHaveBeenCalled();
  });

  it('returns quota exceeded error', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 10, pin: hashedPin } });
    mockGetConfig.mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const result = await validateUserQuota('alice', '1234');

    expect(result.error).toContain('오늘은 마법을 다 썼어요');
    expect(result.status).toBe(429);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/__tests__/lib/quotaHelpers.test.ts
```

Expected: FAIL (현재 bcrypt 없음)

- [ ] **Step 3: quotaHelpers.ts 전체 교체**

```ts
// src/lib/quotaHelpers.ts
import bcrypt from 'bcryptjs';
import { getQuotas, getConfig, updateQuotaSafely } from '@/lib/quotaStore';
import { BCRYPT_ROUNDS } from '@/lib/constants';

async function verifyPin(
  nickname: string,
  inputPin: string,
  storedPin: string
): Promise<boolean> {
  const isHashed = storedPin.startsWith('$2b$') || storedPin.startsWith('$2a$');

  if (isHashed) {
    return bcrypt.compare(inputPin, storedPin);
  }

  // Legacy plain-text: compare then migrate to hash
  if (storedPin !== inputPin) return false;

  const hashedPin = await bcrypt.hash(inputPin, BCRYPT_ROUNDS);
  await updateQuotaSafely(nickname, (existing) => ({
    ...existing!,
    pin: hashedPin,
  }));
  return true;
}

export async function validateUserQuota(userId: string, inputPin: string) {
  const quotas = await getQuotas();
  const config = await getConfig();
  const userData = quotas[userId];

  if (!userData) {
    return { error: '등록되지 않은 사용자입니다.', status: 401 };
  }

  const pinValid = await verifyPin(userId, inputPin, userData.pin);
  if (!pinValid) {
    return { error: '잘못된 PIN 번호입니다.', status: 401 };
  }

  if (userData.usage >= config.maxQuota) {
    return { error: `오늘은 마법을 다 썼어요! (하루 ${config.maxQuota}번 제한)`, status: 429 };
  }

  return { userData, config, error: null, status: undefined };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm run test:run -- src/__tests__/lib/quotaHelpers.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/quotaHelpers.ts src/__tests__/lib/quotaHelpers.test.ts
git commit -m "fix: verify PIN with bcrypt, auto-migrate plain-text PINs"
```

---

## Task 6: PIN 해싱 — register/route.ts

**Files:**
- Modify: `src/app/api/register/route.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/__tests__/api/register.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  updateQuotaSafely: vi.fn(),
}));

import { POST } from '@/app/api/register/route';
import { getQuotas, updateQuotaSafely } from '@/lib/quotaStore';

const mockGetQuotas = vi.mocked(getQuotas);
const mockUpdateQuotaSafely = vi.mocked(updateQuotaSafely);

function makeRequest(body: object) {
  return new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when nickname missing', async () => {
    const res = await POST(makeRequest({ pin: '1234' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when pin missing', async () => {
    const res = await POST(makeRequest({ nickname: 'alice' }));
    expect(res.status).toBe(400);
  });

  it('registers new user with hashed PIN', async () => {
    mockGetQuotas.mockResolvedValue({});
    mockUpdateQuotaSafely.mockImplementation(async (_nick, fn) => fn(undefined) as never);

    const res = await POST(makeRequest({ nickname: 'alice', pin: '1234' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const callFn = mockUpdateQuotaSafely.mock.calls[0][1];
    const result = callFn(undefined);
    expect((result as { pin: string }).pin).toMatch(/^\$2b\$/);
    expect((result as { usage: number }).usage).toBe(0);
  });

  it('allows existing user with correct hashed PIN', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 3, pin: hashedPin } });

    const res = await POST(makeRequest({ nickname: 'alice', pin: '1234' }));
    expect(res.status).toBe(200);
  });

  it('rejects existing user with wrong PIN', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 3, pin: hashedPin } });

    const res = await POST(makeRequest({ nickname: 'alice', pin: '9999' }));
    expect(res.status).toBe(401);
  });

  it('accepts plain-text PIN for existing user and migrates', async () => {
    mockGetQuotas.mockResolvedValue({ alice: { usage: 2, pin: '1234' } });
    mockUpdateQuotaSafely.mockImplementation(async (_nick, fn) => fn({ usage: 2, pin: '1234' }) as never);

    const res = await POST(makeRequest({ nickname: 'alice', pin: '1234' }));
    expect(res.status).toBe(200);
    expect(mockUpdateQuotaSafely).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/__tests__/api/register.test.ts
```

Expected: FAIL

- [ ] **Step 3: register/route.ts 전체 교체**

```ts
// src/app/api/register/route.ts
import { NextResponse } from 'next/server';
import { getQuotas, updateQuotaSafely } from '@/lib/quotaStore';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/lib/constants';

async function isPinValid(inputPin: string, storedPin: string): Promise<boolean> {
  const isHashed = storedPin.startsWith('$2b$') || storedPin.startsWith('$2a$');
  return isHashed
    ? bcrypt.compare(inputPin, storedPin)
    : storedPin === inputPin;
}

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: 'Nickname and pin are required' }, { status: 400 });
    }

    const quotas = await getQuotas();
    const existingUser = quotas[nickname];

    if (existingUser) {
      const valid = await isPinValid(pin, existingUser.pin);
      if (!valid) {
        return NextResponse.json({ error: '등록된 별명입니다. 올바른 PIN을 입력해주세요.' }, { status: 401 });
      }

      // Migrate plain-text PIN to hash
      const isAlreadyHashed = existingUser.pin.startsWith('$2b$') || existingUser.pin.startsWith('$2a$');
      if (!isAlreadyHashed) {
        const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
        await updateQuotaSafely(nickname, (existing) => ({
          ...existing!,
          pin: hashedPin,
        }));
      }

      return NextResponse.json({ success: true, message: `Student ${nickname} logged in` });
    }

    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await updateQuotaSafely(nickname, () => ({ usage: 0, pin: hashedPin }));

    return NextResponse.json({ success: true, message: `Student ${nickname} registered` });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error registering student:', error.message);
      return NextResponse.json({ error: error.message || 'Failed to register student' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm run test:run -- src/__tests__/api/register.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/register/route.ts src/__tests__/api/register.test.ts
git commit -m "fix: hash PIN on registration, migrate plain-text PINs on login"
```

---

## Task 7: Admin API 응답에서 PIN 제거

**Files:**
- Modify: `src/app/api/admin/quotas/route.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// src/__tests__/api/admin/quotas.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/adminAuth', () => ({
  isAdminAuthenticated: vi.fn(),
}));
vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  getConfig: vi.fn(),
}));

import { GET } from '@/app/api/admin/quotas/route';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { getQuotas, getConfig } from '@/lib/quotaStore';

const mockIsAdmin = vi.mocked(isAdminAuthenticated);
const mockGetQuotas = vi.mocked(getQuotas);
const mockGetConfig = vi.mocked(getConfig);

describe('GET /api/admin/quotas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns quota list without pin field', async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockGetQuotas.mockResolvedValue({
      alice: { usage: 3, pin: '$2b$10$hashedpin' },
      bob: { usage: 0, pin: '$2b$10$hashedpin2' },
    });
    mockGetConfig.mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.quotas).toHaveLength(2);
    expect(data.quotas[0]).not.toHaveProperty('pin');
    expect(data.quotas[0]).toHaveProperty('nickname');
    expect(data.quotas[0]).toHaveProperty('usage');
    expect(data.quotas[0]).toHaveProperty('remaining');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/__tests__/api/admin/quotas.test.ts
```

- [ ] **Step 3: admin/quotas/route.ts 업데이트**

```ts
// src/app/api/admin/quotas/route.ts
import { NextResponse } from 'next/server';
import { getQuotas, getConfig } from '@/lib/quotaStore';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quotas = await getQuotas();
  const config = await getConfig();

  const quotasList = Object.entries(quotas).map(([nickname, data]) => ({
    nickname,
    usage: data.usage,
    remaining: Math.max(0, config.maxQuota - data.usage),
  }));

  return NextResponse.json({ quotas: quotasList, config });
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test:run -- src/__tests__/api/admin/quotas.test.ts
```

Expected: 2 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/admin/quotas/route.ts src/__tests__/api/admin/quotas.test.ts
git commit -m "fix: remove pin field from admin quota response"
```

---

## Task 8: GCS 조건부 쓰기 — quotaStore.ts

**Files:**
- Modify: `src/lib/quotaStore.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// src/__tests__/lib/quotaStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockDownload = vi.fn();
const mockGetMetadata = vi.fn();
const mockWriteFile = vi.fn();
const mockReadFile = vi.fn();

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: mockSave,
        download: mockDownload,
        getMetadata: mockGetMetadata,
      }),
    }),
  })),
}));

vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile, writeFile: mockWriteFile },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

describe('quotaStore — GCS conditional writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  it('retries on GCS 412 conflict and succeeds on second attempt', async () => {
    const initialData = JSON.stringify({ alice: { usage: 0, pin: 'hash' } });
    mockDownload
      .mockResolvedValueOnce([Buffer.from(initialData)])
      .mockResolvedValueOnce([Buffer.from(initialData)]);
    mockGetMetadata
      .mockResolvedValueOnce([{ generation: '100' }])
      .mockResolvedValueOnce([{ generation: '101' }]);

    const conflictError = Object.assign(new Error('conditionNotMet'), { code: 412 });
    mockSave
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    const { updateQuotaSafely } = await import('@/lib/quotaStore');
    const result = await updateQuotaSafely('alice', (existing) => ({
      ...existing!,
      usage: (existing?.usage ?? 0) + 1,
    }));

    expect(result.usage).toBe(1);
    expect(mockSave).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/__tests__/lib/quotaStore.test.ts
```

- [ ] **Step 3: quotaStore.ts 전체 교체**

```ts
// src/lib/quotaStore.ts
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { logger } from '@/lib/logger';

const dataFilePath = path.join(process.cwd(), 'data', 'quotas.json');
const configFilePath = path.join(process.cwd(), 'data', 'config.json');

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const bucketName = process.env.GCS_BUCKET_NAME;

if (!existsSync(path.dirname(dataFilePath))) {
  mkdirSync(path.dirname(dataFilePath), { recursive: true });
}

export interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

export interface UserQuota {
  usage: number;
  pin: string;
}

export interface QuotaData {
  [nickname: string]: UserQuota;
}

async function readFromFileOrGcs<T>(
  filePath: string,
  gcsFileName: string,
  fallbackData: T
): Promise<T> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      if (bucketName) {
        try {
          const [content] = await storage.bucket(bucketName).file(gcsFileName).download();
          const parsed = JSON.parse(content.toString('utf-8'));
          await fs.writeFile(filePath, content.toString('utf-8'), 'utf-8');
          logger.info(`Recovered ${gcsFileName} from GCS and cached locally.`);
          return parsed;
        } catch {
          return fallbackData;
        }
      }
      return fallbackData;
    }
    logger.error(`Error reading ${gcsFileName} file:`, error);
    return fallbackData;
  }
}

async function writeToFileAndGcs<T>(
  filePath: string,
  gcsFileName: string,
  data: T
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');

  if (bucketName) {
    try {
      await storage.bucket(bucketName).file(gcsFileName).save(content);
      logger.info(`Synced ${gcsFileName} to GCS bucket ${bucketName}`);
    } catch (error) {
      logger.error(`Error saving ${gcsFileName} to GCS:`, error);
    }
  }
}

class Mutex {
  private mutex = Promise.resolve();
  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {};
    this.mutex = this.mutex.then(() => new Promise(begin));
    return new Promise((res) => {
      begin = res;
    });
  }
}

const fileMutex = new Mutex();

export async function getConfig(): Promise<GlobalConfig> {
  const defaultFallback: GlobalConfig = { maxQuota: 20, resolution: '1024' };
  const parsed = await readFromFileOrGcs(configFilePath, 'config.json', defaultFallback);
  return {
    maxQuota: parsed.maxQuota || 20,
    resolution: parsed.resolution || '1024',
  };
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  await writeToFileAndGcs(configFilePath, 'config.json', config);
}

export async function getQuotas(): Promise<QuotaData> {
  return readFromFileOrGcs(dataFilePath, 'quotas.json', {});
}

export async function saveQuotas(data: QuotaData): Promise<void> {
  await writeToFileAndGcs(dataFilePath, 'quotas.json', data);
}

function isGcsConflict(error: unknown): boolean {
  return (
    (typeof error === 'object' && error !== null && (error as { code?: number }).code === 412) ||
    (error instanceof Error && error.message.includes('conditionNotMet'))
  );
}

async function retryOnGcsConflict<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (isGcsConflict(error) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
        logger.warn(`GCS generation conflict, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded for GCS conditional write');
}

async function updateWithGcsConditionalWrite(
  gcsFileName: string,
  localFilePath: string,
  mutateFn: (current: QuotaData) => QuotaData
): Promise<QuotaData> {
  if (!bucketName) {
    const quotas = await getQuotas();
    const updated = mutateFn(quotas);
    await saveQuotas(updated);
    return updated;
  }

  const file = storage.bucket(bucketName).file(gcsFileName);
  let quotas: QuotaData = {};
  let generation = 0;

  try {
    const [[content], [metadata]] = await Promise.all([
      file.download() as Promise<[Buffer]>,
      file.getMetadata() as Promise<[{ generation: string }]>,
    ]);
    quotas = JSON.parse(content.toString('utf-8'));
    generation = Number(metadata.generation);
  } catch (err: unknown) {
    if ((err as { code?: number }).code !== 404) throw err;
    generation = 0;
  }

  const updated = mutateFn(quotas);
  const content = JSON.stringify(updated, null, 2);

  await file.save(content, {
    contentType: 'application/json',
    preconditionOpts: { ifGenerationMatch: generation },
  });
  await fs.writeFile(localFilePath, content, 'utf-8');
  logger.info(`GCS conditional write succeeded (generation ${generation})`);

  return updated;
}

export async function updateQuotaSafely(
  nickname: string,
  updateFn: (user: UserQuota | undefined) => UserQuota
): Promise<UserQuota> {
  const unlock = await fileMutex.lock();
  try {
    const updated = await retryOnGcsConflict(() =>
      updateWithGcsConditionalWrite('quotas.json', dataFilePath, (quotas) => {
        const updatedUser = updateFn(quotas[nickname]);
        return { ...quotas, [nickname]: updatedUser };
      })
    );
    return updated[nickname];
  } finally {
    unlock();
  }
}

export async function updateAllQuotasSafely(
  updateFn: (quotas: QuotaData) => QuotaData | void
): Promise<void> {
  const unlock = await fileMutex.lock();
  try {
    await retryOnGcsConflict(() =>
      updateWithGcsConditionalWrite('quotas.json', dataFilePath, (quotas) => {
        return updateFn(quotas) || quotas;
      })
    );
  } finally {
    unlock();
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test:run -- src/__tests__/lib/quotaStore.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/quotaStore.ts src/__tests__/lib/quotaStore.test.ts
git commit -m "feat: add GCS conditional writes for multi-instance safety"
```

---

## Task 9: aiService.ts — base64+mimeType 반환 구조 변경

**Files:**
- Modify: `src/services/aiService.ts`

- [ ] **Step 1: aiService.ts 전체 교체**

```ts
// src/services/aiService.ts
import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
});

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

function extractImageFromResponse(response: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> }): GeneratedImage {
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No candidates returned from model');
  }

  const parts = response.candidates[0].content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image data found in response');
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

export async function generateImageWithRetry(
  promptText: string,
  maxRetries = 3
): Promise<GeneratedImage> {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is missing.');
  }

  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: promptText,
        config: {
          responseModalities: ['IMAGE'],
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return extractImageFromResponse(response);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { status?: number }).status === 429 &&
        retries < maxRetries
      ) {
        const delayMs = Math.pow(2, retries + 1) * 1000 + Math.random() * 500;
        logger.warn(`[Retry ${retries + 1}/${maxRetries}] 429 Rate limit. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

export async function generateMultimodalWithRetry(
  promptText: string,
  imageBase64: string,
  mimeType: string,
  maxRetries = 3
): Promise<GeneratedImage> {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is missing.');
  }

  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
              { text: promptText },
            ],
          },
        ],
        config: {
          responseModalities: ['IMAGE'],
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return extractImageFromResponse(response);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { status?: number }).status === 429 &&
        retries < maxRetries
      ) {
        const delayMs = Math.pow(2, retries + 1) * 1000 + Math.random() * 500;
        logger.warn(`[Retry ${retries + 1}/${maxRetries}] 429 Rate limit multimodal. Retrying in ${Math.round(delayMs)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/services/aiService.ts
git commit -m "refactor: aiService returns {base64, mimeType} instead of data URL"
```

---

## Task 10: imageStore.ts + generateHelpers.ts + generate routes 업데이트

**Files:**
- Create: `src/lib/imageStore.ts`
- Create: `src/lib/generateHelpers.ts`
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/app/api/generate-with-image/route.ts`

- [ ] **Step 1: 테스트 작성**

```ts
// src/__tests__/lib/generateHelpers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/quotaStore', () => ({
  updateQuotaSafely: vi.fn(),
}));
vi.mock('@/lib/quotaHelpers', () => ({
  validateUserQuota: vi.fn(),
}));
vi.mock('@/lib/imageStore', () => ({
  saveImageToGcs: vi.fn(),
}));

import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';
import { validateUserQuota } from '@/lib/quotaHelpers';
import { updateQuotaSafely } from '@/lib/quotaStore';
import { saveImageToGcs } from '@/lib/imageStore';

const mockValidate = vi.mocked(validateUserQuota);
const mockUpdateQuota = vi.mocked(updateQuotaSafely);
const mockSaveImage = vi.mocked(saveImageToGcs);

describe('handleGenerateRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 on validation failure', async () => {
    mockValidate.mockResolvedValue({ error: '등록되지 않은 사용자입니다.', status: 401, userData: undefined, config: undefined });

    const res = await handleGenerateRequest('alice', '1234', vi.fn());
    expect(res.status).toBe(401);
  });

  it('generates image and decrements quota', async () => {
    mockValidate.mockResolvedValue({
      error: null,
      status: undefined,
      userData: { usage: 2, pin: 'hash' },
      config: { maxQuota: 10, resolution: '1024' },
    });
    mockSaveImage.mockResolvedValue('https://gcs.example.com/image.png');
    mockUpdateQuota.mockResolvedValue({ usage: 3, pin: 'hash' });

    const generateFn = vi.fn().mockResolvedValue({ base64: 'abc123', mimeType: 'image/png' });
    const res = await handleGenerateRequest('alice', '1234', generateFn);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imageUrl).toBe('https://gcs.example.com/image.png');
    expect(data.remainingQuota).toBe(7);
  });

  it('returns 500 on AI generation failure', async () => {
    mockValidate.mockResolvedValue({
      error: null,
      status: undefined,
      userData: { usage: 0, pin: 'hash' },
      config: { maxQuota: 10, resolution: '1024' },
    });
    const generateFn = vi.fn().mockRejectedValue(new Error('AI failed'));

    const res = await handleGenerateRequest('alice', '1234', generateFn);
    expect(res.status).toBe(500);
  });
});

describe('buildAugmentedPrompt', () => {
  it('appends high quality suffix for 1024', () => {
    const result = buildAugmentedPrompt('cat', { maxQuota: 10, resolution: '1024' });
    expect(result).toContain('high quality');
  });

  it('appends low quality suffix for 512', () => {
    const result = buildAugmentedPrompt('cat', { maxQuota: 10, resolution: '512' });
    expect(result).toContain('low quality');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/__tests__/lib/generateHelpers.test.ts
```

- [ ] **Step 3: imageStore.ts 생성**

```ts
// src/lib/imageStore.ts
import { Storage } from '@google-cloud/storage';
import { logger } from '@/lib/logger';

const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const bucketName = process.env.GCS_BUCKET_NAME;

export async function saveImageToGcs(
  base64Data: string,
  mimeType: string,
  nickname: string
): Promise<string> {
  if (!bucketName) {
    return `data:${mimeType};base64,${base64Data}`;
  }

  const ext = mimeType.split('/')[1] || 'png';
  const fileName = `images/${nickname}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64Data, 'base64');
  const file = storage.bucket(bucketName).file(fileName);

  try {
    await file.save(buffer, { contentType: mimeType, resumable: false });
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });
    logger.info(`Image saved to GCS: ${fileName}`);
    return signedUrl;
  } catch (error) {
    logger.error('Failed to save image to GCS, falling back to data URL:', error);
    return `data:${mimeType};base64,${base64Data}`;
  }
}
```

- [ ] **Step 4: generateHelpers.ts 생성**

```ts
// src/lib/generateHelpers.ts
import { NextResponse } from 'next/server';
import { updateQuotaSafely, GlobalConfig } from '@/lib/quotaStore';
import { validateUserQuota } from '@/lib/quotaHelpers';
import { saveImageToGcs } from '@/lib/imageStore';
import { logger } from '@/lib/logger';
import { GeneratedImage } from '@/services/aiService';

export function buildAugmentedPrompt(prompt: string, config: GlobalConfig): string {
  const suffix = config.resolution === '1024'
    ? ', high quality, 1024x1024 resolution'
    : ', low quality, 512x512 resolution';
  return prompt + suffix;
}

export async function handleGenerateRequest(
  userId: string,
  inputPin: string,
  generateFn: (config: GlobalConfig) => Promise<GeneratedImage>
): Promise<NextResponse> {
  const { userData, config, error, status } = await validateUserQuota(userId, inputPin);
  if (error || !userData || !config) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  try {
    const { base64, mimeType } = await generateFn(config);
    const imageUrl = await saveImageToGcs(base64, mimeType, userId);

    const finalUserData = await updateQuotaSafely(userId, (existing) => ({
      usage: (existing?.usage ?? userData.usage) + 1,
      pin: existing?.pin ?? inputPin,
    }));

    const remainingQuota = Math.max(0, config.maxQuota - finalUserData.usage);
    return NextResponse.json({ imageUrl, remainingQuota });
  } catch (err: unknown) {
    if (err instanceof Error) {
      logger.error('Error generating image:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
```

- [ ] **Step 5: generate/route.ts 교체**

```ts
// src/app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { generateImageWithRetry } from '@/services/aiService';
import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';

export async function POST(request: Request) {
  try {
    const { prompt, user } = await request.json();

    if (!prompt || !user) {
      return NextResponse.json({ error: 'Missing prompt or user' }, { status: 400 });
    }

    return handleGenerateRequest(user.nickname, user.pin, (config) =>
      generateImageWithRetry(buildAugmentedPrompt(prompt, config))
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
```

- [ ] **Step 6: generate-with-image/route.ts 교체**

```ts
// src/app/api/generate-with-image/route.ts
import { NextResponse } from 'next/server';
import { generateMultimodalWithRetry } from '@/services/aiService';
import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';

export async function POST(request: Request) {
  try {
    const { prompt, user, referenceImageBase64, referenceMimeType } = await request.json();

    if (!prompt || !user || !referenceImageBase64) {
      return NextResponse.json({ error: 'Missing prompt, user, or reference image' }, { status: 400 });
    }

    return handleGenerateRequest(user.nickname, user.pin, (config) =>
      generateMultimodalWithRetry(buildAugmentedPrompt(prompt, config), referenceImageBase64, referenceMimeType)
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
npm run test:run -- src/__tests__/lib/generateHelpers.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 8: 커밋**

```bash
git add src/lib/imageStore.ts src/lib/generateHelpers.ts \
  src/app/api/generate/route.ts src/app/api/generate-with-image/route.ts \
  src/__tests__/lib/generateHelpers.test.ts
git commit -m "feat: extract common generate handler, save images to GCS"
```

---

## Task 11: useUser 훅 + 페이지 업데이트

**Files:**
- Create: `src/hooks/useUser.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/photo/page.tsx`

- [ ] **Step 1: useUser.ts 생성**

```ts
// src/hooks/useUser.ts
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { QUOTA_POLL_INTERVAL, DEFAULT_QUOTA } from '@/lib/constants';

export interface User {
  nickname: string;
  pin: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { data: quotaData, mutate } = useSWR(
    user ? `/api/quota?nickname=${encodeURIComponent(user.nickname)}` : null,
    fetcher,
    { refreshInterval: QUOTA_POLL_INTERVAL }
  );

  const currentQuota: number = quotaData?.remainingQuota ?? DEFAULT_QUOTA;

  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('banana_studio_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('banana_studio_user');
      }
    }
  }, []);

  const handleLogin = async (nickname: string, pin: string): Promise<void> => {
    const userData: User = { nickname, pin };
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '로그인에 실패했습니다.');
    }
    setUser(userData);
    localStorage.setItem('banana_studio_user', JSON.stringify(userData));
    mutate();
  };

  const handleLogout = (): void => {
    setUser(null);
    localStorage.removeItem('banana_studio_user');
  };

  return { user, currentQuota, isMounted, handleLogin, handleLogout };
}
```

- [ ] **Step 2: page.tsx 교체**

```tsx
// src/app/page.tsx
'use client';

import { useToast } from '@/components/ui/ToastContext';
import Login from '@/components/Login';
import Studio from '@/components/Studio';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function Home() {
  const { user, currentQuota, isMounted, handleLogin, handleLogout } = useUser();
  const { showToast } = useToast();

  const handleLoginWithFeedback = async (nickname: string, pin: string) => {
    try {
      await handleLogin(nickname, pin);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : '로그인에 실패했습니다.', 'error');
    }
  };

  const handleGenerate = async (prompt: string): Promise<{ imageUrl: string; remainingQuota: number }> => {
    if (!user) throw new Error('Not logged in');
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate image');
    return { imageUrl: data.imageUrl, remainingQuota: data.remainingQuota };
  };

  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">마법을 준비하는 중... 🪄</div>;
  }

  return (
    <div className="w-full flex justify-center">
      {!user ? (
        <Login onLogin={handleLoginWithFeedback} />
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="mb-4 w-full max-w-2xl flex justify-between items-center px-4">
            <button
              onClick={handleLogout}
              className="text-sm font-normal text-gray-500 underline hover:text-gray-700 transition"
            >
              (로그아웃)
            </button>
            <Link href="/photo" className="text-gray-500 hover:text-green-600 font-bold underline transition">
              마법 사진관으로 가기 📸 →
            </Link>
          </div>
          <div className="mb-6 text-green-700 font-extrabold text-2xl drop-shadow-sm flex items-center justify-center">
            환영합니다, <span className="text-blue-600 mx-2 text-3xl">{user.nickname}</span>님! ✨
          </div>
          <Studio onGenerate={handleGenerate} initialQuota={currentQuota} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: photo/page.tsx 교체**

```tsx
// src/app/photo/page.tsx
'use client';

import { useToast } from '@/components/ui/ToastContext';
import Login from '@/components/Login';
import PhotoStudio from '@/components/PhotoStudio';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export default function PhotoPage() {
  const { user, currentQuota, isMounted, handleLogin, handleLogout } = useUser();
  const { showToast } = useToast();

  const handleLoginWithFeedback = async (nickname: string, pin: string) => {
    try {
      await handleLogin(nickname, pin);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : '로그인에 실패했습니다.', 'error');
    }
  };

  const handleGenerate = async (
    prompt: string,
    referenceImageBase64: string,
    referenceMimeType: string
  ): Promise<{ imageUrl: string; remainingQuota: number }> => {
    if (!user) throw new Error('Not logged in');
    const response = await fetch('/api/generate-with-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, user, referenceImageBase64, referenceMimeType }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate image');
    return { imageUrl: data.imageUrl, remainingQuota: data.remainingQuota };
  };

  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">마법을 준비하는 중... 🪄</div>;
  }

  return (
    <div className="w-full flex justify-center">
      {!user ? (
        <div className="flex flex-col items-center">
          <Login onLogin={handleLoginWithFeedback} />
          <Link href="/" className="mt-6 text-gray-500 hover:text-green-600 font-bold underline transition">
            ← 기본 스튜디오로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="mb-4 w-full max-w-2xl flex justify-between items-center px-4">
            <Link href="/" className="text-gray-500 hover:text-green-600 font-bold underline transition">
              ← 텍스트로만 그리기
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-normal text-gray-500 underline hover:text-gray-700 transition"
            >
              (로그아웃)
            </button>
          </div>
          <div className="mb-2 text-blue-700 font-extrabold text-2xl drop-shadow-sm flex items-center justify-center">
            <span className="text-green-600 mx-2 text-3xl">{user.nickname}</span>의 마법 사진관 🖼️
          </div>
          <PhotoStudio onGenerate={handleGenerate} initialQuota={currentQuota} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useUser.ts src/app/page.tsx src/app/photo/page.tsx
git commit -m "refactor: extract useUser hook, remove duplicated auth logic from pages"
```

---

## Task 12: Toast + ConfirmModal UI 컴포넌트

**Files:**
- Create: `src/components/ui/ToastContext.tsx`
- Create: `src/components/ui/Toast.tsx`
- Create: `src/components/ui/ConfirmModal.tsx`

- [ ] **Step 1: ToastContext.tsx 생성**

```tsx
// src/components/ui/ToastContext.tsx
'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

- [ ] **Step 2: Toast.tsx 생성**

```tsx
// src/components/ui/Toast.tsx
'use client';

import { useToast } from './ToastContext';

export function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-6 py-3 rounded-xl shadow-lg text-white font-bold flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-blue-500'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-70 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: ConfirmModal.tsx 생성**

```tsx
// src/components/ui/ConfirmModal.tsx
'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface ConfirmContextValue {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    setState({ message, visible: true });
    return new Promise<boolean>((res) => {
      resolverRef.current = res;
    });
  }, []);

  const handleChoice = (value: boolean) => {
    setState((s) => ({ ...s, visible: false }));
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <p className="text-lg font-bold mb-6 text-gray-800">{state.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleChoice(false)}
                className="px-6 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 transition"
              >
                취소
              </button>
              <button
                onClick={() => handleChoice(true)}
                className="px-6 py-2 rounded-xl bg-red-500 hover:bg-red-600 font-bold text-white transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
```

- [ ] **Step 4: layout.tsx에 Provider 추가**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastContext';
import { Toast } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmModal';

export const metadata: Metadata = {
  title: '마법의 그림 스튜디오',
  description: '내가 적은 대로 그림이 짜잔!',
  icons: { icon: '/magic-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <header className="bg-white p-4 shadow-md text-center flex items-center justify-center gap-3">
              <Image
                src="/magic-icon.png"
                alt="마법의 그림 스튜디오 아이콘"
                width={48}
                height={48}
                className="rounded-xl shadow-sm"
              />
              <h1 className="text-3xl font-bold text-green-600">마법의 그림 스튜디오</h1>
            </header>
            <main className="flex-grow flex items-center justify-center p-4">
              {children}
            </main>
            <Toast />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Studio.tsx — alert() → Toast로 교체**

```tsx
/* eslint-disable @next/next/no-img-element */
// src/components/Studio.tsx
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastContext';
import { DEFAULT_QUOTA } from '@/lib/constants';

interface StudioProps {
  onGenerate: (prompt: string) => Promise<{ imageUrl: string; remainingQuota: number }>;
  initialQuota?: number;
}

export default function Studio({ onGenerate, initialQuota = DEFAULT_QUOTA }: StudioProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quota, setQuota] = useState<number>(initialQuota);
  const { showToast } = useToast();

  useEffect(() => {
    setQuota(initialQuota);
  }, [initialQuota]);

  const handleGenerate = async () => {
    if (!prompt.trim() || quota <= 0) return;
    setIsLoading(true);
    setImageUrl(null);
    try {
      const result = await onGenerate(prompt);
      setImageUrl(result.imageUrl);
      if (result.remainingQuota !== undefined) setQuota(result.remainingQuota);
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? `그림을 그리는 중 문제가 생겼어요: ${error.message}` : '그림을 그리는 중 알 수 없는 문제가 생겼어요.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-center flex-grow">어떤 그림을 그릴까요?</h2>
      </div>
      <div className="w-full text-right mb-2">
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${quota > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          🪄 남은 마법: {quota}번
        </span>
      </div>
      <textarea
        className="input-primary h-32 resize-none mb-6"
        placeholder="예: 우주에서 자전거를 타는 고양이..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading || quota <= 0}
      />
      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim() || quota <= 0}
        className={`btn-primary w-full mb-8 ${isLoading || quota <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {quota <= 0 ? '오늘의 마법을 다 썼어요 🌙' : '그림 만들기! 🪄'}
      </button>
      {isLoading && (
        <div className="my-8 flex flex-col items-center justify-center animate-pulse">
          <div className="text-6xl animate-bounce mb-4">🪄✨</div>
          <p className="text-xl font-bold text-green-600">마법의 물감을 섞고 있어요...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요!</p>
        </div>
      )}
      {imageUrl && !isLoading && (
        <div className="mt-4 w-full flex flex-col items-center">
          <img src={imageUrl} alt="생성된 그림" className="rounded-xl shadow-lg max-w-full h-auto object-contain border-4 border-yellow-300" />
          <a href={imageUrl} download="my_magic_picture.png" className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full">
            💾 내 컴퓨터에 저장하기
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: PhotoStudio.tsx — alert() → Toast로 교체**

`src/components/PhotoStudio.tsx`에서 다음 두 부분을 수정:

상단에 추가:
```tsx
import { useToast } from '@/components/ui/ToastContext';
import { DEFAULT_QUOTA } from '@/lib/constants';
```

`initialQuota = 20` → `initialQuota = DEFAULT_QUOTA`로 변경.

컴포넌트 본문 시작 부분에 추가:
```tsx
const { showToast } = useToast();
```

`handleGenerate`의 catch 블록 교체:
```tsx
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? `그림을 그리는 중 문제가 생겼어요: ${error.message}`
          : '그림을 그리는 중 알 수 없는 문제가 생겼어요.',
        'error'
      );
    }
```

- [ ] **Step 7: 커밋**

```bash
git add src/components/ui/ src/app/layout.tsx \
  src/components/Studio.tsx src/components/PhotoStudio.tsx
git commit -m "feat: add Toast and ConfirmModal UI components, replace alert() calls"
```

---

## Task 13: Admin 페이지 컴포넌트 분리 + 데드코드 제거

**Files:**
- Create: `src/components/admin/AdminLogin.tsx`
- Create: `src/components/admin/AdminSettings.tsx`
- Create: `src/components/admin/AdminStudentTable.tsx`
- Modify: `src/app/admin/page.tsx`
- Delete: `src/app/api/admin/quotas/update/route.ts`

- [ ] **Step 1: AdminLogin.tsx 생성**

```tsx
// src/components/admin/AdminLogin.tsx
'use client';

interface AdminLoginProps {
  onLogin: (e: React.FormEvent) => void;
  adminId: string;
  adminPassword: string;
  onAdminIdChange: (v: string) => void;
  onAdminPasswordChange: (v: string) => void;
}

export default function AdminLogin({
  onLogin,
  adminId,
  adminPassword,
  onAdminIdChange,
  onAdminPasswordChange,
}: AdminLoginProps) {
  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-3xl shadow-xl mt-16 text-center">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">👨‍🏫 선생님 로그인</h2>
      <form onSubmit={onLogin} className="space-y-4">
        <input
          type="text"
          placeholder="아이디"
          className="input-primary"
          value={adminId}
          onChange={(e) => onAdminIdChange(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          className="input-primary"
          value={adminPassword}
          onChange={(e) => onAdminPasswordChange(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary w-full mt-4">로그인</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: AdminSettings.tsx 생성**

```tsx
// src/components/admin/AdminSettings.tsx
'use client';

interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

interface AdminSettingsProps {
  config: GlobalConfig;
  onSettingChange: (field: 'maxQuota' | 'resolution', value: string | number) => void;
}

export default function AdminSettings({ config, onSettingChange }: AdminSettingsProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ 전체 학생 공통 설정</h2>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col flex-1">
          <label className="font-semibold text-gray-700 mb-2">마법 한도 (하루)</label>
          <select
            className="border rounded-lg p-2 text-md bg-white shadow-sm"
            value={config.maxQuota}
            onChange={(e) => onSettingChange('maxQuota', Number(e.target.value))}
          >
            {[1, 5, 10, 20].map((n) => (
              <option key={n} value={n}>{n}번</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1">
          <label className="font-semibold text-gray-700 mb-2">그림 화질</label>
          <select
            className="border rounded-lg p-2 text-md bg-white shadow-sm"
            value={config.resolution}
            onChange={(e) => onSettingChange('resolution', e.target.value)}
          >
            <option value="1024">고화질 (1k)</option>
            <option value="512">저화질 (0.5k)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: AdminStudentTable.tsx 생성**

```tsx
// src/components/admin/AdminStudentTable.tsx
'use client';

interface QuotaData {
  nickname: string;
  usage: number;
  remaining: number;
}

interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

interface AdminStudentTableProps {
  quotas: QuotaData[];
  config: GlobalConfig;
  isLoading: boolean;
  onReset: (nickname: string, amount: number, action: 'RESET' | 'ADD') => void;
  onDelete: (nickname: string) => void;
}

export default function AdminStudentTable({
  quotas,
  config,
  isLoading,
  onReset,
  onDelete,
}: AdminStudentTableProps) {
  if (isLoading && quotas.length === 0) {
    return <div className="text-center text-gray-500 py-10">데이터를 불러오는 중입니다...</div>;
  }
  if (quotas.length === 0) {
    return <div className="text-center text-gray-500 py-10">아직 마법을 사용한 학생이 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="p-4 rounded-tl-xl font-bold">학생 이름 (별명)</th>
            <th className="p-4 font-bold">사용 횟수</th>
            <th className="p-4 font-bold">남은 횟수</th>
            <th className="p-4 rounded-tr-xl text-right font-bold">관리</th>
          </tr>
        </thead>
        <tbody>
          {quotas.map((q, i) => (
            <tr key={i} className="border-b hover:bg-gray-50 transition">
              <td className="p-4 font-bold text-lg text-blue-600">{q.nickname}</td>
              <td className="p-4">
                <div className="w-full bg-gray-200 rounded-full h-4 max-w-[200px] shadow-inner">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${q.remaining <= 5 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (q.usage / config.maxQuota) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-500 mt-1 inline-block">
                  {q.usage} / {config.maxQuota}
                </span>
              </td>
              <td className="p-4">
                <span className={`font-bold px-3 py-1 rounded-full text-sm shadow-sm ${q.remaining <= 5 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                  {q.remaining}번
                </span>
              </td>
              <td className="p-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onReset(q.nickname, 5, 'ADD')}
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-yellow-200"
                  >
                    5번 충전 ⚡
                  </button>
                  <button
                    onClick={() => onReset(q.nickname, 20, 'RESET')}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-blue-200"
                  >
                    가득 충전 🔋
                  </button>
                  <button
                    onClick={() => onDelete(q.nickname)}
                    className="bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-500 font-semibold py-2 px-3 rounded-lg text-sm transition shadow-sm border border-gray-200 hover:border-red-200"
                  >
                    삭제 🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: admin/page.tsx 전체 교체**

```tsx
// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminStudentTable from '@/components/admin/AdminStudentTable';
import { useToast } from '@/components/ui/ToastContext';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { DEFAULT_QUOTA } from '@/lib/constants';

interface QuotaData {
  nickname: string;
  usage: number;
  remaining: number;
}

interface GlobalConfig {
  maxQuota: number;
  resolution: '512' | '1024';
}

export default function AdminDashboard() {
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ maxQuota: DEFAULT_QUOTA, resolution: '1024' });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();

  const fetchQuotas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quotas');
      if (res.status === 401) { setIsAuthenticated(false); setIsLoading(false); return; }
      setIsAuthenticated(true);
      const data = await res.json();
      setQuotas(data.quotas || []);
      if (data.config) setGlobalConfig(data.config);
    } catch {
      showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminId, password: adminPassword }),
      });
      if (res.ok) { setIsAuthenticated(true); fetchQuotas(); }
      else showToast('관리자 아이디 또는 비밀번호가 틀렸습니다.', 'error');
    } catch {
      showToast('로그인 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  useEffect(() => {
    fetchQuotas();
    const interval = setInterval(() => { if (isAuthenticated) fetchQuotas(); }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchQuotas]);

  const handleGlobalSettingChange = async (field: 'maxQuota' | 'resolution', value: string | number) => {
    const newConfig = { ...globalConfig, [field]: value };
    setGlobalConfig(newConfig);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) { showToast('설정 변경에 실패했습니다.', 'error'); fetchQuotas(); }
    } catch {
      showToast('설정 변경 중 오류가 발생했습니다.', 'error');
      fetchQuotas();
    }
  };

  const handleReset = async (nickname: string, amount: number, actionType: 'RESET' | 'ADD' = 'RESET') => {
    const msg = actionType === 'RESET'
      ? nickname === 'ALL'
        ? `모든 학생의 마법 횟수를 ${amount}번으로 초기화하시겠습니까?`
        : `[${nickname}] 학생의 횟수를 ${amount}번으로 설정하시겠습니까?`
      : `[${nickname}] 학생에게 마법 횟수 ${amount}번을 충전하시겠습니까?`;

    if (!(await confirm(msg))) return;

    try {
      const res = await fetch('/api/admin/quotas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, action: actionType, amount }),
      });
      if (res.ok) { fetchQuotas(); showToast('완료되었습니다.', 'success'); }
      else showToast('충전에 실패했습니다.', 'error');
    } catch {
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (nickname: string) => {
    if (!(await confirm(`정말로 [${nickname}] 학생 정보를 완전히 삭제하시겠습니까?`))) return;
    try {
      const res = await fetch('/api/admin/quotas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, action: 'DELETE' }),
      });
      if (res.ok) { fetchQuotas(); showToast(`${nickname} 학생이 삭제되었습니다.`, 'success'); }
      else showToast('삭제에 실패했습니다.', 'error');
    } catch {
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        adminId={adminId}
        adminPassword={adminPassword}
        onAdminIdChange={setAdminId}
        onAdminPasswordChange={setAdminPassword}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white rounded-3xl shadow-xl mt-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">👨‍🏫 선생님 관리자 화면</h1>
        <button
          onClick={() => handleReset('ALL', globalConfig.maxQuota)}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition shadow-md"
        >
          전체 횟수 초기화 🔄
        </button>
      </div>
      <AdminSettings config={globalConfig} onSettingChange={handleGlobalSettingChange} />
      <AdminStudentTable
        quotas={quotas}
        config={globalConfig}
        isLoading={isLoading}
        onReset={handleReset}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 5: 데드코드 삭제**

```bash
rm src/app/api/admin/quotas/update/route.ts
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/admin/ src/app/admin/page.tsx
git rm src/app/api/admin/quotas/update/route.ts
git commit -m "refactor: split admin page into components, replace confirm() with modal"
```

---

## Task 14: 나머지 테스트 파일 작성

**Files:**
- Create: `src/__tests__/api/admin/login.test.ts`
- Create: `src/__tests__/api/admin/config.test.ts`
- Create: `src/__tests__/api/admin/reset.test.ts`
- Create: `src/__tests__/api/quota.test.ts`
- Create: `src/__tests__/hooks/useUser.test.ts`
- Create: `src/__tests__/components/Login.test.tsx`
- Create: `src/__tests__/components/Studio.test.tsx`

- [ ] **Step 1: admin/login.test.ts 작성**

```ts
// src/__tests__/api/admin/login.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: mockSet }),
}));

describe('POST /api/admin/login', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { process.env = { ...originalEnv }; vi.resetModules(); });

  it('returns 500 when ADMIN_ID env not set', async () => {
    delete process.env.ADMIN_ID;
    delete process.env.ADMIN_PASSWORD;
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'admin', password: 'admin' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 200 with correct credentials', async () => {
    process.env.ADMIN_ID = 'teacher';
    process.env.ADMIN_PASSWORD = 'secret123';
    vi.resetModules();
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'teacher', password: 'secret123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith('admin_session', 'true', expect.objectContaining({ httpOnly: true }));
  });

  it('returns 401 with wrong credentials', async () => {
    process.env.ADMIN_ID = 'teacher';
    process.env.ADMIN_PASSWORD = 'secret123';
    vi.resetModules();
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'wrong', password: 'wrong' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: admin/config.test.ts 작성**

```ts
// src/__tests__/api/admin/config.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/adminAuth', () => ({ isAdminAuthenticated: vi.fn() }));
vi.mock('@/lib/quotaStore', () => ({
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

import { GET, POST } from '@/app/api/admin/config/route';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { getConfig, saveConfig } from '@/lib/quotaStore';

const mockIsAdmin = vi.mocked(isAdminAuthenticated);

describe('GET /api/admin/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns config when authenticated', async () => {
    mockIsAdmin.mockResolvedValue(true);
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });
    const res = await GET();
    const data = await res.json();
    expect(data.maxQuota).toBe(10);
  });
});

describe('POST /api/admin/config', () => {
  it('saves config when authenticated', async () => {
    mockIsAdmin.mockResolvedValue(true);
    vi.mocked(saveConfig).mockResolvedValue();
    const req = new Request('http://localhost/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxQuota: 5, resolution: '512' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(saveConfig).toHaveBeenCalledWith({ maxQuota: 5, resolution: '512' });
  });
});
```

- [ ] **Step 3: admin/reset.test.ts 작성**

```ts
// src/__tests__/api/admin/reset.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/adminAuth', () => ({ isAdminAuthenticated: vi.fn() }));
vi.mock('@/lib/quotaStore', () => ({
  updateAllQuotasSafely: vi.fn(),
  getConfig: vi.fn(),
}));

import { POST } from '@/app/api/admin/quotas/reset/route';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { updateAllQuotasSafely, getConfig } from '@/lib/quotaStore';

const mockIsAdmin = vi.mocked(isAdminAuthenticated);

function makeRequest(body: object) {
  return new Request('http://localhost/api/admin/quotas/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/quotas/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 20, resolution: '1024' });
    vi.mocked(updateAllQuotasSafely).mockImplementation(async (fn) => { fn({}); });
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makeRequest({ nickname: 'alice' }));
    expect(res.status).toBe(401);
  });

  it('resets all quotas when nickname is ALL', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makeRequest({ nickname: 'ALL', amount: 20 }));
    expect(res.status).toBe(200);
    expect(updateAllQuotasSafely).toHaveBeenCalled();
  });

  it('deletes student when action is DELETE', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const quotas = { alice: { usage: 5, pin: 'hash' } };
    vi.mocked(updateAllQuotasSafely).mockImplementation(async (fn) => { fn(quotas); });

    const res = await POST(makeRequest({ nickname: 'alice', action: 'DELETE' }));
    expect(res.status).toBe(200);
  });

  it('adds quota when action is ADD', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makeRequest({ nickname: 'alice', action: 'ADD', amount: 5 }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 4: quota.test.ts 작성**

```ts
// src/__tests__/api/quota.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  getConfig: vi.fn(),
}));

import { GET } from '@/app/api/quota/route';
import { getQuotas, getConfig } from '@/lib/quotaStore';

describe('GET /api/quota', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when nickname missing', async () => {
    const req = new Request('http://localhost/api/quota');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns remainingQuota for known user', async () => {
    vi.mocked(getQuotas).mockResolvedValue({ alice: { usage: 3, pin: 'hash' } });
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const req = new Request('http://localhost/api/quota?nickname=alice');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.remainingQuota).toBe(7);
  });

  it('returns maxQuota for unknown user', async () => {
    vi.mocked(getQuotas).mockResolvedValue({});
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const req = new Request('http://localhost/api/quota?nickname=unknown');
    const res = await GET(req);
    const data = await res.json();

    expect(data.remainingQuota).toBe(10);
  });
});
```

- [ ] **Step 5: hooks/useUser.test.ts 작성**

```ts
// src/__tests__/hooks/useUser.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUser } from '@/hooks/useUser';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('swr', () => ({
  default: vi.fn().mockReturnValue({ data: { remainingQuota: 15 }, mutate: vi.fn() }),
}));

describe('useUser', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('restores user from localStorage on mount', async () => {
    localStorageMock.setItem('banana_studio_user', JSON.stringify({ nickname: 'alice', pin: '1234' }));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    expect(result.current.user?.nickname).toBe('alice');
  });

  it('starts with null user when localStorage is empty', async () => {
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    expect(result.current.user).toBeNull();
  });

  it('handleLogout clears user and localStorage', async () => {
    localStorageMock.setItem('banana_studio_user', JSON.stringify({ nickname: 'alice', pin: '1234' }));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.user).not.toBeNull());
    act(() => result.current.handleLogout());
    expect(result.current.user).toBeNull();
    expect(localStorageMock.getItem('banana_studio_user')).toBeNull();
  });

  it('handleLogin saves user on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    await act(async () => { await result.current.handleLogin('bob', '5678'); });
    expect(result.current.user?.nickname).toBe('bob');
    expect(localStorageMock.getItem('banana_studio_user')).toContain('bob');
  });

  it('handleLogin throws on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: '잘못된 PIN' }) });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    await expect(act(async () => { await result.current.handleLogin('bob', 'wrong'); })).rejects.toThrow('잘못된 PIN');
  });
});
```

- [ ] **Step 6: components/Login.test.tsx 작성**

```tsx
// src/__tests__/components/Login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '@/components/Login';

describe('Login component', () => {
  it('renders nickname and pin inputs', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('나의 멋진 별명')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호 4자리 (숫자)')).toBeInTheDocument();
  });

  it('calls onLogin with trimmed nickname and pin', () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('나의 멋진 별명'), { target: { value: ' alice ' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 4자리 (숫자)'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('시작하기! 🚀'));
    expect(onLogin).toHaveBeenCalledWith('alice', '1234');
  });

  it('does not call onLogin with short pin', () => {
    const onLogin = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('나의 멋진 별명'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 4자리 (숫자)'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('시작하기! 🚀'));
    expect(onLogin).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: components/Studio.test.tsx 작성**

```tsx
// src/__tests__/components/Studio.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Studio from '@/components/Studio';
import { ToastProvider } from '@/components/ui/ToastContext';

function renderStudio(props = {}) {
  return render(
    <ToastProvider>
      <Studio onGenerate={vi.fn()} {...props} />
    </ToastProvider>
  );
}

describe('Studio component', () => {
  it('renders remaining quota', () => {
    renderStudio({ initialQuota: 7 });
    expect(screen.getByText('🪄 남은 마법: 7번')).toBeInTheDocument();
  });

  it('disables button when quota is 0', () => {
    renderStudio({ initialQuota: 0 });
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('오늘의 마법을 다 썼어요 🌙');
  });

  it('shows red badge when quota <= 5', () => {
    renderStudio({ initialQuota: 3 });
    const badge = screen.getByText('🪄 남은 마법: 3번');
    expect(badge.className).toContain('bg-red-100');
  });

  it('shows green badge when quota > 5', () => {
    renderStudio({ initialQuota: 10 });
    const badge = screen.getByText('🪄 남은 마법: 10번');
    expect(badge.className).toContain('bg-green-100');
  });
});
```

- [ ] **Step 8: 모든 테스트 실행**

```bash
npm run test:run
```

Expected: 모든 테스트 PASS

- [ ] **Step 9: 커밋**

```bash
git add src/__tests__/
git commit -m "test: add comprehensive test suite for all modules"
```

---

## Task 15: 커버리지 확인 및 마무리

- [ ] **Step 1: 커버리지 측정**

```bash
npm run test:coverage
```

Expected output (text):
```
Coverage report:
  Statements: 80%+
  Branches:   70%+
  Functions:  80%+
  Lines:      80%+
```

- [ ] **Step 2: quota/route.ts logger 추가 (미처리 console.log 정리)**

`src/app/api/quota/route.ts`에서 기존 파일을 교체:

```ts
// src/app/api/quota/route.ts
import { NextResponse } from 'next/server';
import { getQuotas, getConfig } from '@/lib/quotaStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get('nickname');

  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
  }

  const quotas = await getQuotas();
  const config = await getConfig();
  const userData = quotas[nickname];

  const usage = userData ? userData.usage : 0;
  const remainingQuota = Math.max(0, config.maxQuota - usage);

  return NextResponse.json({ remainingQuota });
}
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공 (에러 없음)

- [ ] **Step 4: 최종 커밋**

```bash
git add src/app/api/quota/route.ts
git commit -m "test: verify 80%+ coverage, fix remaining console.log references"
```

---

## 자체 검토

**스펙 커버리지:**
- [x] P0: PIN 해싱 (Task 5, 6), admin env 필수화 (Task 4), 세션 공통화 (Task 3), admin PIN 제거 (Task 7)
- [x] P1: GCS 조건부 쓰기 (Task 8), useUser 훅 (Task 11), 공통 핸들러 (Task 10), 이미지 GCS 저장 (Task 10)
- [x] P2: 상수 (Task 2), logger (Task 2), admin 분리 (Task 13), Toast/Confirm (Task 12), 데드코드 제거 (Task 13)
- [x] P3: Vitest 설정 (Task 1), 모든 테스트 파일 (Task 5~14), 커버리지 확인 (Task 15)

**타입 일관성:**
- `GeneratedImage { base64, mimeType }` — aiService.ts에서 정의, imageStore.ts, generateHelpers.ts에서 사용
- `handleGenerateRequest(userId, inputPin, generateFn)` — generateHelpers.ts에서 정의, 두 route에서 사용
- `useUser()` 반환 타입 — User 인터페이스 포함, 두 페이지에서 동일하게 사용

**플레이스홀더:** 없음 — 모든 코드 블록 완성
