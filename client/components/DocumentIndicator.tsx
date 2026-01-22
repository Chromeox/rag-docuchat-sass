"use client";

import { useState, useEffect, useRef } from "react";
import { FileText } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

interface Document {
  id: number;
  filename: string;
  status: string;
}

interface DocumentIndicatorProps {
  refreshTrigger?: number; // increment to trigger a refresh
}

export function DocumentIndicator({ refreshTrigger }: DocumentIndicatorProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchDocuments = async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Only show ingested documents (ready for querying)
        const ingestedDocs = data.documents.filter(
          (doc: Document) => doc.status === "ingested"
        );
        setDocuments(ingestedDocs);
      }
    } catch (error) {
      console.error("Failed to fetch documents for indicator:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user?.id, refreshTrigger]);

  // Truncate filename if too long
  const truncateFilename = (filename: string, maxLength: number = 20) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split(".").pop() || "";
    const name = filename.slice(0, filename.length - ext.length - 1);
    const truncatedName = name.slice(0, maxLength - ext.length - 4) + "...";
    return `${truncatedName}.${ext}`;
  };

  // Handle hover with slight delay to prevent flickering
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        <FileText className="w-4 h-4 animate-pulse" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        <FileText className="w-4 h-4" />
        <span className="text-xs">No documents loaded</span>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Compact badge showing count */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
        <FileText className="w-4 h-4" />
        <span className="text-xs font-medium">
          {documents.length} doc{documents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Expanded dropdown showing document names */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[200px] max-w-[300px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Loaded Documents
              </p>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span
                    className="text-xs text-slate-700 dark:text-slate-300 truncate"
                    title={doc.filename}
                  >
                    {truncateFilename(doc.filename)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
