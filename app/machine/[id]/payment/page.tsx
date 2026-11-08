"use client";

import { useEffect, useRef, useState } from "react";
import { getMachineProgram } from "@/lib/programConfig";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";



export default function PaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const programId = searchParams.get("program") || "1";

  const [timeLeft, setTimeLeft] = useState(60);
const [paid, setPaid] = useState(false);
const [lidClosed, setLidClosed] = useState(false);
const [machineType, setMachineType] = useState("");
const [capacityKg, setCapacityKg] = useState(0);
const [machineStatusLoaded, setMachineStatusLoaded] = useState(false);
const [qrCodeUrl, setQrCodeUrl] =
  useState<string | null>(null);

const [chargeId, setChargeId] =
  useState<string | null>(null);
  const [uiExpireAt, setUiExpireAt] =
  useState<number>(0);
const [phone, setPhone] = useState("");
const redemptionIdRef = useRef<string | null>(null);
const [canRedeem, setCanRedeem] = useState(false);
const [waitingPayment, setWaitingPayment] = useState(true);
const [paymentMessage, setPaymentMessage] = useState("");
const [manualReview, setManualReview] = useState(false);
// ✅ เพิ่มตรงนี้
const [showPhonePopup, setShowPhonePopup] = useState(false);
const isProgram1 = programId === "1";

const machineLoaded =
  machineStatusLoaded &&
  (machineType === "washer" || machineType === "dryer");

const program =
  machineType === "washer" || machineType === "dryer"
    ? getMachineProgram(
        machineType,
        capacityKg,
        Number(programId)
      )
    : undefined;

const requiresLidClosed = machineLoaded;
const canShowQR = machineLoaded && lidClosed;
  // ----------------------
  // TIMER
  // ----------------------
  const saveQR = async () => {
  const element = document.getElementById("qr-area");

  if (!element) return;

  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element);

  const link = document.createElement("a");
  link.download = `qr-machine-${id}.png`;
  link.href = canvas.toDataURL();
  link.click();
};
  // ----------------------
  // CHECK LID
  // ----------------------
  

useEffect(() => {
  let mounted = true;

  // เริ่มต้นให้ถือว่ายังตรวจสอบเครื่องไม่เสร็จ
  setMachineStatusLoaded(false);
  setLidClosed(false);
  setMachineType("");
  setCapacityKg(0);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/machines", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("ไม่สามารถตรวจสอบสถานะเครื่องได้");
      }

      const machines = await res.json();

      const m = machines.find(
        (item: any) => Number(item.id) === Number(id)
      );

      if (!mounted) return;

      if (
        !m ||
        (m.machineType !== "washer" &&
          m.machineType !== "dryer")
      ) {
        setMachineStatusLoaded(false);
        setLidClosed(false);
        setMachineType("");
        setCapacityKg(0);
        return;
      }

      setMachineType(m.machineType);
      setCapacityKg(Number(m.capacityKg ?? 0));
      setLidClosed(m.lidClosed === true);
      setMachineStatusLoaded(true);

    } catch (error) {
      console.error("Fetch machine status error:", error);

      if (mounted) {
        setMachineStatusLoaded(false);
        setLidClosed(false);
      }
    }
  };

  void fetchStatus();

  const interval = setInterval(fetchStatus, 1000);

  return () => {
    mounted = false;
    clearInterval(interval);
  };
}, [id]);

  // ----------------------
  // CHECK POINTS
  // ----------------------
  const checkPoints = async () => {
    if (!phone) return;

    const res = await fetch(`/api/points?phone=${phone}`);
    const data = await res.json();

    setCanRedeem(data.canRedeem);
  };

  // ----------------------
  // PAYMENT
  // ----------------------


  // ----------------------
  // REDEEM
  // ----------------------

