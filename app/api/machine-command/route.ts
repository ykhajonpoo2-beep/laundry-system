import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMachines, saveMachines } from "@/lib/machineDB";
import { verifyAdminSession, COOKIE_NAME } from "@/lib/adminAuth";

export async function GET(req: Request) {
  try {
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
    // ตรวจสอบสิทธิ์ Admin
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!verifyAdminSession(token)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { machineId, command } = await req.json();

    const machines = await getMachines();

    const updated = machines.map((m: any) => {
      if (!m || m.id !== Number(machineId)) return m;

      if (command === "pause") {
        return {
          ...m,
          status: "paused",
          remainingTime: m.endTime
            ? m.endTime - Date.now()
            : m.remainingTime || 0,
          endTime: null,
          command,
        };
      }

      if (command === "resume") {
        return {
          ...m,
          status: "running",
          endTime: Date.now() + (m.remainingTime || 0),
          command,
        };
      }

      return {
        ...m,
        command,
      };
    });

    await saveMachines(updated);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("machine-command POST error", err);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}