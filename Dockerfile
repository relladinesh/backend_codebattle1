FROM node:20-bookworm-slim

WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files first (for caching)
COPY backend/services/core-service/package*.json ./backend/services/core-service/
COPY backend/services/gateway/package*.json ./backend/services/gateway/

# Install dependencies
WORKDIR /app/backend/services/core-service
RUN npm install

WORKDIR /app/backend/services/gateway
RUN npm install

# Copy source code
WORKDIR /app
COPY backend/services/core-service ./backend/services/core-service
COPY backend/services/gateway ./backend/services/gateway
COPY backend/proto ./backend/proto

# Generate Prisma client
WORKDIR /app/backend/services/core-service
RUN npx prisma generate

# Render public port (Gateway)
EXPOSE 10000

# Start Core gRPC (background) + Gateway (foreground)
CMD sh -c "node backend/services/core-service/src/index.js & node backend/services/gateway/src/server.js"