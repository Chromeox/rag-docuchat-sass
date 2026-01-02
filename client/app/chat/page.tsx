"use client";
import { useEffect, useState } from "react";
import { getUser } from "@/services/auth";
import { useRouter } from "next/navigation";
import ChatBox from "@/components/ChatBox";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{username: string} | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) router.push("/login");
    else {
      setUser(u);
    }
  }, []);

  if (!user) return null;

  return (
    <div className="chat-page-container">
      {/* Header with logo */}
      <header className="chat-header">
        <img src="/logo.png" alt="Brand Logo" className="brand-logo" />
        <h1 className="brand-name">Web3 AI Chat</h1>
      </header>

      {/* ChatBox */}
      <ChatBox user={user}/>
    </div>
  );
}
