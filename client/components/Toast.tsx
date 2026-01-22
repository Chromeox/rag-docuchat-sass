"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: "bg-green-50 dark:bg-green-900/50",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-800 dark:text-green-200",
    iconColor: "text-green-500 dark:text-green-400",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-50 dark:bg-red-900/50",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    iconColor: "text-red-500 dark:text-red-400",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-yellow-50 dark:bg-yellow-900/50",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-200",
    iconColor: "text-yellow-500 dark:text-yellow-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-900/50",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-500 dark:text-blue-400",
  },
};

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{
                duration: 0.3,
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
              className={`
                pointer-events-auto
                flex items-start gap-3
                min-w-[320px] max-w-[420px]
                px-4 py-3
                rounded-xl border shadow-lg
                ${config.bg} ${config.border}
              `}
              role="alert"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
              <p className={`flex-1 text-sm font-medium ${config.text}`}>
                {toast.message}
              </p>
              <button
                onClick={() => onDismiss(toast.id)}
                className={`p-1 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0 ${config.text}`}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
