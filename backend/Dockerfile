FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2 and statsmodels
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and model_service
COPY backend/ /app/
COPY model_service/ /app/model_service/

# Ensure the app can find the modules
ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
