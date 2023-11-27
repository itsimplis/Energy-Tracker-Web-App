import json
import collections
import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from contextlib import contextmanager
from ...model.dbconnector import PostgresConnector
from ..users.authentication import get_current_user

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
    device_id: Optional[int] = None
    title: str
    description: str
    date: str
    type: str
    read_status: str

class UpdateAlert(BaseModel):
    id: int
    read_status: str

class DeviceData(BaseModel):
    device_category: str
    device_type: str
    device_name: str

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
async def get_alerts(unreadAlertsOnly: bool, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "title", "username", "device_id", "device_type", "device_name", "description", "date", "type", "read_status"]
            if (unreadAlertsOnly):
                result = connector.execute("""
                SELECT p.alert.id, p.alert.title, p.alert.username, p.alert.device_id, p.alert.description, p.alert.date, p.alert.type, p.alert.read_status 
                FROM p.alert
                WHERE p.alert.username = %s AND p.alert.read_status = %s ORDER BY date DESC""", (username, 'N'))
            else:
                result = connector.execute("""
                SELECT p.alert.id, p.alert.title, p.alert.username, p.alert.device_id, p.device.device_type, p.device.device_name, p.alert.description, p.alert.date, p.alert.type, p.alert.read_status 
                FROM p.alert
                LEFT JOIN p.device ON p.alert.device_id = p.device.id
                WHERE p.alert.username = %s ORDER BY (read_status='N') DESC, date DESC""", (username,))
            json_data = convert_to_json(result, keys)
        
        return json_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to add an alert for a user
@router.post("/addAlert")
async def add_alert(data: AddAlert, username: str = Depends(get_current_user)):
    
    with database_connection():
        connector.execute(f"""
            INSERT INTO p.alert (username, device_id, title, description, date, type, read_status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (username, data.device_id, data.title, data.description, data.date, data.type, data.read_status)
        )
        connector.commit()

    return {"message": f"You have a new alert!"}

# ===============================================================================================
# Endpoint to update an alert for a user (alert read status)
@router.patch("/updateAlert")
async def update_alert(data: UpdateAlert, username: str = Depends(get_current_user)):
    
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
@router.delete("/removeAlerts")
async def remove_alerts(username: str = Depends(get_current_user)):
    
    with database_connection():

        # Case check - alerts exist for a user
        result = connector.execute("""
        SELECT p.alert.id, p.alert.username
        FROM p.alert
        WHERE p.alert.username = %s""", (username,))

        if (result):
            connector.execute(f"""
                DELETE FROM p.alert WHERE p.alert.username = %s""", (
                    username,))
            connector.commit()
            return {"message": f"All alerts have been cleared!"}
        else:
            raise HTTPException(status_code=400, detail=f"There are no alerts to clear!")

# **************** #
# DEVICE ENDPOINTS #
# **************** #

# ===============================================================================================
# Endpoint to get user's devices
@router.get("/getDevices")
async def get_devices(username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "user_username", "device_type", "device_category", "device_name", "consumption_logs_count", "unread_alerts_count", "total_alerts_count"]
            result = connector.execute("""
            SELECT p.device.id, p.device.user_username, p.device.device_type, p.device.device_category, p.device.device_name,
                COALESCE(sub_consumption.consumption_count, 0) AS consumption_logs_count,
                COALESCE(sub_alerts.unread_alerts_count, 0) AS unread_alerts_count,
                COALESCE(sub_alerts.total_alerts_count, 0) AS total_alerts_count
            FROM p.device
            LEFT JOIN (SELECT device_id, COUNT(*) AS consumption_count FROM p.device_consumption GROUP BY device_id) AS sub_consumption
                ON p.device.id = sub_consumption.device_id
            LEFT JOIN (SELECT device_id, COUNT(*) AS total_alerts_count, COUNT(*) FILTER (WHERE read_status = 'N') AS unread_alerts_count 
                FROM p.alert 
                GROUP BY device_id) AS sub_alerts
                ON p.device.id = sub_alerts.device_id
            WHERE 
                p.device.user_username = %s
            """, (username,))
            json_data = convert_to_json(result, keys)

        return json_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get user's devices
@router.get("/getDevice/{device_id}")
async def get_device(device_id: int, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "user_username", "device_type", "device_category", "device_name", "alert_threshold_high", "alert_threshold_low"]
            result = connector.execute("""
            SELECT p.device.id, p.device.user_username, p.device.device_type, p.device.device_category, p.device.device_name, p.device.alert_threshold_high, p.device.alert_threshold_low 
            FROM p.device
            WHERE p.device.id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

        return json_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get all consumptions logs for a specific device
@router.get("/getDeviceConsumption/{device_id}")
async def get_device_consumption(device_id: int, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["consumption_id", "start_date", "end_date", "duration_days", "files_names", "power_max"]
            result = connector.execute("""
            SELECT p.consumption.id, p.consumption.start_date, p.consumption.end_date, p.consumption.duration_days, p.consumption.files_names, p.consumption.power_max
            FROM p.device
            LEFT JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
            LEFT JOIN p.consumption ON p.device_consumption.consumption_id = p.consumption.id
            WHERE p.device.id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

        return json_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get all alerts for a specific device
@router.get("/getDeviceAlerts/{device_id}")
async def get_device_alerts(device_id: int, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["title", "description", "date", "type", "read_status"]
            result = connector.execute("""
            SELECT p.alert.title, p.alert.description, p.alert.date, p.alert.type, p.alert.read_status
            FROM p.alert
            JOIN p.device ON p.alert.device_id = p.device.id
            WHERE p.alert.device_id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

        return json_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to add a device to user's devices
@router.post("/addDevice")
async def add_device(data: DeviceData, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            connector.execute(
                "INSERT INTO p.device (user_username, device_type, device_category, device_name) VALUES (%s, %s, %s, %s)",
                (username, data.device_type, data.device_category, data.device_name)
            )
            connector.commit()
            return {"message": f"Device '{data.device_name}' added successfully!"}
        except HTTPException:
            raise
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint remove a user's device
@router.delete("/removeDevice/{device_id}")
async def remove_device(device_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            result = connector.execute(
                """SELECT * FROM p.device WHERE p.device.id = %s AND p.device.user_username = %s""", (device_id, username)
            )
            if not result:
                raise HTTPException(
                    status_code=404, detail=f"Device with id {device_id} does not exist."
                )
            connector.execute(
                "DELETE FROM p.device WHERE p.device.id = %s", (device_id,)
            )
            connector.commit()
            return {"message": "Device removed successfully!"}

        except HTTPException as e:
            raise e
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        
# ********************* #
# CONSUMPTION ENDPOINTS #
# ********************* #

# ===============================================================================================
# Endpoint to get all power reading logs for a specific consumption
@router.get("/getConsumptionPowerReadings/{consumption_id}")
async def get_consumption_power_readings(consumption_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["reading_timestamp", "power"]

            ownership_check = connector.execute("""
                SELECT 1 FROM p.consumption
                JOIN p.device_consumption ON p.consumption.id = p.device_consumption.consumption_id
                JOIN p.device ON p.device_consumption.device_id = p.device.id
                WHERE p.consumption.id = %s AND p.device.user_username = %s""",
                (consumption_id, username)
            )
            if not ownership_check:
                raise HTTPException(status_code=404, detail="Consumption data not found or not owned by user")

            result = connector.execute("""
                SELECT p.power_reading.reading_timestamp, p.power_reading.power
                FROM p.power_reading
                WHERE p.power_reading.consumption_id = %s""", (consumption_id,))
            json_data = convert_to_json(result, keys)
            
            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))