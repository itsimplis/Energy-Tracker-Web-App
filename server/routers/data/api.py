import json
import collections
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from contextlib import contextmanager
from ...model.dbconnector import PostgresConnector

router = APIRouter()

connector = PostgresConnector(
    host="localhost",
    port=5432,
    database="postgres",
    user="postgres",
    password="password",
)

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)
    
class AddAlert(BaseModel):
    username: str
    title: str
    description: str
    date: str
    type: str
    read_status: str

@contextmanager
def database_connection():
    try:
        connector.connect()
        yield
    finally:
        connector.disconnect()

def convert_to_json(result, keys):
    data = [collections.OrderedDict(zip(keys, row)) for row in result]
    json_data = json.dumps(data, cls=DecimalEncoder)
    return json.loads(json_data)

# ****************
# ALERTS
# ****************

# ===============================================================================================
# Endpoint to get user's alerts, with basic info
@router.get("/getAlerts")
async def get_data(username: str, unreadAlertsOnly: bool):
    
    with database_connection():
        keys = ["id", "title", "type"]
        if (unreadAlertsOnly):
            result = connector.execute(f"""
            SELECT p.alert.id, p.alert.title, p.alert.type 
            FROM p.alert
            WHERE p.alert.username = %s AND p.alert.read_status = %s""", (username, 'N'))
        else:
            result = connector.execute(f"""
            SELECT p.alert.id, p.alert.title, p.alert.type 
            FROM p.alert
            WHERE p.alert.username = %s""", (username))
        json_data = convert_to_json(result, keys)
    
    return json_data

# ===============================================================================================
# Endpoint to get user's all unread alerts, with all info
@router.get("/getAlertsDetails")
async def get_data(username: str):
    
    with database_connection():
        keys = ["id", "title", "description", "date", "type", "read_status"]
        result = connector.execute(f"""
        SELECT p.alert.id, p.alert.title, p.alert.description, p.alert.date, p.alert.type, p.alert.read_status 
        FROM p.alert
        WHERE p.alert.username = %s""", (username))
        json_data = convert_to_json(result, keys)
    
    return json_data

# ===============================================================================================
# Endpoint to add an alert for a user
@router.get("/addAlert")
async def get_data(data: AddAlert):
    
    with database_connection():
        connector.execute(f"""
            INSERT INTO p.alert (username, title, description, date, type, read_status) 
            VALUES (%s, %s, %s, %s, %s, %s)f""",
            (data.username, data.title, data.description, data.date, data.type, data.read_status)
        )
        connector.commit()
        
    return {"message": f"A new alert has been added!"}

# ===============================================================================================
# Endpoint to clear all alerts of a user
@router.get("/clearAlerts")
async def get_data(username: str):
    
    with database_connection():

        # Case check - alerts exist for a user
        result = connector.execute(f"""
        SELECT p.alert.id, p.alert.username
        FROM p.alert
        WHERE p.alert.username = %s""", (username))

        if (result):
            connector.execute(f"""
                "DELETE FROM p.alert WHERE p.alert.username = %s""", (
                    username))
            connector.commit()
            return {"message": f"All alerts have been cleared!"}
        else:
            raise HTTPException(status_code=400, detail=f"There are no alerts to clear!")


