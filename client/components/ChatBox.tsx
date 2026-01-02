"use client";
import { useState } from "react";
import { sendMessage } from "@/services/chat";
import MessageBubble from "./MessageBubble";
import ChatHistory from "./ChatHistory";

export default function ChatBox({user}: {user:{username: string}}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  async function handleSend() {
    if (!input) return;

    const userMsg = { role: "user", text: input };
    setMessages([...messages, userMsg]);
    setInput("");
    setLoading(true);

    const reply = await sendMessage(input);

    const assistantMsg = { role: "assistant", text: reply };
    setMessages(prev => [...prev, assistantMsg]);

    // Save to history if new conversation
    if (!currentChatId) {
      const id = new Date().getTime().toString();
      setCurrentChatId(id);
      setHistory([{ id, title: input }, ...history]);
    }

    setLoading(false);
  }

  function handleSelectHistory(id: string) {
    setCurrentChatId(id);
    // Load previous chat messages (simplified demo)
    // In production, fetch from backend
    setMessages([]);
  }

  return (
    <div className="chat-container">
      <ChatHistory history={history} onSelect={handleSelectHistory} />
      <div className="chat-main">
        <div className="messages">
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.text} />
          ))}
          {loading && <MessageBubble role="assistant" text="Typing..." />}
        </div>
        <div className="input-box">
          <input
            placeholder="Ask something..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}
