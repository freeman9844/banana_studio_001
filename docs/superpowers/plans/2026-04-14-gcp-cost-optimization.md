# GCP 비용 최적화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GCS 불필요 이미지 저장 제거, Config 인메모리 캐시 적용, Cloud Run 리소스 상한 설정, Artifact Registry 클린업 정책 추가

**Architecture:** imageStore.ts 삭제 후 generateHelpers.ts에서 base64 data URL 직접 반환. quotaStore.ts에 60초 TTL 캐시 추가로 GCS config 읽기 최소화. deploy.sh에 명시적 Cloud Run 플래그와 Artifact Registry 클린업 블록 추가.

**Tech Stack:** Next.js App Router, @google-cloud/storage, Vitest, gcloud CLI

---

## 파일 맵

| 파일 | 변경 |
|------|------|
| `src/lib/generateHelpers.ts` | 수정 — saveImageToGcs 호출 제거, base64 data URL 인라인 반환 |
| `src/lib/imageStore.ts` | **삭제** |
| `src/__tests__/lib/imageStore.test.ts` | **삭제** |
| `src/__tests__/lib/generateHelpers.test.ts` | 수정 — imageStore 모킹 제거, data URL 반환 검증으로 교체 |
| `src/lib/quotaStore.ts` | 수정 — Config 캐시 변수 + TTL 로직 추가 |
| `src/__tests__/lib/quotaStore.test.ts` | 수정 — 캐시 동작 테스트 추가 |
| `deploy.sh` | 수정 — Cloud Run 플래그 추가, Artifact Registry 클린업 블록 추가 |

---

## Task 1: GCS 이미지 저장 제거

**Files:**
- Modify: `src/__tests__/lib/generateHelpers.test.ts`
- Modify: `src/lib/generateHelpers.ts`
- Delete: `src/lib/imageStore.ts`
- Delete: `src/__tests__/lib/imageStore.test.ts`

### 배경

현재 `generateHelpers.ts:27`에서 `saveImageToGcs(base64, mimeType, userId)`를 호출하여 GCS에 이미지를 업로드하고 Signed URL을 반환한다. 히스토리 기능이 없으므로 이 저장은 불필요하다. 제거 후 `data:${mimeType};base64,${base64}` 형태의 data URL을 직접 반환한다. 클라이언트는 이미 data URL을 처리할 수 있다(imageStore.ts의 fallback과 동일한 포맷).

- [ ] **Step 1: generateHelpers 테스트를 수정 — imageStore 모킹 제거 및 data URL 검증으로 교체**

`src/__tests__/lib/generateHelpers.test.ts`를 아래 내용으로 교체:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/quotaStore', () => ({
  updateQuotaSafely: vi.fn(),
}));
vi.mock('@/lib/quotaHelpers', () => ({
  validateUserQuota: vi.fn(),
}));

import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';
import { validateUserQuota } from '@/lib/quotaHelpers';
import { updateQuotaSafely } from '@/lib/quotaStore';

const mockValidate = vi.mocked(validateUserQuota);
const mockUpdateQuota = vi.mocked(updateQuotaSafely);

