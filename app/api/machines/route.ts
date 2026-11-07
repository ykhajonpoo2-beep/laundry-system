import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getMachines, saveMachines, getEsp32LastSeen } from "@/lib/machineDB";

export async function GET() {
  try {
    let machines = await getMachines();

    const now = Date.now();
    let updated = false;

  machines = machines.map((m: any) => {
  if (!m) return null;

  let timeLeft = 0;

  if (m.status === "running" && m.endTime) {
    timeLeft = Math.max(
      0,
      Math.floor((m.endTime - now) / 1000)
    );

    if (timeLeft <= 0) {
  return {
    ...m,
    status: "running",
    overtime: m.overtime ?? false,
    timeLeft: 0,
  };
}
  }

  if (m.status === "paused") {
    return {
      ...m,
      isFree: m.isFree ?? false,   // ✅
      program: m.program ?? 0,     // ✅
      timeLeft: m.remainingTime
        ? Math.floor(m.remainingTime / 1000)
        : 0,
    };
  }

 return {
  ...m,
  isFree: m.isFree ?? false,
  program: m.program ?? 0,
  waitingPayment: false,
  paymentRemain: 0,
  timeLeft,
};
    }).filter(Boolean);

    if (updated) {
      await saveMachines(machines);
    }
const client = await clientPromise;
const db = client.db("laundry");

const sessions = await db
  .collection("paymentSessions")
  .find({
    cancelled: false,
    status: "pending",
    uiExpireAt: {
      $gt: new Date(),
    },
  })
  .toArray();

for (const s of sessions) {
  const machine = machines.find(
    (m: any) => m.id === s.machineId
  );

  if (!machine) continue;

  if (machine.status === "available") {
    machine.waitingPayment = true;

    machine.paymentRemain = Math.floor(
      (new Date(s.uiExpireAt).getTime() - Date.now()) /
        1000
    );
  }
}

const esp32LastSeen = await getEsp32LastSeen(
  machines.map((m: any) => m.id)
);

const responseMachines = machines.map((m: any) => {
  const lastSeenAt = esp32LastSeen[m.id] ?? null;
  const elapsed = lastSeenAt === null ? null : now - lastSeenAt;

  return {
    ...m,
    esp32LastSeenAt: lastSeenAt,
    esp32Online: elapsed !== null && elapsed >= 0 && elapsed < 15000,
  };
});

return NextResponse.json(responseMachines);

  } catch (err) {
    console.error("machines API error", err);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}