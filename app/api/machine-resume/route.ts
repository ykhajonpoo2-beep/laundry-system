import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  const { machineId } = await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) => {
    if (m.id !== Number(machineId)) return m;

    return {
  ...m,
  status: "running",
  endTime: Date.now() + m.remainingTime, // 🔥 ต่อเวลาเดิม
};
  });

  await saveMachines(updated);

  return NextResponse.json({ success: true });
}