import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getMachines } from "@/lib/machineDB";

const MAX_POINTS = 5;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "phone required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("laundry");

    const user = await db.collection("customers").findOne({ phone });
    const points = Number(user?.points ?? 0);

    return NextResponse.json({
      phone,
      points,
      canRedeem: points >= MAX_POINTS,
    });
  } catch (error) {
    console.error("GET /api/points error:", error);

    return NextResponse.json(
      { error: "ไม่สามารถตรวจสอบแต้มได้" },
      { status: 500 }
    );
  }
}

// ----------------------
// POST → เพิ่มแต้ม 1 แต้มต่อรอบซัก
// ใช้ cycleId ป้องกันการรับแต้มซ้ำ
// ----------------------
export async function POST(req: Request) {
  try {
    const { phone, machineId, cycleId } = await req.json();

    const cleanPhone = String(phone ?? "").replace(/\D/g, "");
    const id = Number(machineId);
    const cycle = String(cycleId ?? "").trim();

    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(id) || id < 1 || !cycle) {
      return NextResponse.json(
        { error: "ข้อมูลเครื่องหรือรอบซักไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบรอบซักกับข้อมูลเครื่องจริงก่อนให้แต้ม
    const machines = await getMachines();
    const currentMachine = machines.find(
      (item) => Number(item.id) === id
    );

    if (
      !currentMachine ||
      currentMachine.status !== "running" ||
      String(currentMachine.cycleId ?? "") !== cycle
    ) {
      return NextResponse.json(
        { error: "ไม่พบรอบซักที่กำลังทำงาน หรือรอบซักไม่ตรงกัน" },
        { status: 409 }
      );
    }

    const capacityKg = Number(currentMachine.capacityKg);
    const programId = Number(currentMachine.program);

    const earnsPoint =
      currentMachine.machineType === "washer" &&
      currentMachine.isFree !== true &&
      (
        (capacityKg === 9 && [3, 4, 5].includes(programId)) ||
        (
          (capacityKg === 15 || capacityKg === 25) &&
          [1, 2, 3, 4, 5].includes(programId)
        )
      );

    if (!earnsPoint) {
      return NextResponse.json(
        { error: "เครื่องหรือโปรแกรมนี้ไม่ได้รับคะแนนสะสม" },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db("laundry");
    const claims = db.collection("claims");
    const customers = db.collection("customers");

    // ป้องกันคำขอซ้ำ แม้เกิดพร้อมกันหลายคำขอ
    // หากมี key ซ้ำอยู่แล้ว MongoDB จะปฏิเสธด้วย duplicate key
    await claims.createIndex({ key: 1 }, { unique: true });

    const key = `${id}-${cycle}`;

    try {
      await claims.insertOne({
        key,
        machineId: id,
        cycleId: cycle,
        phone: cleanPhone,
        claimedAt: new Date(),
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return NextResponse.json(
          { error: "รอบซักนี้รับแต้มไปแล้ว" },
          { status: 409 }
        );
      }

      throw error;
    }

    await customers.updateOne(
      { phone: cleanPhone },
      {
        $inc: { points: 1 },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    const user = await customers.findOne({ phone: cleanPhone });
    const points = Number(user?.points ?? 0);

    return NextResponse.json({
      success: true,
      message: "point added",
      points,
      canRedeem: points >= MAX_POINTS,
    });
  } catch (error) {
    console.error("POST /api/points error:", error);

    return NextResponse.json(
      { error: "ไม่สามารถบันทึกแต้มได้" },
      { status: 500 }
    );
  }
}

// ----------------------
// PUT → ใช้ 5 แต้มแลกซักฟรี
// ----------------------
export async function PUT(req: Request) {
  try {
    const { phone, program } = await req.json();
    const cleanPhone = String(phone ?? "").replace(/\D/g, "");

    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก" },
        { status: 400 }
      );
    }

    if (Number(program) !== 1) {
      return NextResponse.json(
        { error: "ใช้สิทธิได้เฉพาะโปรแกรม 1" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("laundry");

    // หักแต้มเฉพาะเมื่อมีอย่างน้อย 5 แต้ม
    // ป้องกันแต้มติดลบเมื่อมีการแลกพร้อมกัน
    const result = await db.collection("customers").updateOne(
      {
        phone: cleanPhone,
        points: { $gte: MAX_POINTS },
      },
      {
        $inc: { points: -MAX_POINTS },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount !== 1) {
      return NextResponse.json(
        { error: "แต้มไม่เพียงพอสำหรับแลกสิทธิ" },
        { status: 400 }
      );
    }

    const user = await db.collection("customers").findOne({
      phone: cleanPhone,
    });

    return NextResponse.json({
      success: true,
      message: "redeemed",
      points: Number(user?.points ?? 0),
    });
  } catch (error) {
    console.error("PUT /api/points error:", error);

    return NextResponse.json(
      { error: "ไม่สามารถใช้สิทธิได้" },
      { status: 500 }
    );
  }
}
