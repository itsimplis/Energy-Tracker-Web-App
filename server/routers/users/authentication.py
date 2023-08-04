import json
import jwt
import bcrypt
from fastapi import APIRouter
from ...config.database import PostgresConnector

router = APIRouter()

connector = PostgresConnector(
    host="localhost",
    port=5432,
    database="postgres",
    user="postgres",
    password="password",
)

@router.get("/")
def get_data():
    return {"result": "Authentication is ok !"}