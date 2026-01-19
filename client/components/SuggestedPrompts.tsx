"use client";

import { motion } from "framer-motion";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  compact?: boolean;
}

const prompts = [
  "How do I upload documents to the knowledge base?",
  "What file formats are supported?",
  "How does the RAG system work?",
  "Can I organize documents into folders?",
];

export function SuggestedPrompts({ onSelect, compact = false }: SuggestedPromptsProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {prompts.slice(0, 2).map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors text-slate-600"
          >
            {prompt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt, idx) => (
        <motion.button
          key={prompt}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          onClick={() => onSelect(prompt)}
          className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm text-slate-700 font-medium"
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  );
}
