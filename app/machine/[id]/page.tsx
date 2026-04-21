"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const programs = [
  { id: 1, name: "ซักด่วน", duration: "30 นาที", price: 20 },
  { id: 2, name: "ซักด่วน น้ำอุ่น", duration: "37 นาที", price: 30 },
  { id: 3, name: "ซักหนัก น้ำร้อน", duration: "90 นาที", price: 40 },
];

export default function MachinePage() {
  const { id } = useParams();
  const router = useRouter();

  const [machine, setMachine] = useState<any>(null);
  const [error, setError] = useState("");

  const status = machine?.status || "loading";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/machines");
        const machines = await res.json();

        const m = machines.find(
          (m: any) => Number(m.id) === Number(id)
        );

        if (!m) {
          setError("ไม่พบเครื่อง");
          return;
        }

        setMachine(m);
        setError("");
      } catch (err) {
        console.error(err);
        setError("โหลดข้อมูลไม่สำเร็จ");
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 2000);
    return () => clearInterval(timer);
  }, [id]);

  const formatRemainingTime = (endTime: number | null) => {
    if (!endTime) return "0 นาที";

    const diff = Math.max(
      0,
      Math.floor((endTime - Date.now()) / 1000)
    );

    const minutes = Math.floor(diff / 60);
    return `${minutes} นาที`;
  };

  // ✅ loading กันพัง
  if (!machine) {
    return <p className="p-4">⏳ กำลังโหลด...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-5">

        <button
          onClick={() => router.push("/")}
          className="mb-4 text-sm"
        >
          ← กลับหน้าแรก
        </button>

        <h1 className="text-2xl font-bold mb-3">
          เครื่อง #{id}
        </h1>

        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}

        <p className="mb-4">
          สถานะ:{" "}
          {status === "available" && "🟢 ว่าง"}
          {status === "running" && "🟠 กำลังทำงาน"}
          {status === "paused" && "⏸️ หยุดชั่วคราว"}
        </p>

        {/* 🔴 ฝาไม่ปิด */}
        {status === "available" && !machine.lidClosed && (
          <p className="text-red-500 mb-3">
            ❗ กรุณาปิดฝาเครื่องก่อน
          </p>
        )}

        {/* ✅ เลือกโปรแกรม */}
        {status === "available" && machine.lidClosed && (
          <div className="space-y-3">
            {programs.map((program) => (
              <button
                key={program.id}
                onClick={() =>
                  router.push(
                    `/machine/${id}/payment?program=${program.id}`
                  )
                }
                className="w-full border rounded-xl p-4 text-left hover:bg-gray-50"
              >
                <div className="font-semibold">
                  {program.name}
                </div>
                <div className="text-sm text-gray-500">
                  {program.duration} • {program.price} บาท
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 🟠 RUNNING */}
 {(status === "running" || status === "paused") && (
  <div
    className={`border rounded-xl p-4 mt-3 ${
      status === "paused" ? "bg-yellow-50" : "bg-gray-50"
    }`}
  >
    {/* 🔥 สถานะ */}
    <p className="font-semibold">
      {status === "running" && "🟠 เครื่องกำลังทำงาน"}
      {status === "paused" && "⏸️ เครื่องหยุดชั่วคราว"}
    </p>

    {/* ⏱ เวลา */}
    <p className="text-sm text-gray-500 mb-3">
      ⏱ {formatRemainingTime(machine.endTime)}
    </p>

    {/* 🔘 ปุ่ม */}
    {status === "running" && (
      <button
        onClick={async () => {
          await fetch("/api/machine-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              machineId: Number(id),
              command: "pause",
            }),
          });
        }}
        className="w-full bg-yellow-500 text-white py-2 rounded-xl"
      >
        ⏸️ พักเครื่อง
      </button>
    )}

    {status === "paused" && (
      <button
        onClick={async () => {
          await fetch("/api/machine-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              machineId: Number(id),
              command: "resume",
            }),
          });
        }}
        className="w-full bg-green-600 text-white py-2 rounded-xl"
      >
        ▶️ ทำงานต่อ
      </button>
    )}
  </div>
)}

      </div>
    </main>
  );
}