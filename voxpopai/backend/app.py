from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Allow running `uvicorn app:app` from backend directory
from voxpopai.backend.routers import personas, surveys, runs, question
from voxpopai.backend.routers import logs as logs_router

app = FastAPI(title="VoxPopAI API", version="0.1.0")

# Register routers
app.include_router(personas.router)
app.include_router(surveys.router)
app.include_router(runs.router)
app.include_router(question.router)
app.include_router(logs_router.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow local development frontend
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    """Simple health-check endpoint."""
    return {"status": "ok"} 