describe('handleGenerateRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 on validation failure', async () => {
    mockValidate.mockResolvedValue({
      error: '등록되지 않은 사용자입니다.',
      status: 401,
      userData: undefined,
      config: undefined,
    });

    const res = await handleGenerateRequest('alice', '1234', vi.fn());
    expect(res.status).toBe(401);
  });

  it('generates image and returns base64 data URL directly', async () => {
    mockValidate.mockResolvedValue({
      error: null,
      status: undefined,
      userData: { usage: 2, pin: 'hash' },
      config: { maxQuota: 10, resolution: '1024' },
    });
    mockUpdateQuota.mockResolvedValue({ usage: 3, pin: 'hash' });

    const generateFn = vi.fn().mockResolvedValue({ base64: 'abc123', mimeType: 'image/png' });
    const res = await handleGenerateRequest('alice', '1234', generateFn);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imageUrl).toBe('data:image/png;base64,abc123');
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
npx vitest run src/__tests__/lib/generateHelpers.test.ts
```

예상 결과: `generates image and returns base64 data URL directly` 테스트 FAIL (`data.imageUrl`이 GCS URL이거나 undefined)

- [ ] **Step 3: generateHelpers.ts 수정 — saveImageToGcs 제거, data URL 인라인 반환**

`src/lib/generateHelpers.ts`를 아래 내용으로 교체:

```typescript
import { NextResponse } from 'next/server';
import { updateQuotaSafely, GlobalConfig } from '@/lib/quotaStore';
import { validateUserQuota } from '@/lib/quotaHelpers';
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
    const imageUrl = `data:${mimeType};base64,${base64}`;

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

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/__tests__/lib/generateHelpers.test.ts
```

예상 결과: 모든 테스트 PASS

- [ ] **Step 5: imageStore 파일 삭제**

```bash
rm src/lib/imageStore.ts
rm src/__tests__/lib/imageStore.test.ts
```

- [ ] **Step 6: 전체 테스트 실행 — 회귀 없음 확인**

```bash
npx vitest run
```

예상 결과: 모든 테스트 PASS (imageStore 관련 테스트 제외하고 기존 테스트 모두 통과)

- [ ] **Step 7: 커밋**

```bash
git add src/lib/generateHelpers.ts src/__tests__/lib/generateHelpers.test.ts
git rm src/lib/imageStore.ts src/__tests__/lib/imageStore.test.ts
git commit -m "refactor: remove GCS image storage, return base64 data URL directly"
```

---

## Task 2: Config 인메모리 캐시

**Files:**
- Modify: `src/__tests__/lib/quotaStore.test.ts`
- Modify: `src/lib/quotaStore.ts`

### 배경

`getConfig()`는 매 호출마다 파일 읽기 또는 GCS 조회를 수행한다. `/api/quota`가 SWR 폴링(30초)으로 자주 호출되므로 Config 읽기가 불필요하게 반복된다. Config는 관리자가 변경하는 값으로, 1분 TTL 캐시를 적용해도 UX에 영향이 없다. `saveConfig()` 호출 시 캐시를 무효화하여 변경 즉시 반영을 보장한다.

- [ ] **Step 1: quotaStore 캐시 테스트 추가**

`src/__tests__/lib/quotaStore.test.ts` 파일 끝에 아래 describe 블록을 추가:

```typescript
describe('quotaStore — config cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  it('returns cached config on second call within TTL', async () => {
    const configData = JSON.stringify({ maxQuota: 5, resolution: '512' });
    mockReadFile.mockResolvedValue(configData);

    const { getConfig } = await import('@/lib/quotaStore');
    const result1 = await getConfig();
    const result2 = await getConfig();

    expect(result1).toEqual({ maxQuota: 5, resolution: '512' });
    expect(result2).toEqual({ maxQuota: 5, resolution: '512' });
    // 두 번 호출했지만 파일 읽기는 한 번만
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache after saveConfig', async () => {
    const configData = JSON.stringify({ maxQuota: 5, resolution: '512' });
    mockReadFile.mockResolvedValue(configData);
    mockWriteFile.mockResolvedValue(undefined);
    mockSave.mockResolvedValue(undefined);

    const { getConfig, saveConfig } = await import('@/lib/quotaStore');
    await getConfig(); // 캐시 채움
    await saveConfig({ maxQuota: 10, resolution: '1024' }); // 캐시 무효화
    await getConfig(); // 재조회

    // saveConfig 후 getConfig가 파일을 다시 읽어야 함
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/__tests__/lib/quotaStore.test.ts
```

예상 결과: 캐시 관련 테스트 2개 FAIL (`mockReadFile`이 2번 이상 호출됨)

- [ ] **Step 3: quotaStore.ts 수정 — 캐시 변수 및 로직 추가**

`src/lib/quotaStore.ts`의 `import` 블록 바로 아래(전역 변수 선언 위치)에 캐시 변수를 추가하고, `getConfig`와 `saveConfig` 함수를 교체:

파일 상단 `const fileMutex = new Mutex();` 직전에 추가:

```typescript
// Config 인메모리 캐시 (TTL: 60초)
let configCache: { data: GlobalConfig; expiresAt: number } | null = null;
const CONFIG_TTL_MS = 60_000;
```

기존 `getConfig` 함수를 아래로 교체:

```typescript
export async function getConfig(): Promise<GlobalConfig> {
  if (configCache && Date.now() < configCache.expiresAt) {
    return configCache.data;
  }
  const defaultFallback: GlobalConfig = { maxQuota: 20, resolution: '1024' };
  const parsed = await readFromFileOrGcs(configFilePath, 'config.json', defaultFallback);
  const data: GlobalConfig = {
    maxQuota: parsed.maxQuota || 20,
    resolution: parsed.resolution || '1024',
  };
  configCache = { data, expiresAt: Date.now() + CONFIG_TTL_MS };
  return data;
}
```

기존 `saveConfig` 함수를 아래로 교체:

```typescript
export async function saveConfig(config: GlobalConfig): Promise<void> {
  configCache = null; // 관리자 변경 시 캐시 즉시 무효화
  await writeToFileAndGcs(configFilePath, 'config.json', config);
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/__tests__/lib/quotaStore.test.ts
```

예상 결과: 모든 테스트 PASS

- [ ] **Step 5: 전체 테스트 실행 — 회귀 없음 확인**

```bash
npx vitest run
```

예상 결과: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/quotaStore.ts src/__tests__/lib/quotaStore.test.ts
git commit -m "perf: add 60s in-memory cache for global config in quotaStore"
```

---

## Task 3: deploy.sh 강화

**Files:**
- Modify: `deploy.sh`

### 배경

`gcloud run deploy`에 리소스 플래그가 없어 Cloud Run 기본값(max-instances=100, timeout=300s 등)으로 배포된다. 학생 30명 규모에 max-instances=100은 사고성 스케일아웃 위험이 있다. 또한 배포할 때마다 Artifact Registry에 이미지가 누적되므로 클린업 정책이 필요하다.

- [ ] **Step 1: deploy.sh의 gcloud run deploy 블록 교체**

`deploy.sh`에서 아래 기존 블록을:

```bash
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET_NAME=$BUCKET_NAME"
```

아래로 교체:

```bash
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --max-instances=3 \
  --min-instances=0 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=10 \
  --timeout=30 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET_NAME=$BUCKET_NAME"
```

- [ ] **Step 2: Artifact Registry 클린업 블록 추가**

`deploy.sh` 파일 끝 `echo "✅ Deployment complete!"` 줄 바로 위에 아래 블록 추가:

```bash
echo "🧹 Configuring Artifact Registry cleanup policy (keep latest 5)..."
gcloud artifacts repositories set-cleanup-policies \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  cloud-run-source-deploy \
  --policy='[{"name":"keep-5","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":5}}]' \
  2>/dev/null || echo "⚠️  Cleanup policy skipped (registry may not exist yet, will apply on next deploy)"
echo "------------------------------------------------------"
```

- [ ] **Step 3: deploy.sh 실행 권한 확인**

```bash
ls -la deploy.sh
```

예상 결과: `-rwxr-xr-x` (실행 권한 있음). 없으면 `chmod +x deploy.sh` 실행.

- [ ] **Step 4: deploy.sh 문법 검증 (dry-run)**

```bash
bash -n deploy.sh && echo "Syntax OK"
```

예상 결과: `Syntax OK`

- [ ] **Step 5: 커밋**

```bash
git add deploy.sh
git commit -m "chore: add Cloud Run resource limits and Artifact Registry cleanup policy"
```

---

## Task 4: 커버리지 검증 및 최종 확인

- [ ] **Step 1: 전체 테스트 커버리지 실행**

```bash
npx vitest run --coverage
```

예상 결과:
- 전체 커버리지 80%+ 유지
- `imageStore` 관련 항목 사라짐
- `quotaStore` 캐시 코드 커버됨

- [ ] **Step 2: 커버리지 확인 항목**

출력에서 아래 항목 확인:
- `lib/generateHelpers.ts` — Lines 90%+ (GCS 호출 제거로 분기 단순화)
- `lib/quotaStore.ts` — Lines 60%+ (캐시 코드 추가로 이전 57% 이상)
- `All files` 행 — Lines 80%+

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

예상 결과: 빌드 성공 (imageStore import 제거 확인)
