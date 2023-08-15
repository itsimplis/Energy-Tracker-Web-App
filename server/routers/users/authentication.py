import json
import collections
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from decimal import Decimal
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

class RegisterData(BaseModel):
    email: str
    username: str
    password: str
    password2: str
    first_name: str
    last_name: str
    age: str
    gender: str
    country: str
    

class LoginData(BaseModel):
    username: str
    password: str


# Secret key for JWT authentication signing
JWT_SECRET_KEY = "7f59da32cdeef05ac9ec8a5da22b9f120c152bccfc1a02a57b96db5c14db52a5"

# ===============================================================================================
# Endpoint to register as a new user
@router.post("/register")
async def register(data: RegisterData):
    connector.connect()

    # Case check - Blank username or white-space
    if not data.username.strip():
        raise HTTPException(
            status_code=400, detail="Username cannot be blank!")

    # Case check - Blank password or white-space
    if not data.password.strip():
        raise HTTPException(
            status_code=400, detail="Password cannot be blank!")

    # Case check - Blank email or white-space
    if not data.email.strip():
        raise HTTPException(
            status_code=400, detail="Email cannot be blank")

    # Case check - Password validation failed
    if (data.password != data.password2):
        raise HTTPException(
            status_code=400, detail="Password do not match!")

    # Case check - Username already exists
    result = connector.execute(
        "SELECT p.user.username FROM p.user WHERE p.user.username = %s", (
            data.username,)
    )
    if result:
        raise HTTPException(
            status_code=400, detail=f"Username '{data.username}' already exists!")

    # Hash the password before storing
    hashed_password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt())

    connector.execute(
        "INSERT INTO p.user (username, email, password, first_name, last_name, age, gender, country) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (data.username, data.email, hashed_password.decode('utf-8'), data.first_name, data.last_name, data.age, data.gender, data.country)
    )

    connector.commit()
    return {"message": "Account registered successfully!"}

# ===============================================================================================
# Endpoint to login as an existing user
@router.post("/login")
async def login(data: LoginData):
    connector.connect()

    result = connector.execute(
        "SELECT * FROM p.user WHERE p.user.username = %s", (data.username,)
    )

    if result:
        user = result[0]
    else:
        user = None

    # Case check - Incorrect username or password
    if user is None or not bcrypt.checkpw(data.password.encode(), user[2].encode('utf-8')):
        raise HTTPException(
            status_code=400, detail="Incorrect username or password!")

    # Generate JWT access token
    access_token = generate_access_token(user[0])
    return {"access_token": access_token, "username": user[0], "message": "Logged in successfully!"}

# ===============================================================================================
# Define JWT payload and generate JWT token (token expiration days: 1)
def generate_access_token(username):

    payload = {
        "username": username,
        "exp": datetime.utcnow() + timedelta(days=1)
    }

    # Generate JWT token
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

    return token