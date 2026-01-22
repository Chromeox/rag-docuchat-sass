"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, FileText, Paperclip, X, FolderOpen, Copy, Check, RefreshCw, ArrowDownToLine, PauseCircle, ThumbsUp, ThumbsDown, ChevronUp, MessageSquare } from "lucide-react";
import { SuggestedPrompts } from "@/components/SuggestedPrompts";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { DocumentManager } from "@/components/DocumentManager";
import { FileIcon } from "@/components/FileIcon";
import { ExportDropdown } from "@/components/ExportDropdown";
import { StreamingMessage } from "@/components/StreamingMessage";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/contexts/ToastContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Format timestamp for display
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Calculate reading time for a message
function getReadingTime(text: string): { words: number; minutes: number } | null {
  const words = text.trim().split(/\s+/).length;
  if (words < 50) return null;
  const minutes = Math.ceil(words / 200);
  return { words, minutes };
}

// Calculate conversation statistics
function getConversationStats(messages: Message[]): { messageCount: number; wordCount: number; formattedWords: string } | null {
  // Exclude the initial welcome message (first message if it's from assistant)
  const conversationMessages = messages.length > 1 && messages[0].role === "assistant"
    ? messages.slice(1)
    : messages;

  if (conversationMessages.length === 0) return null;

  const messageCount = conversationMessages.length;
  const wordCount = conversationMessages.reduce((total, msg) => {
    return total + msg.content.trim().split(/\s+/).length;
  }, 0);

  // Format word count (e.g., 2400 -> "2.4k")
  const formattedWords = wordCount >= 1000
    ? `${(wordCount / 1000).toFixed(1)}k`
    : wordCount.toString();

  return { messageCount, wordCount, formattedWords };
}

