import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const omise = require("omise")({
  secretKey: process.env.OMISE_SECRET_KEY,
  publicKey: process.env.OMISE_PUBLIC_KEY,
});

export async function POST(req: Request) {
  try {
    const { machineId, program } = await req.json();

    const amountMap: Record<number, number> = {
      20: 20,
      30: 30,
      40: 40,
    };

    const amount = amountMap[program];

// สร้าง Charge จาก Omise
const charge = await omise.charges.create({
  amount: amount * 100,
  currency: "thb",
  source: {
    type: "promptpay",
  },
  metadata: {
    machineId,
    program,
  },
});

// ได้ QR
const qr =
  charge.source?.scannable_code?.image?.download_uri;

// เชื่อม MongoDB
const client = await clientPromise;
const db = client.db("laundry");

// บันทึก Session
const uiExpireAt = new Date(
  Date.now() + 5 * 60 * 1000
);

await db.collection("paymentSessions").insertOne({
  chargeId: charge.id,
  machineId,
  amount,
  program,
  qrCodeUrl: qr,
  status: "pending",
  cancelled: false,
  createdAt: new Date(),
  expiresAt: uiExpireAt,
  uiExpireAt,
  paidAt: null,
});
const machines =
  await db.collection("machines").find().toArray();

await db.collection("machines").updateOne(
  {
    id: machineId,
  },
  {
    $set: {
      status: "waiting_payment",
    },
  }
);
return NextResponse.json({
  success: true,

  chargeId: charge.id,

  qrCodeUrl: qr,

  uiExpireAt: uiExpireAt.getTime(),
});

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}