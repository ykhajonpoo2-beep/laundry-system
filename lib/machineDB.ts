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

  if (!data) {
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  let machines: any[] = [];

  try {
    machines = JSON.parse(String(data));
  } catch (e) {
    // 🔥 ถ้า parse พัง → reset เลย
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  const now = Date.now();

  return machines
    .filter((m) => m && typeof m === "object") // 🔥 กัน null
    .map((m: any) => ({
      ...m,
      lidClosed: m.lidClosed ?? true,
      timeLeft: m.endTime
        ? Math.max(0, Math.floor((m.endTime - now) / 1000))
        : m.remainingTime
        ? Math.floor(m.remainingTime / 1000)
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