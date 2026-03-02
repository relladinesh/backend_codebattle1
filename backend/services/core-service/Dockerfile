FROM node:20-bookworm-slim

WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apt-get update -y && apt-get install -y openssl

# -----------------------------
# Install dependencies
# -----------------------------
COPY backend/services/core-service/package*.json ./backend/services/core-service/
WORKDIR /app/backend/services/core-service
RUN npm install

# -----------------------------
# Copy app code
# -----------------------------
COPY backend/services/core-service/prisma ./prisma
COPY backend/services/core-service/src ./src

# Shared protos
COPY backend/proto /app/backend/proto

# -----------------------------
# Generate Prisma Client
# -----------------------------
RUN npx prisma generate

# -----------------------------
# Expose Ports
# -----------------------------
EXPOSE 50051 50053

# -----------------------------
# Start Server (NO migrate deploy)
# -----------------------------
CMD sh -c "\
  export CORE_GRPC_PORT=${PORT:-50051} && \
  export AUTH_GRPC_PORT=${AUTH_GRPC_PORT:-50053} && \
  node src/index.js \
"