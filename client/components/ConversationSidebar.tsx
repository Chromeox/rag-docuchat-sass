"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeft,
  SquarePen,
  Search,
  X,
  Menu,
  Loader2,
  MessageSquare,
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Detect OS for keyboard shortcut display
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "⌘" : "Ctrl";

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [userId]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        setIsExpanded(true);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

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

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.last_message?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Mobile toggle button
  const MobileToggle = () => (
    <button
      onClick={() => setIsMobileOpen(!isMobileOpen)}
      className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
    >
      {isMobileOpen ? (
        <X className="w-5 h-5 text-slate-700" />
      ) : (
        <Menu className="w-5 h-5 text-slate-700" />
      )}
    </button>
  );

  // Collapsed sidebar - just icons with tooltips
  const CollapsedSidebar = () => (
    <div className="flex flex-col items-center py-3 px-2 bg-white border-r border-slate-200 h-full w-14">
      <div className="space-y-1">
        {/* Toggle - expand */}
        <div className="relative group">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
            Open sidebar
            <span className="text-slate-400 text-xs font-mono">{modKey}+\</span>
          </div>
        </div>

        {/* New chat */}
        <div className="relative group">
          <button
            onClick={() => {
              onNewConversation();
              setIsMobileOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <SquarePen className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
            New chat
            <span className="text-slate-400 text-xs font-mono">{modKey}+N</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <button
            onClick={() => {
              setShowSearch(true);
              setIsExpanded(true);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
            Search chats
            <span className="text-slate-400 text-xs font-mono">{modKey}+K</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Expanded sidebar - menu items with text labels + conversation list
  const ExpandedSidebar = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-72">
      {/* Menu items */}
      <div className="p-3 space-y-1">
        {/* Toggle - collapse */}
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-sm"
        >
          <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">Close sidebar</span>
          <span className="text-slate-400 text-xs font-mono">{modKey}+\</span>
        </button>

        {/* New chat */}
        <button
          onClick={() => {
            onNewConversation();
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-sm"
        >
          <SquarePen className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">New chat</span>
          <span className="text-slate-400 text-xs font-mono">{modKey}+N</span>
        </button>

        {/* Search chats */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            showSearch
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Search className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">Search chats</span>
          <span className="text-slate-400 text-xs font-mono">{modKey}+K</span>
        </button>
      </div>

      {/* Search input */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3 pb-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="border-t border-slate-200 mx-3" />

      {/* Your chats section */}
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Your chats
        </h3>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {searchQuery ? (
              <>
                <Search className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No chats found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No conversations yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Start a new chat to begin
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                isCollapsed={false}
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
      <aside className="hidden lg:block h-screen sticky top-0">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ width: 56, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 56, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <ExpandedSidebar />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ width: 288, opacity: 0 }}
              animate={{ width: 56, opacity: 1 }}
              exit={{ width: 288, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <CollapsedSidebar />
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

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
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 h-screen z-50 shadow-2xl"
            >
              <ExpandedSidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
