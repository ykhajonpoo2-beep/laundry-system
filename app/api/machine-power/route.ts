import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

// 🔥 เพิ่มตัวนี้เข้าไป
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const { machineId } = await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) => {
    if (m.id !== Number(machineId)) return m;

    return {
      ...m,
      status: "available",
      endTime: null,
    };
  });

  await saveMachines(updated);

  return NextResponse.json({ success: true });
}