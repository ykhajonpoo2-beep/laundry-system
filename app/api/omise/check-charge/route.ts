import { NextResponse } from "next/server";
import Omise from "omise";

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
});

export async function POST(req: Request) {
  try {
    const { chargeId } = await req.json();

    const charge = await omise.charges.retrieve(chargeId);

    return NextResponse.json({
      success: true,
      status: charge.status,
      paid: charge.status === "successful",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}