"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Machine = {
  id: number;
  status: "available" | "running" | "paused";
  endTime: number | null;
  remainingTime?: number;
};

export default function HomePage() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);

  const fetchMachines = async () => {
    try {
      const res = await fetch("/api/machines", { cache: "no-store" });
      const data = await res.json();
      setMachines(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMachines();
    const i = setInterval(fetchMachines, 3000);
    return () => clearInterval(i);
  }, []);

  const getTime = (m: Machine) => {
    if (m.status === "running" && m.endTime) {
      return Math.max(0, Math.floor((m.endTime - Date.now()) / 1000));
    }

    if (m.status === "paused" && m.remainingTime) {
      return Math.floor(m.remainingTime / 1000);
    }

    return 0;
  };

  const isWasher = (id: number) => id <= 2;

  return (
    <main className="min-h-screen bg-gray-200 p-4">
      <h1 className="text-xl font-bold mb-4">ร้านซัก</h1>

      <div className="grid grid-cols-2 gap-4">
        {machines.map((m) => {
          const running = m.status === "running";
          const paused = m.status === "paused";
          const washer = isWasher(m.id);

          return (
            <div
              key={m.id}
              onClick={() => router.push(`/machine/${m.id}`)}
              className={`
                rounded-2xl p-4 flex gap-3 items-center cursor-pointer
                transition-all
                ${
                  running
                    ? "bg-white"
                    : paused
                    ? "bg-yellow-200"
                    : "bg-gray-400 text-white"
                }
              `}
            >
              {/* 🔥 รูปเครื่อง */}
              <div className="w-20 h-20 relative flex items-center justify-center">

                {/* เครื่องเต็ม */}
                <img
                  src="/lg-full.png"
                  className="absolute w-full h-full object-contain"
                  
                />

                {/* ถัง */}
<div className="absolute w-[100%] h-[100%]"

     style={{
       top: "48%",
       left: "50%",
       transform: "translate(-50%, -50%)"
     }}>
     
  <img
  src="/lg-drum.png"
  className={`
    absolute object-contain
    ${running ? "animate-drum" : ""}
  `}
  style={{
    width: "100px",
    height: "100px",
    top: "-7.8px",
    left: "-0.3px",
    transformOrigin: "50% 46%", // 👈 สำคัญมาก
  }}
/>
</div>

                {/* bubble */}
              {running && (
  <>
    <div className="bubble w-1.5 h-1.5 left-[20%]" />
    <div className="bubble w-2 h-2 left-[35%] animation-delay-500" />
    <div className="bubble w-1 h-1 left-[50%] animation-delay-1000" />
    <div className="bubble w-2.5 h-2.5 left-[65%] animation-delay-700" />
    <div className="bubble w-1.5 h-1.5 left-[80%] animation-delay-1200" />
  </>
)}
              </div>

              {/* 🔥 ข้อมูล */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${
                        washer
                          ? "bg-blue-500 text-white"
                          : "bg-orange-500 text-white"
                      }
                    `}
                  >
                    {washer ? "ซักผ้า" : "อบผ้า"}
                  </span>
                </div>

                <div className="font-semibold">
                  เครื่อง{washer ? "ซักผ้า" : "อบผ้า"} No.
                  {String(m.id).padStart(2, "0")}
                </div>

                {(running || paused) ? (
                  <div className="text-sm mt-1 flex items-center gap-1 text-black">
                    🕒 {Math.floor(getTime(m) / 60)
                      .toString()
                      .padStart(2, "0")}
                    :
                    {(getTime(m) % 60)
                      .toString()
                      .padStart(2, "0")}{" "}
                    เหลือ
                  </div>
                ) : (
                  <div className="text-sm mt-1 opacity-80">
                    สแตนด์บาย
                  </div>
                )}

                <div className="mt-2">
                  {running ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-600">
                      กำลังทำงาน
                    </span>
                  ) : paused ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-yellow-400 text-black">
                      หยุดชั่วคราว
                    </span>
                  ) : (
                    <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full">
                      พร้อมใช้งาน
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}