#!/bin/bash
set -e

echo "=== Updating packages and installing dependencies ==="
apt-get update
apt-get install -y curl git ufw

echo "=== Installing Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh

echo "=== Configuring Ollama to listen on all interfaces ==="
mkdir -p /etc/systemd/system/ollama.service.d
echo -e '[Service]\nEnvironment="OLLAMA_HOST=0.0.0.0"' > /etc/systemd/system/ollama.service.d/override.conf
systemctl daemon-reload
systemctl restart ollama

echo "=== Pulling Llama 3.2 3B Model (Instruct Q4_0) ==="
ollama pull llama3.2:3b-instruct-q4_0

echo "=== Setup Completed Successfully ==="
