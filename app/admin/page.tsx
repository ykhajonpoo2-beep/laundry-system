"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMachinePrograms, type ProgramConfig } from "@/lib/programConfig";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Machine = {
  id: number;
  status: "available" | "running" | "paused";
  program: number;
  endTime: number | null;
  machineType: "washer" | "dryer";
  capacityKg: number;
  lidClosed: boolean;
  command?: string;
  adminTest?: boolean;
};
function getAdminPrograms(machine: Machine): ProgramConfig[] {
  const programs = getMachinePrograms(
    machine.machineType,
    machine.capacityKg
  );

  // เพิ่มโปรแกรมพิเศษเฉพาะเครื่องซัก 9 กก. ใน Admin Test
  if (machine.machineType === "washer" && machine.capacityKg === 9) {
    return [
      ...programs,
      {
        id: 6,
        name: "ล้าง / ปั่นหมาด",
        price: 0,
        durationSeconds: 15 * 60,
      },
      {
        id: 7,
        name: "ล้างเครื่อง",
        price: 0,
        durationSeconds: 120 * 60,
      },
    ];
  }

  return programs;
}
export default function AdminPage() {
  const router = useRouter();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
const [authorized, setAuthorized] = useState(false);
const [authChecking, setAuthChecking] = useState(true);
  // ✅ NEW: revenue state
  const [revenueData, setRevenueData] = useState<any[]>([]);
  // 🔐 logout
  const logout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.push("/admin/login");
  };

  // 🔄 โหลดเครื่อง
  const fetchMachines = async () => {
    try {
      const res = await fetch("/api/machines", {
        cache: "no-store",
      });
      const data = await res.json();
      setMachines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 📊 NEW: โหลดรายได้
  const fetchRevenue = async () => {
    try {
      const res = await fetch("/api/admin/revenue");
      const data = await res.json();
      setRevenueData(data);
    } catch (err) {
      console.error(err);
    }
  };
useEffect(() => {
  let active = true;

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/check", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!res.ok) {
        router.replace("/admin/login");
        return;
      }

      const data = await res.json();

      if (data.ok && active) {
        setAuthorized(true);
      } else {
        router.replace("/admin/login");
      }
    } catch (error) {
      console.error("Admin auth error:", error);
      router.replace("/admin/login");
    } finally {
      if (active) {
        setAuthChecking(false);
      }
    }
  };

  checkAuth();

  return () => {
    active = false;
  };
}, [router]);
  useEffect(() => {
  if (!authorized) return;

  fetchMachines();
  fetchRevenue();

  const timer = setInterval(fetchMachines, 5000);

  return () => clearInterval(timer);
}, [authorized]);

  // 📊 summary
  const total = machines.length;
  const running = machines.filter(m => m.status === "running").length;
  const available = machines.filter(m => m.status === "available").length;
  const paused = machines.filter(m => m.status === "paused").length;

  const revenue = running * 20;

  const sendCommand = async (
  id: number,
  command: string,
  program?: number
) => {
  try {
    const res = await fetch("/api/machine-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        machineId: id,
        command,
        ...(program !== undefined ? { programId: program } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || "ไม่สามารถส่งคำสั่งได้");
      return;
    }

    await fetchMachines();
  } catch (error) {
    console.error("Machine command error:", error);
    alert("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
  }
};
if (authChecking) {
  return <p className="p-4">🔐 กำลังตรวจสอบสิทธิ์...</p>;
}

if (!authorized) return null;
  if (loading) return <p className="p-4">⏳ Loading...</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-3 md:p-5">
      <div className="max-w-5xl mx-auto">

        {/* 🔷 HEADER */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl md:text-3xl font-bold">
            🧑‍💼 Admin Dashboard
          </h1>

          <button
            onClick={logout}
            className="bg-red-500 text-white px-3 py-2 rounded"
          >
            Logout
          </button>
        </div>

        {/* 📊 SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
  type="button"
  onClick={() => router.push("/")}
  className="w-full bg-white p-4 rounded-xl shadow text-left hover:shadow-md transition cursor-pointer"
  aria-label={`เข้าสู่โหมดทดสอบ เลือกเครื่องทั้งหมด ${total} เครื่อง`}
>
  <p>ทั้งหมด</p>
  <p className="text-xl md:text-2xl font-bold">{total}</p>
  <p className="text-xs text-blue-600 mt-1">
    กดเพื่อเลือกเครื่องใน TEST MODE
  </p>
</button>

          <div className="bg-green-100 p-4 rounded-xl">
            <p>ว่าง</p>
            <p className="text-lg font-bold">{available}</p>
          </div>

          <div className="bg-orange-100 p-4 rounded-xl">
            <p>ทำงาน</p>
            <p className="text-lg font-bold">{running}</p>
          </div>

          <div className="bg-gray-200 p-4 rounded-xl">
            <p>หยุด</p>
            <p className="text-lg font-bold">{paused}</p>
          </div>
        </div>

        {/* 💰 REVENUE SUMMARY */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <p>รายได้ (ประมาณ)</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">
            {revenue} บาท
          </p>
        </div>

        {/* 📊 GRAPH */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <h2 className="mb-3 font-semibold">
            📊 รายได้รายวัน
          </h2>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 🧺 MACHINE LIST */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg md:text-xl font-semibold mb-3">
            รายการเครื่อง
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((m) => (
              <div key={m.id} className="border p-4 rounded-xl">
                <p className="font-bold text-lg">
                  เครื่อง #{m.id}
                </p>

                <p>
                  {m.status === "available" && "🟢 ว่าง"}
                  {m.status === "running" && "🟠 ทำงาน"}
                  {m.status === "paused" && "⏸️ หยุด"}
                </p>

                {m.status === "running" && (
                  <p className="text-sm text-gray-500">
                    เหลือ{" "}
                    {Math.max(
                      0,
                      Math.floor((m.endTime - Date.now()) / 60000)
                    )} นาที
                  </p>
                )}

                {/* ADMIN TEST CONTROLS */}
<div className="mt-4 space-y-3 border-t pt-3">

  <div className="text-sm font-semibold text-gray-700">
    ADMIN TEST MODE
  </div>

  <div className="text-sm">
    สถานะฝาเครื่อง:{" "}
    {m.lidClosed ? (
      <span className="text-green-600 font-semibold">
        ปิดฝาแล้ว
      </span>
    ) : (
      <span className="text-red-600 font-semibold">
        เปิดฝาอยู่
      </span>
    )}
  </div>

  {/* POWER */}
  <button
    type="button"
    onClick={() => sendCommand(m.id, "power")}
    className="bg-gray-800 text-white px-4 py-2 rounded-lg w-full"
  >
    POWER
  </button>

  {/* START: RUNNING = PAUSE, PAUSED = RESUME */}
  <button
    type="button"
    disabled={m.status === "available"}
    onClick={() =>
      sendCommand(
        m.id,
        m.status === "running" ? "pause" : "resume"
      )
    }
    className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full disabled:bg-gray-300 disabled:text-gray-500"
  >
    START
  </button>

  {/* PROGRAM BUTTONS */}
  <div>
    <p className="block text-sm mb-2 font-medium">
      โปรแกรมทดสอบ
    </p>

    <div className="grid grid-cols-2 gap-2">
      {getAdminPrograms(m).map((program) => (
        <button
          key={program.id}
          type="button"
          disabled={m.status !== "available" || !m.lidClosed}
          onClick={() => sendCommand(m.id, "start", program.id)}
          className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm disabled:bg-gray-300 disabled:text-gray-500"
        >
          {program.id}. {program.name}
        </button>
      ))}
    </div>
  </div>
</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}