import { NextResponse } from "next/server";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";

export async function POST(req: Request) {
  const { machineId } =
    await req.json();

  const machines =
    await getMachines();

  const updated = machines.map(
    (m: any) =>
      m.id === Number(machineId)
        ? {
            ...m,
            status: "available",
            command: "none",
            endTime: null,
            program: null,
             // ⭐ ใส่ตรงนี้
        isFree: false,
          }
        : m
  );

  await saveMachines(updated);

  return NextResponse.json({
    success: true,
  });
}