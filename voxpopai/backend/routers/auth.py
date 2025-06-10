from fastapi import APIRouter, HTTPException, Request, status
from voxpopai.backend.utils.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/status")
async def auth_status(request: Request):
    """Return authentication state.

    Always succeeds with 200 so the frontend can determine whether the user is
    logged in without raising an exception.
    """
    try:
        user = get_current_user(request)  # type: ignore[arg-type]
        if user:
            return {"authenticated": True, "user": user}
    except HTTPException as exc:
        if exc.status_code != status.HTTP_401_UNAUTHORIZED:
            raise  # propagate other errors
    return {"authenticated": False, "user": None}


@router.get("/logout")
async def logout():
    """Return a logout URL understood by the ALB/Cognito setup.

    The front-end navigates to this URL to clear the provider session.
    """
    return {
        "logout_url": "/oauth2/logout?logout_uri=/",
    }