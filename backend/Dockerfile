FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2, statsmodels, and lightgbm
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend directory
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code into /app
COPY backend/ /app/

# Ensure the app can find the modules
ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
