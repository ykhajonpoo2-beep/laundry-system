
import { createClient } from "redis";

const redisUrl = process.env.LAUNDRY_RECOVERY_REDIS_URL;

if (!redisUrl) {
  throw new Error("Please configure LAUNDRY_RECOVERY_REDIS_URL");
}

const redis = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 8000,
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return false;
      }

      return Math.min(retries * 500, 2000);
    },
  },
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

let connectPromise: Promise<void> | null = null;

async function ensureRedisConnected(): Promise<void> {
  if (redis.isReady) {
    return;
  }

  if (!connectPromise) {
    connectPromise = redis.connect()
      .then(() => undefined)
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }

  await connectPromise;
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
  { id: 1, status: "available", command: "none", endTime: null, lidClosed: true },
  { id: 2, status: "available", command: "none", endTime: null, lidClosed: true },
  { id: 3, status: "available", command: "none", endTime: null, lidClosed: true },
];

export async function getMachines(): Promise<any[]> {
  await ensureRedisConnected();

  const data = await redis.get("machines");

  if (!data) {
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  let machines: any[];

  try {
    machines = JSON.parse(String(data));
    if (!Array.isArray(machines)) {
      throw new Error("Invalid machines data");
    }
  } catch {
    await saveMachines(defaultMachines);
    return defaultMachines;
  }

  const now = Date.now();

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

  return fullMachines.map((m: any) => ({
    ...m,
    timeLeft: m.endTime
      ? Math.max(0, Math.floor((m.endTime - now) / 1000))
      : m.remainingTime
        ? Math.floor(m.remainingTime / 1000)
        : 0,
  }));
}

export async function saveMachines(machines: any[]): Promise<void> {
  await ensureRedisConnected();
  await redis.set("machines", JSON.stringify(machines));
}
