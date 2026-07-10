# Course Bridge AI

Monorepo for the CourseBridge / TransferAI project — two independently
deployed apps that talk to each other over HTTP.

- **`backend/`** — Flask API (course/major data, plan generation, chat advisor).
  Deployed as the Railway service **Course-Bridge-AI**.
- **`frontend/`** — Next.js app (the public-facing site). Its `/api/*` routes
  proxy straight through to `backend/`'s API (see `TRANSFER_AI_URL` in
  `frontend/.env.local`). Deployed as the Railway service
  **coursebridge-frontend**.

Each Railway service builds from this one repo with its **root directory**
set to `backend` or `frontend` respectively — from each service's point of
view, its folder is the repo root. No cross-folder imports; they only talk
over the network via `TRANSFER_AI_URL`.

## Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py                    # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

`frontend/.env.local` should point `TRANSFER_AI_URL` at wherever the backend
is running (local Flask dev server, or the deployed Railway URL) — see
`frontend/.env.local.example`.
