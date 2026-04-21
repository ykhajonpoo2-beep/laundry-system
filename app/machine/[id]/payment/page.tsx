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

      if (!res.ok) {
        throw new Error("payment failed");
      }

      const data = await res.json();
      console.log(data);

      alert("ชำระเงินสำเร็จ");
      router.push(`/machine/${id}`);
    } catch (error) {
      console.error(error);
      setPaid(false);
      alert("ชำระเงินไม่สำเร็จ");
    }
  };
const [lidClosed, setLidClosed] = useState(false);

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

  return (
    <main className="min-h-screen bg-gray-100 p-4">
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">

{!lidClosed && (
  <p className="text-red-500 mb-2 font-bold">
    ❗ QR ไม่แสดง ❗<br />
    กรุณาปิดฝาเครื่องให้สนิท
  </p>
)}

  <h1>เครื่อง #{id}</h1>

        <p className="mb-2">
          โปรแกรม: {program.name}
        </p>

        <p className="mb-4 text-gray-500">
          ราคา {program.price} บาท
        </p>

       {lidClosed ? (
  <div className="border-2 border-dashed h-60 flex items-center justify-center mb-4">
    QR CODE
  </div>
) : (
  <div className="border-2 border-dashed h-60 flex items-center justify-center mb-4 bg-gray-100">
    ❌ QR ไม่แสดง
  </div>
)}

        <p className="text-center mb-4">
          กรุณาชำระภายใน {timeLeft} วินาที
        </p>

<button
  onClick={confirmPayment}
  disabled={!lidClosed || paid}
  className="w-full bg-black text-white py-3 rounded-xl disabled:opacity-50"
>
  {paid ? "กำลังดำเนินการ..." : "ฉันชำระแล้ว"}
</button>
        

      </div>
    </main>
  );
}