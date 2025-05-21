from fastapi import FastAPI

# Allow running `uvicorn app:app` from backend directory
from routers import personas, surveys, runs

app = FastAPI(title="VoxPopAI API", version="0.1.0")

# Register routers
app.include_router(personas.router)
app.include_router(surveys.router)
app.include_router(runs.router)


@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    """Simple health-check endpoint."""
    return {"status": "ok"} 