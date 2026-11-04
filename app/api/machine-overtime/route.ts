import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-esp32-token");
    const expectedToken = process.env.ESP32_API_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { machineId } = await req.json();
    const id = Number(machineId);

    if (!Number.isInteger(id) || id < 1 || id > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid machineId" },
        { status: 400 }
      );
    }

    const machines = await getMachines();
    let found = false;

    const updated = machines.map((m: any) => {
      if (m.id !== id) return m;

      found = true;

      if (m.status !== "running") return m;

      return { ...m, overtime: true };
    });

    if (!found) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    const machine = updated.find((m: any) => m.id === id);

    if (machine.status !== "running") {
      return NextResponse.json(
        { success: false, error: "Machine is not running" },
        { status: 409 }
      );
    }

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      machineId: id,
      overtime: true,
    });
  } catch (error) {
    console.error("machine-overtime API error:", error);

    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}