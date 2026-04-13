from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

app = FastAPI(title="Taxi Demand Forecasting System API")

@app.on_event("startup")
def on_startup():
    # Optimization: Create tables only when the app is starting up,
    # preventing deadlocks during uvicorn reload/import cycles on Windows.
    Base.metadata.create_all(bind=engine)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, change to specific origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, zones, forecasts, contact

@app.get("/")
def root():
    return {"message": "Welcome to Taxi Demand Forecasting API"}

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(forecasts.router)
app.include_router(contact.router)

if __name__ == "__main__":
    import uvicorn
    # Optimization: Running directly via python main.py bypasses reloader deadlocks on Windows
    uvicorn.run(app, host="0.0.0.0", port=8000)

