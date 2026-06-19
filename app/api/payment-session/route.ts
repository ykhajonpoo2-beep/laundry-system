import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {

  const { searchParams } =
    new URL(req.url);

  const machineId = Number(
    searchParams.get("machineId")
  );

  const client =
    await clientPromise;

  const db =
    client.db("laundry");

  const session =
    await db.collection("paymentSessions")
      .findOne({

        machineId,

        status: "pending",

        cancelled: false,

        uiExpireAt: {
          $gt: new Date()
        }

      });

  if (!session) {

    return NextResponse.json({

      found: false

    });

  }

  return NextResponse.json({

    found: true,

    chargeId: session.chargeId,

    qrCodeUrl: session.qrCodeUrl,

    amount: session.amount,

    program: session.program,

    remain:

      Math.floor(

        (

          session.uiExpireAt.getTime()

          -

          Date.now()

        ) / 1000

      )

  });

}