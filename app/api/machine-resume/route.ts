import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  const { machineId } = await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) => {
    if (m.id === Number(machineId)) {

      if (m.status === "running") {
        return { ...m, status: "paused" };
      }

      if (m.status === "paused") {
        return { ...m, status: "running" };
      }

      return m;
    }

    return m;
  });

  await saveMachines(updated);

  return NextResponse.json({ success: true });
}