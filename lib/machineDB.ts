import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

// ป้องกัน connect ซ้ำ
if (!redis.isOpen) {
  redis.connect();
}
export type Machine = {
  id: number;
  status: "available" | "running" | "paused";
  command: string;
  endTime: number | null;
  lidClosed: boolean;
  program?: number;
};
const defaultMachines: Machine[] = [
  {
   id: 1,
    status: "available",
    command: "none",
    endTime: null,
    lidClosed: true,
  },
  {
   id: 2,
    status: "available",
    command: "none",
    endTime: null,
    lidClosed: true,
  },
  {
     id: 3,
    status: "available",
    command: "none",
    endTime: null,
    lidClosed: true,
  },
];

export async function getMachines(): Promise<Machine[]> {
  const data = await redis.get("machines");

  // ถ้ายังไม่มีข้อมูลใน Redis
  if (!data) {
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  const machines = JSON.parse(String(data));
  const now = Date.now();

  // คำนวณเวลาคงเหลือ realtime
return machines.map((m: Machine) => ({
  ...m,
  lidClosed: m.lidClosed ?? true, // 👈 กัน undefined
  timeLeft: m.endTime
    ? Math.max(0, Math.floor((m.endTime - now) / 1000))
    : 0,
}));
}

export async function saveMachines(
  machines: any[]
) {
  await redis.set(
    "machines",
    JSON.stringify(machines)
  );
}