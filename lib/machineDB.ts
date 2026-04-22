// 🔥 import
import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

if (!redis.isOpen) {
  redis.connect();
}

// 🔥 type
export type Machine = {
  id: number;
  status: "available" | "running" | "paused";
  command: string;
  endTime: number | null;
  lidClosed: boolean;
  program?: number;
};

// 🔥 default
const defaultMachines: Machine[] = [
  { id: 1, status: "available", command: "none", endTime: null, lidClosed: true },
  { id: 2, status: "available", command: "none", endTime: null, lidClosed: true },
  { id: 3, status: "available", command: "none", endTime: null, lidClosed: true },
];

// 🔥 GET
export async function getMachines(): Promise<any[]> {
  const data = await redis.get("machines");

  if (!data) {
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  let machines: any[] = [];

  try {
    machines = JSON.parse(String(data));
  } catch {
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  const now = Date.now();

  // ✅ normalize + กัน null
  const cleanMachines = machines
    .filter((m) => m && typeof m === "object" && m.id)
    .map((m: any) => ({
      id: Number(m.id),
      status: m.status || "available",
      command: m.command || "none",
      endTime: m.endTime ?? null,
      lidClosed: m.lidClosed ?? true,
      program: m.program ?? null,
      remainingTime: m.remainingTime ?? 0,
    }));

  // ✅ บังคับให้มีครบ 3 เครื่อง
  const fullMachines = [1, 2, 3].map((id) => {
    const found = cleanMachines.find((m) => m.id === id);

    return found || {
      id,
      status: "available",
      command: "none",
      endTime: null,
      lidClosed: true,
      program: null,
      remainingTime: 0,
    };
  });

  // ✅ คำนวณเวลา
  return fullMachines.map((m: any) => ({
    ...m,
    timeLeft: m.endTime
      ? Math.max(0, Math.floor((m.endTime - now) / 1000))
      : m.remainingTime
      ? Math.floor(m.remainingTime / 1000)
      : 0,
  }));
}

// 🔥 SAVE (ต้องมี!)
export async function saveMachines(machines: any[]) {
  await redis.set("machines", JSON.stringify(machines));
}