const redeem = async () => {
  try {
    if (!/^\d{10}$/.test(phone)) {
      alert("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก");
      return;
    }

    if (!redemptionIdRef.current) {
      redemptionIdRef.current = crypto.randomUUID();
    }

    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        machineId: Number(id),
        programId: 1,
        redemptionId: redemptionIdRef.current,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.error || "ไม่สามารถใช้สิทธิซักฟรีได้"
      );
    }

    alert("ใช้สิทธิซักฟรีสำเร็จ 🎉");
    router.push(`/machine/${id}`);
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "ใช้สิทธิไม่สำเร็จ กรุณาลองอีกครั้ง"
    );
  }
};


  const submitPhone = async () => {
  if (phone) {
    await fetch("/api/points", {
      method: "POST",
      body: JSON.stringify({ phone }),
      headers: { "Content-Type": "application/json" },
    });
  }

  setShowPhonePopup(false);
  router.push(`/machine/${id}`);
};
useEffect(() => {
  if (!paid) return;

  const i = setInterval(async () => {
    const res = await fetch(`/api/machines`);
    const data = await res.json();

    const m = data.find((m: any) => m.id == id);

    if (m.status === "running") {
      router.push(`/machine/${id}`); // 🔥 สำคัญ
      clearInterval(i);
    }
  }, 2000);

  return () => clearInterval(i);
}, [paid, id]);
useEffect(() => {
  const saved = localStorage.getItem("phone");
  if (saved) {
    setPhone(saved);

    fetch(`/api/points?phone=${saved}`)
      .then(res => res.json())
      .then(data => setCanRedeem(data.canRedeem));
  }
}, []);




useEffect(() => {
  // ต้องตรวจสอบเครื่องเสร็จและฝาปิดสนิทก่อน
  if (!machineLoaded || !lidClosed) return;

  let cancelled = false;

  const loadSession = async () => {
    try {
      // ค้นหารายการ QR เดิมก่อน
      const res = await fetch(
        `/api/payment-session?machineId=${id}&programId=${programId}`
      );

      const data = await res.json();

      if (cancelled) return;

      if (data.found) {
        setQrCodeUrl(data.qrCodeUrl);
        setChargeId(data.chargeId);

        const expireAt = new Date(data.uiExpireAt).getTime();

        setUiExpireAt(expireAt);
        setTimeLeft(
          Math.max(
            0,
            Math.floor((expireAt - Date.now()) / 1000)
          )
        );

        return;
      }

      // ตรวจสอบอีกครั้งก่อนสร้าง QR
      if (cancelled) return;

      const createRes = await fetch(
        "/api/omise/create-charge",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            machineId: Number(id),
            programId: Number(programId),
          }),
        }
      );

      const charge = await createRes.json();

      if (cancelled) return;

      if (!createRes.ok || !charge.success) {
        throw new Error(
          charge.error || "ไม่สามารถสร้าง QR ได้"
        );
      }

      setQrCodeUrl(charge.qrCodeUrl);
      setChargeId(charge.chargeId);

      const expireAt = Number(charge.uiExpireAt);

      setUiExpireAt(expireAt);
      setTimeLeft(
        Math.max(
          0,
          Math.floor((expireAt - Date.now()) / 1000)
        )
      );

    } catch (error) {
      if (!cancelled) {
        console.error("Load payment session error:", error);
      }
    }
  };

  void loadSession();

  return () => {
    cancelled = true;
  };

}, [id, programId, machineLoaded, lidClosed]);
useEffect(() => {

  if (!uiExpireAt) return;

  const timer = setInterval(() => {

    const remain = Math.floor(
      (uiExpireAt - Date.now()) / 1000
    );

    if (remain <= 0) {

      clearInterval(timer);

      router.replace(`/machine/${id}`);

      return;
    }

    setTimeLeft(remain);

  }, 1000);

  return () => clearInterval(timer);

}, [uiExpireAt, id, router]);

