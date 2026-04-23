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
  // 🔥 กำลังทำงาน → คิดจาก endTime
  if (m.status === "running" && m.endTime) {
    return Math.max(
      0,
      Math.floor((m.endTime - Date.now()) / 1000)
    );
  }

  // 🔥 หยุดชั่วคราว → ใช้ remainingTime
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
                ${running ? "bg-white" : paused ? "bg-yellow-200" : "bg-gray-400 text-white"}
              `}
            >
              {/* 🔥 รูปเครื่อง */}
              <div className="w-20 h-20 flex items-center justify-center">
                <div className="relative w-16 h-16 bg-gray-300 rounded-xl flex items-center justify-center">

  {/* 🔵 ฝาหน้า */}
  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center overflow-hidden relative">
    <div className="absolute w-12 h-12 rounded-full border border-white/30" />
    {/* 💦 น้ำ (พื้นหลัง) */}
    <div className="absolute inset-0 bg-blue-500 opacity-30" />
    <div className={`absolute inset-0 bg-blue-400 opacity-20 ${running ? "animate-pulse" : ""}`} />
    {/* 👕 ผ้า */}
    <div
      className={`
        w-8 h-8 rounded-full
        ${washer 
          ? "bg-gradient-to-tr from-blue-400 via-purple-400 to-pink-400"
          : "bg-gradient-to-tr from-orange-400 via-red-400 to-yellow-400"
        }
        ${running ? "animate-drum" : ""}
        opacity-80
      `}
    />

    {/* 💧 bubbles */}
    {running && (
      <>
        <div className="bubble w-2 h-2 left-2" />
        <div className="bubble w-1.5 h-1.5 left-5 animation-delay-500" />
        <div className="bubble w-2.5 h-2.5 left-7 animation-delay-1000" />
      </>
    )}

  </div>

</div>
              </div>

              {/* 🔥 ข้อมูล */}
              <div className="flex-1">
                {/* badge */}
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

                {/* name */}
                <div className="font-semibold">
                  เครื่อง{washer ? "ซักผ้า" : "อบผ้า"} No.
                  {String(m.id).padStart(2, "0")}
                </div>

                {/* time */}
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

                {/* status button */}
                <div className="mt-2">
                  {running ? (
                    <span
                      className={`
                        text-xs px-3 py-1 rounded-full
                        ${
                          washer
                            ? "bg-blue-100 text-blue-600"
                            : "bg-orange-100 text-orange-600"
                        }
                      `}
                    >
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