import os
import json
import collections
import random
import datetime
import calendar
import pandas as pd
from datetime import date, timedelta
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
    suggestion: str
    date: str
    type: str
    read_status: str

class AddRegistrationAlert(BaseModel):
    username: str
    device_id: Optional[int] = None
    title: str
    description: str
    suggestion: str
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
    alert_threshold_high: float
    alert_threshold_low: float
    usage_frequency: str

class AddConsumptionPowerReadings(BaseModel):
    device_id: int
    start_date: date
    end_date: date
    duration_days: float

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

# **************************************************************************************************** #
# ALERTS ENDPOINTS #
# **************************************************************************************************** #

# ===============================================================================================
# Endpoint to get user's alerts, with basic info
@router.get("/getAlerts")
async def get_alerts(unreadAlertsOnly: bool, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "title", "username", "device_id", "device_type", "device_name", "description", "suggestion", "date", "type", "read_status"]
            if (unreadAlertsOnly):
                result = connector.execute("""
                SELECT p.alert.id, p.alert.title, p.alert.username, p.alert.device_id, p.alert.description, p.alert.suggestion, p.alert.date, p.alert.type, p.alert.read_status 
                FROM p.alert
                WHERE p.alert.username = %s AND p.alert.read_status = %s ORDER BY date DESC""", (username, 'N'))
            else:
                result = connector.execute("""
                SELECT p.alert.id, p.alert.title, p.alert.username, p.alert.device_id, p.device.device_type, p.device.device_name, p.alert.description, p.alert.suggestion, p.alert.date, p.alert.type, p.alert.read_status 
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
            INSERT INTO p.alert (username, device_id, title, description, suggestion, date, type, read_status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (username, data.device_id, data.title, data.description, data.suggestion, data.date, data.type, data.read_status)
        )
        connector.commit()

    return {"message": f"You have a new alert!"}

# ===============================================================================================
# Endpoint to add an alert specifically for user registration
@router.post("/addRegistrationAlert")
async def add_registration_alert(data: AddRegistrationAlert):
    
    with database_connection():
        connector.execute(f"""
            INSERT INTO p.alert (username, device_id, title, description, suggestion, date, type, read_status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (data.username, data.device_id, data.title, data.description, data.suggestion, data.date, data.type, data.read_status)
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




# **************************************************************************************************** #
# DEVICE TYPE ENDPOINTS #
# **************************************************************************************************** #

# ===============================================================================================
# Endpoint to get available device types
@router.get("/getDeviceTypes/{device_category}")
async def get_device_types(device_category: str):
    try:
        with database_connection():
            keys = ["type_name", "device_category", "power_min", "power_max", "power_draw_pattern"]
            result = connector.execute("""
            SELECT p.device_type.type_name, p.device_type.device_category, p.device_type.power_min, p.device_type.power_max, p.device_type.power_draw_pattern
            FROM p.device_type
            WHERE p.device_type.device_category = %s
            """, (device_category,))
            json_data = convert_to_json(result, keys)

        return json_data
    except HTTPException:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




# **************************************************************************************************** #
# DEVICE ENDPOINTS #
# **************************************************************************************************** #

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
    except HTTPException:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get user's devices
@router.get("/getDevice/{device_id}")
async def get_device(device_id: int, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "user_username", "device_type", "device_category", "device_name", "alert_threshold_high", "alert_threshold_low", "usage_frequency"]
            result = connector.execute("""
            SELECT p.device.id, p.device.user_username, p.device.device_type, p.device.device_category, p.device.device_name, p.device.alert_threshold_high, p.device.alert_threshold_low, p.device.usage_frequency 
            FROM p.device
            WHERE p.device.id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

        return json_data
    except HTTPException:
        raise e
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
            JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
            JOIN p.consumption ON p.device_consumption.consumption_id = p.consumption.id
            WHERE p.device.id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

        return json_data
    except HTTPException:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get all alerts for a specific device
@router.get("/getDeviceAlerts/{device_id}")
async def get_device_alerts(device_id: int, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "title", "description", "device_id", "device_type", "device_name", "suggestion", "date", "type", "read_status"]
            result = connector.execute("""
            SELECT p.alert.id, p.alert.title, p.alert.description, p.alert.device_id, p.device.device_type, p.device.device_name, p.alert.suggestion, p.alert.date, p.alert.type, p.alert.read_status
            FROM p.alert
            JOIN p.device ON p.alert.device_id = p.device.id
            WHERE p.alert.device_id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

        return json_data
    
    except HTTPException:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================================== 
# Endpoint to get all power readings for a specific device, including consumption start and end dates
@router.get("/getDevicePowerReadings/{device_id}")
async def get_device_power_readings(device_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["power_reading_id", "consumption_id", "reading_timestamp", "power", "start_date", "end_date"]

            result = connector.execute("""
            SELECT p.power_reading.id, p.power_reading.consumption_id, p.power_reading.reading_timestamp, p.power_reading.power, p.consumption.start_date, p.consumption.end_date
            FROM p.device
            JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
            JOIN p.consumption ON p.device_consumption.consumption_id = p.consumption.id
            JOIN p.power_reading ON p.consumption.id = p.power_reading.consumption_id
            WHERE p.device.id = %s AND p.device.user_username = %s""", (device_id, username))
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ===============================================================================================
# Endpoint to remove all alerts for a specific device
@router.delete("/removeDeviceAlerts/{device_id}")
async def remove_device_alerts(device_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            ownership_check = connector.execute("""
                SELECT 1 FROM p.device
                WHERE p.device.id = %s AND p.device.user_username = %s""",
                (device_id, username)
            )
            if not ownership_check:
                raise HTTPException(status_code=404, detail="Device not found or not owned by user")

            connector.execute("""
                DELETE FROM p.alert WHERE p.alert.device_id = %s""",
                (device_id,)
            )
            connector.commit()
            return {"message": "Device alerts have been cleared!"}
        
        except HTTPException:
            raise e
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to add a device to user's devices
@router.post("/addDevice")
async def add_device(data: DeviceData, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            connector.execute(
                "INSERT INTO p.device (user_username, device_type, device_category, device_name, alert_threshold_high, alert_threshold_low, usage_frequency) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (username, data.device_type, data.device_category, data.device_name, data.alert_threshold_high, data.alert_threshold_low, data.usage_frequency)
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
        



# **************************************************************************************************** #
# POWER READING ENDPOINTS #
# **************************************************************************************************** #

# ===============================================================================================
# Endpoint to get all power readings for all consumptions of a device - Enhanced
@router.post("/addConsumptionPowerReadings")
def generate_power_readings(data: AddConsumptionPowerReadings, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            # Get device type details
            device_details = connector.execute("""
                SELECT p.device.device_type, p.device_type.power_min, p.device_type.power_max, p.device_type.power_draw_pattern, p.device.device_category, p.device.device_name 
                FROM p.device 
                JOIN p.device_type ON p.device.device_type = p.device_type.type_name 
                WHERE p.device.id = %s AND p.device.user_username = %s
                """, (data.device_id, username))

            if not device_details:
                print(f"No device found with ID {data.device_id}")
                return

            device_type, power_min, power_max, power_draw_pattern, device_category, device_name = device_details[0]
            
            # Conversion to float
            power_min_float = float(power_min)
            power_max_float = float(power_max)

            # Define the frequency of readings
            delta = datetime.timedelta(hours=1)
            
            # Initialize previous reading for the first iteration
            previous_power = random.uniform(power_min_float, power_max_float)
            was_spike = False  # Flag to track if the last reading was a spike
            was_inactive = False  # Flag to track if the last reading was a period of inactivity
            
            # Parse the start and end dates from the request
            current_interval_start = datetime.datetime.combine(data.start_date, datetime.datetime.min.time())
            end_date = datetime.datetime.combine(data.end_date, datetime.datetime.min.time())

            # Breakdown the period into monthly intervals
            while current_interval_start < end_date:
                year, month = current_interval_start.year, current_interval_start.month
                last_day = calendar.monthrange(year, month)[1]
                interval_end = datetime.datetime(year, month, last_day, 23, 59, 59)

                # Adjust if interval_end exceeds end_date
                if interval_end > end_date:
                    interval_end = end_date

                interval_duration = (interval_end - current_interval_start).days
                max_power_for_interval = 0

                # Remove invalid characters from device_name
                invalid_chars = "!@#$%^&*()[]{};:,/<>?\|`~=_+"  # List of characters to remove
                cleaned_device_name = device_name.translate(str.maketrans("", "", invalid_chars))

                # Convert to lowercase, replace spaces with underscores, format dates 
                formatted_device_name = cleaned_device_name.lower().replace(" ", "_")
                start_date_formatted = current_interval_start.strftime('%d%m%Y')
                end_date_formatted = interval_end.strftime('%d%m%Y')

                # Define the file name with underscores and the correct file extension
                file_name = f"{formatted_device_name}_{start_date_formatted}_{end_date_formatted}.csv"
                
                # Create a new consumption record for the interval
                connector.execute("""
                    INSERT INTO p.consumption (start_date, end_date, duration_days, device_type, device_category, device_name, files_names) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (current_interval_start, interval_end, interval_duration, device_type, device_category, device_name, file_name))
                consumption_id = connector.execute("SELECT LASTVAL();")[0][0]

                # Link the consumption record with the device
                connector.execute("""
                    INSERT INTO p.device_consumption (device_id, consumption_id)
                    VALUES (%s, %s);
                    """, (data.device_id, consumption_id))
                
                # GENERATE POWER READINGS
                #-----------------------------------
                # Generate readings for the interval
                current_time = current_interval_start
                while current_time <= interval_end:
                    # Determine if the current reading should be a spike
                    if random.random() < 0.005:  # 0,5% chance to spike
                        power = random.uniform(power_max_float, power_max_float * 1.2)
                        was_spike = True
                        was_inactive = False
                    elif (power_draw_pattern == 'Occasional' and random.random() < 0.2) or \
                        (power_draw_pattern == 'Rare' and random.random() < 0.6):
                        # Set power to 0 for periods of inactivity
                        power = 0
                        was_inactive = True
                        was_spike = False
                    else:
                        # Set a maximum percentage change (e.g., 10% of the normal reading range)
                        max_change = (power_max_float - power_min_float) * 0.1

                        # Reset to a normal range value if the previous reading was a spike or inactive
                        if was_spike or was_inactive:
                            previous_power = random.uniform(power_min_float, power_max_float)
                            was_spike = False
                            was_inactive = False

                        # Generate the next normal reading
                        next_min = max(power_min_float, previous_power - max_change)
                        next_max = min(power_max_float, previous_power + max_change)
                        power = random.uniform(next_min, next_max)

                    connector.execute("""
                        INSERT INTO p.power_reading (consumption_id, reading_timestamp, power) 
                        VALUES (%s, %s, %s);
                        """, (consumption_id, current_time, power))
                    current_time += delta

                    # Update the previous reading for normal fluctuations
                    if not (was_spike or was_inactive):
                        previous_power = power
                        
                    # Update max_power_for_interval if the current power is greater
                    if power > max_power_for_interval:
                        max_power_for_interval = power

                # Move to the first day of the next month
                next_month = current_interval_start.replace(day=1, month=month % 12 + 1, year=year + (month // 12))
                current_interval_start = next_month if next_month > current_interval_start else next_month.replace(year=year + 1)
            
                # After generating power readings for the interval, update max_power in p.consumption
                connector.execute("""
                    UPDATE p.consumption SET power_max = %s WHERE p.consumption.id = %s
                    """, (max_power_for_interval, consumption_id))

                # Reset max_power_for_interval for the next interval
                max_power_for_interval = 0
            
            connector.commit()
            return {"message": "Consumption added successfully!"}
        except HTTPException as e:
            raise e
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))


# ===============================================================================================
# Endpoint to get all power readings for a specific consumption
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




# **************************************************************************************************** #
# DASHBOARD ENDPOINTS #
# **************************************************************************************************** #

# ===============================================================================================
# Endpoint to get counts of total devices, alerts and consumptions for current user        
@router.get("/getDashboardCounters")
async def get_dashboard_counters(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["total_devices", "total_consumptions", "total_alerts"]
            result = connector.execute("""
                SELECT COUNT(DISTINCT device.id), COUNT(DISTINCT consumption.id) , COUNT(DISTINCT alert.id)
                FROM p.user
                LEFT JOIN p.device ON p.user.username = p.device.user_username
                LEFT JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                LEFT JOIN p.consumption ON p.device_consumption.consumption_id = p.consumption.id
                LEFT JOIN p.alert ON p.user.username = p.alert.username
                WHERE p.user.username = %s""", (username,))
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get total power consumption, per device
@router.get("/getTotalPowerPerDevice")
async def get_total_power_per_device(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["device_id", "device_name", "device_category", "device_type", "total_power"]
            result = connector.execute("""
                SELECT p.device.id, p.device.device_name, p.device.device_category, p.device.device_type, COALESCE(SUM(p.power_reading.power), 0) AS total_power
                FROM p.device
                LEFT JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                LEFT JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.device.user_username = %s
                GROUP BY p.device.id, p.device.device_name
                ORDER BY total_power DESC""", (username,))
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get total power consumption, per device
@router.get("/getAveragePowerPerDevice")
async def get_average_power_per_device(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["device_id", "device_name", "device_category", "device_type", "average_power"]
            result = connector.execute("""
                SELECT p.device.id, p.device.device_name, p.device.device_category, p.device.device_type, COALESCE(AVG(p.power_reading.power), 0) AS average_power
                FROM p.device
                LEFT JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                LEFT JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.device.user_username = %s
                GROUP BY p.device.id, p.device.device_name
                ORDER BY average_power DESC""", (username,))
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get peak power analysis for a device
@router.get("/getPeakPowerAnalysis/{consumption_id}")
async def get_peak_power_analysis(consumption_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["consumption_id", "timestamp", "power", "average", "deviation"]
            result = connector.execute("""
                SELECT p.power_reading.consumption_id, p.power_reading.reading_timestamp, p.power_reading.power,
                    AVG(p.power_reading.power) OVER (PARTITION BY p.power_reading.consumption_id) AS average,
                    ((p.power_reading.power - AVG(p.power_reading.power) OVER (PARTITION BY p.power_reading.consumption_id)) / NULLIF(AVG(p.power_reading.power) OVER (PARTITION BY p.power_reading.consumption_id), 0)) AS deviation
                FROM p.power_reading
                INNER JOIN p.device_consumption ON p.power_reading.consumption_id = p.device_consumption.consumption_id
                INNER JOIN p.device ON p.device_consumption.device_id = p.device.id
                INNER JOIN p.user ON p.device.user_username = p.user.username
                WHERE p.power_reading.consumption_id = %s AND p.user.username = %s AND p.power_reading.power > 0
            """, (consumption_id, username))

            if not result:
                return []
            
            peaks = []
            for row in result:
                print(row)
                consumption_id, timestamp, power, average, deviation = row
                if deviation > 0.3:
                    peaks.append(row)

            json_data = convert_to_json(peaks, keys)

            return json_data

        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))




# **************************************************************************************************** #
# STATISTICS ENDPOINTS #
# **************************************************************************************************** #

# ===============================================================================================
# Endpoint to get the total power consumption per user
@router.get("/getTotalPowerConsumptionByUser")
async def get_total_power_consumption_by_user():
    with database_connection():
        try:
            keys = ["username", "total_power_consumption"]
            result = connector.execute("""
                SELECT p.user.username, SUM(p.power_reading.power) AS total_power_consumption
                FROM p.user
                JOIN p.device ON p.user.username = p.device.user_username
                JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.user.visibility = 'public'
                GROUP BY p.user.username
                ORDER BY total_power_consumption DESC
                """)
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ===============================================================================================
# Endpoint to get the total power consumption per device category for a specific user 
# and the average for other users
@router.get("/getUserConsumptionComparisonByCategory")
async def get_user_consumption_comparison_by_category(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["device_category", "user_total_power_consumption", "average_other_users_power_consumption"]
            query = """
                WITH user_consumption AS (
                    SELECT p.device.device_category, SUM(p.power_reading.power) / 1000 AS total_energy_kWh
                    FROM p.power_reading
                    JOIN p.device_consumption ON p.power_reading.consumption_id = p.device_consumption.consumption_id
                    JOIN p.device ON p.device_consumption.device_id = p.device.id
                    WHERE p.device.user_username = %s
                    GROUP BY p.device.device_category
                ),
                other_users_consumption AS (
                    SELECT p.device.device_category, AVG(SUM(p.power_reading.power) / 1000) OVER (PARTITION BY p.device.device_category) AS avg_energy_kWh
                    FROM p.power_reading
                    JOIN p.device_consumption ON p.power_reading.consumption_id = p.device_consumption.consumption_id
                    JOIN p.device ON p.device_consumption.device_id = p.device.id
                    WHERE p.device.user_username != %s
                    GROUP BY p.device.device_category, p.device.user_username
                )
                SELECT user_consumption.device_category, user_consumption.total_energy_kWh AS user_total_energy_consumption_kWh, other_users_consumption.avg_energy_kWh AS average_other_users_energy_consumption_kWh
                FROM user_consumption
                JOIN other_users_consumption ON user_consumption.device_category = other_users_consumption.device_category
                ORDER BY user_consumption.device_category
                """

            result = connector.execute(query, (username, username))
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get the total power consumption per age group
@router.get("/getAveragePowerConsumptionByAgeGroup")
async def get_average_power_consumption_by_age_group():
    with database_connection():
        try:
            keys = ["age", "average_power_consumption"]
            result = connector.execute("""
                SELECT p.user.age, AVG(p.power_reading.power) AS average_power_consumption
                FROM p.user
                JOIN p.device ON p.user.username = p.device.user_username
                JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.user.visibility = 'public'
                GROUP BY p.user.age
                """)
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get the total power consumption per gender
@router.get("/getTotalPowerConsumptionByGender")
async def get_total_power_consumption_by_gender():
    with database_connection():
        try:
            keys = ["gender", "total_power_consumption"]
            result = connector.execute("""
                SELECT p.user.gender, SUM(p.power_reading.power) AS total_power_consumption
                FROM p.user
                JOIN p.device ON p.user.username = p.device.user_username
                JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.user.visibility = 'public'
                GROUP BY p.user.gender
                """)
            
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
