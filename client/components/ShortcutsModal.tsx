"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["Ctrl", "N"], description: "New chat" },
  { keys: ["Ctrl", "/"], description: "Focus input" },
  { keys: ["Ctrl", "K"], description: "Search chats" },
  { keys: ["?"], description: "Show shortcuts" },
  { keys: ["Escape"], description: "Close modal/search" },
];

// Check if user is on Mac
const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

// Format key for display (show ⌘ on Mac instead of Ctrl)
const formatKey = (key: string): string => {
  if (key === "Ctrl" && isMac) return "⌘";
  return key;
};

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount before rendering portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Don't render on server
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 9999 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{ zIndex: 10000 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <h2
                  id="shortcuts-modal-title"
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={onClose}
                  className="ml-auto p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Body - Grid of shortcuts */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center">
                          <kbd className="px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded shadow-sm min-w-[24px] text-center">
                            {formatKey(key)}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-slate-400 dark:text-slate-500">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Press <kbd className="px-1.5 py-0.5 text-xs font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">?</kbd> anytime to show this help
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
