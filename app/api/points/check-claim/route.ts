import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { machineId, cycleId, action } = await req.json();

    const id = Number(machineId);
    const cycle = String(cycleId ?? "").trim();

    if (!Number.isInteger(id) || id < 1 || !cycle) {
      return NextResponse.json(
        { error: "กรุณาระบุ machineId และ cycleId" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("laundry");
    const claims = db.collection("claims");

    const key = `${id}-${cycle}`;

    // ตรวจสอบว่าเคยรับแต้ม หรือปฏิเสธรับแต้มในรอบนี้แล้วหรือไม่
    const existing = await claims.findOne({ key });

    if (action !== "waive") {
      return NextResponse.json({
        alreadyClaimed: !!existing,
        status: existing?.status ?? null,
      });
    }

    // บันทึกการปฏิเสธรับแต้ม เพื่อไม่ให้ Popup กลับมาในรอบเดิม
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        status: existing.status ?? "claimed",
      });
    }

    await claims.createIndex({ key: 1 }, { unique: true });

    try {
      await claims.insertOne({
        key,
        machineId: id,
        cycleId: cycle,
        status: "waived",
        createdAt: new Date(),
      });
    } catch (error: any) {
      // อาจมีคำขอจากอุปกรณ์อื่นบันทึกรอบเดียวกันไปก่อนแล้ว
      if (error?.code === 11000) {
        return NextResponse.json({
          success: true,
          alreadyClaimed: true,
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      status: "waived",
    });
  } catch (error) {
    console.error("POST /api/points/check-claim error:", error);

    return NextResponse.json(
      { error: "ไม่สามารถตรวจสอบหรือบันทึกสถานะได้" },
      { status: 500 }
    );
  }
}