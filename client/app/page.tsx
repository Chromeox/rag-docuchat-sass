"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/services/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (user) router.push("/chat");
    else router.push("/login");
  }, []);

  return null;
}
