import api from "./api";

export async function sendMessage(message: string, conversation_id?: string): Promise<string> {
  const res = await api.post("/chat", {
    question: message,
  });

  return res.data.answer;
}
