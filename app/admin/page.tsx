"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  endTime: number;
};

export default function AdminPage() {
  const router = useRouter();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

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
  const checkAuth = async () => {
    const res = await fetch("/api/admin/check");

    if (!res.ok) {
      router.push("/admin/login");
    }
  };

  checkAuth();
}, []);
  useEffect(() => {
    fetchMachines();
    fetchRevenue();

    const timer = setInterval(fetchMachines, 5000);
    return () => clearInterval(timer);
  }, []);

  // 📊 summary
  const total = machines.length;
  const running = machines.filter(m => m.status === "running").length;
  const available = machines.filter(m => m.status === "available").length;
  const paused = machines.filter(m => m.status === "paused").length;

  const revenue = running * 20;

  const sendCommand = async (id: number, command: string) => {
    await fetch("/api/machine-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        machineId: id,
        command,
      }),
    });

    fetchMachines();
  };

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
          <div className="bg-white p-4 rounded-xl shadow">
            <p>ทั้งหมด</p>
            <p className="text-xl md:text-2xl font-bold">{total}</p>
          </div>

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

                <div className="flex gap-2 mt-2">
                  {m.status === "running" && (
                    <button
                      onClick={() => sendCommand(m.id, "pause")}
                      className="bg-gray-700 text-white px-3 py-1 rounded w-full md:w-auto"
                    >
                      หยุด
                    </button>
                  )}

                  {m.status === "paused" && (
                    <button
                      onClick={() => sendCommand(m.id, "resume")}
                      className="bg-blue-600 text-white px-3 py-1 rounded w-full md:w-auto"
                    >
                      เริ่ม
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}