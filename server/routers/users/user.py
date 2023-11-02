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

class UpdateData(BaseModel):
    username: str
    first_name: str
    last_name: str
    age: str
    gender: str
    country: str
    visibility: str
    notifications: str

# ===============================================================================================
# Endpoint to get the user details
@router.get("/get")
async def get_user(username: str):
    connector.connect()
    keys = ["username", "email", "first_name", "last_name", "age", "gender", "country", "visibility", "notifications"]
    result = connector.execute(f"""
        SELECT p.user.username, p.user.email, p.user.first_name, p.user.last_name, p.user.age, p.user.gender, p.user.country, p.user.visibility, p.user.notifications 
        FROM p.user
        WHERE p.user.username = %s""", (username,))
    
    data = [collections.OrderedDict(zip(keys, row)) for row in result]
    json_data = json.dumps(data, cls=DecimalEncoder)
    connector.disconnect()
    return json.loads(json_data)

# ===============================================================================================
# Endpoint to update user data
@router.patch("/update")
async def update_user(data: UpdateData):
    connector.connect()

    try:
        result = connector.execute(
            "SELECT * FROM p.user WHERE p.user.username = %s", (data.username,)
        )

        if result:
            user = result[0]
        else:
            user = None

        # Case check - User does not exist
        if user is None:
            raise HTTPException(
                status_code=400, detail="User does not exist!")

        # Update user's details
        connector.execute(
            "UPDATE p.user SET first_name = %s, last_name = %s, age = %s, gender = %s, country = %s, visibility = %s, notifications = %s WHERE username = %s",
            (data.first_name, data.last_name, data.age, data.gender, data.country, data.visibility, data.notifications, data.username)
        )

        connector.commit()
        return {"message": "User details updated successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Something went wrong!")