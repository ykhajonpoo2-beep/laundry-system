
export type ProgramConfig = {
  id: number;
  name: string;
  price: number;
  durationSeconds: number;
};

export type MachineProgramType = "washer" | "dryer";

const washer9: ProgramConfig[] = [
  { id: 1, name: "ซักด่วน น้ำเย็น", price: 20, durationSeconds: 17 * 60 },
  { id: 2, name: "ซักด่วน น้ำอุ่น", price: 30, durationSeconds: 19 * 60 },
  { id: 3, name: "ซักทั่วไป น้ำเย็น", price: 40, durationSeconds: 60 * 60 },
  { id: 4, name: "ซักทั่วไป น้ำอุ่น", price: 50, durationSeconds: 70 * 60 },
  { id: 5, name: "ซักทั่วไป น้ำร้อน", price: 60, durationSeconds: 90 * 60 },
];

const washer15: ProgramConfig[] = [
  { id: 1, name: "ซักด่วน น้ำอุ่น", price: 50, durationSeconds: 40 * 60 },
  { id: 2, name: "ซักทั่วไป น้ำเย็น", price: 60, durationSeconds: 60 * 60 },
  { id: 3, name: "ซักทั่วไป น้ำอุ่น", price: 70, durationSeconds: 70 * 60 },
  { id: 4, name: "ซักทั่วไป น้ำร้อน", price: 80, durationSeconds: 80 * 60 },
  { id: 5, name: "ซักผ้านวม", price: 90, durationSeconds: 80 * 60 },
];

const washer25: ProgramConfig[] = [
  { id: 1, name: "ซักด่วน น้ำอุ่น", price: 70, durationSeconds: 40 * 60 },
  { id: 2, name: "ซักทั่วไป น้ำเย็น", price: 80, durationSeconds: 60 * 60 },
  { id: 3, name: "ซักทั่วไป น้ำอุ่น", price: 90, durationSeconds: 70 * 60 },
  { id: 4, name: "ซักทั่วไป น้ำร้อน", price: 100, durationSeconds: 80 * 60 },
  { id: 5, name: "ซักผ้านวม", price: 110, durationSeconds: 80 * 60 },
];

const dryer9: ProgramConfig[] = [
  { id: 1, name: "อบด่วน", price: 30, durationSeconds: 30 * 60 },
  { id: 2, name: "อบแห้ง", price: 50, durationSeconds: 80 * 60 },
  { id: 3, name: "อบผ้านวม", price: 90, durationSeconds: 90 * 60 },
];

export function getMachinePrograms(
  machineType: MachineProgramType,
  capacityKg: number
): ProgramConfig[] {
  if (machineType === "dryer" && capacityKg === 9) {
    return dryer9;
  }

  if (machineType === "washer" && capacityKg === 9) {
    return washer9;
  }

  if (machineType === "washer" && capacityKg === 15) {
    return washer15;
  }

  if (machineType === "washer" && capacityKg === 25) {
    return washer25;
  }

  return [];
}

export function getMachineProgram(
  machineType: MachineProgramType,
  capacityKg: number,
  programId: number
): ProgramConfig | undefined {
  return getMachinePrograms(machineType, capacityKg).find(
    (program) => program.id === programId
  );
}

export function canUseFreeWash(
  machineType: MachineProgramType,
  capacityKg: number,
  programId: number
): boolean {
  return (
    machineType === "washer" &&
    capacityKg === 9 &&
    programId === 1
  );
}
