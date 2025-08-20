# Use official Python runtime as base image
FROM python:3.9-slim

# Build timestamp to force fresh build: 2025-08-18-OPTIMIZED
# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV DISPLAY=:99
ENV QT_QPA_PLATFORM=offscreen

# Install system dependencies for OpenCV and face recognition (optimized for 1GB memory)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgtk-3-0 \
    libgl1-mesa-dev \
    libgthread-2.0-0 \
    libfontconfig1 \
    libxrender1 \
    libxtst6 \
    ffmpeg \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY main.py .

# Expose port
EXPOSE 8080

# Run the application with optimized settings for 1GB memory limit
CMD exec gunicorn --bind :$PORT --workers 1 --threads 1 --timeout 300 --graceful-timeout 300 --keep-alive 300 --max-requests 100 --max-requests-jitter 20 main:app