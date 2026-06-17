import { NextResponse } from "next/server";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    const {
      machineId,
      programId,
      price,
      isFree,
    } = await req.json();

    const durationMap: Record<number, number> = {
      1: 1800,
      2: 2220,
      3: 5400,
    };

    const duration =
      durationMap[Number(programId)] || 1800;

    const machines = await getMachines();

    const updated = machines.map((m: any) => {
      if (m.id !== Number(machineId)) return m;

      if (!m.lidClosed) {
        throw new Error("กรุณาปิดฝาเครื่องก่อน");
      }

      if (m.status === "running") {
        throw new Error("เครื่องกำลังทำงาน");
      }

      return {
        ...m,
        status: "running",
        command: "start",

        program: Number(programId),

        price,

        endTime:
          Date.now() + duration * 1000,

        isFree: Boolean(isFree),
      };
    });

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 400 }
    );
  }
}