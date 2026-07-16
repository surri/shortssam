# 📸 숏쌤 (ShortSsam)

> **문제를 찍으면, 숏쌤이 1분 쇼츠로 풀어줍니다.**

- **트랙: Social Good** — 사진 한 장이면 누구나, 어디서나 1분 과외를 받는 교육 접근성 도구
- **라이브 데모**: https://shortssam-506743449944.asia-northeast3.run.app
- **데모 영상**: (업로드 후 링크 추가)

Google Cloud Study Jam Hackathon 2026 출품작 — [AI Studio 앱](https://ai.studio/apps/31b34c65-7c93-4bc3-8daa-8a055a400ba4)으로 시작해 Antigravity 프로세스로 개발했습니다.

## 왜 만들었나

학원과 과외는 비싸고, 검색은 느리고, 풀이집은 불친절합니다. 정작 학생들이 가장 익숙한 학습 매체는 **유튜브 쇼츠**입니다. 숏쌤은 모르는 문제 사진 한 장을 **그 자리에서 나만을 위한 1분 해설 쇼츠**로 바꿔줍니다 — 사교육 접근성이 낮은 환경일수록 효과가 큰, 주머니 속 무료 과외 선생님입니다.

## 어떻게 동작하나

1. **찍는다** — 문제 사진 업로드(클릭·드래그·붙여넣기·촬영)
2. **고른다** — 쌤 페르소나 선택: 대치동 일타강사 📣 / 서울대 선배 💡 / 수포자 구원자 🔥 (말투·낭독 톤·목소리가 함께 바뀜)
3. **본다** — Gemini가 문제를 읽고 → 단계별로 풀고 → 커리큘럼으로 분류하고 → 쇼츠 대본을 써서, 장면별 TTS 나레이션 + KaTeX 수식 + 강조 자막이 입혀진 **세로 9:16 해설 쇼츠**를 재생
4. **쌓인다** — 생성물은 갤러리에 저장되고, 임베딩 기반 **RAG로 유사 문제**를 이어서 추천

## 기술 하이라이트

- **Gemini 멀티모달 파이프라인**: 이미지 판독→풀이→분류→대본 생성을 단일 호출로. `responseSchema` **constrained decoding**으로 JSON 형식·장면 수·커리큘럼 분류(enum)를 디코딩 단계에서 강제
- **모델 폴백 체인**: gemini-3.5-flash ↔ 2.5-flash 등 환경(AI Studio 키/Vertex)별 가용 모델로 자동 폴백, TTS(gemini-3.1-flash-tts-preview)는 빈 오디오 응답까지 폴백 처리
- **나레이션·자막 이원화**: TTS용 구어체 나레이션과 화면용 LaTeX 자막(caption)을 분리 생성, 강조 단어(accentWords) 컬러 연출
- **RAG 유사 문제**: gemini-embedding-001(1536차원) + Firestore `findNearest` 벡터 검색
- **내결함성 데모 모드**: API 장애 시 목데이터로 자동 전환 — 시연이 끊기지 않음
- **품질**: 테스트 52개(vitest), 시크릿 0(키는 env/서비스계정), Zod 입력 검증, 레이트리밋
- **인프라**: Cloud Run(서울, 스탠드얼론 Docker) · Firestore · **CI/CD** — main 푸시마다 GitHub Actions 테스트 + Cloud Build 자동 배포

## 아키텍처

```
브라우저(9:16 쇼츠 플레이어, KaTeX)
   │ 사진 업로드 / 갤러리
   ▼
Next.js 16 API Routes ── Cloud Run (asia-northeast3)
   ├─ /api/generate ─ Gemini(멀티모달+responseSchema) → 대본·분류
   ├─ /api/tts ────── Gemini TTS(3.1) → WAV 나레이션(캐시)
   └─ /api/works* ─── Firestore(벡터 findNearest) → 갤러리·유사문제
```

## 실행

```bash
npm install
GEMINI_API_KEY=... npm run dev   # http://localhost:3000
```

환경 변수는 `.env.example` 참고 (로컬: AI Studio API 키 / GCP: Vertex AI 전환). 배포 절차는 `docs/DEPLOY-GCP.md`.

## 구조

```
app/api/{generate,tts,works,works/[id],works/[id]/similar}/route.ts
components/{UploadPanel,Player,Gallery}.tsx
lib/{genai,curriculum,persona,accent,mock,sound,math,validation}.ts
lib/repo/{local,firestore}.ts      # STORAGE env로 로컬 JSON ↔ Firestore 전환
```

## 테스트

```bash
npm test   # vitest, 52 tests
```
