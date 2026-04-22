from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import os
import sys

# Initialize FastAPI app
app = FastAPI(title="Taxi Demand Forecasting System API")

@app.on_event("startup")
def on_startup():
    try:
        # Optimization: Create tables only when the app is starting up
        Base.metadata.create_all(bind=engine)
        print("Database tables verified/created successfully.")
    except Exception as e:
        print(f"Database startup error: {e}")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers import auth, zones, forecasts, contact, intelligence

@app.get("/")
def root():
    return {
        "message": "Welcome to Taxi Demand Forecasting API",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(forecasts.router)
app.include_router(contact.router)
app.include_router(intelligence.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

