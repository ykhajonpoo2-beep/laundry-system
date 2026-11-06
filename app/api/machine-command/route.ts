import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getMachines, saveMachines } from "@/lib/machineDB";
import { verifyAdminSession, COOKIE_NAME } from "@/lib/adminAuth";

function maxProgramForMachine(id: number) {
  if (id >= 1 && id <= 4) return 7;
  if (id >= 5 && id <= 8) return 5;
  if (id >= 9 && id <= 12) return 3;
  return 0;
}

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id) || id < 1 || id > 12) {
      return NextResponse.json(
        { command: "none" },
        { status: 400 }
      );
    }

    const machines = await getMachines();
    const machine = machines.find((m: any) => m?.id === id);

    if (!machine) {
      return NextResponse.json(
        { command: "none" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      command: machine.command || "none",
      program: machine.program || null,
    });
  } catch (err) {
    console.error("machine-command GET error", err);

    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const machineId = Number(body.machineId);
    const command = String(body.command ?? "");

    if (
      !Number.isInteger(machineId) ||
      machineId < 1 ||
      machineId > 12
    ) {
      return NextResponse.json(
        { success: false, error: "รหัสเครื่องไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const machines = await getMachines();
    const machine = machines.find((m: any) => m?.id === machineId);

    if (!machine) {
      return NextResponse.json(
        { success: false, error: "ไม่พบเครื่องนี้" },
        { status: 404 }
      );
    }

    // ESP32 ยืนยันการรับคำสั่งและล้างคิวได้ด้วย Token เท่านั้น
    const esp32Token = req.headers.get("x-esp32-token");
    const expectedToken = process.env.ESP32_API_TOKEN;

    if (
      esp32Token &&
      expectedToken &&
      esp32Token === expectedToken
    ) {
      const ackCommand = String(body.ackCommand ?? "");

      if (command !== "none" || !ackCommand) {
        return NextResponse.json(
          { success: false, error: "Invalid acknowledgement" },
          { status: 400 }
        );
      }

      const updated = machines.map((m: any) => {
        if (m?.id !== machineId) return m;

        // ล้างเฉพาะคำสั่งที่ ESP32 แจ้งว่ารับไปแล้ว
        if (m.command !== ackCommand) return m;

        return {
          ...m,
          command: "none",
        };
      });

      const changed = machine.command === ackCommand;

      if (changed) {
        await saveMachines(updated);
      }

      return NextResponse.json({
        success: true,
        cleared: changed,
      });
    }

    // คำสั่งอื่นทั้งหมดต้องผ่าน Admin Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(COOKIE_NAME)?.value;

    if (!verifyAdminSession(sessionToken)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowedCommands = [
      "power",
      "start-button",
      "start",
      "pause",
      "resume",
    ];

    if (!allowedCommands.includes(command)) {
      return NextResponse.json(
        { success: false, error: "คำสั่งไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (machine.command && machine.command !== "none") {
      return NextResponse.json(
        { success: false, error: "เครื่องมีคำสั่งรอดำเนินการ" },
        { status: 409 }
      );
    }

    let updatedMachine: any = { ...machine };

    if (command === "start") {
      const programId = Number(body.programId);
      const maxProgram = maxProgramForMachine(machineId);

      if (
        !Number.isInteger(programId) ||
        programId < 1 ||
        programId > maxProgram
      ) {
        return NextResponse.json(
          { success: false, error: "โปรแกรมไม่ถูกต้องสำหรับเครื่องนี้" },
          { status: 400 }
        );
      }

      if (machine.status !== "available") {
        return NextResponse.json(
          { success: false, error: "เครื่องไม่ว่าง" },
          { status: 409 }
        );
      }

      if (machine.lidClosed !== true) {
        return NextResponse.json(
          { success: false, error: "กรุณาปิดฝาเครื่องก่อน" },
          { status: 400 }
        );
      }

      updatedMachine = {
        ...updatedMachine,
        command: "start",
        program: programId,
        adminTest: true,
        cycleId: `admin_${randomUUID()}`,
        isFree: false,
        price: 0,
      };
    } else if (command === "start-button") {
      if (machine.status !== "available") {
        return NextResponse.json(
          { success: false, error: "START ใช้ได้เมื่อเครื่องว่างเท่านั้น" },
          { status: 409 }
        );
      }

      if (machine.lidClosed !== true) {
        return NextResponse.json(
          { success: false, error: "กรุณาปิดฝาเครื่องก่อน" },
          { status: 400 }
        );
      }

      updatedMachine = {
        ...updatedMachine,
        command: "start-button",
      };
    } else if (command === "power") {
      updatedMachine = {
        ...updatedMachine,
        command: "power",
      };
    } else if (command === "pause") {
      if (machine.status !== "running") {
        return NextResponse.json(
          { success: false, error: "เครื่องไม่ได้กำลังทำงาน" },
          { status: 409 }
        );
      }

      updatedMachine = {
        ...updatedMachine,
        status: "paused",
        remainingTime: machine.endTime
          ? Math.max(0, machine.endTime - Date.now())
          : Number(machine.remainingTime || 0),
        endTime: null,
        command: "pause",
      };
    } else if (command === "resume") {
      if (machine.status !== "paused") {
        return NextResponse.json(
          { success: false, error: "เครื่องไม่ได้หยุดชั่วคราว" },
          { status: 409 }
        );
      }

      const remainingTime = Math.max(
        0,
        Number(machine.remainingTime || 0)
      );

      updatedMachine = {
        ...updatedMachine,
        status: "running",
        endTime: Date.now() + remainingTime,
        command: "resume",
      };
    }

    const updated = machines.map((m: any) =>
      m?.id === machineId ? updatedMachine : m
    );

    await saveMachines(updated);

    return NextResponse.json({
      success: true,
      machineId,
      command,
    });
  } catch (err) {
    console.error("machine-command POST error", err);
    return NextResponse.json(
      { success: false, error: "server error" },
      { status: 500 }
    );
  }
}
