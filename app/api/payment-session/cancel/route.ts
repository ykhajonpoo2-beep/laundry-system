import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { machineId } = await req.json();

    const client = await clientPromise;
    const db = client.db("laundry");

    await db.collection("paymentSessions").updateMany(
      {
        machineId,
        status: "pending",
        cancelled: false,
      },
      {
        $set: {
          cancelled: true,
        },
      }
    );

    return NextResponse.json({
      success: true,
    });

  } catch (err: any) {

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: 500,
      }
    );

  }
}