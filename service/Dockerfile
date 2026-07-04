FROM python:3.11-slim

# OpenCV headless + MediaPipe system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    wget \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download the MediaPipe pose model at build time so it's baked into the image.
# The .task file is gitignored and must not be committed — Railway gets it here instead.
RUN wget -q -O pose_landmarker_heavy.task \
    https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
