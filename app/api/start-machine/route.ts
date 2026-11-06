
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";
import {
  getMachineProgram,
} from "@/lib/programConfig";

export async function POST(req: Request) {
  try {
    const {
      machineId,
      programId,
      price,
      isFree,
    } = await req.json();

    const id = Number(machineId);
    const selectedProgramId = Number(programId);

    if (!Number.isInteger(id) || id < 1) {
      throw new Error("รหัสเครื่องไม่ถูกต้อง");
    }

    if (
      !Number.isInteger(selectedProgramId) ||
      selectedProgramId < 1
    ) {
      throw new Error("รหัสโปรแกรมไม่ถูกต้อง");
    }

    // การซักฟรีต้องผ่าน API /api/redeem เท่านั้น
    if (isFree === true) {
      throw new Error(
        "กรุณาใช้ระบบแลกสิทธิซักฟรีผ่าน /api/redeem"
      );
    }

    const machines = await getMachines();

    const machine = machines.find(
      (m: any) => Number(m.id) === id
    );

    if (!machine) {
      throw new Error("ไม่พบเครื่องนี้");
    }

    if (
      machine.machineType !== "washer" &&
      machine.machineType !== "dryer"
    ) {
      throw new Error("ประเภทเครื่องไม่ถูกต้อง");
    }

    // ตรวจสอบฝาทุกประเภทเครื่อง ทั้งเครื่องซักและเครื่องอบ
if (machine.lidClosed !== true) {
  throw new Error("กรุณาปิดฝาเครื่องก่อน");
}

    if (
      machine.status === "running" ||
      machine.status === "paused"
    ) {
      throw new Error("เครื่องกำลังทำงานหรือหยุดชั่วคราว");
    }

    const selectedProgram = getMachineProgram(
      machine.machineType,
      Number(machine.capacityKg),
      selectedProgramId
    );

    if (!selectedProgram) {
      throw new Error("ไม่พบโปรแกรมของเครื่องนี้");
    }

    const finalPrice = Number(price);

    if (
      !Number.isFinite(finalPrice) ||
      finalPrice !== selectedProgram.price
    ) {
      throw new Error("ราคาของโปรแกรมไม่ถูกต้อง");
    }

    // สร้างรหัสใหม่เฉพาะตอนเริ่มรอบใหม่
    const cycleId = randomUUID();

    const updated = machines.map((m: any) => {
      if (Number(m.id) !== id) return m;

      return {
        ...m,
        status: "running",
        command: "start",
        program: selectedProgramId,
        price: finalPrice,
        endTime:
          Date.now() + selectedProgram.durationSeconds * 1000,
        isFree: false,
        cycleId,
      };
    });

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      duration: selectedProgram.durationSeconds,
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
