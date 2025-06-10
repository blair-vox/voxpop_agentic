from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Allow running `uvicorn app:app` from backend directory
from voxpopai.backend.routers import personas, surveys, runs, question
from voxpopai.backend.routers import logs as logs_router
from voxpopai.backend.routers import auth as auth_router

app = FastAPI(title="VoxPopAI API", version="0.1.0")

# Mount all API routes under the "/api" prefix so that the
# public contract exposed by the load-balancer and consumed by the
# Next.js frontend remains stable (e.g. `/api/question/critic`).

api_prefix = "/api"

app.include_router(personas.router, prefix=api_prefix)
app.include_router(surveys.router, prefix=api_prefix)
app.include_router(runs.router,     prefix=api_prefix)
app.include_router(question.router, prefix=api_prefix)
app.include_router(logs_router.router, prefix=api_prefix)
app.include_router(auth_router.router, prefix=api_prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow local development frontend
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Health-check endpoints (keep the historic root path, but also expose under /api)

@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    """Simple health-check endpoint (legacy path)."""
    return {"status": "ok"}

@app.get(f"{api_prefix}/health", tags=["System"])
async def api_health() -> dict[str, str]:
    """Simple health-check endpoint under the /api prefix (used by ALB)."""
    return {"status": "ok"} 