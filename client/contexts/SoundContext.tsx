"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";

interface SoundContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  playNotificationSound: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const STORAGE_KEY = "docuchat-sound-enabled";

interface SoundProviderProps {
  children: ReactNode;
}

export function SoundProvider({ children }: SoundProviderProps) {
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    // Create audio element with the notification sound
    audioRef.current = new Audio("/sounds/notification.wav");
    audioRef.current.volume = 0.3; // Subtle volume (30%)

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Load preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setSoundEnabledState(saved === "true");
      }
    } catch (error) {
      console.error("Error loading sound preference:", error);
    }
    setMounted(true);
  }, []);

  // Set sound enabled with persistence
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (error) {
      console.error("Error saving sound preference:", error);
    }
  }, []);

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled);
  }, [soundEnabled, setSoundEnabled]);

  // Play the notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      // Reset to start if already playing
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        // Silently handle autoplay restrictions
        console.debug("Could not play notification sound:", error);
      });
    } catch (error) {
      console.debug("Error playing notification sound:", error);
    }
  }, [soundEnabled]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <SoundContext.Provider
        value={{
          soundEnabled: false,
          setSoundEnabled: () => {},
          toggleSound: () => {},
          playNotificationSound: () => {},
        }}
      >
        {children}
      </SoundContext.Provider>
    );
  }

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        playNotificationSound,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}
