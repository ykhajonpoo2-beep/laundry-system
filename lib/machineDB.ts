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
      if (retries > 3) return false;
      return Math.min(retries * 500, 2000);
    },
  },
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

let connectPromise: Promise<void> | null = null;

async function ensureRedisConnected(): Promise<void> {
  if (redis.isReady) return;

  if (!connectPromise) {
    connectPromise = redis
      .connect()
      .then(() => undefined)
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }

  await connectPromise;
}

export type MachineStatus = "available" | "running" | "paused";
export type MachineType = "washer" | "dryer";

export type Machine = {
  id: number;
  machineType: MachineType;
  capacityKg: number;
  status: MachineStatus;
  command: string;
  endTime: number | null;
  lidClosed: boolean;
  program?: number | null;
  remainingTime?: number;
  [key: string]: unknown;
};

/**
 * กำหนดประเภทและขนาดเครื่องจาก ID
 * ไม่อ้างอิงข้อมูลประเภทเครื่องเดิมใน Redis
 */
function getMachineConfig(id: number): {
  machineType: MachineType;
  capacityKg: number;
} {
  if (id >= 9 && id <= 12) {
    return {
      machineType: "dryer",
      capacityKg: 9,
    };
  }

  if (id >= 7 && id <= 8) {
    return {
      machineType: "washer",
      capacityKg: 25,
    };
  }

  if (id >= 5 && id <= 6) {
    return {
      machineType: "washer",
      capacityKg: 15,
    };
  }

  return {
    machineType: "washer",
    capacityKg: 9,
  };
}

function createDefaultMachines(): Machine[] {
  return Array.from({ length: 12 }, (_, index) => {
    const id = index + 1;
    const config = getMachineConfig(id);

    return {
      id,
      machineType: config.machineType,
      capacityKg: config.capacityKg,
      status: "available",
      command: "none",
      endTime: null,
      lidClosed: true,
      program: null,
      remainingTime: 0,
    };
  });
}

export async function getMachines(): Promise<Machine[]> {
  await ensureRedisConnected();

  const data = await redis.get("machines");
  const defaults = createDefaultMachines();

  // กรณียังไม่มีข้อมูลเครื่องใน Redis
  if (!data) {
    await saveMachines(defaults);
    return defaults;
  }

  let stored: unknown;

  try {
    const jsonText =
      typeof data === "string" ? data : data.toString("utf8");

    stored = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "Invalid machines JSON in Redis. Preserve and inspect the data before repairing it."
    );
  }

  if (!Array.isArray(stored)) {
    throw new Error(
      "Invalid machines data in Redis. Expected an array."
    );
  }

  const validMachines = new Map<number, Record<string, unknown>>();

  for (const item of stored) {
    if (!item || typeof item !== "object") continue;

    const machine = item as Record<string, unknown>;
    const id = Number(machine.id);

    if (!Number.isInteger(id) || id < 1 || id > 12) continue;

    // เก็บรายการแรกเมื่อพบ ID ซ้ำ
    if (!validMachines.has(id)) {
      validMachines.set(id, machine);
    }
  }

  const now = Date.now();

  let needsSave = false;

  const machines: Machine[] = defaults.map((fallback) => {
    const old = validMachines.get(fallback.id);

    // เพิ่มเครื่องที่ยังไม่มีใน Redis
    if (!old) {
      needsSave = true;
      return fallback;
    }

    // ตรวจสอบว่าข้อมูลประเภทและขนาดเดิมตรงกับผังใหม่หรือไม่
    if (
      old.machineType !== fallback.machineType ||
      Number(old.capacityKg) !== fallback.capacityKg
    ) {
      needsSave = true;
    }

    const allowedStatuses: MachineStatus[] = [
      "available",
      "running",
      "paused",
    ];

    const status = allowedStatuses.includes(
      old.status as MachineStatus
    )
      ? (old.status as MachineStatus)
      : fallback.status;

    const endTime =
      typeof old.endTime === "number" &&
      Number.isFinite(old.endTime)
        ? old.endTime
        : null;

    const remainingTime =
      typeof old.remainingTime === "number" &&
      Number.isFinite(old.remainingTime)
        ? Math.max(0, old.remainingTime)
        : 0;

    return {
      ...fallback,
      ...old,

      // บังคับค่าประเภทและขนาดจาก ID
      id: fallback.id,
      machineType: fallback.machineType,
      capacityKg: fallback.capacityKg,

      // คงข้อมูลสถานะและการทำงานเดิม
      status,
      command:
        typeof old.command === "string"
          ? old.command
          : "none",
      endTime,
      lidClosed:
        typeof old.lidClosed === "boolean"
          ? old.lidClosed
          : true,
      program:
        typeof old.program === "number"
          ? old.program
          : null,
      remainingTime,

      timeLeft: endTime
        ? Math.max(0, Math.floor((endTime - now) / 1000))
        : Math.floor(remainingTime / 1000),
    };
  });

  // บันทึกเฉพาะเมื่อมีเครื่องใหม่หรือข้อมูลประเภท/ขนาดไม่ตรง
  if (needsSave) {
    await saveMachines(machines);
  }

  return machines;
}

export async function saveMachines(
  machines: Machine[]
): Promise<void> {
  await ensureRedisConnected();

  await redis.set("machines", JSON.stringify(machines));
}