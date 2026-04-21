"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RunningPage() {
  const { id } = useParams();

  const [timeLeft, setTimeLeft] =
    useState(0);

  useEffect(() => {
    const fetchMachine = async () => {
      const res = await fetch(
        "/api/machines"
      );

      const machines = await res.json();

      const machine = machines.find(
        (m: any) =>
          Number(m.id) === Number(id)
      );

      if (machine) {
        setTimeLeft(machine.timeLeft);
      }
    };

    fetchMachine();

    const timer = setInterval(
      fetchMachine,
      1000
    );

    return () =>
      clearInterval(timer);
  }, [id]);

  return (
    <main className="p-4">
      <h1>เครื่อง #{id}</h1>
      <p>🟠 กำลังทำงาน</p>
      <p>เวลาเหลือ {timeLeft} วินาที</p>
    </main>
  );
}