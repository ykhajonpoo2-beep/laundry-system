"use client";
import { useState } from "react";

export default function OwnerPage() {
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // 🔥 START PROGRAM (เหมือน QR)
  const testStart = async (price: number) => {
    setActiveBtn(`price-${price}`);

    await fetch("/api/machine-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        machineId: 1,
        command: "start",
        program: price,
      }),
    });

    setTimeout(() => {
      setActiveBtn(null);
    }, 500);
  };

  // 🔥 POWER / PAUSE / RESUME
  const sendPulseCommand = async (command: string) => {
    setActiveBtn(command);

    await fetch("/api/machine-command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        machineId: 1,
        command,
      }),
    });

    setTimeout(() => {
      setActiveBtn(null);
    }, 500);
  };

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">
        รีโมทเจ้าของร้าน
      </h1>

      <div className="space-y-3">

        {/* 💰 ทดลอง */}
        <button
          onClick={() => testStart(20)}
          className={`w-full rounded-xl py-3 ${
            activeBtn === "price-20"
              ? "bg-gray-300"
              : "bg-white border"
          }`}
        >
          ทดลอง 20 บาท
        </button>

        <button
          onClick={() => testStart(30)}
          className={`w-full rounded-xl py-3 ${
            activeBtn === "price-30"
              ? "bg-gray-300"
              : "bg-white border"
          }`}
        >
          ทดลอง 30 บาท
        </button>

        <button
          onClick={() => testStart(40)}
          className={`w-full rounded-xl py-3 ${
            activeBtn === "price-40"
              ? "bg-gray-300"
              : "bg-white border"
          }`}
        >
          ทดลอง 40 บาท
        </button>

        {/* 🔴 POWER */}
        <button
          onClick={() => sendPulseCommand("power")}
          className={`w-full rounded-xl py-3 text-white ${
            activeBtn === "power"
              ? "bg-red-400"
              : "bg-red-600"
          }`}
        >
          🔴 Power
        </button>

        {/* ⏸ PAUSE */}
        <button
          onClick={() => sendPulseCommand("pause")}
          className={`w-full rounded-xl py-3 text-white ${
            activeBtn === "pause"
              ? "bg-yellow-300"
              : "bg-yellow-500"
          }`}
        >
          ⏸ Pause
        </button>

        {/* ▶️ RESUME */}
        <button
          onClick={() => sendPulseCommand("resume")}
          className={`w-full rounded-xl py-3 text-white ${
            activeBtn === "resume"
              ? "bg-green-300"
              : "bg-green-600"
          }`}
        >
          ▶️ Resume
        </button>

      </div>
    </main>
  );
}