import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const omise = require("omise")({
  secretKey: process.env.OMISE_SECRET_KEY,
  publicKey: process.env.OMISE_PUBLIC_KEY,
});

export async function POST(req: Request) {
  try {
    const { machineId, program } = await req.json();

    // ----------------------
    // ราคาและเวลา
    // ----------------------

    const programs: Record<number, number> = {
      20: 20,
      30: 30,
      40: 40,
    };

    const amount = programs[program];

    if (!amount) {
      return NextResponse.json(
        { error: "invalid program" },
        { status: 400 }
      );
    }

    // Omise ใช้หน่วยเป็นสตางค์

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

    // ----------------------
    // หา QR
    // ----------------------

    const qr =
      charge.source?.scannable_code?.image?.download_uri;

    // ----------------------
    // บันทึก MongoDB
    // ----------------------

    const client = await clientPromise;

    const db = client.db("laundry");

    await db.collection("paymentSessions").insertOne({
      chargeId: charge.id,

      machineId,

      amount,

      program,

      status: "pending",

      expiresAt: new Date(
        Date.now() + 30 * 1000
      ),

      createdAt: new Date(),

      paidAt: null,
    });

    return NextResponse.json({
      success: true,

      chargeId: charge.id,

      qrCodeUrl: qr,

      expiresAt:
        Date.now() + 30 * 1000,
    });

  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error:
          err.message ||
          "create charge failed",
      },
      { status: 500 }
    );
  }
}