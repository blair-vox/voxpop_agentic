from fastapi import FastAPI, Request
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

# Configure CORS with wildcard to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://voxpop-loadb-x8lmu8asjpoh-1593416076.ap-southeast-2.elb.amazonaws.com",  # Deployed frontend
        "https://voxpop-loadb-x8lmu8asjpoh-1593416076.ap-southeast-2.elb.amazonaws.com",  # Deployed frontend HTTPS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def debug_auth(request: Request, call_next):
    print("AUTH HEADER:", request.headers.get("authorization"))
    # Print CORS-related headers for debugging
    print("ORIGIN:", request.headers.get("origin"))
    print("METHOD:", request.method)
    return await call_next(request)

@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    """Simple health-check endpoint."""
    return {"status": "ok"} 

@app.get("/api/health", tags=["System"])
async def api_health() -> dict[str, str]:
    """Health-check endpoint for the API path."""
    return {"status": "ok"} 