#!/bin/bash
# ==============================================================================
# Banana Studio — Cloud Run 배포 스크립트
# ==============================================================================
#
# 사용법:
#   ./deploy.sh [옵션]
#
# 옵션:
#   --dry-run          실제 배포 없이 실행할 명령만 출력
#   --skip-secrets     Secret Manager 설정 건너뜀 (이미 설정된 경우)
#   --skip-iam         서비스 계정 / IAM 설정 건너뜀
#   --help             이 도움말 출력
#
# 필수 환경 변수 (최초 배포 시):
#   ADMIN_ID           관리자 로그인 ID
#   ADMIN_PASSWORD     관리자 로그인 비밀번호
#
# 선택 환경 변수:
#   GOOGLE_CLOUD_PROJECT   GCP 프로젝트 ID (기본: jwlee-argolis-202104)
#   GOOGLE_CLOUD_LOCATION  Vertex AI 위치  (기본: us-central1)
#   SERVICE_NAME           Cloud Run 서비스 이름 (기본: banana-studio)
#
# 예시:
#   ADMIN_ID=teacher ADMIN_PASSWORD=secret123 ./deploy.sh
#   ./deploy.sh --skip-secrets   # 이미 Secret Manager 설정 완료된 경우
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# 색상 / 출력 헬퍼
# ------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ ${NC}$*"; }
success() { echo -e "${GREEN}✅ ${NC}$*"; }
warn()    { echo -e "${YELLOW}⚠️  ${NC}$*"; }
error()   { echo -e "${RED}❌ ${NC}$*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }
divider() { echo -e "${CYAN}──────────────────────────────────────────────${NC}"; }

# dry-run 모드: 실제 실행 대신 명령 출력
DRY_RUN=false
run() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} $*"
  else
    "$@"
  fi
}

# ------------------------------------------------------------------------------
# 인수 파싱
# ------------------------------------------------------------------------------
SKIP_SECRETS=false
SKIP_IAM=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)      DRY_RUN=true ;;
    --skip-secrets) SKIP_SECRETS=true ;;
    --skip-iam)     SKIP_IAM=true ;;
    --help)
      head -40 "$0" | grep "^#" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      error "알 수 없는 옵션: $arg  (--help 로 사용법 확인)"
      exit 1
      ;;
  esac
done

# ------------------------------------------------------------------------------
# 설정값
# ------------------------------------------------------------------------------
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-"jwlee-argolis-202104"}"
REGION="${GOOGLE_CLOUD_LOCATION:-"us-central1"}"
SERVICE_NAME="${SERVICE_NAME:-"banana-studio"}"
BUCKET_NAME="${PROJECT_ID}-banana-studio-data"
SERVICE_ACCOUNT_NAME="banana-studio-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRET_ADMIN_ID="banana-studio-admin-id"
SECRET_ADMIN_PASSWORD="banana-studio-admin-password"

# ------------------------------------------------------------------------------
# 배너
# ------------------------------------------------------------------------------
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        🍌  바나나 스튜디오 배포 시작         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
info "프로젝트    : ${BOLD}$PROJECT_ID${NC}"
info "리전        : ${BOLD}$REGION${NC}"
info "서비스      : ${BOLD}$SERVICE_NAME${NC}"
info "GCS 버킷    : ${BOLD}gs://$BUCKET_NAME${NC}"
info "서비스 계정 : ${BOLD}$SERVICE_ACCOUNT_EMAIL${NC}"
[ "$DRY_RUN" = true ] && warn "DRY-RUN 모드 — 실제 변경 없음"
divider

# ------------------------------------------------------------------------------
# 1. 사전 요구사항 확인
# ------------------------------------------------------------------------------
step "사전 요구사항 확인"

# gcloud CLI 설치 확인
if ! command -v gcloud &> /dev/null; then
  error "gcloud CLI가 설치되어 있지 않습니다."
  echo "   설치: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
success "gcloud CLI 확인"

# 인증 상태 확인
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
if [ -z "$ACTIVE_ACCOUNT" ]; then
  error "gcloud 인증이 필요합니다. 아래 명령을 실행하세요:"
  echo "   gcloud auth login"
  echo "   gcloud auth application-default login"
  exit 1
