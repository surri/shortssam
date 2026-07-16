# GCP 배포 — 수학 숏츠 (Next.js 풀스택 → Cloud Run)

앱은 `web/`(Next.js). 로컬은 그대로, **환경변수 플립 + 배포**만 하면 된다. 예상 5~10분.
전제: 현장 `@gcplab.me` 계정 로그인, 프로젝트 ID 확보(결제 사전구성).

```bash
export PROJECT=<gcp-project-id>
export REGION=us-central1
gcloud config set project "$PROJECT"
gcloud services enable aiplatform.googleapis.com firestore.googleapis.com run.googleapis.com
```

## 1. Firestore Native + 벡터 인덱스
```bash
gcloud firestore databases create --location="$REGION"
gcloud firestore indexes composite create \
  --collection-group=works --query-scope=COLLECTION \
  --field-config=field-path=embedding,vector-config='{"dimension":1536,"flat":{}}'
```
> 인덱스 READY까지 몇 분. `findNearest`는 인덱스가 있어야 동작.

## 2. Cloud Run 배포 (web/ 의 Dockerfile 사용)
```bash
cd web
gcloud run deploy math-shorts \
  --source . --region "$REGION" --allow-unauthenticated \
  --set-env-vars=GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=$REGION,STORAGE=firestore
```
- `output: 'standalone'` + `Dockerfile`로 최소 이미지 빌드. HTTPS 자동.
- Gemini/Firestore는 **Cloud Run 서비스계정**으로 인증(키리스). 권한 부족 시:
```bash
SA=$(gcloud run services describe math-shorts --region "$REGION" --format='value(spec.template.spec.serviceAccountName)')
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/datastore.user"
```
> ⚠️ Cloud Run 파일시스템은 휘발성 → 로컬 JSON 저장소는 못 씀. **반드시 `STORAGE=firestore`**.

## 3. 스모크 테스트
```bash
URL=$(gcloud run services describe math-shorts --region "$REGION" --format='value(status.url)')
open "$URL"   # 문제 업로드 → 숏츠 생성 → 갤러리 저장·유사검색 확인
```

## 규칙 준수 (HACKATHON.md)
- Cloud Run = **HTTPS** · Firestore = **SDK/서비스계정**(개방 DB 아님) · 키 = **env/서비스계정**(커밋 금지)
- PHP 없음 · 자율 에이전트 아님 · **Gemini + Vertex 사용**(Google AI 원칙 충족)
- 배포 후 루트에서 `bash scripts/check-rules.sh` 재확인
