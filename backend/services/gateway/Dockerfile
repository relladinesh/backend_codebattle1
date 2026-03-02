FROM node:20-bookworm-slim

WORKDIR /app

# deps (cache friendly)
COPY backend/services/gateway/package*.json ./backend/services/gateway/
WORKDIR /app/backend/services/gateway
RUN npm install

# app code
COPY backend/services/gateway/src ./src

# shared protos (gateway loads grpc definitions)
COPY backend/proto /app/backend/proto

EXPOSE 5000

CMD ["node", "src/server.js"]