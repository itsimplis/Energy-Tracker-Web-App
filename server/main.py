from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .routers.data.api import router as api_router
from .routers.users.authentication import router as auth_router
from .routers.users.user import router as user_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/data")
app.include_router(auth_router, prefix="/auth")
app.include_router(user_router, prefix="/user")



@app.get("/")
def get_data():
    return {"result": "API is ok !"}