export default function ChatPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [conversationCopied, setConversationCopied] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<number, "up" | "down" | null>>({});

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your DocuChat assistant. I can help you query and analyze your documents using advanced AI. **Drag files anywhere on the page** or click the 📎 button to upload documents, then ask me anything about them!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [showUpload, setShowUpload] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showNewChatConfirmModal, setShowNewChatConfirmModal] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ref to hold the latest upload handler (avoids stale closure in drag-drop effect)
  const handleInlineUploadRef = useRef<(files: FileList) => Promise<void>>(null);

  // Copy message to clipboard
  const handleCopyMessage = useCallback(async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      toast.success("Copied to clipboard!");
      // Reset after 2 seconds
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  }, [toast]);

  // Handle feedback on assistant messages
  const handleFeedback = useCallback((messageIndex: number, feedback: "up" | "down") => {
    setMessageFeedback((prev) => ({
      ...prev,
      [messageIndex]: prev[messageIndex] === feedback ? null : feedback,
    }));
  }, []);

  // Copy entire conversation to clipboard
  const handleCopyConversation = useCallback(async () => {
    try {
      const formattedConversation = messages
        .map((msg) => {
          const role = msg.role === "user" ? "You" : "Assistant";
          return `${role}: ${msg.content}`;
        })
        .join("\n\n");

      await navigator.clipboard.writeText(formattedConversation);
      setConversationCopied(true);
      toast.success("Conversation copied to clipboard!");
      // Reset after 2 seconds
      setTimeout(() => setConversationCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy conversation");
    }
  }, [messages, toast]);

  // Helper to find last index (for broader browser compatibility)
  const findLastIndex = <T,>(arr: T[], predicate: (item: T) => boolean): number => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i])) return i;
    }
    return -1;
  };

  // Regenerate last assistant response
  const handleRegenerate = useCallback(async () => {
    // Find the last user message
    const lastUserMessageIndex = findLastIndex(messages, msg => msg.role === "user");
    if (lastUserMessageIndex === -1) {
      toast.error("No user message to regenerate from");
      return;
    }

    const lastUserMessage = messages[lastUserMessageIndex].content;

    // Remove the last assistant message (if it exists after the last user message)
    setMessages(prev => {
      const newMessages = [...prev];
      // Find and remove the last assistant message
      const lastAssistantIndex = findLastIndex(newMessages, msg => msg.role === "assistant");
      if (lastAssistantIndex > lastUserMessageIndex) {
        newMessages.splice(lastAssistantIndex, 1);
      }
      return newMessages;
    });

    setIsRegenerating(true);

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
          question: lastUserMessage,
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

      // Start streaming effect
      const finalContent = assistantMessage || "No response from the server.";
      setStreamingContent(finalContent);
      setIsStreaming(true);
      setIsRegenerating(false);
    } catch (error) {
      console.error("Error regenerating response:", error);
      const errorContent = "Sorry, I encountered an error connecting to the RAG backend. Please make sure the server is running on port 8000.";
      setStreamingContent(errorContent);
      setIsStreaming(true);
      setIsRegenerating(false);
    }
  }, [messages, currentConversationId, getToken, toast]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "n",
        ctrl: true,
        action: () => {
          requestNewConversation();
        },
        description: "New chat",
      },
      {
        key: "/",
        ctrl: true,
        action: () => {
          inputRef.current?.focus();
        },
        description: "Focus input",
      },
    ],
  });

  // Listen for ? key to open shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if ? is pressed without modifiers and not in an input/textarea
      if (
        e.key === "?" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // Redirect to home if not signed in
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, isLoaded, router]);

  // Full-page drag & drop handlers - use ref to avoid stale closure
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
      // Upload files inline when dropped - use ref to get latest handler
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        console.log("[DRAG-DROP] Files dropped, calling handleInlineUploadRef.current");
        handleInlineUploadRef.current?.(e.dataTransfer.files);
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

  // Handle inline file upload (for drag-and-drop)
  // NOTE: This hook must be before early returns to follow React's Rules of Hooks
  const handleInlineUpload = useCallback(async (files: FileList) => {
    console.log("[UPLOAD] handleInlineUpload called", { userId: user?.id, fileCount: files.length, isLoaded, isSignedIn });

    if (!user?.id) {
      console.error("[UPLOAD] User not authenticated - user:", user, "isLoaded:", isLoaded, "isSignedIn:", isSignedIn);
      toast.error("Please wait for authentication to complete before uploading.");
      return;
    }

    if (files.length === 0) {
      console.error("[UPLOAD] No files selected");
      return;
    }

    const fileArray = Array.from(files);
    const fileNames = fileArray.map(f => f.name).join(", ");

    // Add upload progress message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `📎 Uploading ${fileArray.length} ${fileArray.length === 1 ? "file" : "files"}: ${fileNames}...`,
        timestamp: new Date(),
      },
    ]);

    try {
      const formData = new FormData();
      fileArray.forEach(file => formData.append("files", file));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      console.log("[UPLOAD] API URL:", apiUrl);

      const token = await getToken();
      console.log("[UPLOAD] Token obtained:", !!token);

      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      console.log("[UPLOAD] Sending upload request...");
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("[UPLOAD] Upload response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[UPLOAD] Upload failed:", errorData);
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("[UPLOAD] Upload success:", data);

      // Trigger ingestion
      console.log("[INGEST] Triggering ingestion...");
      const ingestResponse = await fetch(`${apiUrl}/api/ingest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      console.log("[INGEST] Ingest response status:", ingestResponse.status);

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json().catch(() => ({}));
        console.error("[INGEST] Ingestion failed:", errorData);
        throw new Error(errorData.detail || `Ingestion failed with status ${ingestResponse.status}`);
      }

      const ingestData = await ingestResponse.json();
      console.log("[INGEST] Ingestion success:", ingestData);

      // Add success message and toast
      toast.success(`Successfully processed ${fileArray.length} ${fileArray.length === 1 ? "file" : "files"}!`);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✓ Successfully uploaded and processed ${fileArray.length} ${fileArray.length === 1 ? "file" : "files"}! You can now ask me questions about your documents.`,
          timestamp: new Date(),
        },
      ]);

      setHasDocuments(true);
    } catch (error) {
      console.error("[UPLOAD] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Add error message with details and toast
      toast.error(`Upload failed: ${errorMessage}`);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Upload failed: ${errorMessage}. Check browser console for details.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [user, getToken, isLoaded, isSignedIn, toast]);

  // Keep the ref updated with the latest handleInlineUpload (fixes stale closure)
  useEffect(() => {
    handleInlineUploadRef.current = handleInlineUpload;
  }, [handleInlineUpload]);

  // Auto-scroll to bottom when new messages arrive (if enabled)
  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScrollEnabled]);

  // Scroll when messages change or streaming content updates
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, isLoading, scrollToBottom]);

  // Track scroll position for scroll-to-top button
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      setShowScrollToTop(scrollTop > 300);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  // Non-hook helper functions (safe after early returns)
  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleUploadComplete = () => {
    setHasDocuments(true);
    setShowUpload(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Great! Your documents have been uploaded and are being processed. You can now ask me questions about your documents!`,
        timestamp: new Date(),
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
    setMessages((prev) => [...prev, { role: "user", content: message, timestamp: new Date() }]);
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

      // Start streaming effect instead of directly adding to messages
      const finalContent = assistantMessage || "No response from the server.";
      setStreamingContent(finalContent);
      setIsStreaming(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorContent = "Sorry, I encountered an error connecting to the RAG backend. Please make sure the server is running on port 8000.";
      setStreamingContent(errorContent);
      setIsStreaming(true);
      setIsLoading(false);
    }
  };

  // Handle streaming complete - add message to history
  const handleStreamingComplete = () => {
    if (streamingContent) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: streamingContent,
          timestamp: new Date(),
        },
      ]);
      setStreamingContent("");
      setIsStreaming(false);
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
        const loadedMessages = await response.json();
        setMessages([
          {
            role: "assistant",
            content: "Hi! I'm your DocuChat assistant. I can help you query and analyze your documents using advanced AI. **Drag files anywhere on the page** or click the 📎 button to upload documents, then ask me anything about them!",
            timestamp: new Date(),
          },
          ...loadedMessages.map((msg: { role: string; content: string; created_at?: string }) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
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

  // Check if there are unsaved messages (more than just the welcome message)
  const hasUnsavedMessages = () => {
    // If there's only 1 message (the welcome message), no confirmation needed
    if (messages.length <= 1) return false;
    // If there are user messages or additional assistant messages, confirmation needed
    return messages.some(msg => msg.role === "user") || messages.length > 1;
  };

  // Request new conversation (shows confirmation if needed)
  const requestNewConversation = () => {
    if (hasUnsavedMessages()) {
      setShowNewChatConfirmModal(true);
    } else {
      handleNewConversation();
    }
  };

  const handleNewConversation = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm your DocuChat assistant. I can help you query and analyze your documents using advanced AI. **Drag files anywhere on the page** or click the 📎 button to upload documents, then ask me anything about them!",
        timestamp: new Date(),
      },
    ]);
    setCurrentConversationId(null);
    setShowNewChatConfirmModal(false);
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
          className="fixed inset-0 z-50 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 backdrop-blur-sm border-4 border-dashed border-green-500 flex items-center justify-center pointer-events-none"
        >
          <div className="text-center bg-white/95 dark:bg-slate-800/95 rounded-2xl p-12 shadow-2xl border-2 border-green-500">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">Drop files here</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">Upload documents to your knowledge base</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Supports PDF, DOCX, TXT, MD, CSV, JSON & code files (max 10MB each)</p>
          </div>
        </motion.div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upload Documents</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Add files to your knowledge base</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* New Chat Confirmation Modal */}
      <ConfirmModal
        isOpen={showNewChatConfirmModal}
        onClose={() => setShowNewChatConfirmModal(false)}
        onConfirm={handleNewConversation}
        title="Start a new conversation?"
        message="Your current conversation will be saved."
        confirmText="New Chat"
        cancelText="Cancel"
        variant="warning"
      />

      <div className="flex h-full overflow-hidden">
      {/* Conversation Sidebar */}
      {user && (
        <ConversationSidebar
          userId={user.id}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={requestNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      )}

      {/* Main chat container */}
      <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header with navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={requestNewConversation}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <FileText className="w-4 h-4" />
                New Chat
              </button>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">DocuChat</h1>
              {/* Conversation stats indicator */}
              {(() => {
                const stats = getConversationStats(messages);
                return stats ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <MessageSquare className="w-3 h-3" />
                    <span>{stats.messageCount} msgs</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>{stats.formattedWords} words</span>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDocumentManager(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <FolderOpen className="w-4 h-4" />
                My Documents
              </button>
              <button
                onClick={handleCopyConversation}
                disabled={messages.length <= 1 || isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy entire conversation to clipboard"
              >
                {conversationCopied ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <ExportDropdown messages={messages} disabled={isLoading} />
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {user.username || user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main chat area */}
      <main ref={scrollContainerRef} className="flex-1 container mx-auto px-4 py-8 max-w-4xl overflow-y-auto custom-scrollbar relative">
        {/* Messages */}
        <div className="space-y-6 mb-8">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
            >
              <div
                className={`relative max-w-2xl px-6 py-4 rounded-2xl message-bubble ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none shadow-sm"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-2 ${
                  msg.role === "user"
                    ? "text-blue-200"
                    : "text-slate-500 dark:text-slate-400"
                }`}>
                  {formatTimestamp(msg.timestamp)}
                </p>
                {/* Reading time indicator for assistant messages */}
                {msg.role === "assistant" && (() => {
                  const readingTime = getReadingTime(msg.content);
                  return readingTime ? (
                    <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
                      ~{readingTime.words} words · {readingTime.minutes} min read
                    </p>
                  ) : null;
                })()}

                {/* Action buttons for assistant messages */}
                {msg.role === "assistant" && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Regenerate button - only show on last assistant message */}
                    {idx === findLastIndex(messages, m => m.role === "assistant") &&
                     messages.some(m => m.role === "user") && (
                      <button
                        onClick={handleRegenerate}
                        disabled={isLoading || isStreaming || isRegenerating}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="Regenerate response"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${isRegenerating ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    {/* Copy button */}
                    <button
                      onClick={() => handleCopyMessage(msg.content, idx)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                      title="Copy to clipboard"
                    >
                      {copiedMessageIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      )}
                    </button>
                    {/* Thumbs up button */}
                    <button
                      onClick={() => handleFeedback(idx, "up")}
                      className={`p-1.5 rounded-lg transition-all ${
                        messageFeedback[idx] === "up"
                          ? "bg-green-100 dark:bg-green-900/50"
                          : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                      title="Good response"
                    >
                      <ThumbsUp
                        className={`w-3.5 h-3.5 transition-colors ${
                          messageFeedback[idx] === "up"
                            ? "text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                    </button>
                    {/* Thumbs down button */}
                    <button
                      onClick={() => handleFeedback(idx, "down")}
                      className={`p-1.5 rounded-lg transition-all ${
                        messageFeedback[idx] === "down"
                          ? "bg-red-100 dark:bg-red-900/50"
                          : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                      title="Poor response"
                    >
                      <ThumbsDown
                        className={`w-3.5 h-3.5 transition-colors ${
                          messageFeedback[idx] === "down"
                            ? "text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Loading indicator */}
          {(isLoading || isRegenerating) && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-4 rounded-2xl rounded-bl-none shadow-sm">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Streaming message with typewriter effect */}
          {isStreaming && streamingContent && (
            <StreamingMessage
              content={streamingContent}
              isComplete={false}
              onComplete={handleStreamingComplete}
              onCopy={() => handleCopyMessage(streamingContent, messages.length)}
              isCopied={copiedMessageIndex === messages.length}
            />
          )}

          {/* Scroll anchor for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to top button - show when scrolled down past threshold */}
        <AnimatePresence>
          {showScrollToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={scrollToTop}
              className="fixed bottom-32 left-8 z-20 p-3 rounded-full shadow-lg border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              title="Scroll to top"
            >
              <ChevronUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Auto-scroll toggle button - only show when there are messages to scroll */}
        {messages.length > 1 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
            className={`fixed bottom-32 right-8 z-20 p-3 rounded-full shadow-lg border transition-all duration-200 ${
              autoScrollEnabled
                ? "bg-blue-600 border-blue-700 text-white hover:bg-blue-700"
                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            title={autoScrollEnabled ? "Auto-scroll enabled (click to disable)" : "Auto-scroll disabled (click to enable)"}
          >
            {autoScrollEnabled ? (
              <ArrowDownToLine className="w-5 h-5" />
            ) : (
              <PauseCircle className="w-5 h-5" />
            )}
          </motion.button>
        )}

        {/* Suggested questions (show when starting) */}
        {messages.length === 1 && !showUpload && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Suggested questions:</p>
            <SuggestedPrompts onSelect={handleQuickPrompt} />
          </motion.div>
        )}
      </main>

      {/* Input area */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 sticky bottom-0">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="p-3 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors flex items-center justify-center group"
              title="Upload documents"
            >
              <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, 4000))}
              placeholder="Ask anything about your documents... (? for shortcuts)"
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 disabled:opacity-50 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
          <div className="flex justify-end mt-2 pr-24">
            <span
              className={`text-xs ${
                inputValue.length > 3500
                  ? "text-red-500 dark:text-red-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {inputValue.length}/4000
            </span>
          </div>
        </div>
      </footer>
      </div>
      </div>
    </>
  );
}
