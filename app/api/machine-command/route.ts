import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  const machines = await getMachines();
  const machine = machines.find((m: any) => m.id === id);

  if (!machine) {
    return NextResponse.json({ command: "none" });
  }

  return NextResponse.json({
    command: machine.command || "none",
    program: machine.program || null,
  });
}

export async function POST(req: Request) {
  const { machineId, command } = await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) => {
  if (m.id === machineId) {
  if (command === "pause") {
    return {
      ...m,
      status: "paused",
      remainingTime: m.endTime - Date.now(),
      endTime: null,
      command,
    };
  }

  if (command === "resume") {
    return {
      ...m,
      status: "running",
      endTime: Date.now() + m.remainingTime,
      command,
    };
  }

  return { ...m, command };
}
  });

  await saveMachines(updated);

  return Response.json({ success: true });
}