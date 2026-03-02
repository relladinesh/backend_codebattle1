FROM node:20-bookworm-slim

WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY backend/services/core-service/package*.json ./backend/services/core-service/
WORKDIR /app/backend/services/core-service

# Install dependencies
RUN npm install

# Copy source code
COPY backend/services/core-service/prisma ./prisma
COPY backend/services/core-service/src ./src

# Shared protos
COPY backend/proto /app/backend/proto

# Generate Prisma client
RUN npx prisma generate

# Set ports (merged)
ENV CORE_GRPC_PORT=50051
ENV AUTH_GRPC_PORT=50051

EXPOSE 50051

CMD ["node", "src/index.js"]