"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const washer9Programs = [
  { id: 1, name: "ซักด่วน น้ำเย็น", duration: "17 นาที", price: 20 },
  { id: 2, name: "ซักด่วน น้ำอุ่น", duration: "19 นาที", price: 30 },
  { id: 3, name: "ซักทั่วไป น้ำเย็น", duration: "60 นาที", price: 40 },
  { id: 4, name: "ซักทั่วไป น้ำอุ่น", duration: "70 นาที", price: 50 },
  { id: 5, name: "ซักทั่วไป น้ำร้อน", duration: "90 นาที", price: 60 },
];
const ownerWasher9Programs = [
  ...washer9Programs,
  {
    id: 6,
    name: "ล้าง ปั่นหมาด",
    duration: "15 นาที",
    price: 0,
  },
  {
    id: 7,
    name: "ล้างเครื่อง",
    duration: "120 นาที",
    price: 0,
  },
];
const washer15Programs = [
  { id: 1, name: "ซักด่วน น้ำอุ่น", duration: "40 นาที", price: 40 },
  { id: 2, name: "ซักทั่วไป น้ำเย็น", duration: "60 นาที", price: 50 },
  { id: 3, name: "ซักทั่วไป น้ำอุ่น", duration: "70 นาที", price: 60 },
  { id: 4, name: "ซักทั่วไป น้ำร้อน", duration: "80 นาที", price: 70 },
  { id: 5, name: "ซักผ้านวม", duration: "80 นาที", price: 80 },
];

const washer25Programs = [
  { id: 1, name: "ซักด่วน น้ำอุ่น", duration: "40 นาที", price: 60 },
  { id: 2, name: "ซักทั่วไป น้ำเย็น", duration: "60 นาที", price: 70 },
  { id: 3, name: "ซักทั่วไป น้ำอุ่น", duration: "70 นาที", price: 80 },
  { id: 4, name: "ซักทั่วไป น้ำร้อน", duration: "80 นาที", price: 90 },
  { id: 5, name: "ซักผ้านวม", duration: "80 นาที", price: 100 },
];

const dryer9Programs = [
  { id: 1, name: "อบด่วน", duration: "30 นาที", price: 30 },
  { id: 2, name: "อบแห้ง", duration: "80 นาที", price: 50 },
  { id: 3, name: "อบผ้านวม", duration: "90 นาที", price: 60 },
];

export default function MachinePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [machine, setMachine] = useState<any>(null);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [points, setPoints] = useState(0);
  const [canRedeem, setCanRedeem] = useState(false);
  const [displayPhone, setDisplayPhone] = useState("");

  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [loadingProgram, setLoadingProgram] = useState<number | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [savingClaim, setSavingClaim] = useState(false);
  const [savingWaive, setSavingWaive] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState(false);
const [pendingProgramId, setPendingProgramId] = useState<number | null>(null);
const [ownerMode, setOwnerMode] = useState(false);
const [checkingOwner, setCheckingOwner] = useState(true);
  const status = machine?.status || "loading";
  const fromPayment = searchParams.get("from") === "payment";

  const customerPrograms =
  machine?.machineType === "dryer"
    ? dryer9Programs
    : Number(machine?.capacityKg) === 15
      ? washer15Programs
      : Number(machine?.capacityKg) === 25
        ? washer25Programs
        : washer9Programs;

const programs =
  ownerMode &&
  machine?.machineType === "washer" &&
  Number(machine?.capacityKg) === 9
    ? ownerWasher9Programs
    : customerPrograms;

