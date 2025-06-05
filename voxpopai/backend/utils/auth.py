from __future__ import annotations

import os
import time
from functools import lru_cache
from typing import Dict, Any

import requests
from jose import jwk, jwt, JWTError
from jose.utils import base64url_decode
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

COGNITO_REGION = os.getenv("COGNITO_REGION", "ap-southeast-2")
COGNITO_POOL_ID = os.getenv("COGNITO_POOL_ID")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

if not COGNITO_POOL_ID:
    raise RuntimeError("COGNITO_POOL_ID env var not set")

ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"


@lru_cache(maxsize=1)
def get_jwks() -> Dict[str, Any]:
    resp = requests.get(JWKS_URL, timeout=5)
    resp.raise_for_status()
    return resp.json()


def _verify_token(token: str) -> Dict[str, Any]:
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


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Security(security_scheme)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        claims = _verify_token(token)
        return claims
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}") 