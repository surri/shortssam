# 📸 숏쌤 (ShortSsam)

> 문제를 찍으면, 숏쌤이 1분 쇼츠로 풀어줍니다.

문제 사진 한 장을 올리면 Gemini가 문제를 읽고 → 단계별로 풀고 → 커리큘럼으로 분류하고 → 쇼츠 대본을 만들어, 장면별 TTS 나레이션이 입혀진 세로 9:16 해설 쇼츠를 재생합니다. 생성물은 저장되어 갤러리와 RAG 기반 유사 문제 추천으로 이어집니다.

Google Cloud Study Jam Hackathon 2026 출품작 — [AI Studio 앱](https://ai.studio/apps/31b34c65-7c93-4bc3-8daa-8a055a400ba4)으로 시작해 Antigravity 프로세스로 개발했습니다.

## 실행

```bash
npm install
GEMINI_API_KEY=... npm run dev   # http://localhost:3000
```

환경 변수는 `.env.example` 참고 (로컬: AI Studio API 키 / GCP: Vertex AI 전환).

## 스택

- **Next.js 16 + React 19** 풀스택 (API Routes)
- **@google/genai** — Gemini 멀티모달 풀이 생성, TTS 나레이션, 임베딩(RAG)
- **KaTeX** — 수식 렌더링
- 저장소: 로컬 JSON ↔ Firestore (`STORAGE` env 전환)
- 배포: `output: 'standalone'` + Dockerfile → **Cloud Run** (`docs/DEPLOY-GCP.md`)

## 구조

```
app/api/{generate,tts,works,works/[id],works/[id]/similar}/route.ts
components/{UploadPanel,Player,Gallery}.tsx
lib/{genai,curriculum,math,types,validation}.ts
lib/repo/{local,firestore}.ts
```

## 테스트

```bash
npm test   # vitest
```
