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

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create nginx configuration with SSL
RUN echo 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    \n\
    location / {\n\
        root /app/frontend/build;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    location /api {\n\
        proxy_pass http://localhost:5001;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        proxy_cache_bypass $http_upgrade;\n\
    }\n\
}\n\
\n\
# HTTPS server - only enabled if certificates exist\n\
server {\n\
    listen 443 ssl http2;\n\
    server_name localhost;\n\
\n\
    # SSL configuration will be added if certificates exist\n\
    include /etc/nginx/ssl.conf;\n\
\n\
    location / {\n\
        root /app/frontend/build;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location /api {\n\
        proxy_pass http://localhost:5001;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        proxy_cache_bypass $http_upgrade;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

# Create conditional SSL configuration
RUN echo '# This file is included if SSL certificates exist\n\
ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;\n\
ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;\n\
ssl_dhparam /etc/nginx/ssl/dhparam.pem;\n\
\n\
# SSL configuration\n\
ssl_protocols TLSv1.2 TLSv1.3;\n\
ssl_prefer_server_ciphers on;\n\
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;\n\
ssl_session_timeout 1d;\n\
ssl_session_cache shared:SSL:50m;\n\
ssl_session_tickets off;' > /etc/nginx/ssl.conf

# Create MongoDB configuration
RUN echo 'net:\n\
  bindIp: 0.0.0.0\n\
  port: 27017\n\
security:\n\
  authorization: disabled\n\
systemLog:\n\
  destination: file\n\
  path: /var/log/mongodb.log\n\
  logAppend: true\n\
storage:\n\
  dbPath: /data/db\n\
processManagement:\n\
  fork: true\n\
  pidFilePath: /var/run/mongodb/mongod.pid\n\
' > /etc/mongod.conf

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "Checking SSL certificates..."\n\
if [ -f "/app/ssl/nginx-selfsigned.crt" ] && [ -f "/app/ssl/nginx-selfsigned.key" ] && [ -f "/app/ssl/dhparam.pem" ]; then\n\
    echo "SSL certificates found, copying to nginx..."\n\
    cp /app/ssl/* /etc/nginx/ssl/\n\
    chmod 600 /etc/nginx/ssl/nginx-selfsigned.key\n\
    chmod 644 /etc/nginx/ssl/nginx-selfsigned.crt\n\
    chmod 644 /etc/nginx/ssl/dhparam.pem\n\
    echo "SSL certificates installed"\n\
else\n\
    echo "No SSL certificates found, running in HTTP mode only"\n\
    # Remove SSL configuration if no certificates\n\
    rm -f /etc/nginx/ssl.conf\n\
fi\n\
\n\
echo "Creating MongoDB data directory and setting permissions..."\n\
mkdir -p /data/db\n\
mkdir -p /var/run/mongodb\n\
chown -R mongodb:mongodb /data/db\n\
chown -R mongodb:mongodb /var/run/mongodb\n\
mkdir -p /var/log\n\
touch /var/log/mongodb.log\n\
chown mongodb:mongodb /var/log/mongodb.log\n\
\n\
echo "Starting MongoDB with config..."\n\
cat /etc/mongod.conf\n\
\n\
# Start MongoDB directly (no sudo)\n\
mongod --config /etc/mongod.conf &\n\
\n\
echo "Waiting for MongoDB to be ready..."\n\
for i in {1..30}; do\n\
  if mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then\n\
    echo "MongoDB is up!"\n\
    # Initialize the database\n\
    mongosh --quiet --eval "db = db.getSiblingDB('hevy'); db.createCollection('workouts');"\n\
    break\n\
  fi\n\
  if [ $i -eq 30 ]; then\n\
    echo "MongoDB failed to start after 30 seconds"\n\
    echo "Last few lines of MongoDB log:"\n\
    tail -n 20 /var/log/mongodb.log\n\
    exit 1\n\
  fi\n\
  echo "Waiting for MongoDB... attempt $i"\n\
  sleep 1\n\
done\n\
\n\
echo "Starting nginx..."\n\
nginx -t && service nginx start\n\
\n\
echo "Starting Flask application..."\n\
python backend/app.py &\n\
\n\
echo "All services started. Waiting for processes..."\n\
wait' > /app/start.sh && chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production
ENV MONGODB_URI=mongodb://localhost:27017/hevy
ENV PORT=5001

# Expose ports
EXPOSE 80 443 5001 27017

# Start both services
CMD ["/app/start.sh"] 