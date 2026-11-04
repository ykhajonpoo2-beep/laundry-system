import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    // ตรวจสอบ ESP32 Token
    const token = req.headers.get("x-esp32-token");
    const expectedToken = process.env.ESP32_API_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ตรวจสอบ Machine ID
    const { machineId } = await req.json();
    const id = Number(machineId);

    if (!Number.isInteger(id) || id < 1 || id > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid machineId" },
        { status: 400 }
      );
    }

    const machines = await getMachines();

    const found = machines.some((m: any) => m.id === id);

    if (!found) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    // ยืนยันว่าเครื่องทำงานเสร็จแล้ว
    const updated = machines.map((m: any) =>
      m.id === id
        ? {
            ...m,
            status: "available",
            command: "none",
            endTime: null,
            remainingTime: 0,
            timeLeft: 0,
            program: null,
            isFree: false,
            overtime: false,
          }
        : m
    );

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      machineId: id,
      status: "available",
    });
  } catch (error) {
    console.error("Machine done error:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}