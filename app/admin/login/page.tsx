"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const router = useRouter();

  const login = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // ✅ สำคัญ
      },
      body: JSON.stringify({
        username: user,
        password: pass,
      }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      alert("login failed");
    }
  };

  return (
    <div className="p-10 space-y-2">
      <input
        onChange={(e) => setUser(e.target.value)}
        placeholder="user"
        className="border p-2 w-full"
      />
      <input
        type="password"
        onChange={(e) => setPass(e.target.value)}
        placeholder="pass"
        className="border p-2 w-full"
      />
      <button
        onClick={login}
        className="bg-black text-white px-4 py-2"
      >
        Login
      </button>
    </div>
  );
}