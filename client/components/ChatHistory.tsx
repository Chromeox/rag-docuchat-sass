"use client";
import { logoutUser } from "@/services/auth";
import { useRouter } from "next/navigation";

export default function ChatHistory({
  history,
  onSelect,
}: {
  history: { id: string; title: string }[];
  onSelect: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="chat-history">
      <h3>History</h3>
      <div className="history-list">
        {history.map((item) => (
          <div
            key={item.id}
            className="history-item"
            onClick={() => onSelect(item.id)}
          >
            {item.title}
          </div>
        ))}
      </div>

      <button
        className="logout-btn"
        onClick={() => {
          logoutUser();
          router.push("/login");
        }}
      >
        Logout
      </button>
    </div>
  );
}
