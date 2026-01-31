"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/user/`, {
      credentials: "include", // cookies
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Authentication failed");
        return res.json();
      })
      .then((user) => {
        console.log("Logged in as:", user);
        router.replace("/"); // redirect to dashboard
      })
      .catch(() => {
        setError("Login failed. Please try again.");
      });
  }, [router]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  return <p>Signing you in…</p>;
}
