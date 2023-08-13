import json
from fastapi import APIRouter
from ...model.dbconnector import PostgresConnector

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
    return {"result": "Users is ok !"}