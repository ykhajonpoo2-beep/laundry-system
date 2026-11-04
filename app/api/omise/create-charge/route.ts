
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getMachines } from "@/lib/machineDB";

const omise = require("omise")({
  secretKey: process.env.OMISE_SECRET_KEY,
  publicKey: process.env.OMISE_PUBLIC_KEY,
});

const washer9Programs = {
  1: { name: "ซักด่วน น้ำเย็น", duration: 17, price: 20 },
  2: { name: "ซักด่วน น้ำอุ่น", duration: 19, price: 30 },
  3: { name: "ซักทั่วไป น้ำเย็น", duration: 60, price: 40 },
  4: { name: "ซักทั่วไป น้ำอุ่น", duration: 70, price: 50 },
  5: { name: "ซักทั่วไป น้ำร้อน", duration: 90, price: 60 },
} as const;

type ProgramId = keyof typeof washer9Programs;

function resolveProgramId(body: any): ProgramId | null {
  // รูปแบบใหม่: ส่ง programId เช่น 1, 2, 3, 4, 5
  if (body.programId !== undefined) {
    const id = Number(body.programId);

    return Number.isInteger(id) && id >= 1 && id <= 5
      ? (id as ProgramId)
      : null;
  }

  // รองรับหน้า Payment รุ่นเดิมที่ส่ง "ราคา" มาใน program
  const value = Number(body.program);

  const entry = Object.entries(washer9Programs).find(
    ([, item]) => item.price === value
  );

  if (entry) return Number(entry[0]) as ProgramId;

  // รองรับกรณีหน้าเดิมส่ง program เป็นหมายเลขโปรแกรม
  return Number.isInteger(value) && value >= 1 && value <= 5
    ? (value as ProgramId)
    : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const machineId = Number(body.machineId);
    const programId = resolveProgramId(body);

    if (!Number.isInteger(machineId) || machineId < 1) {
      return NextResponse.json(
        { success: false, error: "หมายเลขเครื่องไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!programId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบโปรแกรมที่เลือก" },
        { status: 400 }
      );
    }

    // ระยะเริ่มต้น: รองรับเครื่องซักผ้า 9 kg ก่อน
    const machines = await getMachines();
    const machine = machines.find(
      (item: any) => Number(item.id) === machineId
    );

    if (!machine) {
      return NextResponse.json(
        { success: false, error: "ไม่พบเครื่องนี้" },
        { status: 404 }
      );
    }

    if (
      machine.machineType !== "washer" ||
      Number(machine.capacityKg) !== 9
    ) {
      return NextResponse.json(
        { success: false, error: "ขณะนี้รองรับเฉพาะเครื่องซักผ้า Size S 9 kg" },
        { status: 400 }
      );
    }

    if (machine.status !== "available") {
      return NextResponse.json(
        { success: false, error: "เครื่องนี้ไม่ว่าง กรุณาเลือกเครื่องอื่น" },
        { status: 409 }
      );
    }

    if (machine.lidClosed !== true) {
      return NextResponse.json(
        { success: false, error: "กรุณาปิดฝาเครื่องก่อนชำระเงิน" },
        { status: 409 }
      );
    }

    const selectedProgram = washer9Programs[programId];
    const amount = selectedProgram.price;

    const client = await clientPromise;
    const db = client.db("laundry");
    const sessions = db.collection("paymentSessions");

    // ป้องกันสร้าง QR ใหม่ หากมีรายการรอชำระเงินที่ยังไม่หมดอายุ
    const existing = await sessions.findOne({
  machineId,
  programId,
  status: "pending",
  cancelled: { $ne: true },
  expiresAt: { $gt: new Date() },
});

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "เครื่องนี้มี QR ที่รอชำระเงินอยู่แล้ว กรุณากลับไปใช้รายการเดิม",
          chargeId: existing.chargeId,
        },
        { status: 409 }
      );
    }

    // สร้าง PromptPay Charge โดยใช้ราคาที่กำหนดบนเซิร์ฟเวอร์
    const charge = await omise.charges.create({
      amount: amount * 100,
      currency: "thb",
      source: { type: "promptpay" },
      metadata: {
        machineId: String(machineId),
        programId: String(programId),
        programName: selectedProgram.name,
        price: String(amount),
      },
    });

    const qrCodeUrl =
      charge.source?.scannable_code?.image?.download_uri;

    if (!qrCodeUrl) {
      throw new Error("ไม่พบ QR Code จาก Omise");
    }

    const uiExpireAt = new Date(Date.now() + 5 * 60 * 1000);

    await sessions.insertOne({
      chargeId: charge.id,
      machineId,
      programId,
      programName: selectedProgram.name,
      durationMinutes: selectedProgram.duration,
      amount,
      qrCodeUrl,
      status: "pending",
      cancelled: false,
      createdAt: new Date(),
      expiresAt: uiExpireAt,
      uiExpireAt,
      paidAt: null,
      startedAt: null,
    });

    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      machineId,
      programId,
      programName: selectedProgram.name,
      amount,
      qrCodeUrl,
      uiExpireAt: uiExpireAt.getTime(),
    });
  } catch (err: any) {
    console.error("create-charge error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "สร้าง QR ไม่สำเร็จ",
      },
      { status: 500 }
    );
  }
}
