from __future__ import annotations

import os
import time
from functools import lru_cache
from typing import Dict, Any
import base64
import json

import requests
from jose import jwk, jwt, JWTError
from jose.utils import base64url_decode
from fastapi import HTTPException, status, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

COGNITO_REGION = os.getenv("COGNITO_REGION", "ap-southeast-2")
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

# Only required when verifying JWTs; in local-dev we may run without Cognito.

ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"


@lru_cache(maxsize=1)
def get_jwks() -> Dict[str, Any]:
    resp = requests.get(JWKS_URL, timeout=5)
    resp.raise_for_status()
    return resp.json()


def _verify_token(token: str) -> Dict[str, Any]:
    if not COGNITO_POOL_ID:
        raise JWTError("COGNITO_POOL_ID not configured on server")
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    if not kid:
        raise JWTError("No KID in token header")
    jwks = get_jwks()
    key_data = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if not key_data:
        raise JWTError("Public key not found in JWKS")
    public_key = jwk.construct(key_data)
    message, encoded_sig = token.rsplit('.', 1)
    decoded_sig = base64url_decode(encoded_sig.encode())
    if not public_key.verify(message.encode(), decoded_sig):
        raise JWTError("Signature verification failed")
    claims = jwt.get_unverified_claims(token)
    if time.time() > claims.get("exp", 0):
        raise JWTError("Token is expired")
    if claims.get("iss") != ISSUER:
        raise JWTError("Invalid issuer")
    if COGNITO_APP_CLIENT_ID:
        aud_claim = claims.get("aud")
        client_id_claim = claims.get("client_id")
        aud_ok = False
        if isinstance(aud_claim, list):
            aud_ok = COGNITO_APP_CLIENT_ID in aud_claim
        else:
            aud_ok = aud_claim == COGNITO_APP_CLIENT_ID
        if not aud_ok and client_id_claim != COGNITO_APP_CLIENT_ID:
            raise JWTError("Invalid audience")
    return claims


security_scheme = HTTPBearer(auto_error=False)


# By default allow anonymous access in local-dev unless explicitly disabled.
ALLOW_ANONYMOUS = os.getenv("ALLOW_ANONYMOUS", "true").lower() in {"1", "true", "yes"}


def _extract_user_from_alb_headers(request: Request) -> Dict[str, Any] | None:
    """Return a dict of user claims if *request* contains ALB OIDC headers."""

    identity_id = request.headers.get("x-amzn-oidc-identity-id") or request.headers.get(
        "x-amzn-oidc-identity"
    )
    if not identity_id:
        return None

    user: Dict[str, Any] = {"sub": identity_id}

    # Modern ALB injects `x-amzn-oidc-data` which is base64-encoded JSON.
    oidc_data_b64 = request.headers.get("x-amzn-oidc-data")
    if oidc_data_b64:
        try:
            padded = oidc_data_b64 + "=" * (-len(oidc_data_b64) % 4)
            decoded = base64.b64decode(padded)
            user.update(json.loads(decoded))
        except Exception:
            # Ignore decode errors – fallback to individual headers below.
            pass

    # Fallback for older ALB formats exposing individual claim headers.
    for hdr, key in (
        ("x-amzn-oidc-data-email", "email"),
        ("x-amzn-oidc-data-name", "name"),
        ("x-amzn-oidc-data-username", "username"),
    ):
        if hdr in request.headers:
            user[key] = request.headers[hdr]

    return user


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Security(security_scheme),
) -> Dict[str, Any]:
    """FastAPI dependency returning the current authenticated user (claims).

    The resolution order is:

    1. OIDC headers injected by an AWS ALB (preferred in production)
    2. JWT present in an `Authorization: Bearer <token>` header
    3. Anonymous fallback (if ALLOW_ANONYMOUS=true)
    """

    # --- 1.  ALB-injected headers -------------------------------------------------
    alb_user = _extract_user_from_alb_headers(request)
    if alb_user:
        return alb_user

    # --- 2.  Standard Bearer token ------------------------------------------------
    if credentials:
        token = credentials.credentials
        try:
            return _verify_token(token)
        except JWTError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    # --- 3.  Anonymous / dev mode -------------------------------------------------
    if ALLOW_ANONYMOUS:
        return {}  # type: ignore[return-value]

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated") 