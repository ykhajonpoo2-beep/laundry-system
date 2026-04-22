"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RunningPage() {
  const { id } = useParams();

  const [machine, setMachine] = useState<any>(null);

  useEffect(() => {
    const fetchMachine = async () => {
      const res = await fetch("/api/machines");
      const machines = await res.json();

      const m = machines.find(
        (m: any) => Number(m.id) === Number(id)
      );

      setMachine(m);
    };

    fetchMachine();
    const timer = setInterval(fetchMachine, 1000);

    return () => clearInterval(timer);
  }, [id]);

  if (!machine) return <p>Loading...</p>;

  return (
    <main className="p-4">
      <h1>เครื่อง #{id}</h1>

      {machine.status === "paused" && (
        <p className="text-yellow-500">
          ⏸️ หยุดชั่วคราว
        </p>
      )}

      {machine.status === "running" && (
        <p>🟠 กำลังทำงาน</p>
      )}

      <p>เวลาเหลือ {machine.timeLeft} วินาที</p>
    </main>
  );
}