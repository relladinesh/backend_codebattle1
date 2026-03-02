import { redis } from "./config/redis.js";

async function test() {
  try {
    console.log("Connecting to Redis...");

    await redis.set("test:key", "Hello Upstash!");
    const value = await redis.get("test:key");

    console.log("✅ Redis Connected!");
    console.log("Value from Redis:", value);

  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  } finally {
    process.exit();
  }
}

test();
