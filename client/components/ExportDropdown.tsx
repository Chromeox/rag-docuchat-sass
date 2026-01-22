"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, FileCode, ChevronDown } from "lucide-react";
import { exportToMarkdown, exportToPDF } from "@/services/exportService";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExportDropdownProps {
  messages: Message[];
  disabled?: boolean;
}

export function ExportDropdown({ messages, disabled = false }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleExportMarkdown = () => {
    exportToMarkdown(messages);
    setIsOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(messages);
    setIsOpen(false);
  };

  // Check if there are actual conversation messages (excluding welcome message)
  const hasConversation = messages.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !hasConversation}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent disabled:hover:border-slate-200 dark:disabled:hover:border-slate-700"
        title={hasConversation ? "Export conversation" : "Start a conversation to export"}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
          >
            <div className="py-1">
              <button
                onClick={handleExportMarkdown}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <FileCode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <div>
                  <div className="font-medium">Markdown</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">.md file</div>
                </div>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-red-500" />
                <div>
                  <div className="font-medium">PDF</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">.pdf document</div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
