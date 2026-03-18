# ibm_granite_speech — Implementation Plan

## Context
New project inside the existing `ibm_granite_projects` repo. Provides a speech analysis pipeline: record/upload audio → transcribe via IBM Granite MLX model → sentiment analysis + keyword extraction + summarization → display results in a polished web UI.

---

## Directory Structure

```
ibm_granite_projects/
└── ibm_granite_speech/
    ├── backend/
    │   ├── src/
    │   │   ├── api/routes.py
    │   │   ├── utils/config.py
    │   │   ├── schemas/models.py
    │   │   ├── service/model_connector.py   ← MLX transcription singleton
    │   │   ├── service/analysis_service.py  ← NLP pipelines singleton
    │   │   └── main.py
    │   ├── pyproject.toml
    │   └── .python-version
    └── frontend/
        ├── app/layout.tsx, page.tsx, globals.css
        ├── components/AudioRecorder.tsx, FileUpload.tsx,
        │             ResultsPanel.tsx, SentimentChart.tsx, KeywordTags.tsx
        ├── lib/api.ts
        ├── next.config.ts
        └── package.json
```

---

## API Contract

```
POST /api/v1/analyze   (multipart: audio_file)
→ {
    transcription: string,
    summary: string,
    sentiment: { positive: float, negative: float, neutral: float },  // 0-100 each
    keywords: string[],
    processing_time: float   // seconds
  }

GET /api/v1/health → { status: "ok", version: "1.0.0" }
```

---

## Backend Implementation

### Dependencies (`pyproject.toml` — uv managed, Python 3.11)
- `fastapi`, `uvicorn[standard]`, `python-multipart` — web framework + file uploads
- `mlx-audio>=0.1.0`, `mlx>=0.22.0` — Apple Silicon transcription
- `librosa`, `soundfile`, `numpy` — audio preprocessing (resample to 16kHz mono WAV)
- `transformers`, `torch` (CPU) — sentiment + summarization pipelines
- `keybert`, `sentence-transformers` — keyword extraction
- `pydantic>=2.8`, `pydantic-settings` — schemas + config

### `src/utils/config.py`
`pydantic-settings` `Settings` singleton with:
- `cors_origins = ["http://localhost:3000"]`
- `speech_model_id = "mlx-community/granite-4.0-1b-speech-8bit"`
- `sentiment_model_id = "cardiffnlp/twitter-roberta-base-sentiment-latest"`
- `summarization_model_id = "facebook/bart-large-cnn"`
- `target_sample_rate = 16000`, `max_keywords = 7`

### `src/service/model_connector.py`
Module-level singleton (`_speech_model`, `_model_loaded`).
- `initialize()` — called once at FastAPI startup via lifespan; loads MLX model
- `preprocess_audio(bytes, filename) → str` — writes to temp file, `librosa.load(sr=16000, mono=True)`, `sf.write()` PCM_16 WAV; cleans up both temp files
- `transcribe(bytes, filename) → str` — calls `preprocess_audio` then `generate_transcription(model, wav_path)` from `mlx_audio.stt.generate`

### `src/service/analysis_service.py`
Three module-level singleton pipelines loaded once at startup.
- Sentiment: `transformers.pipeline("sentiment-analysis", top_k=None)` → normalize scores × 100 to get pos/neg/neu %
- Keywords: `KeyBERT().extract_keywords(text, keyphrase_ngram_range=(1,2), use_mmr=True, diversity=0.5, top_n=7)`
- Summary: `transformers.pipeline("summarization")` with short-text guard (< 30 words → return as-is)

### `src/api/routes.py`
Single `POST /api/v1/analyze` route:
1. Read file bytes, validate size (≤50MB) and content type
2. Call `model_connector.transcribe()` → transcription string
3. Call `analysis_service.analyze()` → sentiment + keywords + summary
4. Return `AnalyzeResponse` with `processing_time = perf_counter() delta`

### `src/main.py`
- FastAPI `lifespan` context manager: calls `model_connector.initialize()` then `analysis_service.initialize()` on startup (blocks until all models loaded)
- `CORSMiddleware` with `allow_origins=settings.cors_origins`
- Includes router at `/api/v1`

---

## Frontend Implementation (Next.js 14 App Router)

### Design Tokens (CSS vars in `globals.css`)
```
--color-bg:        #F5F0E8   (warm beige)
--color-surface:   #FAFAF8   (off-white)
--color-text-primary:  #0A0A0A
--color-text-secondary: #5C5653
--color-border:    #E8E2D9
--color-positive:  #4A7C59   (muted green)
--color-negative:  #8B3A3A   (muted red)
--color-neutral:   #7A6E64
--shadow-card:     0 2px 16px rgba(10,10,10,0.08)
--shadow-hover:    0 8px 32px rgba(10,10,10,0.12)
```

### `next.config.ts`
Proxy `/api/*` → `http://localhost:8000/api/*` (Next.js rewrites). Eliminates CORS during local dev; browser sees same-origin requests.

### `lib/api.ts`
`analyzeAudio(blob, filename)` → POST FormData to `/api/v1/analyze`, parse JSON, throw typed error on non-2xx.

### State machine in `app/page.tsx`
`idle → analyzing → results | error` — manages `AudioRecorder` and `FileUpload` in idle state, loading card during analysis, `ResultsPanel` on success.

### Components
| Component | Responsibility |
|---|---|
| `AudioRecorder` | `MediaRecorder` + `AnalyserNode` live waveform on canvas, record/stop, emits `Blob` |
| `FileUpload` | Drag-drop + click-to-browse, validates audio MIME, emits `Blob` |
| `SentimentChart` | Animated horizontal bars for pos/neg/neu percentages |
| `KeywordTags` | Pill chips with hover invert (beige→black) effect |
| `ResultsPanel` | Assembles all sections: transcription, summary, 2-col grid of sentiment+keywords, processing time header, "Analyze another" reset button |

---

## CORS Strategy
- **Dev**: Next.js rewrites proxy `/api/*` to backend. No browser CORS preflight.
- **Prod**: FastAPI `CORSMiddleware` reads `CORS_ORIGINS` env var.

## Audio Format Flow
Any browser audio (WebM from recorder, WAV/MP3/M4A/OGG/FLAC upload) → `librosa.load(sr=16000, mono=True)` → 16kHz mono PCM WAV temp file → MLX model. Requires `brew install ffmpeg` for MP3/M4A/WebM support via `audioread`.

## Error Handling
| Condition | HTTP |
|---|---|
| File > 50MB | 400 |
| Empty file | 400 |
| Bad MIME | 400 |
| Silent/empty transcription | 422 |
| Model not loaded / non-Apple-Silicon | 503 |
| Unexpected inference error | 500 |

---

## Build Order
1. `backend/`: `.python-version` → `pyproject.toml` → `uv sync` → `config.py` → `models.py` → `model_connector.py` → `analysis_service.py` → `routes.py` → `main.py`
2. `frontend/`: `package.json` → `next.config.ts` → `globals.css` → `lib/api.ts` → leaf components → `ResultsPanel` → `page.tsx` + `layout.tsx`

## Startup Commands
```bash
# Backend
cd ibm_granite_speech/backend
uv sync
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (separate terminal)
cd ibm_granite_speech/frontend
npm install
npm run dev
```

## Verification
1. `curl http://localhost:8000/api/v1/health` → `{"status":"ok"}`
2. `curl -F "audio_file=@test.wav" http://localhost:8000/api/v1/analyze` → full JSON response
3. Open `http://localhost:3000`, record or upload audio, verify all result sections render
4. Check processing time is displayed correctly
5. Test error state by uploading a non-audio file
