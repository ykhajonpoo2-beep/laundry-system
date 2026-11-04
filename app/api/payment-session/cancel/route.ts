
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const machineId = Number(body.machineId);
    const chargeId = String(body.chargeId || "").trim();

    if (
      !Number.isInteger(machineId) ||
      machineId < 1 ||
      !chargeId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูลรายการชำระเงินไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const sessions = client
      .db("laundry")
      .collection("paymentSessions");

    const result = await sessions.updateOne(
      {
        machineId,
        chargeId,
        status: "pending",
        cancelled: { $ne: true },
        startedAt: null,
      },
      {
        $set: {
          cancelled: true,
          status: "cancelled",
          cancelledAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      cancelled: result.modifiedCount === 1,
    });
  } catch (error) {
    console.error("Cancel payment session error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถยกเลิกรายการได้",
      },
      { status: 500 }
    );
  }
}
