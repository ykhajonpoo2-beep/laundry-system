// /app/api/points/route.ts

import { NextResponse } from "next/server";

type Customer = {
  phone: string;
  points: number;
  updatedAt: number;
};

// 🔥 mock database (เปลี่ยนเป็น DB จริงทีหลัง)
const db: Record<string, Customer> = {};

const MAX_POINTS = 1;
const claimed: Record<string, boolean> = {};
// ----------------------
// GET → เช็คแต้ม
// ----------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json(
      { error: "phone required" },
      { status: 400 }
    );
  }

  const user = db[phone] || {
    phone,
    points: 0,
    updatedAt: Date.now(),
  };

  return NextResponse.json({
    phone,
    points: user.points,
    remain: Math.max(0, MAX_POINTS - user.points),
   
    canRedeem: user.points >= MAX_POINTS
  });
}

// ----------------------
// POST → เพิ่มแต้ม
// ----------------------
export async function POST(req: Request) {
  const body = await req.json();
  const { phone, machineId, startTime } = body;

  if (!phone || !machineId || !startTime) {
    return NextResponse.json(
      { error: "missing data" },
      { status: 400 }
    );
  }

  // 🔥 unique key ต่อรอบการซัก
  const key = `${machineId}-${startTime}`;

  // ❌ ถ้าเคยได้แต้มแล้ว
  if (claimed[key]) {
    return NextResponse.json(
      { error: "already claimed" },
      { status: 400 }
    );
  }

  // ✅ mark ว่าใช้แล้ว
  claimed[key] = true;

  let user = db[phone];

  if (!user) {
    user = {
      phone,
      points: 0,
      updatedAt: Date.now(),
    };
  }

  user.points += 1;
  user.updatedAt = Date.now();
  db[phone] = user;

  return NextResponse.json({
    message: "point added",
    points: user.points,
    remain: Math.max(0, MAX_POINTS - user.points),
  });
}

// ----------------------
// PUT → ใช้สิทธิ (redeem)
// ----------------------
export async function PUT(req: Request) {
  const body = await req.json();
  const { phone, program } = body;

  if (!phone) {
    return NextResponse.json(
      { error: "phone required" },
      { status: 400 }
    );
  }

  const user = db[phone];

  if (!user || user.points < MAX_POINTS) {
    return NextResponse.json(
      { error: "not enough points" },
      { status: 400 }
    );
  }

  // 🔥 จำกัดเฉพาะโปรแกรม 1
  if (program !== 1) {
    return NextResponse.json(
      { error: "redeem allowed only for program 1" },
      { status: 400 }
    );
  }

  // ✅ รีเซ็ตแต้ม
  user.points = 0;
  user.updatedAt = Date.now();

  db[phone] = user;

  return NextResponse.json({
    message: "redeemed",
    points: 0,
  });
  
}
