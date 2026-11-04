import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    const { machineId, duration } = await req.json();

    const id = Number(machineId);
    const seconds = Number(duration);

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > 12 ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid machineId or duration" },
        { status: 400 }
      );
    }

    const machines = await getMachines();

    const updated = machines.map((m: any) => {
      if (m.id !== id) return m;

      return {
        ...m,
        status: "running",
        endTime: Date.now() + seconds * 1000,
        timeLeft: seconds,
        overtime: false,
      };
    });

    await saveMachines(updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("machine-started API error:", error);

    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}