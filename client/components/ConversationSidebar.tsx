"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Menu,
  X,
} from "lucide-react";
import { ConversationItem } from "./ConversationItem";
import { useAuth, useUser } from "@clerk/nextjs";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

interface ConversationSidebarProps {
  userId: string;
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
}

export function ConversationSidebar({
  userId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();
      const response = await fetch(
        `${apiUrl}/api/conversations`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/conversations/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        onDeleteConversation(id);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  // Mobile toggle button
  const MobileToggle = () => (
    <button
      onClick={() => setIsMobileOpen(!isMobileOpen)}
      className="lg:hidden fixed top-20 left-4 z-50 p-3 bg-white rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
    >
      {isMobileOpen ? (
        <X className="w-5 h-5 text-slate-700" />
      ) : (
        <Menu className="w-5 h-5 text-slate-700" />
      )}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="font-semibold text-slate-900">Conversations</h2>
        )}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            setIsMobileOpen(false);
          }}
          className="hidden lg:block p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* New conversation button */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            onNewConversation();
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <MessageSquarePlus className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">New Chat</span>}
        </motion.button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              {!isCollapsed && (
                <p className="text-sm text-slate-500">Loading...</p>
              )}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          !isCollapsed && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <MessageSquarePlus className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                No conversations yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Start a new chat to begin
              </p>
            </div>
          )
        ) : (
          <div className="space-y-1 py-2">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                isCollapsed={isCollapsed}
                onSelect={() => {
                  onSelectConversation(conversation.id);
                  setIsMobileOpen(false);
                }}
                onDelete={() => handleDelete(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <MobileToggle />

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="hidden lg:block h-screen sticky top-0 transition-all duration-300"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 h-screen w-[280px] z-50 shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
