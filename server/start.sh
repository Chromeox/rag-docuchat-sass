#!/bin/bash
# Startup script for Railway deployment
# Explicitly reads PORT environment variable and starts uvicorn

# Print PORT for debugging
echo "PORT environment variable: $PORT"

# Default to 8000 if PORT is not set
PORT=${PORT:-8000}
echo "Using PORT: $PORT"

# Start uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
