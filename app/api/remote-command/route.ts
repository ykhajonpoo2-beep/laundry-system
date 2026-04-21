import { NextResponse } from "next/server";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";

export async function POST(req: Request) {
  const { machineId, command } =
    await req.json();

  const machines = await getMachines();

  const updated = machines.map((m: any) =>
    m.id === machineId
      ? { ...m, command }
      : m
  );

  await saveMachines(updated);

  return NextResponse.json({
    success: true,
  });
}