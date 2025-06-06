# Build frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source files
COPY frontend/ .

# Build frontend
RUN npm run build

# Python dependencies stage
FROM python:3.9-slim as python-deps

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY requirements.txt .
COPY backend/requirements.txt backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Final stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies and MongoDB
RUN apt-get update && apt-get install -y \
    gnupg \
    curl \
    nginx \
    && curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default \
    && rm -f /etc/nginx/sites-available/default

# Copy Python dependencies from python-deps stage
COPY --from=python-deps /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages

# Copy backend files
COPY backend/ backend/

# Copy frontend build from frontend-build stage
COPY --from=frontend-build /app/frontend/build /app/frontend/build

# Create nginx configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    \
    location / { \
        root /app/frontend/build; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api { \
        proxy_pass http://localhost:5001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Create startup script
RUN echo '#!/bin/bash\n\
mkdir -p /data/db\n\
mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db\n\
\n\
# Wait for MongoDB to be ready\n\
echo "Waiting for MongoDB to be ready..."\n\
until mongosh --quiet --eval "db.adminCommand('\''ping'\'')" > /dev/null 2>&1; do\n\
  sleep 1\n\
done\n\
echo "MongoDB is up!"\n\
\n\
service nginx start\n\
python backend/app.py &\n\
wait' > /app/start.sh && chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production
ENV MONGODB_URI=mongodb://localhost:27017/hevy

# Expose ports
EXPOSE 80 5001 27017

# Start both services
CMD ["/app/start.sh"] 