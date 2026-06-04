import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,

  // VERY IMPORTANT for Upstash TLS
  tls: {
    rejectUnauthorized: false,
  },

  // Prevent crashes if Redis is temporarily unavailable
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times >= 5) {
      console.error("❌ Redis: giving up after 5 attempts. Check REDIS_HOST/.env");
      return null;
    }
    return Math.min(times * 500, 3000);
  },
});

redis.on("connect", () => {
  console.log("✅ Connected to Upstash Redis");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

// Prevent unhandled error from crashing the process
redis.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});