fi
success "인증 계정: ${BOLD}$ACTIVE_ACCOUNT${NC}"

# 프로젝트 접근 권한 확인
if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  error "프로젝트 '$PROJECT_ID' 에 접근할 수 없습니다."
  echo "   확인: gcloud projects list"
  exit 1
fi
success "프로젝트 접근 확인"

# 최초 배포 시 ADMIN 자격증명 확인
if [ "$SKIP_SECRETS" = false ]; then
  if [ -z "${ADMIN_ID:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    error "ADMIN_ID 와 ADMIN_PASSWORD 환경 변수가 필요합니다."
    echo ""
    echo "   실행 예시:"
    echo "   ADMIN_ID=teacher ADMIN_PASSWORD=yourpassword ./deploy.sh"
    echo ""
    echo "   이미 Secret Manager에 설정된 경우:"
    echo "   ./deploy.sh --skip-secrets"
    exit 1
  fi
  if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
    error "ADMIN_PASSWORD 는 최소 8자 이상이어야 합니다."
    exit 1
  fi
  success "관리자 자격증명 확인"
fi

divider

# ------------------------------------------------------------------------------
# 2. GCP 프로젝트 설정
# ------------------------------------------------------------------------------
step "GCP 프로젝트 설정"

run gcloud config set project "$PROJECT_ID"
success "활성 프로젝트: $PROJECT_ID"

# ------------------------------------------------------------------------------
# 3. 필수 API 활성화
# ------------------------------------------------------------------------------
step "필수 API 활성화"

REQUIRED_APIS=(
  "run.googleapis.com"               # Cloud Run
  "cloudbuild.googleapis.com"        # Cloud Build (이미지 빌드)
  "artifactregistry.googleapis.com"  # Artifact Registry (이미지 저장)
  "storage.googleapis.com"           # Cloud Storage (데이터 영속성)
  "secretmanager.googleapis.com"     # Secret Manager (관리자 자격증명)
  "aiplatform.googleapis.com"        # Vertex AI (Gemini 이미지 생성)
  "iam.googleapis.com"               # IAM (서비스 계정)
)

info "활성화할 API: ${REQUIRED_APIS[*]}"
run gcloud services enable "${REQUIRED_APIS[@]}" --project="$PROJECT_ID"
success "모든 API 활성화 완료"
divider

# ------------------------------------------------------------------------------
# 4. 서비스 계정 생성 및 IAM 권한 부여
# ------------------------------------------------------------------------------
if [ "$SKIP_IAM" = false ]; then
  step "서비스 계정 설정 (최소 권한 원칙)"

  # 서비스 계정 생성 (이미 있으면 건너뜀)
  if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" \
       --project="$PROJECT_ID" &>/dev/null; then
    info "서비스 계정 생성 중: $SERVICE_ACCOUNT_EMAIL"
    run gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
      --display-name="Banana Studio Cloud Run SA" \
      --project="$PROJECT_ID"
    success "서비스 계정 생성 완료"
  else
    success "서비스 계정 이미 존재: $SERVICE_ACCOUNT_EMAIL"
  fi

  # IAM 역할 부여
  declare -A IAM_ROLES=(
    ["roles/storage.objectAdmin"]="GCS 버킷 읽기/쓰기 (데이터 영속성)"
    ["roles/aiplatform.user"]="Vertex AI Gemini 이미지 생성"
    ["roles/secretmanager.secretAccessor"]="Secret Manager 자격증명 읽기"
    ["roles/logging.logWriter"]="Cloud Logging 쓰기"
  )

  for ROLE in "${!IAM_ROLES[@]}"; do
    info "IAM 부여: ${ROLE} — ${IAM_ROLES[$ROLE]}"
    run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
      --role="$ROLE" \
      --condition=None \
      --quiet
  done
  success "IAM 권한 부여 완료"
  divider
fi

# ------------------------------------------------------------------------------
# 5. GCS 버킷 설정
# ------------------------------------------------------------------------------
step "GCS 버킷 설정"

if ! gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
  info "버킷 생성: gs://$BUCKET_NAME"
  run gsutil mb \
    -l "$REGION" \
    -p "$PROJECT_ID" \
    --pap enforced \
    "gs://$BUCKET_NAME"
  success "버킷 생성 완료"
else
  success "버킷 이미 존재: gs://$BUCKET_NAME"
fi

# 버킷 접근 권한: 서비스 계정에 objectAdmin 부여
info "버킷 IAM 권한 설정 중..."
run gsutil iam ch \
  "serviceAccount:${SERVICE_ACCOUNT_EMAIL}:roles/storage.objectAdmin" \
  "gs://$BUCKET_NAME"
success "버킷 IAM 설정 완료"

# 수명 주기 정책: 90일 이상 된 객체 자동 삭제 (이미지 정리)
info "버킷 수명 주기 정책 설정 중 (90일 후 자동 삭제)..."
LIFECYCLE_JSON=$(cat <<'EOF'
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 90 }
    }
  ]
}
EOF
)
if [ "$DRY_RUN" = false ]; then
  echo "$LIFECYCLE_JSON" | gsutil lifecycle set /dev/stdin "gs://$BUCKET_NAME"
