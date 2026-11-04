import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";

export async function POST(req: Request) {
  try {
    const {
      machineId,
      programId,
      price,
      isFree,
    } = await req.json();

    const machines = await getMachines();

    const machine = machines.find(
      (m: any) => m.id === Number(machineId)
    );

    if (!machine) {
      throw new Error("ไม่พบเครื่องนี้");
    }

    if (!machine.lidClosed) {
      throw new Error("กรุณาปิดฝาเครื่องก่อน");
    }

    if (
      machine.status === "running" ||
      machine.status === "paused"
    ) {
      throw new Error("เครื่องกำลังทำงานหรือหยุดชั่วคราว");
    }

    const isWasher9 =
      machine.machineType === "washer" &&
      Number(machine.capacityKg) === 9;

    // เวลาเป็นวินาที
    const washer9DurationMap: Record<number, number> = {
      1: 17 * 60,
      2: 19 * 60,
      3: 60 * 60,
      4: 70 * 60,
      5: 90 * 60,
    };

    // เวลาโปรแกรมเดิม สำหรับเครื่องที่ยังไม่ได้แยกชุดโปรแกรม
    const legacyDurationMap: Record<number, number> = {
      1: 1800,
      2: 2220,
      3: 5400,
    };

    const selectedProgramId = Number(programId);

    const durationMap = isWasher9
      ? washer9DurationMap
      : legacyDurationMap;

    const duration = isFree
      ? washer9DurationMap[1]
      : durationMap[selectedProgramId];

    if (!duration) {
      throw new Error("ไม่พบเวลาโปรแกรมที่เลือก");
    }

    // สร้างรหัสใหม่เฉพาะตอนเริ่มรอบใหม่
    const cycleId = randomUUID();

    const updated = machines.map((m: any) => {
      if (m.id !== Number(machineId)) return m;

      return {
        ...m,
        status: "running",
        command: "start",
        program: isFree ? 1 : selectedProgramId,
        price: Number(price),
        endTime: Date.now() + duration * 1000,
        isFree: Boolean(isFree),
        cycleId,
      };
    });

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      duration,
      cycleId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาด",
      },
      { status: 400 }
    );
  }
}