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
  const [loadingId, setLoadingId] = useState<number | null>(null);
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
              onClick={() => {
  setLoadingId(m.id);

  setTimeout(() => {
    router.push(`/machine/${m.id}`);
  }, 300); // delay นิดนึงให้เห็น animation
}}
             className={`  relative   // 👈 เพิ่มตรงนี้
  rounded-2xl p-4 cursor-pointer transition-all
  flex flex-col items-center text-center
  ${
    running
      ? "bg-white"
      : paused
      ? "bg-yellow-200"
      : "bg-gray-400 text-white"
  }
`}
            >  {/* 🔷 TOP */}
  <div className="mb-2">
  <span
    className={`
      text-xs px-3 py-1 rounded-full inline-block mb-1
      ${washer ? "bg-blue-500 text-white" : "bg-orange-500 text-white"}
    `}
  >
    {washer ? "ซักผ้า" : "อบผ้า"}
  </span>

  <div className="text-sm font-semibold">
    เครื่อง{washer ? "ซักผ้า" : "อบผ้า"} No.{String(m.id).padStart(2, "0")}
  </div>
</div>
              {/* 🔥 รูปเครื่อง */}
              <div className="w-20 h-20 relative flex items-center justify-center my-2">

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

 {/* 💧 ฟอง (ซักผ้า) */}
{running && washer && (
  <>
    <div className="bubble w-1.5 h-1.5 left-[20%]" />
    <div className="bubble w-2 h-2 left-[35%] animation-delay-500" />
    <div className="bubble w-1 h-1 left-[50%] animation-delay-1000" />
    <div className="bubble w-2.5 h-2.5 left-[65%] animation-delay-700" />
    <div className="bubble w-1.5 h-1.5 left-[80%] animation-delay-1200" />
  </>
)}
{/* ☁️ ไอน้ำ (อบผ้า) */}
{running && !washer && (
  <>
    <div className="steam w-3 h-3 left-[35%]" />
    <div className="steam w-4 h-4 left-[50%] animation-delay-500" />
    <div className="steam w-2 h-2 left-[65%] animation-delay-500" />
    <div className="steam w-4 h-4 left-[70%] animation-delay-500" />
    <div className="steam w-2 h-2 left-[85%] animation-delay-1000" />
  </>
)}
              </div>

              {/* 🔥 ข้อมูล */}
              <div className="flex-1 flex flex-col justify-between">

 

              {(running || paused) && (
  <div className="text-sm mt-2 text-black">
    🕒 {Math.floor(getTime(m) / 60)
      .toString()
      .padStart(2, "0")}
    :
    {(getTime(m) % 60)
      .toString()
      .padStart(2, "0")}{" "}
    เหลือ
  </div>
)}

                <div className="mt-3">
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
{loadingId === m.id && (
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
    
    {/* spinner */}
    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />

  </div>
)}
</div>
            </div>
          );
        })}
      </div>
    </main>
  );
}