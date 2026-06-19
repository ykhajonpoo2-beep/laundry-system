import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const machineId = Number(
    searchParams.get("machineId")
  );

  const client = await clientPromise;

  const db = client.db("laundry");

  const session =
    await db.collection("paymentSessions").findOne(
      {
        machineId,
        status: "pending",
        cancelled: false,
      },
      {
        sort: {
          createdAt: -1,
        },
      }
    );

  if (!session) {

    return NextResponse.json({
      found: false,
    });

  }

  const remain = Math.floor(
    (new Date(session.uiExpireAt).getTime() -
      Date.now()) /
      1000
  );

  if (remain <= 0) {

    return NextResponse.json({
      found: false,
    });

  }

  return NextResponse.json({
    found: true,
    chargeId: session.chargeId,
    qrCodeUrl: session.qrCodeUrl,
    remain,
  });

}