# VoxPopAI – Synthetic Focus Group MVP

This repository contains the code for **VoxPopAI**, a web-based application that simulates synthetic focus groups using AI-generated personas grounded in Australian Census (ABS) and electoral data.

The high-level architecture, agents, and build phases are defined in [blueprint.md](../blueprint.md). This README explains how to run the minimal skeleton that is generated automatically from that blueprint.

---

## Tech Stack

* **Frontend** – Next.js 14 (React / shadcn/ui)
* **Backend** – FastAPI + LangChain agents
* **Workflow** – AWS Step Functions (not wired yet in skeleton)
* **Storage** – S3, DynamoDB, OpenSearch (place-holders only)
* **Auth** – AWS Cognito (not wired yet)

---

## Local Development

### Prerequisites

* Python 3.10+
* Node.js 18+
* `pipx` or `virtualenv` for Python deps

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

The API server will be running at <http://localhost:8000> with a single `/health` route.

### Frontend

```bash
cd ../frontend
pnpm i  # or yarn / npm install
pnpm dev
```

The web UI is available at <http://localhost:3000>.

---

## Project Structure (Skeleton)

```
voxpopai/
├─ README.md          <- you are here
├─ backend/           <- FastAPI app & agents (skeletons)
├─ frontend/          <- Next.js 14 (placeholder page)
├─ data/              <- Static YAML & CSV templates
├─ infra/             <- Terraform / CDK (placeholder)
└─ scripts/           <- Utility scripts (e.g., ABS loader)
```

> NOTE: Only minimal stub code is generated. Follow the blueprint to flesh out each module.

---

## Licence

MIT © 2025 VoxPopAI 