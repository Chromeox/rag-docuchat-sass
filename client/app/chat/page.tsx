"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, ArrowLeft, FileText, Paperclip, X, FolderOpen } from "lucide-react";
import Link from "next/link";
import { SuggestedPrompts } from "@/components/SuggestedPrompts";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { DocumentManager } from "@/components/DocumentManager";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your DocuChat assistant. I can help you query and analyze your documents using advanced AI. **Drag files anywhere on the page** or click the 📎 button to upload documents, then ask me anything about them!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [showUpload, setShowUpload] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  useEffect(() => {
    // Redirect to home if not signed in
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, isLoaded, router]);

  // Full-page drag & drop handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only hide if leaving the window
      if (e.target === document.body || e.clientX === 0 || e.clientY === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      // Open upload modal when files are dropped
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setShowUploadModal(true);
      }
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontSize: "18px"
      }}>
        Loading...
      </div>
    );
  }

  // Don't render chat if not signed in
  if (!isSignedIn || !user) {
    return null;
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleUploadComplete = () => {
    setHasDocuments(true);
    setShowUpload(false);
    // Add a success message to the chat
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Great! Your documents have been uploaded and are being processed. You can now ask me questions about your documents!`,
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  const sendMessage = async (message: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      // Call the RAG backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: message,
          conversation_id: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let conversationId = currentConversationId;
      let isFirstChunk = true;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          // First chunk contains conversation_id as JSON
          if (isFirstChunk) {
            const lines = chunk.split('\n');
            if (lines.length > 0 && lines[0].trim().startsWith('{')) {
              try {
                const metadata = JSON.parse(lines[0]);
                conversationId = metadata.conversation_id;
                setCurrentConversationId(conversationId);
                // Add remaining lines to message
                assistantMessage += lines.slice(1).join('\n');
              } catch (e) {
                // If parsing fails, treat as regular message
                assistantMessage += chunk;
              }
            } else {
              assistantMessage += chunk;
            }
            isFirstChunk = false;
          } else {
            assistantMessage += chunk;
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantMessage || "No response from the server.",
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error connecting to the RAG backend. Please make sure the server is running on port 8000.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (conversationId: number) => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();

      // Load conversation messages
      const response = await fetch(
        `${apiUrl}/api/conversations/${conversationId}/messages`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const messages = await response.json();
        setMessages([
          {
            role: "assistant",
            content: "Hi! I'm your DocuChat assistant. I can help you query and analyze your documents using advanced AI. **Drag files anywhere on the page** or click the 📎 button to upload documents, then ask me anything about them!",
          },
          ...messages.map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ]);
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm your DocuChat assistant. I can help you query and analyze your documents using advanced AI. **Drag files anywhere on the page** or click the 📎 button to upload documents, then ask me anything about them!",
      },
    ]);
    setCurrentConversationId(null);
  };

  const handleDeleteConversation = (conversationId: number) => {
    if (conversationId === currentConversationId) {
      handleNewConversation();
    }
  };

  return (
    <>
      {/* Full-page drag overlay */}
      {isDraggingOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 backdrop-blur-sm border-4 border-dashed border-green-500 flex items-center justify-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            setShowUploadModal(true);
          }}
        >
          <div className="text-center bg-white/95 rounded-2xl p-12 shadow-2xl border-2 border-green-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-green-700 mb-2">Drop files here</h2>
            <p className="text-lg text-slate-600">Upload documents to your knowledge base</p>
            <p className="text-sm text-slate-500 mt-2">Supports PDF, DOCX, TXT, MD, CSV, JSON & code files (max 10MB each)</p>
          </div>
        </motion.div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Upload Documents</h2>
                  <p className="text-sm text-slate-600">Add files to your knowledge base</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <DocumentUpload
                onUploadComplete={() => {
                  handleUploadComplete();
                  setShowUploadModal(false);
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Document Manager Modal */}
      <DocumentManager
        isOpen={showDocumentManager}
        onClose={() => setShowDocumentManager(false)}
        onUploadClick={() => {
          setShowDocumentManager(false);
          setShowUploadModal(true);
        }}
      />

      <div className="flex h-screen overflow-hidden">
      {/* Conversation Sidebar */}
      {user && (
        <ConversationSidebar
          userId={user.id}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      )}

      {/* Main chat container */}
      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header with navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Home
              </Link>
              <h1 className="text-xl font-bold text-slate-900">DocuChat</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDocumentManager(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 hover:text-blue-600"
              >
                <FolderOpen className="w-4 h-4" />
                My Documents
              </button>
              <div className="text-sm text-slate-600">
                {user.username || user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main chat area */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl overflow-y-auto custom-scrollbar">
        {/* Messages */}
        <div className="space-y-6 mb-8">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl px-6 py-4 rounded-2xl message-bubble ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-sm"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-bl-none shadow-sm">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Suggested questions (show when starting) */}
        {messages.length === 1 && !showUpload && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <p className="text-sm font-medium text-slate-600 mb-3">Suggested questions:</p>
            <SuggestedPrompts onSelect={handleQuickPrompt} />
          </motion.div>
        )}
      </main>

      {/* Input area */}
      <footer className="bg-white border-t border-slate-200 sticky bottom-0">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-colors flex items-center justify-center group"
              title="Upload documents"
            >
              <Paperclip className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about your documents..."
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-full focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <span>Thinking...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
          </form>
        </div>
      </footer>
      </div>
      </div>
    </>
  );
}
