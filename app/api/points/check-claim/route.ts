import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const { machineId, startTime } = await req.json();

  const client = await clientPromise;
  const db = client.db("laundry");

  const key = `${machineId}-${startTime}`;

  const existing = await db.collection("claims").findOne({ key });

  return NextResponse.json({
    alreadyClaimed: !!existing,
  });
}