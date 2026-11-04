"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useRef } from "react";

const programs: Record<string, {
  name: string;
  price: number;
  duration: number;
}> = {
  "1": {
    name: "ซักด่วน น้ำเย็น",
    price: 20,
    duration: 17 * 60,
  },
  "2": {
    name: "ซักด่วน น้ำอุ่น",
    price: 30,
    duration: 19 * 60,
  },
  "3": {
    name: "ซักทั่วไป น้ำเย็น",
    price: 40,
    duration: 60 * 60,
  },
  "4": {
    name: "ซักทั่วไป น้ำอุ่น",
    price: 50,
    duration: 70 * 60,
  },
  "5": {
    name: "ซักทั่วไป น้ำร้อน",
    price: 60,
    duration: 90 * 60,
  },
};


export default function PaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const programId = searchParams.get("program") || "1";
  const program = programs[programId];

  const [timeLeft, setTimeLeft] = useState(60);
const [paid, setPaid] = useState(false);
const [lidClosed, setLidClosed] = useState(false);
const [qrCodeUrl, setQrCodeUrl] =
  useState<string | null>(null);

const [chargeId, setChargeId] =
  useState<string | null>(null);
  const [uiExpireAt, setUiExpireAt] =
  useState<number>(0);
const [phone, setPhone] = useState("");
const [canRedeem, setCanRedeem] = useState(false);
const [waitingPayment, setWaitingPayment] = useState(true);
const [paymentMessage, setPaymentMessage] = useState("");
const [manualReview, setManualReview] = useState(false);
// ✅ เพิ่มตรงนี้
const [showPhonePopup, setShowPhonePopup] = useState(false);
  const isProgram1 = programId === "1";
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
    const fetchStatus = async () => {
      const res = await fetch("/api/machines", {
        cache: "no-store",
      });

      const machines = await res.json();

      const m = machines.find(
        (m: any) => Number(m.id) === Number(id)
      );

      setLidClosed(m?.lidClosed);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
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
      await fetch("/api/points", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          program: 1,
        }),
      });

 await fetch("/api/start-machine", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    machineId: Number(id),
    price: 0,
    isFree: true, // ✅ เพิ่มตรงนี้
  }),
});

      alert("ใช้ฟรีสำเร็จ 🎉");
      router.push(`/machine/${id}`);
    } catch {
      alert("ใช้สิทธิไม่สำเร็จ");
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

  const loadSession = async () => {

    try {

      const res = await fetch(
        `/api/payment-session?machineId=${id}&programId=${programId}`
      );

      const data = await res.json();

      if (data.found) {

        setQrCodeUrl(data.qrCodeUrl);
        setChargeId(data.chargeId);
        const expireAt = new Date(data.uiExpireAt).getTime();

setUiExpireAt(expireAt);
setTimeLeft(
  Math.max(0, Math.floor((expireAt - Date.now()) / 1000))
);

        return;
      }

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

      if (!charge.success) throw new Error();

      setQrCodeUrl(charge.qrCodeUrl);
      setChargeId(charge.chargeId);
      const expireAt = Number(charge.uiExpireAt);

setUiExpireAt(expireAt);
setTimeLeft(
  Math.max(0, Math.floor((expireAt - Date.now()) / 1000))
);

    } catch (err) {

      console.error(err);

    }

  };

  loadSession();

}, [id, programId]);  // ✅ จบตรงนี้
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
if (!program) {
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

        {!lidClosed && (
          <p className="text-red-500 mb-2 font-bold">
            ❗ กรุณาปิดฝาเครื่อง
          </p>
        )}

        <h1>เครื่อง #{id}</h1>

        <p className="mb-2">โปรแกรม: {program.name}</p>
        <p className="mb-4 text-gray-500">
          ราคา {program.price} บาท
        </p>

        {/* QR */}
        {lidClosed ? (
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
        ) : (
          <div className="border-2 h-60 flex items-center justify-center mb-4 bg-gray-100">
            ❌ QR ไม่แสดง
          </div>
        )}

<button
  onClick={saveQR}
  className="w-full bg-blue-500 text-white py-2 rounded mb-3"
>
  💾 บันทึก QR
</button>
<p className="text-xs text-gray-500 text-center mb-2">
  📥 กดบันทึก QR เพื่อใช้ชำระภายหลัง
</p>
        {/* REDEEM */}
{isProgram1 && canRedeem && (
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

      </div>
    </main>
  );
}