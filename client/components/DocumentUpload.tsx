"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  File,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "ingesting" | "error";
  error?: string;
  documentId?: number;
}

interface DocumentUploadProps {
  onUploadComplete?: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  // Documents
  ".pdf", ".txt", ".md", ".docx", ".doc",
  // Data files
  ".csv", ".json",
  // Code files
  ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css"
];

export function DocumentUpload({ onUploadComplete, className = "" }: DocumentUploadProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit`;
    }

    // Check file type
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED_FILE_TYPES.includes(extension)) {
      return `Invalid file type. Accepted: ${ACCEPTED_FILE_TYPES.join(", ")}`;
    }

    return null;
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    const formData = new FormData();
    formData.append("files", uploadedFile.file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${await getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await response.json();
      const documentId = data.documents?.[0]?.id;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? { ...f, progress: 100, status: "success", documentId }
            : f
        )
      );

      return true;
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );
      return false;
    }
  };

  const ingestDocuments = async () => {
    if (!user?.id) return;

    setIsIngesting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/ingest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${await getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Ingestion failed");
      }

      // Mark all successful uploads as ingested
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "success" ? { ...f, status: "ingesting" } : f
        )
      );

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Ingestion failed:", error);
      alert("Failed to ingest documents. Please try again from My Documents.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles: UploadedFile[] = [];

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      newFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: error ? "error" : "pending",
        error: error || undefined,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload valid files
    const validFiles = newFiles.filter((f) => f.status === "pending");
    let successCount = 0;

    for (const file of validFiles) {
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "uploading" } : f))
      );
      const success = await uploadFile(file);
      if (success) successCount++;
    }

    // Auto-ingest after all uploads complete
    if (successCount > 0) {
      setTimeout(() => {
        ingestDocuments();
      }, 500);
    }
  }, [user?.id, onUploadComplete]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <File className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "ingesting":
        return <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-200 group
            ${
              isDragging
                ? "border-blue-500 bg-blue-50 scale-[1.02]"
                : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{
                scale: isDragging ? 1.1 : 1,
                rotate: isDragging ? 5 : 0,
              }}
              transition={{ duration: 0.2 }}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${
                  isDragging
                    ? "bg-blue-500 text-white"
                    : "bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600"
                }
                group-hover:shadow-lg transition-shadow duration-200
              `}
            >
              <Upload className="w-8 h-8" />
            </motion.div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {isDragging ? "Drop files here" : "Upload your documents"}
              </h3>
              <p className="text-sm text-slate-600">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-2">
                PDF, DOCX, TXT, MD, CSV, JSON, code files • Max 10MB per file
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ingestion Status */}
      {isIngesting && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-purple-900">
                Processing documents...
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                Creating embeddings and building vector store
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 space-y-3"
          >
            <h4 className="text-sm font-semibold text-slate-700 px-1">
              Uploaded Files ({files.length})
            </h4>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(file.file.name)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatFileSize(file.file.size)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusIcon(file)}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {file.status === "uploading" && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {file.error && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {file.error}
                      </p>
                    )}

                    {/* Success Message */}
                    {file.status === "success" && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Uploaded successfully
                      </p>
                    )}

                    {/* Ingesting Message */}
                    {file.status === "ingesting" && (
                      <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing for RAG...
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