const canUseFreeWash =
  machine?.machineType === "washer" &&
  Number(machine?.capacityKg) === 9 &&
  canRedeem;

  // โหลดข้อมูลเครื่อง
  const fetchData = async () => {
    try {
      const res = await fetch("/api/machines", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลเครื่องได้");
      }

      const machines = await res.json();

      const currentMachine = machines.find(
        (item: any) => Number(item.id) === Number(id)
      );

      setMachine(currentMachine ?? null);
    } catch (err) {
      console.error("fetch machine error:", err);
      setError("ไม่สามารถโหลดข้อมูลเครื่องได้");
    }
  };

  // ตรวจสอบแต้มด้วยเบอร์ที่ระบุ
  const checkPoints = async (phoneToCheck?: string) => {
    const cleanPhone = String(phoneToCheck ?? phone).replace(/\D/g, "");

    if (!/^\d{10}$/.test(cleanPhone)) {
      alert("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก");
      return;
    }

    setLoadingCheck(true);

    try {
      const res = await fetch(
        `/api/points?phone=${encodeURIComponent(cleanPhone)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "ไม่สามารถตรวจสอบแต้มได้");
        return;
      }

      setPoints(Number(data.points ?? 0));
      setCanRedeem(Boolean(data.canRedeem));
      setDisplayPhone(cleanPhone);
      setPhone("");
    } catch (err) {
      console.error("check points error:", err);
      alert("ไม่สามารถเชื่อมต่อเพื่อตรวจสอบแต้มได้");
    } finally {
      setLoadingCheck(false);
    }
  };

  const getRemainingTime = () => {
    if (machine?.status === "paused") {
      return Math.floor(Number(machine.remainingTime || 0) / 1000);
    }

    if (machine?.status === "running") {
      return Math.max(
        0,
        Math.floor((Number(machine.endTime) - Date.now()) / 1000)
      );
    }

    return 0;
  };

  // รับแต้มสำหรับรอบซักปัจจุบัน
  const claimPoint = async () => {
    const cleanPhone = phone.replace(/\D/g, "");

    if (!/^\d{10}$/.test(cleanPhone)) {
      alert("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง 10 หลัก");
      return;
    }

    if (!machine?.cycleId) {
      alert("ไม่พบรหัสรอบซัก กรุณาเริ่มรอบซักใหม่ก่อน");
      return;
    }

    if (machine.machineType !== "washer") {
      alert("เครื่องอบผ้าไม่ได้รับแต้มสะสม");
      return;
    }

    setSavingClaim(true);

    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          machineId: machine.id,
          cycleId: machine.cycleId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "ไม่สามารถรับแต้มได้");
        return;
      }

      // ใช้แต้มที่ API ส่งกลับมา ไม่เรียก checkPoints ด้วย input ที่ถูกล้างแล้ว
      setPoints(Number(data.points ?? 0));
      setCanRedeem(Boolean(data.canRedeem));
      setDisplayPhone(cleanPhone);
      setPhone("");
      setShowPhonePopup(false);
    } catch (err) {
      console.error("claim point error:", err);
      alert("ไม่สามารถเชื่อมต่อเพื่อบันทึกแต้มได้");
    } finally {
      setSavingClaim(false);
    }
  };

  // ปิด Popup พร้อมบันทึกว่าไม่รับแต้ม
  const waivePoint = async () => {
    if (!machine?.cycleId) {
      alert("ไม่พบรหัสรอบซัก จึงยังบันทึกสถานะไม่ได้");
      return;
    }

    setSavingWaive(true);

    try {
      const res = await fetch("/api/points/check-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machine.id,
          cycleId: machine.cycleId,
          action: "waive",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "บันทึกสถานะไม่สำเร็จ กรุณาลองใหม่");
        return;
      }

      setShowPhonePopup(false);
      setPhone("");
    } catch (err) {
      console.error("waive point error:", err);
      alert("ไม่สามารถบันทึกสถานะได้ กรุณาลองใหม่");
    } finally {
      setSavingWaive(false);
    }
  };
useEffect(() => {
  let mounted = true;

  const checkOwner = async () => {
    try {
      const res = await fetch("/api/admin/check", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!mounted) return;

      setOwnerMode(res.ok);
    } catch {
      if (mounted) setOwnerMode(false);
    } finally {
      if (mounted) setCheckingOwner(false);
    }
  };

  checkOwner();

  return () => {
    mounted = false;
  };
}, []);
  // โหลดข้อมูลและอัปเดตสถานะเครื่อง
  useEffect(() => {
    let mounted = true;

    const loadMachine = async () => {
      try {
        const res = await fetch("/api/machines", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const machines = await res.json();

        if (!mounted) return;

        const currentMachine = machines.find(
          (item: any) => Number(item.id) === Number(id)
        );

        setMachine(currentMachine ?? null);
      } catch (err) {
        console.error("load machine error:", err);
      }
    };

    loadMachine();

    const timer = setInterval(loadMachine, 3000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [id]);

// ตรวจสอบ QR ที่รอชำระเงินของเครื่องนี้
useEffect(() => {
  let mounted = true;
  let checking = false;

  const checkWaitingPayment = async () => {
    if (checking) return;
    checking = true;

    try {
      const res = await fetch(
        `/api/payment-session?machineId=${id}`,
        { cache: "no-store" }
      );

      if (!res.ok) return;

      const data = await res.json();

      if (!mounted) return;

      if (data.found) {
        setWaitingPayment(true);
        setPendingProgramId(Number(data.programId));
      } else {
        setWaitingPayment(false);
        setPendingProgramId(null);
      }
    } catch (err) {
      console.error("check payment session error:", err);
    } finally {
      checking = false;
    }
  };

  void checkWaitingPayment();

  const timer = setInterval(() => {
    void checkWaitingPayment();
  }, 3000);

  return () => {
    mounted = false;
    clearInterval(timer);
  };
}, [id]);

  // จำเบอร์ที่กรอกระหว่างใช้งาน
  useEffect(() => {
    if (/^\d{10}$/.test(phone)) {
      localStorage.setItem("phone", phone);
    }
  }, [phone]);

  // ตรวจสอบสถานะการรับแต้มด้วย cycleId
  useEffect(() => {
    let cancelled = false;

    const checkPopup = async () => {
      if (
        !machine ||
        machine.status !== "running" ||
        machine.isFree ||
        !machine.cycleId ||
        machine.program <= 0 ||
        machine.machineType !== "washer" ||
        showPhonePopup
      ) {
        return;
      }

      try {
        const res = await fetch("/api/points/check-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            machineId: machine.id,
            cycleId: machine.cycleId,
          }),
        });

        if (!res.ok) return;

        const data = await res.json();

        if (cancelled) return;

        if (!data.alreadyClaimed) {
          setShowPhonePopup(true);
        }
      } catch (err) {
        console.error("check claim error:", err);
      }
    };

    checkPopup();

    return () => {
      cancelled = true;
    };
  }, [machine, showPhonePopup]);

  if (!machine) {
    return <p className="p-4">⏳ กำลังโหลด...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-5">
        {/* ตรวจสอบแต้ม */}
        <input
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          inputMode="numeric"
          placeholder="กรอกเบอร์โทร 10 หลัก"
          className="w-full border p-2 rounded mb-2"
        />

        <button
          onClick={() => checkPoints()}
          disabled={loadingCheck}
          className="w-full bg-blue-600 text-white py-2 rounded flex justify-center items-center gap-2 disabled:opacity-60"
        >
          {loadingCheck && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loadingCheck ? "กำลังตรวจสอบ..." : "เช็คแต้ม"}
        </button>

        {displayPhone && (
          <div className="mt-3 text-center">
            <p className="font-semibold">เบอร์: {displayPhone}</p>

            <p>
              แต้ม: {points} / 5
              {points < 5 && ` (เหลือ ${5 - points} แต้ม)`}
            </p>

            {canRedeem && (
              <div className="bg-green-100 text-green-700 p-2 rounded mt-2">
                🎉 คุณมีสิทธิซักฟรี!
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => {
            setLoadingBack(true);
            router.push("/");
          }}
          className="mb-4 mt-4 text-sm flex items-center gap-2"
        >
          {loadingBack && (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          )}
          ← กลับหน้าแรก
        </button>

        <h1 className="text-2xl font-bold mb-3">เครื่อง #{id}</h1>
{ownerMode && (
  <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg p-3 mb-4 text-center font-bold">
    🛠️ OWNER TEST MODE
    <p className="text-xs font-normal mt-1">
      โหมดทดสอบสำหรับเจ้าของร้าน
    </p>
  </div>
)}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <p className="mb-4">
          สถานะ:{" "}
          {status === "available" && "🟢 ว่าง"}
          {status === "running" && "🟠 กำลังทำงาน"}
          {status === "paused" && "⏸️ หยุดชั่วคราว"}
        </p>

        {status === "available" && !machine.lidClosed && (
          <p className="text-red-500 mb-3">
            ❗นำผ้าเข้าเครื่อง เติมน้ำยาซัก แล้วปิดฝาเครื่อง
          </p>
        )}
{status === "available" && waitingPayment && (
  <div className="border border-yellow-300 bg-yellow-50 rounded-xl p-4 mb-4">
    <p className="text-center font-bold text-yellow-800 text-lg">
      🟡 รอชำระเงิน
    </p>

    <p className="text-center text-sm text-gray-600 mt-2">
      มี QR Code ที่รอชำระเงินอยู่
    </p>

    <button
      onClick={() => {
        if (!pendingProgramId) return;

        router.push(
          `/machine/${id}/payment?program=${pendingProgramId}`
        );
      }}
      disabled={!pendingProgramId}
      className="w-full bg-yellow-500 text-white font-semibold py-3 rounded-xl mt-3 disabled:opacity-50"
    >
      กลับไปชำระเงิน
    </button>
  </div>
)}
        {status === "available" &&
          machine.lidClosed &&
          !waitingPayment && (
            <div className="space-y-3">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => {
                    if (loadingProgram !== null) return;

                    setLoadingProgram(program.id);

                    setTimeout(() => {
                      router.push(
                        `/machine/${id}/payment?program=${program.id}`
                      );
                    }, 300);
                  }}
                  className={`w-full border rounded-xl p-4 text-left transition-all ${
                    loadingProgram === program.id
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold flex justify-between items-center">
                    {program.name}

                    {loadingProgram === program.id && (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {program.duration} •{" "}
                    {program.id === 1 && canUseFreeWash ? (
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

        {(status === "running" || status === "paused") && (
          <div className="border rounded-2xl p-4 bg-blue-50 mt-3">
            <p className="text-center font-medium">
              {status === "running" ? "กำลังทำงาน" : "หยุดชั่วคราวแล้ว"}
            </p>

            <p className="text-center text-2xl font-bold my-2">
              {Math.floor(getRemainingTime() / 60)} นาที เหลือ
            </p>

            <div className="w-full bg-gray-200 h-2 rounded-full mb-4">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: "70%" }}
              />
            </div>

            {ownerMode && (status === "running" ? (
              <button
                onClick={async () => {
                  const res = await fetch("/api/machine-command", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      machineId: Number(id),
                      command: "pause",
                    }),
                  });

                  if (!res.ok) {
                    alert("ไม่สามารถหยุดเครื่องชั่วคราวได้");
                    return;
                  }

                  fetchData();
                }}
                className="w-full bg-gray-700 text-white py-3 rounded-xl"
              >
                ⏸️ หยุดชั่วคราว
              </button>
            ) : (
              <button
                onClick={async () => {
                  const res = await fetch("/api/machine-command", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      machineId: Number(id),
                      command: "resume",
                    }),
                  });

                  if (!res.ok) {
                    alert("ไม่สามารถเริ่มเครื่องต่อได้");
                    return;
                  }

                  fetchData();
                }}
                className="w-full bg-gray-700 text-white py-3 rounded-xl"
              >
                ▶️ เริ่มใหม่
              </button>
            ))}
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
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                inputMode="numeric"
                placeholder="กรอกเบอร์โทร 10 หลัก"
                className="border w-full p-2 mb-3"
              />

              <button
                onClick={claimPoint}
                disabled={savingClaim || savingWaive}
                className="bg-black text-white w-full py-2 mb-2 rounded disabled:opacity-60"
              >
                {savingClaim ? "กำลังบันทึกแต้ม..." : "ยืนยันรับแต้ม"}
              </button>

              <button
                onClick={waivePoint}
                disabled={savingClaim || savingWaive}
                className="text-gray-500 text-sm disabled:opacity-60"
              >
                {savingWaive ? "กำลังบันทึก..." : "❗กดปิดไม่รับแต้ม"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}