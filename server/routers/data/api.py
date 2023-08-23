import json
import collections
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
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

# ****************
# ALERTS
# ****************

# ===============================================================================================
# Endpoint to get the user details
@router.get("/getUnreadAlerts")
async def get_data(username: str):
    connector.connect()
    keys = ["id", "title", "type"]
    result = connector.execute(f"""
        SELECT p.alert.id, p.alert.title, p.alert.type 
        FROM p.alert
        WHERE p.alert.username = %s AND p.alert.read_status = %s""", (username, 'N'))
    
    data = [collections.OrderedDict(zip(keys, row)) for row in result]
    json_data = json.dumps(data, cls=DecimalEncoder)
    connector.disconnect()
    return json.loads(json_data)