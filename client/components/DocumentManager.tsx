"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Loader2, Upload as UploadIcon } from "lucide-react";
import { DocumentList, Document } from "./DocumentList";
import { useAuth, useUser } from "@clerk/nextjs";

interface DocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
}

export function DocumentManager({
  isOpen,
  onClose,
  onUploadClick,
}: DocumentManagerProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string>("not_ready");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchDocuments = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/documents`, {
        headers: {
          "Authorization": `Bearer ${await getToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIngestStatus = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${apiUrl}/api/ingest/status`, {
        headers: {
          "Authorization": `Bearer ${await getToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIngestStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to check ingest status:", error);
    }
  };

  const handleIngestAll = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/ingest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${await getToken()}`,
        },
      });

      if (response.ok) {
        await fetchDocuments();
        await checkIngestStatus();
      } else {
        const error = await response.json();
        alert(`Ingestion failed: ${error.detail}`);
      }
    } catch (error) {
      console.error("Failed to ingest documents:", error);
      alert("Failed to ingest documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${apiUrl}/api/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${await getToken()}`,
        },
      });

      if (response.ok) {
        await fetchDocuments();
        await checkIngestStatus();
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.detail}`);
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete document. Please try again.");
    }
  };

  const handleReingest = async (documentId: number) => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/documents/${documentId}/reingest`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${await getToken()}`,
          },
        }
      );

      if (response.ok) {
        await fetchDocuments();
        await checkIngestStatus();
      } else {
        const error = await response.json();
        alert(`Reingest failed: ${error.detail}`);
      }
    } catch (error) {
      console.error("Failed to reingest document:", error);
      alert("Failed to reingest document. Please try again.");
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchDocuments();
      checkIngestStatus();
    }
  }, [isOpen, user?.id]);

  const pendingCount = documents.filter((d) => d.status === "pending").length;
  const ingestedCount = documents.filter((d) => d.status === "ingested").length;
  const errorCount = documents.filter((d) => d.status === "error").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-500" />
                  My Documents
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Manage your uploaded documents and ingestion status
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {documents.length}
                    </div>
                    <div className="text-xs text-slate-600">Total</div>
                  </div>
                  <div className="h-10 w-px bg-slate-300" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {ingestedCount}
                    </div>
                    <div className="text-xs text-slate-600">Ready</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {pendingCount}
                    </div>
                    <div className="text-xs text-slate-600">Pending</div>
                  </div>
                  {errorCount > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {errorCount}
                      </div>
                      <div className="text-xs text-slate-600">Errors</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <button
                      onClick={handleIngestAll}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-4 h-4" />
                          Ingest All ({pendingCount})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <DocumentList
                documents={documents}
                onDelete={handleDelete}
                onReingest={handleReingest}
                isLoading={isLoading}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Documents are automatically used for RAG queries after ingestion
                </p>
                <button
                  onClick={onUploadClick}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Upload More
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
