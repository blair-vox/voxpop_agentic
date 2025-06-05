from fastapi import APIRouter

router = APIRouter(prefix="/surveys", tags=["Surveys"])


@router.get("/")
async def list_surveys() -> list[dict]:
    return [] 