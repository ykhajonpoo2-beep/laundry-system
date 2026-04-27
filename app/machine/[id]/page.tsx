"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
const programs = [
  { id: 1, name: "ซักด่วน", duration: "30 นาที", price: 20 },
  { id: 2, name: "ซักด่วน น้ำอุ่น", duration: "37 นาที", price: 30 },
  { id: 3, name: "ซักหนัก น้ำร้อน", duration: "90 นาที", price: 40 },
];

export default function MachinePage() {
  const { id } = useParams();
  const router = useRouter();

  // ✅ state ทั้งหมดอยู่บนสุด
  const [machine, setMachine] = useState<any>(null);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [points, setPoints] = useState(0);
  const [canRedeem, setCanRedeem] = useState(false);

  const status = machine?.status || "loading";
  const [showPhonePopup, setShowPhonePopup] = useState(false);
 const searchParams = useSearchParams();
const fromPayment = searchParams.get("from") === "payment";

const [displayPhone, setDisplayPhone] = useState("");
  // ✅ function
const checkPoints = async () => {
  if (phone.length !== 10) {
    alert("กรุณากรอกเบอร์ 10 หลัก");
    return;
  }

  const res = await fetch(`/api/points?phone=${phone}`);
  const data = await res.json();

  setPoints(data.points);
  setCanRedeem(data.canRedeem);

  setDisplayPhone(phone); // แสดงผล
  setPhone("");           // 🔥 ล้างช่องทันที
};

const fetchData = async () => {
  try {
    const res = await fetch("/api/machines", {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("API error");
    }

    const machines = await res.json();

    const m = machines.find(
      (m: any) => Number(m.id) === Number(id)
    );

    setMachine(m);
  } catch (err) {
    console.error("fetch machine error:", err);
  }
};

  const getRemainingTime = () => {
    if (machine?.status === "paused") {
      return Math.floor(machine.remainingTime / 1000);
    }

    if (machine?.status === "running") {
      return Math.max(
        0,
        Math.floor((machine.endTime - Date.now()) / 1000)
      );
    }

    return 0;
  };
const claimPoint = async () => {
  if (!phone || !machine) return;

  await fetch("/api/points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      machineId: machine.id,
      startTime: machine.endTime,
    }),
  });

  await checkPoints(); // ✅ สำคัญมาก
  setShowPhonePopup(false);
};
  // ✅ useEffect ทั้งหมดต้องอยู่ตรงนี้ (ก่อน return)
 useEffect(() => {
  let mounted = true;

  const fetchData = async () => {
    try {
      const res = await fetch("/api/machines");
      const data = await res.json();

      if (!mounted) return;

      const m = data.find(
        (m: any) => Number(m.id) === Number(id)
      );

      setMachine(m);
    } catch (err) {
      console.error(err);
    }
  };

  fetchData();
  const timer = setInterval(fetchData, 3000);

  return () => {
    mounted = false;
    clearInterval(timer);
  };
}, [id]);


useEffect(() => {
  if (phone.length === 10) {
    localStorage.setItem("phone", phone);
  }
}, [phone]);


  // ✅ ค่อย return ทีหลัง
  // ✅ hook ต้องอยู่ก่อน
useEffect(() => {
  if (!machine) return;

  const key = `popup-${machine.id}`;
  const already = localStorage.getItem(key);

  if (
    machine.status === "running" &&
    !machine.isFree &&
    machine.program > 0 &&
    machine.endTime &&
    !already
  ) {
    setShowPhonePopup(true);
    localStorage.setItem(key, "true");
  }
}, [machine]);
useEffect(() => {
  if (machine?.status === "available") {
    localStorage.removeItem(`popup-${machine.id}`);
  }
}, [machine]);

// ✅ ค่อย return ทีหลัง
if (!machine) {
  return <p className="p-4">⏳ กำลังโหลด...</p>;
}


  return (
    
    <main className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-5">

  {/* 🔹 input + ปุ่ม (แสดงตลอด) */}
<input
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  placeholder="กรอกเบอร์โทร 10 หลัก"
  className="w-full border p-2 rounded mb-2"
/>

<button
  onClick={checkPoints}
  className="w-full bg-blue-600 text-white py-2 rounded"
>
  เช็คแต้ม
</button>

{/* 🔹 แสดงผลหลังเช็ค */}
{displayPhone && (
  <div className="mt-3 text-center">
    <p className="font-semibold">
      เบอร์: {displayPhone}
    </p>

    <p>
      แต้ม: {points} / 5
      {points < 5 && ` (เหลือ ${5 - points} ครั้ง)`}
    </p>

    {canRedeem && (
      <div className="bg-green-100 text-green-700 p-2 rounded mt-2">
        🎉 คุณมีสิทธิซักฟรี!
      </div>
    )}
  </div>
)}

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
                  {program.id === 1 && canRedeem ? (
  <span className="text-green-600 font-bold">
    ฟรี 🎉
  </span>
) : (
  <span>{program.price} บาท</span>
)}
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
{showPhonePopup && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-5 rounded-xl w-80 text-center">

      <p className="mb-2 font-semibold">
        🎉 รับแต้มสะสม ซักครบ 5 ฟรี 1
      </p>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="กรอกเบอร์โทร"
        className="border w-full p-2 mb-3"
      />

      <button
        onClick={claimPoint}
        className="bg-black text-white w-full py-2 mb-2 rounded"
      >
        ยืนยันรับแต้ม
      </button>

      <button
        onClick={() => setShowPhonePopup(false)}
        className="text-gray-500 text-sm"
      >
        ❗กดปิดไม่รับแต้ม
      </button>

    </div>
  </div>
)} 

      </div>
    </main>
  );
}