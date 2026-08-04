# CCaaS Migration Suite — Backend

A thin FastAPI backend for the CCaaS Migration Suite. It does three jobs:

1. **Serves the existing static frontend** (`CCaaS Migration Suite.dc.html`, `support.js`, `data/`) from one origin.
2. **Exposes a data API** (`/api/scenarios/...`) in the exact shapes the frontend already consumes — currently backed by `data/demo-data.json`.
3. **Acts as a secure proxy** for secret-backed features (OpenRouter LLM, GitHub Terraform deploy, CCaaS connectors) so **no secret ever reaches the browser**.

> The frontend and `data/demo-data.json` are unchanged. The backend is purely additive.

## Layout

```
backend/
├── app/
│   ├── main.py            # FastAPI app: CORS, errors, routers, static mount
│   ├── config.py          # settings from repo-root .env (secrets stay here)
│   ├── static.py          # serves the existing frontend at /
│   ├── core/              # logging + client-safe error handling
│   ├── models/            # Pydantic schemas mirroring demo-data.json
│   ├── routers/           # /api endpoints
│   │   ├── health.py      # /api/health, /api/capabilities
│   │   ├── dataset.py     # /api/dataset   (full {scenarios:{...}} for the SPA)
│   │   ├── scenarios.py   # /api/scenarios[/{id}][/inventory|mappings|tests|...]
│   │   ├── connect.py     # /api/connect
│   │   ├── discover.py    # /api/discover
│   │   ├── convert.py     # /api/convert   (OpenRouter LLM)
│   │   └── deploy.py      # /api/deploy/github  (atomic Git Data API commit)
│   └── services/
│       ├── data_store.py      # loads demo-data.json (swap point for real data)
│       ├── openrouter.py      # server-side LLM calls
│       ├── github_deploy.py   # server-side GitHub commits
│       └── connectors/        # CCaaS connectors (demo + Genesys/Connect stubs)
└── requirements.txt
```

## Run

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# bash:               source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open **http://127.0.0.1:8000/** — the frontend loads from the backend, and the API is under `/api`. Interactive API docs at **http://127.0.0.1:8000/docs**.

## Configuration

Copy the repo-root `.env.example` to `.env` and fill in what you need. All keys are optional — features degrade gracefully:

| Feature | Requires | If missing |
|---|---|---|
| Scenario data API | — | always on (demo-data.json) |
| LLM convert (`/api/convert`) | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | returns `503` |
| GitHub deploy (`/api/deploy/github`) | `GITHUB_TOKEN` | returns `503` |

`GET /api/capabilities` reports which features are enabled — the frontend can use it to enable/disable buttons without ever seeing the secrets.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

`tests/test_api.py` locks the API contract the frontend depends on (including that `/api/dataset` is byte-for-byte equal to `data/demo-data.json`). `tests/test_github_deploy.py` mocks GitHub and asserts the Git Data API flow (blobs → tree → single commit → ref, with branch auto-creation).

## Design notes

- **Browser never holds a secret.** Every secret-backed action is a server-side proxy call.
- **Stable contract.** `data_store.py` and the `connectors/` package are the seams to swap demo data for real CCaaS APIs / a database — the API shape (and the frontend) stay the same.
- **Errors are client-safe.** Upstream/provider details are logged server-side; the browser gets generic messages.
- **CORS fails safe.** With the default wildcard, credentialed cross-origin requests are disabled so the API never reflects an arbitrary origin. Set an explicit `CORS_ORIGINS` allow-list to enable them.

## Frontend wiring (done)

The frontend now hydrates from `GET /api/dataset`, falling back to the bundled
`./data/demo-data.json` when no backend is reachable (so opening the raw HTML
still works). It also reads `GET /api/capabilities` to learn which secret-backed
features are enabled. `data/demo-data.json` is retained as both the backend's
data source and the offline fallback.
