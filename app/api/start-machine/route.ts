import { NextResponse } from "next/server";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    const { machineId, price } =
      await req.json();

    const durationMap: any = {
      20: 1800,
      30: 2220,
      40: 5400,
    };

    const duration =
      durationMap[price] || 1800;

    const machines =
      await getMachines();

    const updated = machines.map(
      (m: any) =>
        m.id === Number(machineId)
          ? {
              ...m,
              status: "running",
              command: "start",
              program: price,
              endTime:
                Date.now() +
                duration * 1000,
            }
          : m
    );

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
      { status: 500 }
    );
  }
}