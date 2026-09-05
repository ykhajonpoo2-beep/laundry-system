import { NextResponse } from "next/server";
import { createClient } from "redis";

const redis = createClient({
  url: process.env.LAUNDRY_NEW_REDIS_URL,
});

export async function GET() {
  if (!redis.isOpen) {
    await redis.connect();
  }

  await redis.del("machines");

  return NextResponse.json({ success: true });
}