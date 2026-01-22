"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";
import { FileIcon } from "./FileIcon";
import { EmptyState } from "./EmptyState";

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  status: "pending" | "ingested" | "error";
  chunk_count?: number;
  error_message?: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: number) => Promise<void>;
  onReingest: (documentId: number) => Promise<void>;
  isLoading?: boolean;
}

export function DocumentList({
  documents,
  onDelete,
  onReingest,
  isLoading = false,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reingestingId, setReingestingId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleteModalOpen(false);
    setDeletingId(documentToDelete.id);
    try {
      await onDelete(documentToDelete.id);
    } finally {
      setDeletingId(null);
      setDocumentToDelete(null);
    }
  };

  const handleReingest = async (documentId: number) => {
    setReingestingId(documentId);
    try {
      await onReingest(documentId);
    } finally {
      setReingestingId(null);
    }
  };

  const getStatusBadge = (doc: Document) => {
    switch (doc.status) {
      case "pending":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </div>
        );
      case "ingested":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Error
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          variant="no-documents"
          title="No documents yet"
          description="Upload PDFs to start chatting with your documents"
        />
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDocumentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.original_filename}"? This action cannot be undone and will remove the document from your knowledge base.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deletingId !== null}
      />

      <div className="space-y-3">
        <AnimatePresence>
          {documents.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              {/* File Icon */}
              <div className="flex-shrink-0 mt-1">
                <FileIcon filename={doc.original_filename} size="md" />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                      {doc.original_filename}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        {formatFileSize(doc.file_size)}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(doc.upload_date)}
                      </span>
                      {doc.chunk_count && (
                        <>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {doc.chunk_count} chunks
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(doc)}
                  </div>
                </div>

                {/* Error Message */}
                {doc.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs text-red-700 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{doc.error_message}</span>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {doc.status === "error" && (
                    <button
                      onClick={() => handleReingest(doc.id)}
                      disabled={reingestingId === doc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reingestingId === doc.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Reingesting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteClick(doc)}
                    disabled={deletingId === doc.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === doc.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </>
  );
}
