"use client";

import { useEffect, useCallback } from "react";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: ShortcutConfig[];
}

/**
 * Hook for handling keyboard shortcuts
 *
 * Supports:
 * - Ctrl/Cmd + Key combinations
 * - Shift, Alt modifiers
 * - Platform-aware (uses meta on Mac, ctrl elsewhere)
 *
 * Example usage:
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: "n", ctrl: true, action: handleNewChat, description: "New chat" },
 *     { key: "/", ctrl: true, action: focusInput, description: "Focus input" },
 *     { key: "Escape", action: closeModal, description: "Close modal" },
 *   ]
 * });
 * ```
 */
export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const {
          key,
          ctrl = false,
          meta = false,
          shift = false,
          alt = false,
          action,
        } = shortcut;

        // Check if this shortcut matches
        const keyMatches = event.key.toLowerCase() === key.toLowerCase();

        // For Ctrl/Meta shortcuts, check either (platform-aware)
        const ctrlOrMetaRequired = ctrl || meta;
        const ctrlOrMetaPressed = event.ctrlKey || event.metaKey;
        const ctrlMetaMatches = ctrlOrMetaRequired
          ? ctrlOrMetaPressed
          : !ctrlOrMetaPressed;

        const shiftMatches = shift ? event.shiftKey : !event.shiftKey;
        const altMatches = alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMetaMatches && shiftMatches && altMatches) {
          // Allow Escape even when typing
          if (key.toLowerCase() === "escape" || !isTyping) {
            event.preventDefault();
            action();
            return;
          }
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

// Pre-defined common shortcuts
export const COMMON_SHORTCUTS = {
  newChat: { key: "n", ctrl: true, description: "New chat" },
  focusInput: { key: "/", ctrl: true, description: "Focus input" },
  closeModal: { key: "Escape", description: "Close modal/menu" },
  save: { key: "s", ctrl: true, description: "Save" },
  search: { key: "k", ctrl: true, description: "Search" },
} as const;
