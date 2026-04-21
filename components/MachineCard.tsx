"use client";

import { useEffect, useState } from "react";

type Program = {
  id: number;
  name: string;
  duration: string;
  price: number;
};

type MachineCardProps = {
  id: number;
  status: string;
};

const programs: Program[] = [
  { id: 1, name: "ซักด่วน", duration: "30 นาที", price: 20 },
  { id: 2, name: "ซักด่วน น้ำอุ่น", duration: "37 นาที", price: 30 },
  {
    id: 3,
    name: "ซักผ้าสกปรกมาก น้ำร้อน",
    duration: "1 ชม. 30 นาที",
    price: 40,
  },
];

export default function MachineCard({
  id,
  status,
}: MachineCardProps) {
  const [showProgramPopup, setShowProgramPopup] =
    useState(false);
console.log("render", showProgramPopup);
  const [showQR, setShowQR] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);

  const [selectedProgram, setSelectedProgram] =
    useState<Program | null>(null);

  useEffect(() => {
    if (!showQR) return;

    if (timeLeft <= 0) {
      setShowQR(false);
      setTimeLeft(60);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showQR, timeLeft]);

  const openQR = (program: Program) => {
    setSelectedProgram(program);
    setShowProgramPopup(false);
    setShowQR(true);
    setTimeLeft(60);
  };

  const startMachine = async () => {
    if (!selectedProgram) return;

    await fetch("/api/start-machine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        machineId: id,
        program: selectedProgram,
      }),
    });

    alert(`เริ่มเครื่อง #${id}`);
    setShowQR(false);
  };

  const downloadQR = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;

    const ctx = canvas.getContext("2d");
    if (!ctx || !selectedProgram) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 500, 500);

    ctx.fillStyle = "black";
    ctx.font = "bold 28px Arial";
    ctx.fillText(`Machine #${id}`, 140, 80);
    ctx.fillText(
      `${selectedProgram.price} บาท`,
      170,
      130
    );

    ctx.strokeRect(100, 170, 300, 300);

    ctx.font = "20px Arial";
    ctx.fillText("QR CODE", 205, 330);

    const link = document.createElement("a");
    link.download = `machine-${id}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return `${min}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <>
  <div className="bg-white rounded-2xl shadow-md p-6">
  <h2 className="text-xl font-semibold mb-2">
    เครื่อง #{id}
  </h2>

  <p className="mb-4">สถานะ: {status}</p>

<button
  type="button"
  onClick={() => {
    alert("button clicked");
    setShowProgramPopup(true);
  }}
  className="w-full bg-black text-white rounded-xl py-3"
>
  เลือกโปรแกรม / ชำระเงิน
</button>
{showProgramPopup && (
  <div className="mt-4 border rounded-xl p-4 bg-white">
    popup mobile test
  </div>
)}
  <p className="mt-3 text-sm">
    popup state: {String(showProgramPopup)}
  </p>
</div>

{showProgramPopup && (
    
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">
          เลือกโปรแกรมซัก
        </h3>

        <button
          type="button"
          onClick={() => setShowProgramPopup(false)}
          className="border px-3 py-1 rounded-lg"
        >
          กลับ
        </button>
      </div>

      <div className="space-y-3">
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            onClick={() => openQR(program)}
            className="w-full border rounded-xl py-4 px-4 text-left"
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
    </div>
  </div>
)}

      {showQR && selectedProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-2">
              เครื่อง #{id}
            </h3>

            <p className="mb-3">
              {selectedProgram.name}
            </p>

            <div className="border-2 border-dashed rounded-xl h-56 flex items-center justify-center mb-4">
              QR CODE
            </div>

            <p className="text-center mb-4">
              เวลาชำระ {formatTime(timeLeft)}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowQR(false)}
                className="border rounded-xl py-2"
              >
                ปิด
              </button>

              <button
                onClick={downloadQR}
                className="border rounded-xl py-2"
              >
                บันทึก QR
              </button>

              <button
                onClick={startMachine}
                className="bg-black text-white rounded-xl py-2"
              >
                จ่ายสำเร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}