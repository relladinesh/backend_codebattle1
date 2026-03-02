FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY backend/services/core-service/package*.json ./backend/services/core-service/
WORKDIR /app/backend/services/core-service
RUN npm install

COPY backend/services/core-service/prisma ./prisma
COPY backend/services/core-service/src ./src
COPY backend/proto /app/backend/proto

RUN npx prisma generate

EXPOSE 50051

CMD ["node", "src/index.js"]