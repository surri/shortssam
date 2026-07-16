# GCP 배포 — 수학 숏츠 (Next.js 풀스택 → Cloud Run)

앱은 `web/`(Next.js). 로컬은 그대로, **환경변수 플립 + 배포**만 하면 된다. 예상 5~10분.
전제: 현장 `@gcplab.me` 계정 로그인, 프로젝트 ID 확보(결제 사전구성).

```bash
export PROJECT=<gcp-project-id>
export REGION=asia-northeast3   # Cloud Run·버킷 리전(서울). Vertex 모델 리전은 us-central1 별도
gcloud config set project "$PROJECT"
gcloud services enable aiplatform.googleapis.com firestore.googleapis.com run.googleapis.com storage.googleapis.com
```
> `main` 푸시 시 `cloudbuild.yaml` 트리거가 **자동 배포**한다(기존 서비스 env 유지). 아래 수동 절차는 최초 1회 프로비저닝용.

## 1. Firestore Native + 벡터 인덱스
```bash
gcloud firestore databases create --location="$REGION"
gcloud firestore indexes composite create \
  --collection-group=works --query-scope=COLLECTION \
  --field-config=field-path=embedding,vector-config='{"dimension":1536,"flat":{}}'
```
> 인덱스 READY까지 몇 분. `findNearest`는 인덱스가 있어야 동작.

## 1.5. 오디오(TTS) 캐시 버킷
```bash
gcloud storage buckets create "gs://$PROJECT-tts-cache" \
  --location="$REGION" --uniform-bucket-level-access
```
> ⚠️ `AUDIO_BUCKET` 미설정 시 오디오 캐시는 인스턴스 파일시스템(휘발성) — 재시작마다 재합성 비용이 든다. 재청취 비용 절감을 원하면 반드시 설정.
> (선택) 비용 관리: `gcloud storage buckets update "gs://$PROJECT-tts-cache" --lifecycle-file=<(echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":90}}]}')`

## 2. Cloud Run 배포 (Dockerfile 사용)
```bash
gcloud run deploy shortssam \
  --source . --region "$REGION" --allow-unauthenticated \
  --set-env-vars=GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=us-central1,STORAGE=firestore,AUDIO_BUCKET=$PROJECT-tts-cache
```
> ⚠️ `--set-env-vars`는 기존 env를 **전체 대체**한다. 배포된 서비스에 변수 하나만 추가할 땐 반드시 `--update-env-vars`를 쓸 것.
- `output: 'standalone'` + `Dockerfile`로 최소 이미지 빌드. HTTPS 자동.
- Gemini/Firestore는 **Cloud Run 서비스계정**으로 인증(키리스). 권한 부족 시:
```bash
SA=$(gcloud run services describe shortssam --region "$REGION" --format='value(spec.template.spec.serviceAccountName)')
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role="roles/datastore.user"
gcloud storage buckets add-iam-policy-binding "gs://$PROJECT-tts-cache" \
  --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"
```
> ⚠️ Cloud Run 파일시스템은 휘발성 → 로컬 JSON 저장소는 못 씀. **반드시 `STORAGE=firestore`**.

## 3. 스모크 테스트
```bash
URL=$(gcloud run services describe shortssam --region "$REGION" --format='value(status.url)')
open "$URL"   # 문제 업로드 → 숏츠 생성 → 갤러리 저장·유사검색 확인
```

## 규칙 준수 (HACKATHON.md)
- Cloud Run = **HTTPS** · Firestore = **SDK/서비스계정**(개방 DB 아님) · 키 = **env/서비스계정**(커밋 금지)
- PHP 없음 · 자율 에이전트 아님 · **Gemini + Vertex 사용**(Google AI 원칙 충족)
- 배포 후 루트에서 `bash scripts/check-rules.sh` 재확인