fi
success "수명 주기 정책 설정 완료"
divider

# ------------------------------------------------------------------------------
# 6. Secret Manager — 관리자 자격증명
# ------------------------------------------------------------------------------
if [ "$SKIP_SECRETS" = false ]; then
  step "Secret Manager — 관리자 자격증명 설정"

  # ADMIN_ID 시크릿
  if gcloud secrets describe "$SECRET_ADMIN_ID" --project="$PROJECT_ID" &>/dev/null; then
    info "$SECRET_ADMIN_ID 시크릿 이미 존재 → 새 버전 추가"
    if [ "$DRY_RUN" = false ]; then
      echo -n "$ADMIN_ID" | gcloud secrets versions add "$SECRET_ADMIN_ID" \
        --data-file=- \
        --project="$PROJECT_ID"
    else
      echo -e "  ${YELLOW}[DRY-RUN]${NC} echo -n ADMIN_ID | gcloud secrets versions add $SECRET_ADMIN_ID ..."
    fi
  else
    info "$SECRET_ADMIN_ID 시크릿 생성"
    if [ "$DRY_RUN" = false ]; then
      echo -n "$ADMIN_ID" | gcloud secrets create "$SECRET_ADMIN_ID" \
        --data-file=- \
        --replication-policy=automatic \
        --project="$PROJECT_ID"
    else
      echo -e "  ${YELLOW}[DRY-RUN]${NC} gcloud secrets create $SECRET_ADMIN_ID ..."
    fi
  fi
  success "$SECRET_ADMIN_ID 설정 완료"

  # ADMIN_PASSWORD 시크릿
  if gcloud secrets describe "$SECRET_ADMIN_PASSWORD" --project="$PROJECT_ID" &>/dev/null; then
    info "$SECRET_ADMIN_PASSWORD 시크릿 이미 존재 → 새 버전 추가"
    if [ "$DRY_RUN" = false ]; then
      echo -n "$ADMIN_PASSWORD" | gcloud secrets versions add "$SECRET_ADMIN_PASSWORD" \
        --data-file=- \
        --project="$PROJECT_ID"
    else
      echo -e "  ${YELLOW}[DRY-RUN]${NC} echo -n ADMIN_PASSWORD | gcloud secrets versions add $SECRET_ADMIN_PASSWORD ..."
    fi
  else
    info "$SECRET_ADMIN_PASSWORD 시크릿 생성"
    if [ "$DRY_RUN" = false ]; then
      echo -n "$ADMIN_PASSWORD" | gcloud secrets create "$SECRET_ADMIN_PASSWORD" \
        --data-file=- \
        --replication-policy=automatic \
        --project="$PROJECT_ID"
    else
      echo -e "  ${YELLOW}[DRY-RUN]${NC} gcloud secrets create $SECRET_ADMIN_PASSWORD ..."
    fi
  fi
  success "$SECRET_ADMIN_PASSWORD 설정 완료"
  divider
fi

# ------------------------------------------------------------------------------
# 7. Cloud Run 배포
# ------------------------------------------------------------------------------
step "Cloud Run 배포"

info "소스 빌드 후 배포 시작 (Cloud Build 사용, 수 분 소요)..."

run gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --service-account "$SERVICE_ACCOUNT_EMAIL" \
  --allow-unauthenticated \
  --max-instances=3 \
  --min-instances=0 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=10 \
  --timeout=30 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION},GCS_BUCKET_NAME=${BUCKET_NAME}" \
  --update-secrets="ADMIN_ID=${SECRET_ADMIN_ID}:latest,ADMIN_PASSWORD=${SECRET_ADMIN_PASSWORD}:latest"

success "Cloud Run 배포 완료"
divider

# ------------------------------------------------------------------------------
# 8. Artifact Registry 이미지 클린업 정책
# ------------------------------------------------------------------------------
step "Artifact Registry 클린업 정책 설정 (최신 5개 유지)"

run gcloud artifacts repositories set-cleanup-policies \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  cloud-run-source-deploy \
  --policy='[{"name":"keep-5","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":5}}]' \
  2>/dev/null \
  || warn "클린업 정책 설정 건너뜀 (레지스트리 미존재 — 다음 배포 후 재시도)"

divider

# ------------------------------------------------------------------------------
# 9. 배포 후 헬스체크
# ------------------------------------------------------------------------------
step "배포 후 헬스체크"

# 서비스 URL 가져오기
if [ "$DRY_RUN" = false ]; then
  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

  if [ -z "$SERVICE_URL" ]; then
    warn "서비스 URL을 가져오지 못했습니다. 배포 상태를 직접 확인하세요."
  else
    info "서비스 URL: ${BOLD}$SERVICE_URL${NC}"
    info "헬스체크 중 (최대 30초 대기)..."

    # 최대 6회(5초 간격) 재시도
    HEALTH_OK=false
    for i in $(seq 1 6); do
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 10 "$SERVICE_URL" 2>/dev/null || echo "000")
      if [ "$HTTP_STATUS" = "200" ]; then
        HEALTH_OK=true
        break
      fi
      info "응답 대기 중... ($i/6, HTTP $HTTP_STATUS)"
      sleep 5
    done

    if [ "$HEALTH_OK" = true ]; then
      success "헬스체크 통과 (HTTP 200)"
    else
      warn "헬스체크 실패 — 서비스가 아직 시작 중이거나 오류가 있을 수 있습니다."
      warn "로그 확인: gcloud run services logs read $SERVICE_NAME --region=$REGION"
    fi
  fi
else
  info "[DRY-RUN] 헬스체크 건너뜀"
  SERVICE_URL="https://${SERVICE_NAME}-xxxx-uc.a.run.app (예시)"
fi

divider

# ------------------------------------------------------------------------------
# 10. 최종 요약
# ------------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║           🎉  배포 완료 요약                 ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}서비스 URL${NC}"
echo -e "  학생 페이지 : ${CYAN}${SERVICE_URL:-N/A}${NC}"
echo -e "  관리자 페이지: ${CYAN}${SERVICE_URL:-N/A}/admin${NC}"
echo ""
echo -e "  ${BOLD}주요 리소스${NC}"
echo -e "  Cloud Run   : ${CYAN}https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}${NC}"
echo -e "  GCS 버킷    : ${CYAN}https://console.cloud.google.com/storage/browser/${BUCKET_NAME}${NC}"
echo -e "  Secret Mgr  : ${CYAN}https://console.cloud.google.com/security/secret-manager${NC}"
echo ""
echo -e "  ${BOLD}유용한 명령어${NC}"
echo -e "  로그 보기    : ${YELLOW}gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=50${NC}"
echo -e "  트래픽 확인  : ${YELLOW}gcloud run services describe ${SERVICE_NAME} --region=${REGION}${NC}"
echo -e "  롤백         : ${YELLOW}gcloud run services update-traffic ${SERVICE_NAME} --region=${REGION} --to-revisions=PREV=100${NC}"
echo -e "  비밀 갱신    : ${YELLOW}echo -n NEW_PASSWORD | gcloud secrets versions add ${SECRET_ADMIN_PASSWORD} --data-file=-${NC}"
echo ""
echo -e "  ${BOLD}비용 제어 설정${NC}"
echo -e "  max-instances=3 | min-instances=0 | memory=512Mi | concurrency=10 | timeout=30s"
echo ""
