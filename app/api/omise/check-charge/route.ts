import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const omise = require("omise")({
  secretKey: process.env.OMISE_SECRET_KEY,
  publicKey: process.env.OMISE_PUBLIC_KEY,
});

export async function POST(req: Request) {
  try {
    const { chargeId } = await req.json();

    const charge = await omise.charges.retrieve(chargeId);

    if (charge.status === "successful") {
      const client = await clientPromise;
      const db = client.db("laundry");

      await db.collection("paymentSessions").updateOne(
        {
          chargeId,
        },
        {
          $set: {
            status: "paid",
            paidAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      paid: charge.status === "successful",
      status: charge.status,
    });

  } catch (err: any) {

    return NextResponse.json({
      success: false,
      error: err.message,
    });

  }
}