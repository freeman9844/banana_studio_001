# GCP 비용 최적화 설계

**날짜:** 2026-04-14
**범위:** GCS 이미지 저장 제거, Config 캐시, Cloud Run 설정 강화, Artifact Registry 클린업
**접근 방식:** Quick Wins (방식 A) — 기존 아키텍처 변경 최소화, 낮은 리스크

---

## 배경

Banana Studio는 학생 10~30명 규모의 소규모 서비스로, Cloud Run + GCS + Vertex AI(Gemini)로 구성된다.
실제 비용의 대부분은 Vertex AI 이미지 생성 API이며 이미 `maxQuota` + 해상도 제어로 관리 중이다.
나머지 GCP 서비스의 불필요한 비용과 잠재적 사고 방지를 위한 Quick Win 최적화를 적용한다.

---

## 1. GCS 이미지 저장 제거

### 문제

`src/lib/imageStore.ts`의 `saveImageToGcs()`는 매 이미지 생성 시:
1. GCS에 이미지 업로드 (Class A 작업 비용)
2. 1시간짜리 Signed URL 발급 (IAM `serviceAccountTokenCreator` 권한 필요)
3. 생성 응답 레이턴시에 GCS 업로드 시간 추가

학생은 이미지를 생성 직후 다운로드하고 끝이며, 히스토리 기능은 불필요하다.
결과적으로 GCS에 이미지가 무한 누적되고 Signed URL 만료 후 접근 불가한 상태가 된다.

### 해결책

`generateHelpers.ts`에서 `saveImageToGcs()` 호출을 제거하고 base64를 직접 반환한다.
클라이언트는 기존과 동일하게 base64 data URL을 수신하므로 UI 변경이 없다.

**변경 파일:**
- `src/lib/generateHelpers.ts` — `saveImageToGcs()` 호출 제거, base64 직접 반환
- `src/lib/imageStore.ts` — 파일 삭제
- `src/__tests__/lib/imageStore.test.ts` — 파일 삭제

**효과:**
- GCS 이미지 업로드 API 호출 제거
- Signed URL 발급 제거 (IAM 권한 단순화)
- 이미지 생성 응답 레이턴시 감소
- GCS `images/` 폴더 누적 중단

---

## 2. Config 인메모리 캐시

### 문제

`getConfig()`는 매 호출마다 로컬 파일 읽기를 시도하고, 파일이 없으면 GCS를 조회한다.
`/api/quota` 엔드포인트는 SWR 폴링(기본 30초)으로 반복 호출되므로, Config 읽기가 불필요하게 자주 발생한다.
Config(maxQuota, resolution)는 관리자가 가끔 변경하는 값으로, 매 요청마다 파일/GCS를 읽을 이유가 없다.

### 해결책

`src/lib/quotaStore.ts`에 모듈 수준 캐시 변수를 추가한다.

```ts
// 모듈 수준 캐시
let configCache: { data: GlobalConfig; expiresAt: number } | null = null;
const CONFIG_TTL_MS = 60_000; // 1분

export async function getConfig(): Promise<GlobalConfig> {
  if (configCache && Date.now() < configCache.expiresAt) {
    return configCache.data;
  }
  const defaultFallback: GlobalConfig = { maxQuota: 20, resolution: '1024' };
  const parsed = await readFromFileOrGcs(configFilePath, 'config.json', defaultFallback);
  const data = { maxQuota: parsed.maxQuota || 20, resolution: parsed.resolution || '1024' };
  configCache = { data, expiresAt: Date.now() + CONFIG_TTL_MS };
  return data;
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  configCache = null; // 관리자 변경 시 즉시 무효화
  await writeToFileAndGcs(configFilePath, 'config.json', config);
}
```

**변경 파일:**
- `src/lib/quotaStore.ts` — 캐시 변수 및 로직 추가

**효과:**
- SWR 폴링이 반복 호출해도 TTL 내에는 메모리에서 즉시 응답
- 관리자가 Config 변경 시 `saveConfig()`에서 캐시 무효화 → 다음 요청에 즉시 갱신
- Cloud Run 인스턴스별 독립 캐시 (소규모 max-instances=3 환경에서 허용)

---

## 3. Cloud Run 설정 강화

### 문제

`deploy.sh`의 `gcloud run deploy`에 리소스 관련 플래그가 없어 Cloud Run 기본값으로 배포된다.
기본 max-instances=100은 학생 30명 규모에 과잉이며, 버그나 트래픽 급증 시 의도치 않은 스케일아웃이 발생할 수 있다.
timeout 기본값 300초도 Gemini API 응답(통상 5~15초)에 비해 과잉이다.

### 해결책

`deploy.sh`에 명시적 리소스 플래그를 추가한다.

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

| 플래그 | 값 | 이유 |
|--------|-----|------|
| `--max-instances=3` | 3 | 학생 30명 동시 접속 기준 여유 있음, 사고성 스케일아웃 방지 |
| `--min-instances=0` | 0 | 야간·주말 idle 시 scale-to-zero로 비용 0 |
| `--memory=512Mi` | 512Mi | Next.js standalone 기본값, 명시화 |
| `--cpu=1` | 1 | 이미지 생성 작업 기준 충분 |
| `--concurrency=10` | 10 | Gemini API 호출은 무거운 I/O, 인스턴스당 동시 요청 제한 |
| `--timeout=30` | 30s | Gemini 응답 기준 충분, 기본값(300s) 과잉 제거 |

**변경 파일:**
- `deploy.sh` — 리소스 플래그 추가

---

## 4. Artifact Registry 이미지 클린업

### 문제

`gcloud run deploy --source .`는 빌드할 때마다 Artifact Registry에 새 컨테이너 이미지를 누적한다.
클린업 정책이 없으면 장기 운영 시 오래된 이미지가 계속 쌓여 스토리지 비용이 증가한다.

### 해결책

`deploy.sh` 배포 완료 후 Artifact Registry 클린업 정책을 설정한다. 최신 5개 이미지를 유지하고 나머지는 자동 삭제한다.

```bash
echo "🧹 Configuring Artifact Registry cleanup policy..."
gcloud artifacts repositories set-cleanup-policies \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  cloud-run-source-deploy \
  --policy='[{"name":"keep-5","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":5}}]' \
  2>/dev/null || echo "⚠️  Cleanup policy skipped (registry may not exist yet)"
```

**변경 파일:**
- `deploy.sh` — 클린업 정책 설정 블록 추가

**효과:**
- 배포 누적 이미지가 최신 5개 이외 자동 삭제
- 장기 운영 시 Artifact Registry 스토리지 비용 통제

---

## 파일 변경 요약

| 파일 | 변경 유형 |
|------|-----------|
| `src/lib/generateHelpers.ts` | 수정 — `saveImageToGcs()` 호출 제거 |
| `src/lib/imageStore.ts` | 삭제 |
| `src/__tests__/lib/imageStore.test.ts` | 삭제 |
| `src/lib/quotaStore.ts` | 수정 — Config 캐시 추가 |
| `deploy.sh` | 수정 — Cloud Run 플래그 + Artifact Registry 클린업 |

---

## 테스트 계획

- `generateHelpers.ts` 테스트: `saveImageToGcs` 모킹 제거, base64 직접 반환 검증
- `quotaStore.ts` 캐시 테스트: TTL 내 캐시 히트 / 만료 후 재조회 / `saveConfig` 후 무효화 검증
- `deploy.sh`: 로컬 dry-run (`--dry-run` 플래그로 gcloud 실제 실행 없이 파라미터 검증)
