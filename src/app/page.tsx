"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@test.com",
          password: "123456",
        }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      console.log(data);

      setTimeout(() => {
        router.push("/weather");
      }, 3000);

    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-5xl font-extrabold mb-6">
        Premium Weather Experience
      </h1>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="px-8 py-4 bg-blue-600 text-white rounded-full"
      >
        {loading ? "Loading..." : "Check Local Weather"}
      </button>
    </div>
  );
}
