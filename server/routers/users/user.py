import json
import collections
import datetime
from contextlib import contextmanager
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
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

class GetData(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    age: str
    gender: str
    country: str
    visibility: str
    notifications: str

class UserUpdateData(BaseModel):
    first_name: str
    last_name: str
    age: str
    gender: str
    country: str
    visibility: str
    notifications: str

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

# ===============================================================================================
# Endpoint to get the user details
@router.get("/get/")
async def get_user(username: str = Depends(get_current_user)):
    with database_connection():
        keys = ["username", "email", "first_name", "last_name", "age", "gender", "country", "visibility", "notifications"]
        result = connector.execute(f"""
            SELECT p.user.username, p.user.email, p.user.first_name, p.user.last_name, p.user.age, p.user.gender, p.user.country, p.user.visibility, p.user.notifications 
            FROM p.user
            WHERE p.user.username = %s""", (username,))
        json_data = convert_to_json(result, keys)

    return json_data

# ===============================================================================================
# Endpoint to update user data
@router.patch("/update/")
async def update_user(data: UserUpdateData, username: str = Depends(get_current_user)):
    with database_connection():
        try:
            # Case check- User does not exist
            result = connector.execute(
                "SELECT * FROM p.user WHERE p.user.username = %s", (username,)
            )

            if result:
                connector.execute(
                    "UPDATE p.user SET first_name = %s, last_name = %s, age = %s, gender = %s, country = %s, visibility = %s, notifications = %s WHERE username = %s",
                    (data.first_name, data.last_name, data.age, data.gender, data.country, data.visibility, data.notifications, username)
                )
                connector.commit()
                return {"message": "User details updated successfully!"}
            else:
                raise HTTPException(
                    status_code=400, detail="User does not exist!")
        except HTTPException:
            raise
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    
# ===============================================================================================
# Endpoint to remove a user
@router.delete("/delete/")
async def delete_user(username: str = Depends(get_current_user)):
    with database_connection():
        try:
            # Case check- User does not exist
            result = connector.execute(
                "SELECT * FROM p.user WHERE p.user.username = %s", (username,)
            )

            if result:
                connector.execute(
                    "DELETE FROM p.user WHERE username = %s",
                    (username,)
                )
                connector.commit()
                return {"message": "Account deleted successfully!"}
            else:
                raise HTTPException(
                    status_code=404, detail="User not found!")
        except HTTPException:
            raise
        except Exception as e:
            connector.rollback()
            raise HTTPException(status_code=500, detail=str(e))