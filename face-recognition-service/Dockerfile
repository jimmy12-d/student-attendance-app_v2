# Use the full official Python runtime as a parent image for better compatibility
FROM python:3.9

# Set environment variables
ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
ENV PORT 8080

# Create and set the working directory
WORKDIR $APP_HOME

# Install system dependencies required for OpenCV (used by deepface)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Copy only the requirements file first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the local source code to the container
COPY . .

# Set the command to run the application using Gunicorn
# This will be a robust, production-ready server.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app 