import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

// GET (ESP32 poll)
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

// POST (web send command)
export async function POST(req: Request) {
  const { machineId, command, program } = await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) => {
    // ✅ แก้เฉพาะเครื่องเดียว
    if (m.id === Number(machineId)) {
      return {
        ...m,
        command,
        program: program ?? m.program,
      };
    }

    // ✅ เครื่องอื่น "ห้ามยุ่ง"
    return m;
  });

  await saveMachines(updated);

  return NextResponse.json({ success: true });
}