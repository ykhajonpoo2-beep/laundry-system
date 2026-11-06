import { NextResponse } from "next/server";
import { getMachines, saveMachines } from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    // ตรวจสอบ Token จาก ESP32
    const token = req.headers.get("x-esp32-token");
    const expectedToken = process.env.ESP32_API_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // อ่านข้อมูลที่ส่งมา
    const body = await req.json().catch(() => null);
    const machineId = Number(body?.machineId);
    const closed = body?.closed;

    // ตรวจสอบหมายเลขเครื่อง
    if (!Number.isInteger(machineId) || machineId < 1 || machineId > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid machineId" },
        { status: 400 }
      );
    }

    // ต้องเป็น Boolean เท่านั้น
    if (typeof closed !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid closed value" },
        { status: 400 }
      );
    }

    const machines = await getMachines();
    const machineExists = machines.some((m: any) => m.id === machineId);

    if (!machineExists) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    const updated = machines.map((m: any) => {
      if (m.id !== machineId) return m;

      return {
        ...m,
        lidClosed: closed,
      };
    });

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      machineId,
      lidClosed: closed,
    });
  } catch (error) {
    console.error("Lid status API error:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
