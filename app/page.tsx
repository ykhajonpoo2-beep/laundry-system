"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Machine = {
  id: number;
  status: "available" | "running" | "paused"; // ✅ เพิ่ม
  endTime: number | null;
  timeLeft: number;
};

export default function HomePage() {
  const router = useRouter();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 const fetchMachines = async () => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort(); // ⛔ ตัด request ถ้าค้าง
  }, 5000);

  try {
    const res = await fetch("/api/machines", {
      signal: controller.signal,
      cache: "no-store",
    });

  const data = await res.json();

if (!Array.isArray(data)) {
  throw new Error("invalid data");
}

setMachines(data);
  } catch (err) {
    console.error("fetch error", err);
    setError("เซิร์ฟเวอร์ยังไม่พร้อม");
  } finally {
    clearTimeout(timeout);
    setLoading(false); // 🔥 สำคัญ
  }
};

 useEffect(() => {
  fetchMachines();

  const interval = setInterval(() => {
    fetchMachines();
  }, 3000); // 🔥 ช้าลงหน่อย (ลดโหลด server)

  return () => clearInterval(interval);
}, []);

 if (loading) {
  return (
    <main className="p-4 text-center">
      <p>⏳ กำลังเชื่อมต่อเซิร์ฟเวอร์...</p>
      <p className="text-sm text-gray-400">
        (ถ้าเพิ่ง deploy รอสักครู่)
      </p>
    </main>
  );
}
const getRemainingTime = (m: any) => {
  if (m.status === "paused") {
    return Math.floor(m.remainingTime / 1000);
  }

  if (m.status === "running") {
    return Math.max(
      0,
      Math.floor((m.endTime - Date.now()) / 1000)
    );
  }

  return 0;
};
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <h1>TEST DEPLOY  🔥</h1>
      <h1 className="text-xl font-bold mb-4">
  🧺 Laundry System (NEW UI V3)
</h1>
<div className="grid grid-cols-2 gap-4">
  {machines.map((m) => (
    <div
      key={m.id}
      onClick={() => router.push(`/machine/${m.id}`)}
      className="bg-white p-4 rounded-2xl shadow cursor-pointer"
    >
      {/* icon */}
      <div className="flex justify-center mb-2">
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
          🧺
        </div>
      </div>

      {/* name */}
      <div className="text-center text-sm font-medium">
        เครื่องซักผ้า No.{String(m.id).padStart(2, "0")}
      </div>

      {/* time */}
     {(m.status === "running" || m.status === "paused") && (
  <div className="text-center text-xs text-gray-500 mt-1">
    {Math.floor(getRemainingTime(m) / 60)} นาที เหลือ
  </div>
)}

      {/* status */}
      <div className="text-center mt-2">
        {m.status === "available" && "🔵"}
        {m.status === "running" && "🟠"}
        {m.status === "paused" && "⏸️"}
      </div>
    </div>
  ))}
</div>
    </main>
  );
}