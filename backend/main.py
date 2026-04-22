from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import os
import sys

# 1. Initialize App FIRST
app = FastAPI(title="Taxi Demand Forecasting System API")

# 2. Define Root & Health Routes IMMEDIATELY
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

# 3. Configure Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Import and Include Routers
from routers import auth, zones, forecasts, contact, intelligence

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(forecasts.router)
app.include_router(contact.router)
app.include_router(intelligence.router)

# 5. Startup logic
@app.on_event("startup")
def on_startup():
    try:
        # Optimization: Create tables only when the app is starting up
        Base.metadata.create_all(bind=engine)
        print("Database tables verified/created successfully.")
    except Exception as e:
        print(f"Database startup error: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
