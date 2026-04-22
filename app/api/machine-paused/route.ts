import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  const { machineId } = await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) => {
    if (m.id !== Number(machineId)) return m;

    const now = Date.now();

return {
  ...m,
  status: "paused",
  remainingTime: m.endTime - now, // 🔥 เก็บเวลาคงเหลือจริง
  endTime: null,
};
  });

  await saveMachines(updated);

  return NextResponse.json({ success: true });
}