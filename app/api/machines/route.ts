import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export const dynamic = "force-dynamic";

export async function GET() {
  let machines = await getMachines();

  const now = Date.now();

  let updated = false;

  machines = machines.map((m: any) => {
    let timeLeft = 0;

    if (m.status === "running" && m.endTime) {
      timeLeft = Math.max(
        0,
        Math.floor((m.endTime - now) / 1000)
      );

      // ถ้าหมดเวลาแล้วให้ reset
      if (timeLeft <= 0) {
        updated = true;

        return {
          ...m,
          status: "available",
          command: "none",
          endTime: null,
          timeLeft: 0,
        };
      }
    }

    return {
      ...m,
      timeLeft,
    };
  });

  // save auto reset
  if (updated) {
    await saveMachines(machines);
  }

  return NextResponse.json(machines);
}