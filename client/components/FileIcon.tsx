"use client";

import { FileText, Table, Code, File, FileImage, FileArchive } from "lucide-react";

interface FileIconProps {
  filename: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

// File type configuration: extension → { icon, color }
const fileTypeConfig: Record<string, { icon: typeof File; color: string }> = {
  // PDF
  ".pdf": { icon: FileText, color: "text-red-500" },

  // Word documents
  ".doc": { icon: FileText, color: "text-blue-600" },
  ".docx": { icon: FileText, color: "text-blue-600" },

  // Plain text and markdown
  ".txt": { icon: FileText, color: "text-slate-500" },
  ".md": { icon: FileText, color: "text-slate-600" },

  // Data files
  ".csv": { icon: Table, color: "text-green-600" },
  ".json": { icon: Code, color: "text-yellow-600" },
  ".xml": { icon: Code, color: "text-orange-500" },

  // Code files
  ".py": { icon: Code, color: "text-blue-500" },
  ".js": { icon: Code, color: "text-yellow-500" },
  ".jsx": { icon: Code, color: "text-cyan-500" },
  ".ts": { icon: Code, color: "text-blue-600" },
  ".tsx": { icon: Code, color: "text-blue-500" },
  ".html": { icon: Code, color: "text-orange-500" },
  ".css": { icon: Code, color: "text-purple-500" },
  ".swift": { icon: Code, color: "text-orange-600" },
  ".go": { icon: Code, color: "text-cyan-600" },
  ".rs": { icon: Code, color: "text-orange-700" },
  ".java": { icon: Code, color: "text-red-600" },

  // Images
  ".png": { icon: FileImage, color: "text-purple-500" },
  ".jpg": { icon: FileImage, color: "text-purple-500" },
  ".jpeg": { icon: FileImage, color: "text-purple-500" },
  ".gif": { icon: FileImage, color: "text-purple-500" },
  ".svg": { icon: FileImage, color: "text-orange-500" },
  ".webp": { icon: FileImage, color: "text-purple-500" },

  // Archives
  ".zip": { icon: FileArchive, color: "text-amber-600" },
  ".tar": { icon: FileArchive, color: "text-amber-600" },
  ".gz": { icon: FileArchive, color: "text-amber-600" },
  ".rar": { icon: FileArchive, color: "text-amber-600" },
};

export function FileIcon({ filename, className = "", size = "md" }: FileIconProps) {
  // Extract extension from filename
  const extension = filename.includes(".")
    ? `.${filename.split(".").pop()?.toLowerCase()}`
    : "";

  // Get config or fall back to default
  const config = fileTypeConfig[extension] || {
    icon: File,
    color: "text-slate-400",
  };

  const Icon = config.icon;

  return (
    <Icon className={`${sizeClasses[size]} ${config.color} ${className}`} />
  );
}

// Helper function to get file type label
export function getFileTypeLabel(filename: string): string {
  const extension = filename.includes(".")
    ? filename.split(".").pop()?.toUpperCase()
    : "FILE";
  return extension || "FILE";
}
