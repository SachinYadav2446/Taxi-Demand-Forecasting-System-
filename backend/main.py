import json
import traceback
import sys

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from database import engine, Base
    import models
    from mangum import Mangum

    app = FastAPI(title="Taxi Demand Forecasting System API")

    @app.on_event("startup")
    def on_startup():
        try:
            # Optimization: Create tables only when the app is starting up
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            print(f"Database startup error: {e}")
            # We don't raise here to allow the app to start, but subsequent DB calls will fail

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from routers import auth, zones, forecasts, contact, intelligence

    @app.get("/")
    def root():
        return {"message": "Welcome to Taxi Demand Forecasting API"}

    @app.get("/debug")
    def debug():
        return {
            "python_version": sys.version,
            "path": sys.path,
            "env": {k: v for k, v in os.environ.items() if "PASSWORD" not in k and "SECRET" not in k}
        }

    app.include_router(auth.router)
    app.include_router(zones.router)
    app.include_router(forecasts.router)
    app.include_router(contact.router)
    app.include_router(intelligence.router)

    # AWS Lambda Handler
    handler = Mangum(app, lifespan="off") # Use lifespan="off" to bypass startup event issues if any

except Exception as e:
    # If startup fails, we provide a fallback handler that returns the error
    error_msg = f"Startup Error: {str(e)}\n{traceback.format_exc()}"
    print(error_msg)
    
    def handler(event, context):
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Internal Server Error during startup",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
        }

if __name__ == "__main__":
    import uvicorn
    import os
    # For local running, we use the app directly
    uvicorn.run(app, host="0.0.0.0", port=8000)

