"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";

interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
  onComplete?: () => void;
  onCopy?: () => void;
  isCopied?: boolean;
  speed?: number; // milliseconds between words
}

export function StreamingMessage({
  content,
  isComplete,
  onComplete,
  onCopy,
  isCopied = false,
  speed = 30,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<boolean>(true);

  useEffect(() => {
    if (!content) return;

    // If already complete, show full content immediately
    if (isComplete && displayedContent === content) {
      return;
    }

    // If content is already displayed, don't re-animate
    if (displayedContent === content) {
      return;
    }

    setIsAnimating(true);
    animationRef.current = true;

    const words = content.split(" ");
    let currentIndex = 0;

    const typeNextWord = () => {
      if (!animationRef.current) return;

      if (currentIndex < words.length) {
        const newContent = words.slice(0, currentIndex + 1).join(" ");
        setDisplayedContent(newContent);
        currentIndex++;

        // Auto-scroll to keep cursor visible
        if (contentRef.current) {
          const parent = contentRef.current.closest(".overflow-y-auto");
          if (parent) {
            parent.scrollTop = parent.scrollHeight;
          }
        }

        setTimeout(typeNextWord, speed);
      } else {
        setIsAnimating(false);
        onComplete?.();
      }
    };

    // Start animation
    typeNextWord();

    return () => {
      animationRef.current = false;
    };
  }, [content, isComplete, speed]);

  // When isComplete becomes true, immediately show full content
  useEffect(() => {
    if (isComplete && displayedContent !== content) {
      animationRef.current = false;
      setDisplayedContent(content);
      setIsAnimating(false);
    }
  }, [isComplete, content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start group"
    >
      <div
        ref={contentRef}
        className="relative max-w-2xl px-6 py-4 rounded-2xl rounded-bl-none message-bubble bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayedContent}
          {/* Blinking cursor */}
          {isAnimating && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-0.5 h-4 bg-blue-500 dark:bg-blue-400 ml-0.5 align-middle"
            />
          )}
        </p>

        {/* Copy button */}
        {!isAnimating && displayedContent && (
          <button
            onClick={onCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy to clipboard"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
