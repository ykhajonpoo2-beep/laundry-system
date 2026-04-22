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
useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 2000);
    return () => clearInterval(timer);
  }, [id]);

const getRemainingTime = () => {
  if (machine.status === "paused") {
    return Math.floor(machine.remainingTime / 1000);
  }

  if (machine.status === "running") {
    return Math.max(
      0,
      Math.floor((machine.endTime - Date.now()) / 1000)
    );
  }

  return 0;
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
            ❗นำผ้าเข้าเครื่อง เติมน้ำยาซัก แล้วปิดฝาเครื่อง 
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
  <div className="border rounded-2xl p-4 bg-blue-50 mt-3">

    {/* ✅ เปลี่ยนข้อความตรงนี้ */}
    <p className="text-center font-medium">
      {status === "running"
        ? "กำลังทำงาน"
        : "หยุดชั่วคราวแล้ว"}
    </p>

    {/* เวลา */}
  <p className="text-center text-2xl font-bold my-2">
  {Math.floor(getRemainingTime() / 60)} นาที เหลือ
</p>

    {/* progress bar */}
    <div className="w-full bg-gray-200 h-2 rounded-full mb-4">
      <div
        className="bg-blue-500 h-2 rounded-full"
        style={{ width: "70%" }} // (ต่อยอดทำ dynamic ได้)
      />
    </div>

    {/* 🔘 ปุ่ม */}
    {status === "running" ? (
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

          fetchData(); // รีโหลด
        }}
        className="w-full bg-gray-700 text-white py-3 rounded-xl"
      >
        ⏸️ หยุดชั่วคราว
      </button>
    ) : (
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

          fetchData();
        }}
        className="w-full bg-gray-700 text-white py-3 rounded-xl"
      >
        ▶️ เริ่มใหม่
      </button>
    )}
  </div>
)}

      </div>
    </main>
  );
}