import os
import io
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
from fastapi.responses import StreamingResponse
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
    consumption_id: Optional[int] = None
    title: str
    description: str
    suggestion: str
    date: str
    type: str
    read_status: str

class AddRegistrationAlert(BaseModel):
    username: str
    device_id: Optional[int] = None
    consumption_id: Optional[int] = None
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
    energy_alert_threshold: float
    power_alert_threshold: float
    usage_frequency: str
    custom_power_min: float
    custom_power_max: float

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

def generate_alert_message(exceeded_peaks, non_exceeded_peaks, consumption_id, power_alert_threshold):
    
    # Default warning threshold percentage (if no user power_alert_threshold is specified)
    default_warning_threshold_percentage = Decimal('0.02')  # Default system - 2% before max power rating

    highest_exceeded_peak = None
    highest_warning_peak = None

    # Find the highest exceeded peak
    for peak in exceeded_peaks:
        if highest_exceeded_peak is None or peak[2] > highest_exceeded_peak[2]:
            highest_exceeded_peak = peak

    # Find the highest warning peak
    for peak in non_exceeded_peaks:
        custom_power_min = Decimal(peak[4])
        custom_power_max = Decimal(peak[3])
        power_range = custom_power_max - custom_power_min

        if (power_range == 0):
            continue
        else:
            # Adjust the threshold percentage based on the power range
            adjusted_threshold_percentage = default_warning_threshold_percentage * (power_range / custom_power_max)
            calculated_threshold = custom_power_max * (1 - adjusted_threshold_percentage)

            if power_alert_threshold != 0:
                warning_threshold = Decimal(power_alert_threshold)
            else:
                # Ensure warning threshold is not below the minimum power rating
                warning_threshold = max(custom_power_min, calculated_threshold)

            if Decimal(peak[2]) >= warning_threshold:
                if highest_warning_peak is None or Decimal(peak[2]) > Decimal(highest_warning_peak[2]):
                    highest_warning_peak = peak   

    if highest_exceeded_peak:
        timestamp, power, power_max = highest_exceeded_peak[1], highest_exceeded_peak[2], highest_exceeded_peak[3]
        timestamp = timestamp.strftime("%d/%m/%Y, %I:%M %p")
        title = "Critical Power Draw"
        type = 'C'
        description = (
            f"Critical Alert - [{timestamp}]: Power draw of {power:.1f} W has exceeded the "
            f"device maximum power rating of {power_max:.1f} W, for Consumption ID {consumption_id}. This level of consumption "
            "may indicate a potential issue with the device or abnormal operation."
        )
        suggestion = (
            "Immediate investigation is advised. Check for any unusual activity or malfunctioning equipment. "
            "Consider temporarily shutting down the device to mitigate risks."
        )
    elif highest_warning_peak:
        timestamp, power, power_max = highest_warning_peak[1], highest_warning_peak[2], highest_warning_peak[3]
        timestamp = timestamp.strftime("%d/%m/%Y, %I:%M %p")
        title = "Power Draw Warning"
        type = 'W'
        if power_alert_threshold != 0:
            description = (
                f"Warning Alert - [{timestamp}]: Power draw of {power:.1f} W has exceeded your set alert threshold "
                f"of {warning_threshold:.1f} W, for Consumption ID {consumption_id}. This might lead to potential "
                "capacity challenges if left unchecked, provided that your set alert threshold is accurate for your device."
            )
        else:
            description = (
                f"Warning Alert - [{timestamp}]: Power draw of {power:.1f} W has exceeded default system alert threshold "
                f"of {warning_threshold:.1f} W, for Consumption ID {consumption_id}. This might lead to potential "
                "capacity challenges if left unchecked, as it indicates poor operating efficiency."
            )
        suggestion = (
            "Review your current power usage patterns and alert threshold. Consider rescheduling high-power activities "
            "to off-peak hours, enabling 'Eco' mode, or distributing the load across different circuits."
        )
    else:
        # No significant power draw - no alert needed
        return None

    return title, description, suggestion, type

