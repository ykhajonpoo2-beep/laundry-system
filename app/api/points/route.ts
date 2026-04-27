import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const MAX_POINTS = 5;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("laundry");

  const user = await db.collection("customers").findOne({ phone });

  return NextResponse.json({
    phone,
    points: user?.points || 0,
    canRedeem: (user?.points || 0) >= MAX_POINTS,
  });
  return NextResponse.json({
  version: "MONGODB OK",
});
}

// ----------------------
// POST → เพิ่มแต้ม
// ----------------------
export async function POST(req: Request) {
  const { phone, machineId, startTime } = await req.json();

  const client = await clientPromise;
  const db = client.db("laundry");

  const key = `${machineId}-${startTime}`;

  // 🔥 กันซ้ำ
  const existing = await db.collection("claims").findOne({ key });

  if (existing) {
    return NextResponse.json({ error: "already claimed" }, { status: 400 });
  }

  await db.collection("claims").insertOne({ key });

  await db.collection("customers").updateOne(
    { phone },
    {
      $inc: { points: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );

  const user = await db.collection("customers").findOne({ phone });

  return NextResponse.json({
    message: "point added",
    points: user?.points || 0,
  });
}

// ----------------------
// PUT → ใช้สิทธิ
// ----------------------
export async function PUT(req: Request) {
  const { phone, program } = await req.json();

  if (program !== 1) {
    return NextResponse.json({ error: "only program 1" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("laundry");

  const user = await db.collection("customers").findOne({ phone });

  if (!user || user.points < MAX_POINTS) {
    return NextResponse.json({ error: "not enough points" }, { status: 400 });
  }

  await db.collection("customers").updateOne(
    { phone },
    {
      $inc: { points: -MAX_POINTS }, // 🔥 หักแต้ม
    }
  );

  return NextResponse.json({
    message: "redeemed",
  });
}