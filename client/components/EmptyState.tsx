"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface EmptyStateProps {
  variant: "no-documents" | "no-conversations";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// SVG Illustration for no documents
function NoDocumentsIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-slate-300 dark:text-slate-600"
    >
      {/* Main document */}
      <motion.rect
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        x="30"
        y="20"
        width="50"
        height="65"
        rx="4"
        fill="currentColor"
        className="text-slate-200 dark:text-slate-700"
      />
      <motion.rect
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        x="30"
        y="20"
        width="50"
        height="65"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        className="text-slate-300 dark:text-slate-600"
      />

      {/* Document fold */}
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        d="M68 20V32H80"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-slate-300 dark:text-slate-600"
      />
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        d="M68 20L80 32"
        stroke="currentColor"
        strokeWidth="2"
        className="text-slate-300 dark:text-slate-600"
      />

      {/* Text lines */}
      <motion.rect
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        x="38"
        y="42"
        width="34"
        height="4"
        rx="2"
        fill="currentColor"
        className="text-slate-300 dark:text-slate-500"
        style={{ transformOrigin: "left" }}
      />
      <motion.rect
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        x="38"
        y="52"
        width="28"
        height="4"
        rx="2"
        fill="currentColor"
        className="text-slate-300 dark:text-slate-500"
        style={{ transformOrigin: "left" }}
      />
      <motion.rect
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        x="38"
        y="62"
        width="20"
        height="4"
        rx="2"
        fill="currentColor"
        className="text-slate-300 dark:text-slate-500"
        style={{ transformOrigin: "left" }}
      />

      {/* Upload arrow */}
      <motion.g
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <circle
          cx="85"
          cy="75"
          r="18"
          fill="currentColor"
          className="text-blue-100 dark:text-blue-900/50"
        />
        <motion.path
          d="M85 82V68M85 68L79 74M85 68L91 74"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-500 dark:text-blue-400"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        />
      </motion.g>
    </svg>
  );
}

// SVG Illustration for no conversations
function NoConversationsIllustration() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-slate-300 dark:text-slate-600"
    >
      {/* Main chat bubble */}
      <motion.path
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        d="M20 25C20 21.6863 22.6863 19 26 19H64C67.3137 19 70 21.6863 70 25V50C70 53.3137 67.3137 56 64 56H35L24 65V56H26C22.6863 56 20 53.3137 20 50V25Z"
        fill="currentColor"
        className="text-slate-200 dark:text-slate-700"
      />
      <motion.path
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        d="M20 25C20 21.6863 22.6863 19 26 19H64C67.3137 19 70 21.6863 70 25V50C70 53.3137 67.3137 56 64 56H35L24 65V56H26C22.6863 56 20 53.3137 20 50V25Z"
        stroke="currentColor"
        strokeWidth="2"
        className="text-slate-300 dark:text-slate-600"
      />

      {/* Dots in chat bubble */}
      <motion.circle
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.2 }}
        cx="35"
        cy="37"
        r="4"
        fill="currentColor"
        className="text-slate-300 dark:text-slate-500"
      />
      <motion.circle
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.2 }}
        cx="45"
        cy="37"
        r="4"
        fill="currentColor"
        className="text-slate-300 dark:text-slate-500"
      />
      <motion.circle
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.2 }}
        cx="55"
        cy="37"
        r="4"
        fill="currentColor"
        className="text-slate-300 dark:text-slate-500"
      />

      {/* Secondary smaller chat bubble */}
      <motion.path
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        d="M55 55C55 52.2386 57.2386 50 60 50H78C80.7614 50 83 52.2386 83 55V70C83 72.7614 80.7614 75 78 75H72V81L65 75H60C57.2386 75 55 72.7614 55 70V55Z"
        fill="currentColor"
        className="text-blue-100 dark:text-blue-900/50"
      />
      <motion.path
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        d="M55 55C55 52.2386 57.2386 50 60 50H78C80.7614 50 83 52.2386 83 55V70C83 72.7614 80.7614 75 78 75H72V81L65 75H60C57.2386 75 55 72.7614 55 70V55Z"
        stroke="currentColor"
        strokeWidth="2"
        className="text-blue-300 dark:text-blue-600"
      />

      {/* Plus icon in small bubble */}
      <motion.path
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.3 }}
        d="M69 58V68M64 63H74"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-blue-500 dark:text-blue-400"
      />
    </svg>
  );
}

export function EmptyState({
  variant,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
    >
      {/* Illustration */}
      <div className="mb-4">
        {variant === "no-documents" ? (
          <NoDocumentsIllustration />
        ) : (
          <NoConversationsIllustration />
        )}
      </div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]"
      >
        {description}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
