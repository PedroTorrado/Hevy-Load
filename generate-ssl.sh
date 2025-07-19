#!/bin/bash

# Create SSL directory
mkdir -p ssl

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/nginx-selfsigned.key \
  -out ssl/nginx-selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Generate DH parameters (for better security)
openssl dhparam -out ssl/dhparam.pem 2048

# Set proper permissions
chmod 600 ssl/nginx-selfsigned.key
chmod 644 ssl/nginx-selfsigned.crt
chmod 644 ssl/dhparam.pem 