from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

# Create tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Taxi Demand Forecasting System API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, change to specific origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, zones, forecasts

@app.get("/")
def root():
    return {"message": "Welcome to Taxi Demand Forecasting API"}

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(forecasts.router)

