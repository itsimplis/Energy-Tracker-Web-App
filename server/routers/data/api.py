import json
import collections
import datetime
from decimal import Decimal
from typing import Optional
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

class ExtendedEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        return super().default(o)
    
class AddAlert(BaseModel):
    username: str
    device_id: Optional[int] = None
    title: str
    description: str
    date: str
    type: str
    read_status: str

class UpdateAlert(BaseModel):
    id: int
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
    json_data = json.dumps(data, cls=ExtendedEncoder)
    return json.loads(json_data)

# **************** #
# ALERTS ENDPOINTS #
# **************** #

# ===============================================================================================
# Endpoint to get user's alerts, with basic info
@router.get("/getAlerts")
async def get_alerts(username: str, unreadAlertsOnly: bool):
    
    with database_connection():
        keys = ["id", "title", "username", "device_id", "description", "date", "type", "read_status"]
        if (unreadAlertsOnly):
            result = connector.execute(f"""
            SELECT p.alert.id, p.alert.title, p.alert.username, p.alert.device_id, p.alert.description, p.alert.date, p.alert.type, p.alert.read_status 
            FROM p.alert
            WHERE p.alert.username = %s AND p.alert.read_status = %s ORDER BY date DESC""", (username, 'N'))
        else:
            result = connector.execute(f"""
            SELECT p.alert.id, p.alert.title, p.alert.username, p.alert.device_id, p.alert.description, p.alert.date, p.alert.type, p.alert.read_status 
            FROM p.alert
            WHERE p.alert.username = %s ORDER BY (read_status='N') DESC, date DESC""", (username,))
        json_data = convert_to_json(result, keys)
    
    return json_data

# ===============================================================================================
# Endpoint to add an alert for a user
@router.post("/addAlert")
async def add_alert(data: AddAlert):
    
    with database_connection():
        connector.execute(f"""
            INSERT INTO p.alert (username, device_id, title, description, date, type, read_status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (data.username, data.device_id, data.title, data.description, data.date, data.type, data.read_status)
        )
        connector.commit()

    return {"message": f"You have a new alert!"}

# ===============================================================================================
# Endpoint to update an alert for a user (alert read status)
@router.patch("/updateAlert")
async def update_alert(data: UpdateAlert):
    
    with database_connection():
        connector.execute(f"""
            UPDATE p.alert 
            SET read_status = %s
            WHERE id = %s""",
            (data.read_status, data.id)
        )
        connector.commit()
        
    return {"message": f"Alert updated!"}

# ===============================================================================================
# Endpoint to clear all alerts of a user
@router.post("/removeAlerts")
async def clear_alerts(username: str):
    
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


