import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function GET(req: NextRequest) {

  try {

    const machineId = Number(
      req.nextUrl.searchParams.get("machineId")
    );

    if (!machineId) {
      return NextResponse.json({
        found: false,
      });
    }

    const client = await clientPromise;

    const db = client.db("laundry");

    // หา Session ล่าสุดของเครื่อง

    const session =
      await db.collection("paymentSessions")
      .findOne(
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
      (new Date(session.uiExpireAt).getTime() - Date.now()) / 1000
    );

    // --------------------
    // หมดเวลา
    // --------------------

    if (remain <= 0) {

      await db.collection("paymentSessions")
      .updateOne(
        {
          _id: session._id,
        },
        {
          $set: {
            cancelled: true,
            status: "expired",
          },
        }
      );

      // คืนเครื่อง

      const machines = await getMachines();

      const updated = machines.map((m: any) => {

        if (m.id !== machineId)
          return m;

        return {

          ...m,

          status: "available",

          command: "none",

          program: 0,

          isFree: false,

        };

      });

      await saveMachines(updated);

      return NextResponse.json({
        found: false,
      });

    }

    // --------------------
    // ยังใช้งานได้
    // --------------------

    return NextResponse.json({

      found: true,

      chargeId: session.chargeId,

      qrCodeUrl: session.qrCodeUrl,

      remain,

      program: session.program,

      uiExpireAt: session.uiExpireAt,

    });

  }

  catch (err:any) {

    return NextResponse.json(
      {
        found:false,
        error:err.message,
      },
      {
        status:500,
      }
    );

  }

}