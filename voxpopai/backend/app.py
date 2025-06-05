from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# Allow running `uvicorn app:app` from backend directory
from voxpopai.backend.routers import personas, surveys, runs, question
from voxpopai.backend.routers import logs as logs_router

app = FastAPI(title="VoxPopAI API", version="0.1.0")

# Configure CORS FIRST - this must be the first middleware added!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://d3h9rtejibs9gc.cloudfront.net",  # CloudFront URL
    ],
    allow_origin_regex=r"https://.*\.cloudfront\.net",  # Allow all CloudFront domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom debug middleware comes AFTER CORS
@app.middleware("http")
async def debug_auth(request: Request, call_next):
    # Log all headers for debugging
    print("\n=== Request Debug Info ===")
    print(f"URL: {request.url}")
    print(f"Method: {request.method}")
    print("Headers:")
    for name, value in request.headers.items():
        print(f"  {name}: {value}")
    
    # Specifically check auth header
    auth_header = request.headers.get("authorization")
    print(f"\nAuth Header: {auth_header}")
    if auth_header:
        print(f"Auth Type: {auth_header.split(' ')[0] if ' ' in auth_header else 'None'}")
        print(f"Token Length: {len(auth_header.split(' ')[1]) if ' ' in auth_header else 0}")
    
    # Enhanced CORS debugging
    print("\nCORS Debug Info:")
    origin = request.headers.get('origin')
    print(f"Origin: {origin}")
    # Handle both spellings of referer/referrer
    referer = request.headers.get('referer') or request.headers.get('referrer')
    print(f"Referer/Referrer: {referer}")
    print(f"Access-Control-Request-Method: {request.headers.get('access-control-request-method')}")
    print(f"Access-Control-Request-Headers: {request.headers.get('access-control-request-headers')}")
    
    response = await call_next(request)
    
    # Log response headers for debugging CORS
    print("\n=== Response Debug Info ===")
    print(f"Status: {response.status_code}")
    print("Response Headers:")
    for name, value in response.headers.items():
        print(f"  {name}: {value}")
    print("============================\n")
    
    return response

# Register routers AFTER middleware
app.include_router(personas.router)
app.include_router(surveys.router)
app.include_router(runs.router)
app.include_router(question.router)
app.include_router(logs_router.router)

@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    """Simple health-check endpoint."""
    return {"status": "ok"} 

@app.get("/api/health", tags=["System"])
async def api_health() -> dict[str, str]:
    """Health-check endpoint for the API path."""
    return {"status": "ok"} 