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

    const qr =
      charge.source?.scannable_code?.image?.download_uri;

    const client = await clientPromise;

    await client
      .db("laundry")
      .collection("paymentSessions")
      .insertOne({
        chargeId: charge.id,
        machineId,
        amount,
        program,
        status: "pending",
        createdAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      qrCodeUrl: qr,
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}