useEffect(() => {
  if (!chargeId || paid || manualReview) return;

  let active = true;
  let checking = false;

  const checkPayment = async () => {
    if (checking || !active) return;

    checking = true;

    try {
      const res = await fetch("/api/omise/check-charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chargeId }),
        cache: "no-store",
      });

      const data = await res.json();

      if (!active) return;

      if (data.manualReview) {
        setManualReview(true);
        setWaitingPayment(false);
        setPaymentMessage(
          data.message ||
            "ชำระเงินแล้ว แต่ต้องให้เจ้าของร้านตรวจสอบก่อนเริ่มเครื่อง"
        );
        return;
      }

      if (data.started === true) {
        setPaid(true);
        setWaitingPayment(false);
        setPaymentMessage("ชำระเงินสำเร็จ กำลังเปิดหน้าเครื่อง...");
        router.replace(`/machine/${id}`);
        return;
      }

      if (data.status === "cancelled") {
        setWaitingPayment(false);
        setPaymentMessage("รายการชำระเงินนี้ถูกยกเลิกแล้ว");
      }
    } catch (error) {
      console.error("ตรวจสอบการชำระเงินไม่สำเร็จ:", error);
    } finally {
      checking = false;
    }
  };

  void checkPayment();

  const interval = setInterval(() => {
    void checkPayment();
  }, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, [chargeId, paid, manualReview, id, router]);
if (machineLoaded && !program) {
  return (
    <main className="min-h-screen p-4">
      <p className="text-red-600">
        ไม่พบโปรแกรมนี้ กรุณากลับไปเลือกโปรแกรมใหม่
      </p>
      <button
        onClick={() => router.replace(`/machine/${id}`)}
        className="mt-3 rounded-lg bg-black px-4 py-2 text-white"
      >
        กลับไปเลือกโปรแกรม
      </button>
    </main>
  );
}
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">

<button
  onClick={async () => {
    try {
      if (!chargeId) {
        router.push(`/machine/${id}`);
        return;
      }

      const res = await fetch("/api/payment-session/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          machineId: Number(id),
          chargeId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "ยกเลิกรายการไม่สำเร็จ");
        return;
      }

      router.replace(`/machine/${id}`);
    } catch (error) {
      console.error("Cancel payment error:", error);
      alert("ไม่สามารถยกเลิกรายการได้ กรุณาลองอีกครั้ง");
    }
  }}
  className="mb-4 text-sm"
>
  ← ย้อนกลับ
</button>

        {requiresLidClosed && !lidClosed && (
          <p className="text-red-500 mb-2 font-bold">
            ❗ กรุณาปิดฝาเครื่อง
          </p>
        )}

        <h1>เครื่อง #{id}</h1>

        {!machineLoaded && (
  <p className="text-center text-gray-500 mb-4">
    กำลังตรวจสอบสถานะเครื่อง...
  </p>
)}

{canShowQR && (
  <>
    <p className="mb-2">
      โปรแกรม: {program.name}
    </p>

    <p className="mb-4 text-gray-500">
      ราคา {program.price} บาท
    </p>

    <div
      id="qr-area"
      className="border-2 border-dashed h-60 flex items-center justify-center mb-4"
    >
      {qrCodeUrl ? (
        <img
          src={qrCodeUrl}
          alt="PromptPay QR"
          className="w-full max-w-xs"
        />
      ) : (
        <p>กำลังสร้าง QR...</p>
      )}
    </div>

    {qrCodeUrl && (
      <>
        <button
          onClick={saveQR}
          className="w-full bg-blue-500 text-white py-2 rounded mb-3"
        >
          💾 บันทึก QR
        </button>

        <p className="text-xs text-gray-500 text-center mb-2">
          📥 กดบันทึก QR เพื่อใช้ชำระภายหลัง
        </p>
      </>
    )}

    {machineType === "washer" &&
      capacityKg === 9 &&
      isProgram1 &&
      canRedeem && (
        <button
          onClick={redeem}
          className="w-full bg-green-500 text-white py-3 rounded-xl mb-3"
        >
          🎁 ใช้สิทธิซักฟรี
        </button>
      )}

    <p className="text-center mb-4">
      ชำระภายใน {timeLeft} วินาที
    </p>

    {waitingPayment && !paid && !manualReview && (
      <p className="text-yellow-500 text-center">
        ⏳ รอการชำระเงิน...
      </p>
    )}

    {paymentMessage && (
      <p className="mt-3 text-center text-sm text-amber-700">
        {paymentMessage}
      </p>
    )}
  </>
)}

      </div>
    </main>
  );
}
