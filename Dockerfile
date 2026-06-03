# =========================================
# Stage 1: Build Node.js Frontend & Backend
# =========================================
FROM node:20-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# =========================================
# Stage 2: Final Production Environment
# =========================================
FROM node:20-bookworm-slim
WORKDIR /app

# Install Python 3 and virtual environment packages
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

# Copy package config and install production Node modules
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled build output and Python service directories
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/python_ml ./python_ml
COPY --from=builder /app/shared ./shared

# Create virtual environment for Python packages
RUN python3 -m venv /app/python_ml/.venv

# Install Python ML dependencies inside the container venv
RUN /app/python_ml/.venv/bin/pip install --no-cache-dir \
    flask>=3.1.2 \
    flask-cors>=6.0.2 \
    nltk>=3.9.2 \
    numpy>=2.4.2 \
    pandas>=3.0.0 \
    scikit-learn>=1.8.0 \
    tensorflow>=2.20.0 \
    textblob>=0.19.0 \
    yfinance \
    requests

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000
ENV ML_PYTHON_CMD=/app/python_ml/.venv/bin/python
ENV ML_SERVICE_URL=http://127.0.0.1:5001

EXPOSE 3000

# Start Express server (which automatically spawns Python ML service)
CMD ["node", "dist/index.cjs"]
