"use client";

import { useEffect, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

const programs: Record<string, any> = {
  "1": { name: "ซักด่วน", price: 20, duration: 1800 },
  "2": { name: "ซักด่วน น้ำอุ่น", price: 30, duration: 2220 },
  "3": { name: "ซักหนัก น้ำร้อน", price: 40, duration: 5400 },
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

const [phone, setPhone] = useState("");
const [canRedeem, setCanRedeem] = useState(false);

// ✅ เพิ่มตรงนี้
const [showPhonePopup, setShowPhonePopup] = useState(false);
  const isProgram1 = programId === "1";
  // ----------------------
  // TIMER
  // ----------------------
  useEffect(() => {
    if (paid) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          router.push(`/machine/${id}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paid, id, router]);

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
  const confirmPayment = async () => {
  try {
    setPaid(true);

    const res = await fetch("/api/start-machine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        machineId: Number(id),
        price: program.price,
      }),
    });

    if (!res.ok) throw new Error();

    // ❌ ลบ 2 บรรทัดนี้
    // alert("ชำระเงินสำเร็จ 🎉");
    // router.push(`/machine/${id}`);

  } catch (err) {
    setPaid(false);
    alert("ผิดพลาด");
  }
};

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
  if (!paid) return; // ✅ สำคัญมาก

  const i = setInterval(async () => {
    const res = await fetch(`/api/machines`);
    const data = await res.json();

    const m = data.find((m: any) => m.id == id);

    if (m.status === "running") {
      setShowPhonePopup(true);
      clearInterval(i); // ✅ กันยิงซ้ำ
    }
  }, 2000);

  return () => clearInterval(i);
}, [paid, id]);
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">
<button
          onClick={() => router.push("/")}
          className="mb-4 text-sm"
        >
          ← กลับหน้าแรก
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
          <div className="border-2 border-dashed h-60 flex items-center justify-center mb-4">
            QR CODE
          </div>
        ) : (
          <div className="border-2 h-60 flex items-center justify-center mb-4 bg-gray-100">
            ❌ QR ไม่แสดง
          </div>
        )}

        {/* INPUT PHONE */}
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="กรอกเบอร์รับแต้ม"
          className="w-full border p-2 rounded mb-2"
        />

        <button
          onClick={checkPoints}
          className="w-full bg-blue-500 text-white py-2 rounded mb-3"
        >
          เช็คสิทธิ
        </button>

        {/* REDEEM */}
        {canRedeem && (
          <button
            onClick={redeem}
            className="w-full bg-green-500 text-white py-3 rounded-xl mb-3"
          >
            🎁 ใช้สิทธิซักฟรี
          </button>
        )}
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

        <button
          onClick={confirmPayment}
          disabled={!lidClosed || paid}
          className="w-full bg-black text-white py-3 rounded-xl disabled:opacity-50"
        >
          {paid ? "กำลังดำเนินการ..." : "ฉันชำระแล้ว"}
        </button>
        {paid && !showPhonePopup && (
  <p className="text-center text-blue-500">
    ⏳ กำลังตรวจสอบการชำระเงิน...
  </p>
)}
{showPhonePopup && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white p-5 rounded-xl w-80">
      <p className="mb-2">รับแต้มสะสม</p>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border w-full p-2 mb-3"
      />

      <button
        onClick={submitPhone}
        className="bg-black text-white w-full py-2"
      >
        ยืนยัน
      </button>
      <button
  onClick={() => {
    setShowPhonePopup(false);
    router.push(`/machine/${id}`);
  }}
  className="text-gray-500 text-sm mt-2"
>
  ไม่รับแต้ม
</button>
    </div>
  </div>
)}
      </div>
    </main>
  );
}