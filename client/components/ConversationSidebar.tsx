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
  Sun,
  Moon,
} from "lucide-react";
import { ConversationItem } from "./ConversationItem";
import { EmptyState } from "./EmptyState";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTheme } from "@/contexts/ThemeContext";

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
  onRenameConversation?: (id: number, newTitle: string) => void;
}

export function ConversationSidebar({
  userId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ConversationSidebarProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
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

  const handleRename = async (id: number, newTitle: string): Promise<void> => {
    if (!user) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/conversations/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (response.ok) {
        // Update local state
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, title: newTitle } : c
          )
        );
        // Notify parent component if callback provided
        if (onRenameConversation) {
          onRenameConversation(id, newTitle);
        }
      } else {
        throw new Error("Failed to rename conversation");
      }
    } catch (error) {
      console.error("Error renaming conversation:", error);
      throw error; // Re-throw to let the ConversationItem handle it
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
      className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
    >
      {isMobileOpen ? (
        <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
      ) : (
        <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
      )}
    </button>
  );

  // Collapsed sidebar - just icons with tooltips
  const CollapsedSidebar = () => (
    <div className="flex flex-col items-center py-3 px-2 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-full w-14">
      <div className="space-y-1 flex-1">
        {/* Toggle - expand */}
        <div className="relative group">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
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
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <SquarePen className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
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
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
            Search chats
            <span className="text-slate-400 text-xs font-mono">{modKey}+K</span>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="relative group">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </div>
        </div>
      </div>

      {/* User Profile - Fixed Bottom */}
      {user && (
        <div className="relative group flex-shrink-0 pt-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <button className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600 transition-all">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </button>
          <div className="absolute left-full ml-2 bottom-0 hidden group-hover:block px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg whitespace-nowrap z-[100] shadow-lg">
            {user.fullName || user.emailAddresses?.[0]?.emailAddress || "Account"}
          </div>
        </div>
      )}
    </div>
  );

  // Expanded sidebar - menu items with text labels + conversation list
  const ExpandedSidebar = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 w-72">
      {/* Menu items */}
      <div className="p-3 space-y-1">
        {/* Toggle - collapse */}
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm"
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
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm"
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
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <Search className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">Search chats</span>
          <span className="text-slate-400 text-xs font-mono">{modKey}+K</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Moon className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="flex-1 text-left">
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </span>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 mx-3" />

      {/* Your chats section */}
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No chats found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Try a different search term
                </p>
              </>
            ) : (
              <EmptyState
                variant="no-conversations"
                title="No conversations yet"
                description="Start a new chat to begin"
                action={{
                  label: "New Chat",
                  onClick: () => {
                    onNewConversation();
                    setIsMobileOpen(false);
                  },
                }}
              />
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
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Profile - Fixed Bottom */}
      {user && (
        <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {user.fullName || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.emailAddresses?.[0]?.emailAddress || ""}
              </p>
            </div>
          </div>
        </div>
      )}
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
              className="h-full"
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
              className="h-full"
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
