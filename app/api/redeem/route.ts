import { NextResponse } from "next/server";
import type { UpdateFilter } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  getMachines,
  saveMachines,
} from "@/lib/machineDB";
import {
  getMachineProgram,
  canUseFreeWash,
} from "@/lib/programConfig";

const MAX_POINTS = 5;

type RedemptionRecord = {
  id: string;
  machineId: number;
  programId: number;
  status: "reserved" | "started" | "refunded";
  cycleId: string;
  createdAt: Date;
  updatedAt?: Date;
};
type CustomerDocument = {
  phone: string;
  points: number;
  redemptions?: RedemptionRecord[];
  updatedAt?: Date;
};
export async function POST(req: Request) {
  let phone = "";
  let redemptionId = "";
  let reserved = false;

  try {
    const body = await req.json();

    phone = String(body.phone ?? "").replace(/\D/g, "");
    const machineId = Number(body.machineId);
    const programId = Number(body.programId);
    redemptionId = String(body.redemptionId ?? "").trim();

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(machineId) ||
      machineId < 1 ||
      programId !== 1
    ) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลเครื่องหรือโปรแกรมไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (
      redemptionId.length < 16 ||
      redemptionId.length > 100
    ) {
      return NextResponse.json(
        { success: false, error: "รหัสแลกสิทธิไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบเครื่องก่อนจองแต้ม
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
      !canUseFreeWash(
        machine.machineType,
        Number(machine.capacityKg),
        programId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "สิทธิซักฟรีใช้ได้เฉพาะเครื่องซัก 9 กก. โปรแกรม 1",
        },
        { status: 400 }
      );
    }

    const selectedProgram = getMachineProgram(
      machine.machineType,
      Number(machine.capacityKg),
      programId
    );

    if (!selectedProgram) {
      throw new Error("ไม่พบโปรแกรมที่เลือก");
    }

    if (machine.lidClosed !== true) {
      return NextResponse.json(
        { success: false, error: "กรุณาปิดฝาเครื่องก่อน" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
   const customers = client
  .db("laundry")
  .collection<CustomerDocument>("customers");

    const cycleId = `redeem_${redemptionId}`;

    // ตรวจสอบว่ารหัสนี้เคยถูกใช้หรือยัง
    let customer = await customers.findOne({ phone });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลสมาชิก" },
        { status: 404 }
      );
    }

    let existing = (
      customer.redemptions ?? []
    ).find((item: RedemptionRecord) => item.id === redemptionId);

    if (existing) {
      if (
        Number(existing.machineId) !== machineId ||
        Number(existing.programId) !== programId
      ) {
        return NextResponse.json(
          { success: false, error: "รหัสแลกสิทธินี้ถูกใช้กับรายการอื่นแล้ว" },
          { status: 409 }
        );
      }

      if (existing.status === "started") {
        return NextResponse.json({
          success: true,
          started: true,
          alreadyProcessed: true,
          cycleId: existing.cycleId,
        });
      }

      if (existing.status === "refunded") {
        return NextResponse.json(
          {
            success: false,
            error: "รายการนี้ได้รับการคืนแต้มแล้ว กรุณาทำรายการใหม่",
          },
          { status: 409 }
        );
      }
    } else {
      // จองแต้มและบันทึก redemptionId ในคำสั่ง MongoDB เดียวกัน
      const reserveUpdate: UpdateFilter<CustomerDocument> = {
  $inc: { points: -MAX_POINTS },
  $push: {
    redemptions: {
      id: redemptionId,
      machineId,
      programId,
      status: "reserved",
      cycleId,
      createdAt: new Date(),
    },
  },
  $set: { updatedAt: new Date() },
};

const reserveResult = await customers.updateOne(
  {
    phone,
    points: { $gte: MAX_POINTS },
    redemptions: {
      $not: {
        $elemMatch: { id: redemptionId },
      },
    },
  },
  reserveUpdate
);

      if (reserveResult.modifiedCount !== 1) {
        customer = await customers.findOne({ phone });

        existing = (
          customer?.redemptions ?? []
        ).find((item: RedemptionRecord) => item.id === redemptionId);

        if (!existing) {
          return NextResponse.json(
            { success: false, error: "แต้มไม่เพียงพอสำหรับแลกสิทธิ" },
            { status: 400 }
          );
        }

        if (
          Number(existing.machineId) !== machineId ||
          Number(existing.programId) !== programId
        ) {
          return NextResponse.json(
            { success: false, error: "รหัสแลกสิทธินี้ถูกใช้กับรายการอื่นแล้ว" },
            { status: 409 }
          );
        }

        if (existing.status === "started") {
          return NextResponse.json({
            success: true,
            started: true,
            alreadyProcessed: true,
            cycleId: existing.cycleId,
          });
        }

        if (existing.status === "refunded") {
          return NextResponse.json(
            { success: false, error: "รายการนี้ได้รับการคืนแต้มแล้ว" },
            { status: 409 }
          );
        }
      } else {
        reserved = true;
      }
    }

    // อ่านสถานะเครื่องล่าสุดก่อนเริ่ม
    const latestMachines = await getMachines();

    const latestMachine = latestMachines.find(
      (item: any) => Number(item.id) === machineId
    );

    if (!latestMachine) {
      throw new Error("ไม่พบเครื่องนี้");
    }

    // ถ้า Redis บันทึกรอบนี้ไปแล้ว ให้ถือว่าเริ่มสำเร็จ
    if (latestMachine.cycleId === cycleId) {
      await customers.updateOne(
        {
          phone,
          "redemptions.id": redemptionId,
          "redemptions.status": "reserved",
        },
        {
          $set: {
            "redemptions.$.status": "started",
            "redemptions.$.updatedAt": new Date(),
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        started: true,
        alreadyProcessed: true,
        cycleId,
      });
    }

    if (latestMachine.status !== "available") {
      throw new Error("เครื่องไม่พร้อมทำงาน");
    }

    if (latestMachine.lidClosed !== true) {
      throw new Error("ฝาเครื่องยังไม่ปิด");
    }

    const updatedMachines = latestMachines.map((item: any) => {
      if (Number(item.id) !== machineId) return item;

      return {
        ...item,
        status: "running",
        command: "start",
        program: programId,
        price: 0,
        endTime:
          Date.now() + selectedProgram.durationSeconds * 1000,
        isFree: true,
        cycleId,
      };
    });

    await saveMachines(updatedMachines);

    // บันทึกว่าเริ่มเครื่องแล้ว
    await customers.updateOne(
      {
        phone,
        "redemptions.id": redemptionId,
        "redemptions.status": "reserved",
      },
      {
        $set: {
          "redemptions.$.status": "started",
          "redemptions.$.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      started: true,
      cycleId,
      duration: selectedProgram.durationSeconds,
    });
  } catch (error) {
    console.error("POST /api/redeem error:", error);

    // ถ้าได้จองแต้มแล้ว ให้ตรวจ Redis ก่อนคืนแต้ม
    if (reserved && phone && redemptionId) {
      try {
        const cycleId = `redeem_${redemptionId}`;
        const machines = await getMachines();

        const customer = await (
          await clientPromise
        )
          .db("laundry")
          .collection("customers")
          .findOne({ phone });

        const record = (
          customer?.redemptions ?? []
        ).find((item: RedemptionRecord) => item.id === redemptionId);

        const machineStarted = machines.some(
          (item: any) => item.cycleId === cycleId
        );

        if (machineStarted) {
          await (
            await clientPromise
          )
            .db("laundry")
            .collection("customers")
            .updateOne(
              {
                phone,
                "redemptions.id": redemptionId,
                "redemptions.status": "reserved",
              },
              {
                $set: {
                  "redemptions.$.status": "started",
                  "redemptions.$.updatedAt": new Date(),
                  updatedAt: new Date(),
                },
              }
            );
        } else if (record?.status === "reserved") {
          await (
            await clientPromise
          )
            .db("laundry")
            .collection("customers")
            .updateOne(
              {
                phone,
                points: { $exists: true },
                redemptions: {
                  $elemMatch: {
                    id: redemptionId,
                    status: "reserved",
                  },
                },
              },
              {
                $inc: { points: MAX_POINTS },
                $set: {
                  "redemptions.$.status": "refunded",
                  "redemptions.$.updatedAt": new Date(),
                  updatedAt: new Date(),
                },
              }
            );
        }
      } catch (recoveryError) {
        // หากตรวจสอบ Redis ไม่ได้ จะไม่คืนแต้มอัตโนมัติ
        // เพื่อป้องกันกรณีเครื่องเริ่มแล้วแต่มีการคืนแต้ม
        console.error("Redemption recovery error:", recoveryError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "ไม่สามารถแลกสิทธิได้",
      },
      { status: 400 }
    );
  }
}