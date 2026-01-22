"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Trash2, MoreVertical, Pencil, Loader2, Pin } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isCollapsed: boolean;
  isPinned?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (id: number, newTitle: string) => Promise<void>;
  onTogglePin?: (id: number) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  isCollapsed,
  isPinned = false,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edited title when conversation title changes
  useEffect(() => {
    setEditedTitle(conversation.title);
  }, [conversation.title]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteModal(false);
  };

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedTitle(conversation.title);
    setShowMenu(false);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin(conversation.id);
    }
    setShowMenu(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedTitle(conversation.title);
  };

  const handleSaveTitle = async () => {
    const trimmedTitle = editedTitle.trim();

    // If empty or unchanged, cancel
    if (!trimmedTitle || trimmedTitle === conversation.title) {
      handleCancelEditing();
      return;
    }

    if (onRename) {
      setIsRenaming(true);
      try {
        await onRename(conversation.id, trimmedTitle);
        setIsEditing(false);
      } catch (error) {
        console.error("Error renaming conversation:", error);
        // Reset to original on error
        setEditedTitle(conversation.title);
      } finally {
        setIsRenaming(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditing();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: isCollapsed ? 1 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative"
      onMouseLeave={() => setShowMenu(false)}
    >
      <button
        onClick={onSelect}
        className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
          isActive
            ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700"
            : isPinned
            ? "bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30"
            : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex-shrink-0 ${
              isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0 group/item">
              <div className="flex items-start justify-between gap-2">
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveTitle}
                      disabled={isRenaming}
                      className={`flex-1 text-sm font-medium px-2 py-0.5 rounded border focus:outline-none focus:ring-1 min-w-0 ${
                        isActive
                          ? "text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-400 dark:focus:ring-blue-500"
                          : "text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-slate-400 dark:focus:ring-slate-500"
                      } ${isRenaming ? "opacity-50" : ""}`}
                    />
                    {isRenaming && (
                      <Loader2 className="w-3 h-3 text-slate-400 dark:text-slate-500 animate-spin flex-shrink-0" />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isPinned && (
                        <Pin className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0 fill-current" />
                      )}
                      <h3
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {conversation.title}
                      </h3>
                    </div>
                    {onTogglePin && (
                      <button
                        onClick={handleTogglePin}
                        className={`flex-shrink-0 p-1 rounded transition-all ${
                          isPinned
                            ? "opacity-100 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            : "opacity-0 group-hover/item:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                        title={isPinned ? "Unpin conversation" : "Pin conversation"}
                      >
                        <Pin className={`w-3 h-3 ${isPinned ? "fill-current" : "text-slate-400 dark:text-slate-500"}`} />
                      </button>
                    )}
                    {onRename && (
                      <button
                        onClick={handleStartEditing}
                        className="flex-shrink-0 p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        title="Rename conversation"
                      >
                        <Pencil className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="flex-shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <MoreVertical className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDate(conversation.updated_at)}
                </span>
                {conversation.message_count !== undefined && (
                  <>
                    <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {conversation.message_count} messages
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Context menu */}
      {showMenu && !isCollapsed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute right-3 top-12 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-10 min-w-[140px]"
        >
          {onTogglePin && (
            <button
              onClick={handleTogglePin}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Pin className={`w-4 h-4 ${isPinned ? "fill-current text-amber-500" : ""}`} />
              {isPinned ? "Unpin" : "Pin"}
            </button>
          )}
          {onRename && (
            <button
              onClick={handleStartEditing}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Rename
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </motion.div>
  );
}
