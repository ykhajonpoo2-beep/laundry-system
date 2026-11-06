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
    const duration = Number(body?.duration);

    // ตรวจสอบหมายเลขเครื่อง
    if (!Number.isInteger(machineId) || machineId < 1 || machineId > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid machineId" },
        { status: 400 }
      );
    }

    // ตรวจสอบระยะเวลาทำงาน (วินาที)
    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid duration" },
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

    // คำนวณเวลาสิ้นสุดจากระยะเวลาที่ ESP32 แจ้งมา
    const endTime = Date.now() + duration * 1000;

    const updated = machines.map((m: any) => {
      if (m.id !== machineId) return m;

      return {
        ...m,
        status: "running",
        endTime,
        timeLeft: duration,
        overtime: false,
      };
    });

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      machineId,
      endTime,
      timeLeft: duration,
    });
  } catch (error) {
    console.error("Machine started API error:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
