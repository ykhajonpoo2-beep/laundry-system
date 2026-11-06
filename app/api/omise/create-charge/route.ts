
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getMachines } from "@/lib/machineDB";
import {
  getMachinePrograms,
  getMachineProgram,
} from "@/lib/programConfig";

const omise = require("omise")({
  secretKey: process.env.OMISE_SECRET_KEY,
  publicKey: process.env.OMISE_PUBLIC_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const machineId = Number(body.machineId);

    if (!Number.isInteger(machineId) || machineId < 1) {
      return NextResponse.json(
        { success: false, error: "หมายเลขเครื่องไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ค้นหาเครื่อง
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
      machine.machineType !== "washer" &&
      machine.machineType !== "dryer"
    ) {
      return NextResponse.json(
        { success: false, error: "ประเภทเครื่องไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const capacityKg = Number(machine.capacityKg);

    // อ่านโปรแกรมจาก config กลาง
    const programs = getMachinePrograms(
      machine.machineType,
      capacityKg
    );

    if (programs.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบโปรแกรมของเครื่องนี้" },
        { status: 400 }
      );
    }

    // รูปแบบใหม่ใช้ programId
    let programId: number;

    if (body.programId !== undefined) {
      programId = Number(body.programId);
    } else {
      // รองรับหน้าเดิมที่ส่งราคาใน field program
      const legacyValue = Number(body.program);

      const matchedByPrice = programs.find(
        (item) => item.price === legacyValue
      );

      programId = matchedByPrice
        ? matchedByPrice.id
        : legacyValue;
    }

    if (!Number.isInteger(programId)) {
      return NextResponse.json(
        { success: false, error: "หมายเลขโปรแกรมไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const selectedProgram = getMachineProgram(
      machine.machineType,
      capacityKg,
      programId
    );

    if (!selectedProgram) {
      return NextResponse.json(
        { success: false, error: "โปรแกรมนี้ไม่รองรับเครื่องที่เลือก" },
        { status: 400 }
      );
    }

    // ตรวจสอบสถานะเครื่อง
    if (machine.status !== "available") {
      return NextResponse.json(
        {
          success: false,
          error: "เครื่องนี้ไม่ว่าง กรุณาเลือกเครื่องอื่น",
        },
        { status: 409 }
      );
    }

    // ตรวจสอบฝาทุกประเภทเครื่อง ทั้งเครื่องซักและเครื่องอบ
if (machine.lidClosed !== true) {
  return NextResponse.json(
    {
      success: false,
      error: "กรุณาปิดฝาเครื่องก่อนชำระเงิน",
    },
    { status: 409 }
  );
}

    const amount = selectedProgram.price;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "ราคาโปรแกรมไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // เชื่อมต่อ MongoDB
    const client = await clientPromise;
    const db = client.db("laundry");
    const sessions = db.collection("paymentSessions");

    // ป้องกัน QR รอชำระซ้ำบนเครื่องเดียวกัน
    const existing = await sessions.findOne({
      machineId,
      status: "pending",
      cancelled: { $ne: true },
      expiresAt: { $gt: new Date() },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "เครื่องนี้มี QR ที่รอชำระเงินอยู่แล้ว กรุณากลับไปใช้รายการเดิม",
          chargeId: existing.chargeId,
        },
        { status: 409 }
      );
    }

    // สร้าง PromptPay QR ด้วยราคาจากเซิร์ฟเวอร์
    const charge = await omise.charges.create({
      amount: amount * 100,
      currency: "thb",
      source: {
        type: "promptpay",
      },
      metadata: {
        machineId: String(machineId),
        machineType: machine.machineType,
        capacityKg: String(capacityKg),
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

    const now = new Date();
    const uiExpireAt = new Date(now.getTime() + 5 * 60 * 1000);

    // บันทึก Payment Session
    await sessions.insertOne({
      chargeId: charge.id,
      machineId,
      machineType: machine.machineType,
      capacityKg,
      programId,
      programName: selectedProgram.name,
      durationMinutes: selectedProgram.durationSeconds / 60,
      durationSeconds: selectedProgram.durationSeconds,
      amount,
      qrCodeUrl,
      status: "pending",
      cancelled: false,
      createdAt: now,
      expiresAt: uiExpireAt,
      uiExpireAt,
      paidAt: null,
      startedAt: null,
    });

    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      machineId,
      machineType: machine.machineType,
      capacityKg,
      programId,
      programName: selectedProgram.name,
      amount,
      durationSeconds: selectedProgram.durationSeconds,
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
