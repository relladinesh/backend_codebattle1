import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,

  tls: {
    rejectUnauthorized: false,
  },

  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("✅ Connected to Upstash Redis");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});
