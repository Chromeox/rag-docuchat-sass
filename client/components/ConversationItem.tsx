"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Trash2, MoreVertical } from "lucide-react";
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
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  isCollapsed,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteModal(false);
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
            ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
            : "hover:bg-slate-50 border border-transparent"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex-shrink-0 ${
              isActive ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`text-sm font-medium truncate ${
                    isActive ? "text-blue-900" : "text-slate-900"
                  }`}
                >
                  {conversation.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                >
                  <MoreVertical className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {conversation.last_message && (
                <p className="text-xs text-slate-500 truncate mt-1">
                  {conversation.last_message}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">
                  {formatDate(conversation.updated_at)}
                </span>
                {conversation.message_count !== undefined && (
                  <>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-400">
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
          className="absolute right-3 top-12 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-10 min-w-[140px]"
        >
          <button
            onClick={handleDeleteClick}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
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