def generate_energy_alert_message(total_energy_consumption, energy_threshold, consumption_id):
    if (total_energy_consumption > energy_threshold) and (total_energy_consumption <= (energy_threshold * 3)):
        title = "High Energy Consumption"
        type = 'I'
        description = (
            f"Energy Consumption Notice: Your energy consumption of {total_energy_consumption:.2f} kWh for Consumption ID {consumption_id} "
            f"has surpassed the set threshold of {energy_threshold:.2f} kWh. "
            "This indicates a higher than usual energy demand."
        )
        suggestion = (
            "Consider identifying devices or activities contributing to high energy usage. "
            "Regular maintenance, using energy-efficient appliances, and turning off unused devices "
            "can help in reducing energy consumption."
        )
        return title, description, suggestion, type
    elif (total_energy_consumption > (energy_threshold * 3)):
        title = "Too High Energy Consumption"
        type = 'W'
        description = (
            f"Energy Consumption Notice: Your energy consumption of {total_energy_consumption:.2f} kWh for Consumption ID {consumption_id} "
            f"has surpassed the set threshold of {energy_threshold:.2f} kWh. "
            "This indicates an exceptionally higher than usual energy demand."
        )
        suggestion = (
            "Immediate action is required due to the exceptionally high energy consumption. "
            "Consider conducting a comprehensive energy audit to identify the primary sources of excessive usage. "
            "Replacing old, energy-inefficient equipment with high-efficiency alternatives. "
            "You may also seek professional advice on implementing an energy management system for more sustainable usage."
        )
        return title, description, suggestion, type

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
# Endpoint remove a single alert
@router.delete("/removeAlert/{alert_id}")
async def remove_alert(alert_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            result = connector.execute(
                """SELECT * FROM p.alert WHERE p.alert.id = %s AND p.alert.username = %s""", (alert_id, username)
            )
            if not result:
                raise HTTPException(
                    status_code=404, detail=f"Alert with id {alert_id} does not exist."
                )
            connector.execute(
                "DELETE FROM p.alert WHERE p.alert.id = %s", (alert_id,)
            )
            connector.commit()
            return {"message": "Alert removed successfully!"}

        except HTTPException as e:
            raise e
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))

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
            keys = ["id", "user_username", "device_type", "device_category", "device_name", "consumption_logs_count", "unread_alerts_count", "total_alerts_count", "custom_power_min", "custom_power_max", "energy_alert_threshold", "power_alert_threshold", "alert_level"]
            result = connector.execute("""
            SELECT p.device.id, p.device.user_username, p.device.device_type, p.device.device_category, p.device.device_name,
                COALESCE(sub_consumption.consumption_count, 0) AS consumption_logs_count,
                COALESCE(sub_alerts.unread_alerts_count, 0) AS unread_alerts_count,
                COALESCE(sub_alerts.total_alerts_count, 0) AS total_alerts_count,
                p.device.custom_power_min, p.device.custom_power_max, p.device.energy_alert_threshold, p.device.power_alert_threshold,
                CASE
                    WHEN EXISTS (SELECT 1 FROM p.alert WHERE device_id = p.device.id AND p.alert.type = 'C') THEN 'critical'
                    WHEN EXISTS (SELECT 1 FROM p.alert WHERE device_id = p.device.id AND p.alert.type = 'W') THEN 'warning'
                    WHEN EXISTS (SELECT 1 FROM p.alert WHERE device_id = p.device.id AND p.alert.type = 'I') THEN 'info'
                    ELSE 'normal'
                END AS alert_level
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
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/getDevice/{device_id}")
async def get_device(device_id: int, username: str = Depends(get_current_user)):
    try:
        with database_connection():
            keys = ["id", "user_username", "device_type", "device_category", "device_name", 
                    "energy_alert_threshold", "power_alert_threshold", "usage_frequency", 
                    "custom_power_min", "custom_power_max"]
            
            result = connector.execute("""
            SELECT p.device.id, p.device.user_username, p.device.device_type, p.device.device_category, 
                p.device.device_name, p.device.energy_alert_threshold, p.device.power_alert_threshold, 
                p.device.usage_frequency, p.device.custom_power_min, p.device.custom_power_max 
            FROM p.device
            WHERE p.device.id = %s AND p.device.user_username = %s
            """, (device_id, username))
            
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
            keys = ["consumption_id", "start_date", "end_date", "duration_days", "files_names", "power_max", "energy_max"]
            result = connector.execute("""
            SELECT p.consumption.id, p.consumption.start_date, p.consumption.end_date, p.consumption.duration_days, p.consumption.files_names, p.consumption.power_max, p.consumption.energy_max
            FROM p.device
            JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
            JOIN p.consumption ON p.device_consumption.consumption_id = p.consumption.id
            WHERE p.device.id = %s AND p.device.user_username = %s
            ORDER BY p.consumption.start_date
            """, (device_id, username))
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
            keys = ["id", "title", "description", "device_id", "consumption_id", "device_type", "device_name", "suggestion", "date", "type", "read_status"]
            result = connector.execute("""
            SELECT p.alert.id, p.alert.title, p.alert.description, p.alert.device_id, p.alert.consumption_id, p.device.device_type, p.device.device_name, p.alert.suggestion, p.alert.date, p.alert.type, p.alert.read_status
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
            WHERE p.device.id = %s AND p.device.user_username = %s
            ORDER BY p.power_reading.reading_timestamp                           
            """, (device_id, username))
            json_data = convert_to_json(result, keys)

            return json_data
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ================================================================================================= 
# Endpoint to download all power readings of all consumptions for a specific device, as .xlsx file
@router.get("/downloadAllConsumptionPowerReadings/{device_id}")
async def download_power_readings(device_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            query = """
            SELECT p.power_reading.reading_timestamp, p.power_reading.power
            FROM p.device
            JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
            JOIN p.consumption ON p.device_consumption.consumption_id = p.consumption.id
            JOIN p.power_reading ON p.consumption.id = p.power_reading.consumption_id
            WHERE p.device.id = %s AND p.device.user_username = %s
            ORDER BY p.power_reading.reading_timestamp
            """
            result = connector.execute(query, (device_id, username))

            if result:
                # Convert to DataFrame
                df = pd.DataFrame(result, columns=['reading_timestamp', 'power'])
                
                # Convert DataFrame to Excel
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    df.to_excel(writer, index=False, sheet_name='Power Readings')

                output.seek(0)
                filename = f"{device_id}_data.xlsx"

                return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={"Content-Disposition": f"attachment;filename={filename}"})
            else:
                raise HTTPException(status_code=404, detail="No data found")
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# Endpoint to download all power readings of a single consumption for a specific device, as .csv file
@router.get("/downloadConsumptionPowerReadings/{consumption_id}")
async def download_single_consumption_power_readings(consumption_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            query = """
            SELECT p.power_reading.reading_timestamp, p.power_reading.power
            FROM p.consumption
            JOIN p.power_reading ON p.consumption.id = p.power_reading.consumption_id
            WHERE p.consumption.id = %s
            ORDER BY p.power_reading.reading_timestamp
            """
            result = connector.execute(query, (consumption_id,))

            if result:
                # Convert to DataFrame
                df = pd.DataFrame(result, columns=['reading_timestamp', 'power'])
                
                # Convert DataFrame to CSV
                output = io.StringIO()
                df.to_csv(output, index=False)
                output.seek(0)

                filename = f"{consumption_id}_power_readings.csv"

                return StreamingResponse(
                    iter([output.getvalue()]), 
                    media_type='text/csv',
                    headers={"Content-Disposition": f"attachment;filename={filename}"}
                )
            else:
                raise HTTPException(status_code=404, detail="No data found")
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
# Endpoint to remove a single consumption record 
@router.delete("/removeConsumption/{consumption_id}")
async def remove_consumption(consumption_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:     
            # First, delete the related alerts
            connector.execute("""
                DELETE FROM p.alert 
                WHERE consumption_id IN (
                    SELECT id FROM p.consumption WHERE id = %s AND EXISTS (
                        SELECT 1 FROM p.device
                        JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                        WHERE p.device_consumption.consumption_id = %s AND p.device.user_username = %s
                    )
                )""",
                (consumption_id, consumption_id, username)
            )

            # Then, delete the consumption record
            connector.execute("""
                DELETE FROM p.device_consumption 
                WHERE consumption_id = %s AND EXISTS (
                    SELECT 1 FROM p.device
                    JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                    WHERE p.device_consumption.consumption_id = %s AND p.device.user_username = %s
                )""",
                (consumption_id, consumption_id, username)
            )

            connector.commit()
            return {"message": "Consumption record and related alerts removed successfully!"}

        except HTTPException as e:
            raise e
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to remove all consumption records for a specific device (and, optionally associated alerts)
@router.delete("/removeAllDeviceConsumption/{device_id}")
async def remove_all_device_consumption(device_id: int, username: str = Depends(get_current_user)):
    with database_connection():
        try:     
            # First, delete related alerts
            connector.execute("""
                DELETE FROM p.alert 
                WHERE consumption_id IN (
                    SELECT p.consumption.id FROM p.consumption
                    JOIN p.device_consumption ON p.consumption.id = p.device_consumption.consumption_id
                    WHERE p.device_consumption.device_id = %s AND EXISTS (
                        SELECT 1 FROM p.device WHERE id = %s AND user_username = %s
                    )
                )""",
                (device_id, device_id, username)
            )

            # Then, delete all device consumption records
            connector.execute("""
                DELETE FROM p.device_consumption 
                WHERE device_id = %s AND EXISTS (
                    SELECT 1 FROM p.device WHERE id = %s AND user_username = %s
                )""",
                (device_id, device_id, username)
            )

            connector.commit()
            return {"message": "All device consumption records and related alerts have been cleared!"}

        except HTTPException as e:
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
                "INSERT INTO p.device (user_username, device_type, device_category, device_name, energy_alert_threshold, power_alert_threshold, usage_frequency, custom_power_min, custom_power_max) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (username, data.device_type, data.device_category, data.device_name, data.energy_alert_threshold, data.power_alert_threshold, data.usage_frequency, data.custom_power_min, data.custom_power_max)
            )
            connector.commit()
            return {"message": f"Device '{data.device_name}' added successfully!"}
        except HTTPException:
            raise
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        
# ===============================================================================================
# Endpoint to edit a user's device
@router.patch("/editDevice/{device_id}")
async def edit_device(device_id: int, data: DeviceData, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            connector.execute(
                "UPDATE p.device SET device_type = %s, device_category = %s, device_name = %s, energy_alert_threshold = %s, power_alert_threshold = %s, usage_frequency = %s, custom_power_min = %s, custom_power_max = %s WHERE id = %s AND user_username = %s",
                (data.device_type, data.device_category, data.device_name, data.energy_alert_threshold, data.power_alert_threshold, data.usage_frequency, data.custom_power_min, data.custom_power_max, device_id, username)
            )
            connector.commit()
            return {"message": f"Device '{data.device_name}' updated successfully!"}
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
                SELECT p.device.device_type, p.device.custom_power_min, p.device.custom_power_max, p.device_type.power_draw_pattern, p.device.device_category, p.device.device_name 
                FROM p.device 
                JOIN p.device_type ON p.device.device_type = p.device_type.type_name 
                WHERE p.device.id = %s AND p.device.user_username = %s
                """, (data.device_id, username))

            if not device_details:
                print(f"No device found with ID {data.device_id}")
                return

            device_type, custom_power_min, custom_power_max, power_draw_pattern, device_category, device_name = device_details[0]
            
            # List to store the newly created consumption IDs
            consumption_ids = [] 
            
            # Conversion to float 
            power_min_float = float(custom_power_min)
            power_max_float = float(custom_power_max)
            
            # Define the frequency of readings
            delta = datetime.timedelta(hours=1)
            
            # Initialize previous reading for the first iteration, and reset inactivity duation
            previous_power = random.uniform(power_min_float, power_max_float)
            was_spike = False
            was_inactive = False
            inactivity_duration = 0
            
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
                max_energy_for_interval = 0
                energy_accumulated = 0

                # Remove invalid characters from device_name
                invalid_chars = "!@#$%^&*()[]{};:,/<>?\|`~=_+"
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
                    # Set power to 0 for periods of inactivity
                    if was_inactive and inactivity_duration > 0:
                        power = 0
                        inactivity_duration -= 1
                    else:
                        if random.random() < 0.0008:  # 0,08% chance to spike
                            power = random.uniform(power_max_float, power_max_float * 1.2)
                            was_spike = True
                            was_inactive = False
                        elif (power_draw_pattern == 'Occasional' and random.random() < 0.35) or \
                            (power_draw_pattern == 'Rare' and random.random() < 0.75):
                            if (power_draw_pattern == 'Occasional'):
                                inactivity_duration = random.randint(6, 10)
                            else:
                                inactivity_duration = random.randint(12, 24)
                            power = 0
                            was_inactive = True
                            was_spike = False
                        else:
                            # Randomly choose a percentage between 1% and 3%
                            fluctuation_percentage = random.uniform(0.01, 0.03)  # Random percentage between 1% and 3%
                            max_change = (power_max_float - power_min_float) * fluctuation_percentage
                            
                            # Reset to a normal range value if the previous reading was a spike or inactive
                            if was_spike or was_inactive:
                                previous_power = random.uniform(power_min_float, power_max_float)
                                was_spike = False
                                was_inactive = False

                            # Generate the next normal reading
                            next_min = max(power_min_float, previous_power - max_change)
                            next_max = min(power_max_float, previous_power + max_change)
                            power = random.uniform(next_min, next_max)

                    # Energy calculation (for hourly power redings)
                    # Convert power (W) to energy (kWh) for one hour
                    energy = power * 1 / 1000  
                    energy_accumulated += energy

                    # Update max energy if needed
                    if energy_accumulated > max_energy_for_interval:
                        max_energy_for_interval = energy_accumulated

                    connector.execute("""
                        INSERT INTO p.power_reading (consumption_id, reading_timestamp, power) 
                        VALUES (%s, %s, %s);
                        """, (consumption_id, current_time, power))
                    current_time += delta

                    if not (was_spike or was_inactive):
                        previous_power = power

                    if power > max_power_for_interval:
                        max_power_for_interval = power

                # Move to the first day of the next month
                next_month = current_interval_start.replace(day=1, month=month % 12 + 1, year=year + (month // 12))
                current_interval_start = next_month if next_month > current_interval_start else next_month.replace(year=year + 1)

                # After generating power readings for the interval, update max_power in p.consumption
                connector.execute("""
                    UPDATE p.consumption SET power_max = %s, energy_max = %s WHERE p.consumption.id = %s
                    """, (max_power_for_interval, max_energy_for_interval, consumption_id))

                # Add the consumption_id to the list
                consumption_ids.append(consumption_id)
                
                # Reset max_power_for_interval, max_energy_for_interval for the next interval
                max_power_for_interval = 0
                max_energy_for_interval = 0
            
            connector.commit()
            return {"message": "Consumption added successfully!", "consumption_ids": consumption_ids}
        except HTTPException as e:
            connector.rollback()
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
                SELECT p.device.id, p.device.device_name, p.device.device_category, p.device.device_type, COALESCE(SUM(p.power_reading.power), 0) / 1000 AS total_power
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
# Endpoint to get average power peak, per device
@router.get("/getAveragePowerPerDevice")
async def get_average_power_per_device(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["device_id", "device_name", "device_category", "device_type", "average_power"]
            result = connector.execute("""
                SELECT 
                    p.device.id, 
                    p.device.device_name, 
                    p.device.device_category, 
                    p.device.device_type, 
                    COALESCE(AVG(NULLIF(p.power_reading.power, 0)), 0) AS average_power
                FROM p.device
                LEFT JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                LEFT JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.device.user_username = %s AND p.power_reading.power <> 0
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
            keys = ["consumption_id", "timestamp", "power", "power_max", "power_min," "exceeded"]

            result = connector.execute("""
                SELECT p.power_reading.consumption_id, p.power_reading.reading_timestamp, p.power_reading.power,
                       p.device.custom_power_max, p.device.custom_power_min,
                       CASE WHEN p.power_reading.power > p.device.custom_power_max THEN TRUE
                            ELSE NULL END AS exceeded
                FROM p.power_reading
                INNER JOIN p.device_consumption ON p.power_reading.consumption_id = p.device_consumption.consumption_id
                INNER JOIN p.device ON p.device_consumption.device_id = p.device.id
                INNER JOIN p.device_type ON p.device.device_type = p.device_type.type_name
                INNER JOIN p.user ON p.device.user_username = p.user.username
                WHERE p.power_reading.consumption_id = %s AND p.user.username = %s
            """, (consumption_id, username))

            if not result:
                return []
            
            # Filter for records that are over or close to the limit
            peaks = [row for row in result if row[-1] is not None]

            json_data = convert_to_json(peaks, keys)
            
            # Fetch the power alert threshold for the device
            power_alert_threshold_result = connector.execute("""
                SELECT p.device.power_alert_threshold
                FROM p.device
                INNER JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                WHERE p.device_consumption.consumption_id = %s AND p.device.user_username = %s
                LIMIT 1
            """, (consumption_id, username))
            
            power_alert_threshold = 0
            if power_alert_threshold_result:
                power_alert_threshold = power_alert_threshold_result[0][0]

            # Split in peaks that exceeded and not exceeded max power rating
            exceeded_peaks = [row for row in peaks if row[-1]]
            non_exceeded_peaks = [row for row in result if not row[-1]]

            # Generate either Warning or Critical alerts
            alert_message = generate_alert_message(exceeded_peaks, non_exceeded_peaks, consumption_id, power_alert_threshold)
            if alert_message:
                alert_title, alert_description, alert_suggestion, alert_type = alert_message
                
                connector.execute("""
                    INSERT INTO p.alert (username, device_id, consumption_id, title, description, suggestion, date, type, read_status)
                    VALUES (%s, (SELECT device_id FROM p.device_consumption WHERE consumption_id = %s LIMIT 1), %s, %s, %s, %s, NOW(), %s, 'N');
                """, (username, consumption_id, consumption_id, alert_title, alert_description, alert_suggestion, alert_type))

            # Fetch the energy and power consumption threshold for the device
            energy_threshold_result = connector.execute("""
                SELECT p.device.energy_alert_threshold
                FROM p.device
                INNER JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                WHERE p.device_consumption.consumption_id = %s AND p.device.user_username = %s
                LIMIT 1
            """, (consumption_id, username))

            # Ensure there is a result and extract the threshold
            if energy_threshold_result:
                energy_threshold = energy_threshold_result[0][0]
                
                # Check if the threshold is non-zero (since zero means 'disabled')
                if (energy_threshold != 0):  
                    # Calculate total energy consumption and compare with threshold
                    total_energy_consumption = sum([float(row[2]) for row in result]) / 1000.0
                    alert_message = generate_energy_alert_message(total_energy_consumption, energy_threshold, consumption_id)
                    if alert_message:
                        alert_title, alert_description, alert_suggestion, alert_type = alert_message

                        # Insert the alert into the database
                        connector.execute("""
                            INSERT INTO p.alert (username, device_id, consumption_id, title, description, suggestion, date, type, read_status)
                            VALUES (%s, (SELECT device_id FROM p.device_consumption WHERE consumption_id = %s LIMIT 1), %s, %s, %s, %s, NOW(), %s, 'N');
                        """, (username, consumption_id, consumption_id, alert_title, alert_description, alert_suggestion, alert_type))

            connector.commit()
            return json_data

        except HTTPException as e:
            raise e
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))




# **************************************************************************************************** #
# STATISTICS ENDPOINTS #
# **************************************************************************************************** #

# ===============================================================================================
# Endpoint to get the global top 10 devices, with the highest average power draw 
@router.get("/getTopTenDevicesByPowerDraw")
async def get_top_ten_devices_by_power_draw():
    with database_connection():
        try:
            keys = ["device_name", "average_power_draw"]
            query = """
                SELECT p.device.device_name, AVG(p.power_reading.power) AS average_power_draw
                FROM p.power_reading
                JOIN p.device_consumption ON p.power_reading.consumption_id = p.device_consumption.consumption_id
                JOIN p.device ON p.device_consumption.device_id = p.device.id
                WHERE p.power_reading.power > 0
                GROUP BY p.device.device_name
                ORDER BY average_power_draw DESC
                LIMIT 10
                """

            result = connector.execute(query)
            if result is not None:
                json_data = convert_to_json(result, keys)
                return json_data
            else:
                return {"message": "No data found"}
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

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
# Endpoint to get the total hours of usage per device category for a specific user 
# and the average for other users
@router.get("/getUserUsageComparisonByCategory")
async def get_user_usage_comparison_by_category(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            keys = ["device_category", "user_total_usage_hours", "average_other_users_usage_hours"]
            query = """
                WITH user_usage AS (
                    SELECT 
                        p.device.device_category, 
                        SUM(p.consumption.duration_days * 24) AS total_usage_hours
                    FROM p.consumption
                    JOIN p.device_consumption ON p.consumption.id = p.device_consumption.consumption_id
                    JOIN p.device ON p.device_consumption.device_id = p.device.id
                    WHERE p.device.user_username = %s
                    GROUP BY p.device.device_category
                ),
                other_users_usage AS (
                    SELECT 
                        p.device.device_category, 
                        AVG(SUM(p.consumption.duration_days * 24)) OVER (PARTITION BY p.device.device_category) AS avg_usage_hours
                    FROM p.consumption
                    JOIN p.device_consumption ON p.consumption.id = p.device_consumption.consumption_id
                    JOIN p.device ON p.device_consumption.device_id = p.device.id
                    WHERE p.device.user_username != %s
                    GROUP BY p.device.device_category, p.device.user_username
                )
                SELECT 
                    user_usage.device_category, 
                    user_usage.total_usage_hours AS user_total_usage_hours, 
                    other_users_usage.avg_usage_hours AS average_other_users_usage_hours
                FROM user_usage
                JOIN other_users_usage ON user_usage.device_category = other_users_usage.device_category
                ORDER BY user_usage.device_category
                """

            result = connector.execute(query, (username, username))
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
# Endpoint to get the average total energy consumption per age group, measured in kilowatt-hours
@router.get("/getAverageEnergyConsumptionByAgeGroup")
async def get_average_energy_consumption_by_age_group():
    with database_connection():
        try:
            keys = ["age_group", "average_total_power_consumption"]
            result = connector.execute("""
                SELECT 
                    CASE
                        WHEN CAST(p.user.age AS INTEGER) BETWEEN 18 AND 25 THEN '18-25'
                        WHEN CAST(p.user.age AS INTEGER) BETWEEN 26 AND 35 THEN '26-35'
                        WHEN CAST(p.user.age AS INTEGER) BETWEEN 36 AND 45 THEN '36-45'
                        WHEN CAST(p.user.age AS INTEGER) BETWEEN 46 AND 55 THEN '46-55'
                        WHEN CAST(p.user.age AS INTEGER) > 55 THEN '55+'
                        ELSE 'Other'
                    END AS age_group,
                    SUM(p.power_reading.power) / COUNT(DISTINCT p.user.username) / 1000 AS average_total_power_consumption
                FROM p.user
                JOIN p.device ON p.user.username = p.device.user_username
                JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.user.visibility = 'public' AND p.user.age <> ''
                GROUP BY age_group
                """)
            
            if result is not None:
                json_data = convert_to_json(result, keys)
                return json_data
            else:
                return {"message": "No data found"}
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ===============================================================================================
# Endpoint to get the average total energy consumption per gender, measured in kilowatt-hours (kWh)
@router.get("/getAverageEnergyConsumptionByGender")
async def get_average_energy_consumption_by_gender():
    with database_connection():
        try:
            keys = ["gender", "average_total_power_consumption"]
            result = connector.execute("""
                SELECT p.user.gender, SUM(p.power_reading.power) / COUNT(DISTINCT p.user.username) / 1000 AS average_total_power_consumption
                FROM p.user
                JOIN p.device ON p.user.username = p.device.user_username
                JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.user.visibility = 'public' AND p.user.gender <> ''
                GROUP BY p.user.gender
                """)
            
            if result is not None:
                json_data = convert_to_json(result, keys)
                return json_data
            else:
                return {"message": "No data found"}
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
# ===============================================================================================
# Endpoint to get the average total energy consumption per country, measured in kilowatt-hours (kWh)
@router.get("/getAverageEnergyConsumptionByCountry")
async def get_average_energy_consumption_by_country():
    with database_connection():
        try:
            keys = ["country", "average_total_power_consumption"]
            result = connector.execute("""
                SELECT p.user.country, SUM(p.power_reading.power) / COUNT(DISTINCT p.user.username) / 1000 AS average_total_power_consumption
                FROM p.user
                JOIN p.device ON p.user.username = p.device.user_username
                JOIN p.device_consumption ON p.device.id = p.device_consumption.device_id
                JOIN p.power_reading ON p.device_consumption.consumption_id = p.power_reading.consumption_id
                WHERE p.user.visibility = 'public' AND p.user.country <> ''
                GROUP BY p.user.country
                """)
            
            if result is not None:
                json_data = convert_to_json(result, keys)
                return json_data
            else:
                return {"message": "No data found"}
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
