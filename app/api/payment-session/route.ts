import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const machineId = Number(searchParams.get("machineId"));
    const programParam = searchParams.get("programId");
    const programId =
      programParam === null ? null : Number(programParam);

    if (
      !Number.isInteger(machineId) ||
      machineId < 1 ||
      (programId !== null &&
        (!Number.isInteger(programId) ||
          programId < 1 ||
          programId > 5))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "หมายเลขเครื่องหรือโปรแกรมไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const sessions = client.db("laundry").collection("paymentSessions");

    const filter: any = {
      machineId,
      status: "pending",
      cancelled: { $ne: true },
    };

    // ถ้าส่ง programId มา ให้ค้นหาเฉพาะโปรแกรมนั้น
    if (programId !== null) {
      filter.programId = programId;
    }

    // ค้นหารายการล่าสุดก่อน โดยยังไม่กรองวันหมดอายุ
    const pendingSessions = await sessions
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const now = Date.now();

    // ปิดสถานะรายการที่หมดอายุแล้ว
    for (const item of pendingSessions) {
      const expireAt = new Date(item.uiExpireAt).getTime();

      if (!Number.isFinite(expireAt) || expireAt <= now) {
        await sessions.updateOne(
          {
            _id: item._id,
            status: "pending",
            cancelled: { $ne: true },
          },
          {
            $set: {
              cancelled: true,
              status: "cancelled",
              expiredAt: new Date(),
            },
          }
        );
      }
    }

    // เลือกรายการที่ยังไม่หมดอายุรายการล่าสุด
    const session = pendingSessions.find((item: any) => {
      const expireAt = new Date(item.uiExpireAt).getTime();
      return Number.isFinite(expireAt) && expireAt > now;
    });

    if (!session) {
      return NextResponse.json({
        success: true,
        found: false,
      });
    }

    const remain = Math.max(
      0,
      Math.floor(
        (new Date(session.uiExpireAt).getTime() - Date.now()) / 1000
      )
    );

    return NextResponse.json({
      success: true,
      found: true,
      chargeId: session.chargeId,
      qrCodeUrl: session.qrCodeUrl,
      remain,
      programId: session.programId,
      programName: session.programName,
      amount: session.amount,
      uiExpireAt: new Date(session.uiExpireAt).getTime(),
    });
  } catch (error) {
    console.error("GET /api/payment-session error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถตรวจสอบรายการชำระเงินได้",
      },
      { status: 500 }
    );
  }
}