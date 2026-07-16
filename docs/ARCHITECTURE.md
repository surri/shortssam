# 아키텍처 — 수학 숏츠

문제 사진을 올리면 Gemini가 읽고·풀고·분류해서 **세로 숏츠 설명 영상**을 만들고, 생성물을 저장하며 유사 문제(RAG)를 찾아준다.

## 컴포넌트

```
[브라우저] app/static/index.html
   업로드(파일/드래그/Ctrl+V) · 음성 선택 · 세로 숏츠 플레이어(KaTeX) · 갤러리
        │  fetch JSON
        ▼
[FastAPI] app/main.py
   POST /api/generate   이미지 → 대본+분류 생성 → 임베딩 → 저장 → Work 반환
   POST /api/tts        텍스트 → WAV (음성 고정)
   GET  /api/works      저장 목록(갤러리)
   GET  /api/works/{id} 단건(재생)
   GET  /api/works/{id}/similar  RAG 유사 문제
        │
        ├─ services/generate.py  (Gemini 비전+추론, 커리큘럼 분류 통합)
        ├─ services/tts.py       (Gemini TTS, PCM→WAV)
        ├─ services/embed.py     (gemini-embedding-001 @1536)
        ├─ services/categorize.py(한국 고교 커리큘럼 taxonomy)
        │
        └─ storage/repository.py  Repository 인터페이스 (STORAGE로 구현 선택)
              ├─ local_repo.py     SQLite + numpy 코사인   (로컬)
              └─ firestore_repo.py Firestore + find_nearest (GCP)
```

## GENAI 이중 모드 (genai_client.py)
- 로컬: `genai.Client()` — `GEMINI_API_KEY`(또는 `GKEYFILE`) 자동 로드
- GCP: `GOOGLE_GENAI_USE_VERTEXAI=true` → `genai.Client(vertexai=True, project, location)` (서비스계정)
- 코드 변경 없이 **환경변수만으로 전환**. 폴백 체인: 429는 다음 모델로 즉시 점프.

## 저장소 & RAG
- `Work { id, created_at, problem, answer, category, subtopic, scenes[], total_seconds, thumb, embedding[1536] }`
- 저장 시 `problem + category + subtopic`를 임베딩 → 유사도 검색에 사용
- 로컬: SQLite에 embedding을 JSON으로 저장, 조회 시 numpy 코사인(브루트포스; 해커톤 규모 충분)
- GCP: Firestore 문서에 `Vector(embedding)` 저장, `find_nearest(COSINE)` KNN. **차원 ≤ 2048** 제약 때문에 1536 사용.

## 데이터 흐름(생성)
1. 프론트가 이미지 data URL을 `/api/generate`로 POST
2. `generate_script`가 Gemini에 이미지+프롬프트 → `{problem, answer, category, subtopic, scenes[]}` JSON
3. `embed`로 임베딩 → `repo.save`
4. 프론트가 장면별 `narration`을 `/api/tts`로 (선택 음성 고정) → WAV
5. 플레이어가 장면을 순서대로: onscreen(KaTeX) + 자막 + 나레이션 재생 + 진행바

## 형식 규칙(품질 핵심)
- `narration`: 순수 한국어 구어체(수식은 말로), TTS가 자연스럽게 읽음
- `onscreen`: LaTeX를 `$`로 감싼 수식 → 프론트에서 KaTeX auto-render로 교과서 형태 렌더
