import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getMachines, saveMachines } from "@/lib/machineDB";
import { getMachineProgram } from "@/lib/programConfig";

const omise = require("omise")({
  secretKey: process.env.OMISE_SECRET_KEY,
  publicKey: process.env.OMISE_PUBLIC_KEY,
});

export async function POST(req: Request) {
  try {
    const { chargeId } = await req.json();

    if (
      typeof chargeId !== "string" ||
      !chargeId.startsWith("chrg_")
    ) {
      return NextResponse.json(
        { success: false, error: "chargeId ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const sessions = client.db("laundry").collection("paymentSessions");

    const session = await sessions.findOne({ chargeId });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรายการชำระเงิน" },
        { status: 404 }
      );
    }

    // หากรายการนี้เริ่มเครื่องแล้ว ไม่สั่งซ้ำ
    if (session.status === "started" && session.startedAt) {
      return NextResponse.json({
        success: true,
        paid: true,
        started: true,
        status: "successful",
        machineId: session.machineId,
      });
    }

    // ตรวจสอบสถานะการชำระเงินกับ Omise โดยตรง
    const charge = await omise.charges.retrieve(chargeId);

    if (charge.status !== "successful") {
      if (
        session.cancelled === true ||
        session.status === "cancelled"
      ) {
        return NextResponse.json({
          success: true,
          paid: false,
          started: false,
          status: "cancelled",
        });
      }

      return NextResponse.json({
        success: true,
        paid: false,
        started: false,
        status: charge.status,
      });
    }

    // ตรวจสอบยอดเงินและสกุลเงิน
    const expectedAmount = Number(session.amount) * 100;
    const actualCurrency = String(charge.currency || "").toLowerCase();

    if (
      !Number.isFinite(expectedAmount) ||
      Number(charge.amount) !== expectedAmount ||
      actualCurrency !== "thb"
    ) {
      return NextResponse.json(
        {
          success: false,
          paid: true,
          started: false,
          error:
            "ยอดเงินหรือสกุลเงินไม่ตรงกับรายการ กรุณาตรวจสอบด้วยตนเอง",
        },
        { status: 409 }
      );
    }

    // หากยกเลิกหรือหมดอายุแล้ว แต่ Omise แจ้งว่าชำระสำเร็จ
    // จะไม่เริ่มเครื่องอัตโนมัติ
    if (
      session.cancelled === true ||
      session.status === "cancelled" ||
      (session.expiresAt &&
        new Date(session.expiresAt).getTime() < Date.now())
    ) {
      await sessions.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "paid",
            paidAt: session.paidAt || new Date(),
            manualReview: true,
            manualReviewReason:
              session.cancelled === true ||
              session.status === "cancelled"
                ? "ชำระสำเร็จหลังยกเลิกรายการ"
                : "ชำระสำเร็จหลังรายการหมดอายุ",
          },
        }
      );

      return NextResponse.json({
        success: true,
        paid: true,
        started: false,
        manualReview: true,
        status: "successful",
        message:
          "ชำระเงินสำเร็จ แต่ต้องตรวจสอบรายการก่อนเริ่มเครื่อง",
      });
    }

    // ล็อกการเริ่มเครื่อง ป้องกันการประมวลผลซ้ำจาก polling
    const now = new Date();
    const lockUntil = new Date(Date.now() + 30_000);

    const claim = await sessions.findOneAndUpdate(
      {
        _id: session._id,
        startedAt: null,
        cancelled: { $ne: true },
        status: { $ne: "cancelled" },
        $or: [
          { startLockUntil: { $exists: false } },
          { startLockUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          status: "paid",
          paidAt: session.paidAt || now,
          startLockUntil: lockUntil,
        },
      },
      { returnDocument: "after" }
    );

    if (!claim) {
      const latest = await sessions.findOne({ _id: session._id });

      if (latest?.startedAt) {
        return NextResponse.json({
          success: true,
          paid: true,
          started: true,
          status: "successful",
          machineId: session.machineId,
        });
      }

      return NextResponse.json({
        success: true,
        paid: true,
        started: false,
        processing: true,
        status: "successful",
        message: "กำลังประมวลผลรายการนี้",
      });
    }

    const machineId = Number(session.machineId);
    const programId = Number(session.programId);
    const cycleId = `omise_${chargeId}`;

    try {
      const machines = await getMachines();

      const machine = machines.find(
        (item: any) => Number(item.id) === machineId
      );

      if (!machine) {
        throw new Error("ไม่พบเครื่องที่ผูกกับรายการชำระเงิน");
      }

      // หาก Redis บันทึกรอบเดียวกันไปแล้ว ให้ถือว่าเริ่มเครื่องแล้ว
      if (machine.cycleId === cycleId) {
        await sessions.updateOne(
          { _id: session._id },
          {
            $set: {
              status: "started",
              startedAt: new Date(),
              cycleId,
            },
            $unset: { startLockUntil: "" },
          }
        );

        return NextResponse.json({
          success: true,
          paid: true,
          started: true,
          status: "successful",
          machineId,
        });
      }

      // ตรวจสอบประเภทและขนาดเครื่อง
      if (
        machine.machineType !== "washer" &&
        machine.machineType !== "dryer"
      ) {
        throw new Error("ประเภทเครื่องไม่ถูกต้อง");
      }

      const capacityKg = Number(machine.capacityKg);

      // ตรวจสอบข้อมูลเครื่องใน Payment Session ถ้ามีข้อมูลบันทึกไว้
      if (
        session.machineType !== undefined &&
        session.machineType !== machine.machineType
      ) {
        throw new Error("ประเภทเครื่องไม่ตรงกับรายการชำระเงิน");
      }

      if (
        session.capacityKg !== undefined &&
        Number(session.capacityKg) !== capacityKg
      ) {
        throw new Error("ขนาดเครื่องไม่ตรงกับรายการชำระเงิน");
      }

      // อ่านโปรแกรมจาก config กลาง
      const selectedProgram = getMachineProgram(
        machine.machineType,
        capacityKg,
        programId
      );

      if (!selectedProgram) {
        throw new Error("ไม่พบโปรแกรมที่รองรับสำหรับเครื่องนี้");
      }

      // ตรวจสอบราคาอีกครั้งกับ config กลาง
      if (
        !Number.isFinite(Number(session.amount)) ||
        Number(session.amount) !== selectedProgram.price
      ) {
        throw new Error("ราคาโปรแกรมไม่ตรงกับรายการชำระเงิน");
      }

      // ตรวจสอบสถานะเครื่อง
      if (machine.status !== "available") {
        throw new Error("เครื่องไม่พร้อมทำงานหลังชำระเงิน");
      }

     // ตรวจสอบฝาทุกประเภทเครื่อง ทั้งเครื่องซักและเครื่องอบ
if (machine.lidClosed !== true) {
  throw new Error("ฝาเครื่องยังไม่ปิด");
}

      // ใช้ระยะเวลาจาก config กลาง
      const duration = selectedProgram.durationSeconds;

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error("ระยะเวลาโปรแกรมไม่ถูกต้อง");
      }

      const updatedMachines = machines.map((item: any) => {
        if (Number(item.id) !== machineId) return item;

        return {
          ...item,
          status: "running",
          command: "start",
          program: programId,
          price: Number(session.amount),
          endTime: Date.now() + duration * 1000,
          isFree: false,
          cycleId,
        };
      });

      await saveMachines(updatedMachines);

      // บันทึกสถานะเริ่มเครื่องสำเร็จ
      await sessions.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "started",
            startedAt: new Date(),
            cycleId,
            durationSeconds: duration,
          },
          $unset: {
            startLockUntil: "",
            manualReview: "",
            manualReviewReason: "",
          },
        }
      );

      return NextResponse.json({
        success: true,
        paid: true,
        started: true,
        status: "successful",
        machineId,
        machineType: machine.machineType,
        capacityKg,
        programId,
        programName: selectedProgram.name,
        duration,
        cycleId,
      });
    } catch (machineError) {
      // ไม่ลบข้อมูลการชำระเงิน หากเครื่องยังเริ่มไม่ได้
      await sessions.updateOne(
        { _id: session._id },
        {
          $set: {
            status: "paid",
            manualReview: true,
            manualReviewReason:
              machineError instanceof Error
                ? machineError.message
                : "ไม่สามารถเริ่มเครื่องได้",
          },
          $unset: { startLockUntil: "" },
        }
      );

      return NextResponse.json(
        {
          success: false,
          paid: true,
          started: false,
          manualReview: true,
          error:
            machineError instanceof Error
              ? machineError.message
              : "ชำระแล้ว แต่เริ่มเครื่องไม่ได้",
        },
        { status: 409 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการตรวจสอบการชำระเงิน",
      },
      { status: 500 }
    );
  }
}