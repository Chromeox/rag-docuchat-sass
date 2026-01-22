"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, MessageSquare, Paperclip, FolderOpen, Moon } from "lucide-react";

const STORAGE_KEY = "docuchat-onboarding-complete";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector: string;
  position: "left" | "right" | "top" | "bottom";
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "sidebar",
    title: "Your Conversations",
    description: "All your chat conversations are organized here. Click any conversation to continue where you left off.",
    icon: <MessageSquare className="w-5 h-5" />,
    targetSelector: "[data-onboarding='sidebar']",
    position: "right",
  },
  {
    id: "upload",
    title: "Upload Documents",
    description: "Click this button to upload PDFs, documents, or text files. You can also drag and drop files anywhere on the page.",
    icon: <Paperclip className="w-5 h-5" />,
    targetSelector: "[data-onboarding='upload-button']",
    position: "top",
  },
  {
    id: "documents",
    title: "Document Manager",
    description: "View and manage all your uploaded documents here. Delete old files or see what's in your knowledge base.",
    icon: <FolderOpen className="w-5 h-5" />,
    targetSelector: "[data-onboarding='document-manager']",
    position: "bottom",
  },
  {
    id: "theme",
    title: "Dark Mode",
    description: "Toggle between light and dark themes for comfortable reading in any environment.",
    icon: <Moon className="w-5 h-5" />,
    targetSelector: "[data-onboarding='theme-toggle']",
    position: "right",
  },
];

interface WelcomeOnboardingProps {
  onComplete?: () => void;
}

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if onboarding should be shown
  useEffect(() => {
    setMounted(true);
    const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY);
    if (!hasCompletedOnboarding) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update target element position
  useEffect(() => {
    if (!isVisible || !mounted) return;

    const updateTargetPosition = () => {
      const step = onboardingSteps[currentStep];
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    updateTargetPosition();

    // Update position on resize/scroll
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, true);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition, true);
    };
  }, [isVisible, currentStep, mounted]);

  const handleNext = useCallback(() => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      }
    };

    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, handleNext, handleSkip]);

  // Don't render on server or if not visible
  if (!mounted || !isVisible) return null;

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Fallback to center if target not found
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Approximate

    switch (step.position) {
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - tooltipWidth - padding,
          transform: "translateY(-50%)",
        };
      case "top":
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: "translateX(-50%)",
        };
      default:
        return {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  };

  // Get arrow styles based on position
  const getArrowStyle = (): React.CSSProperties => {
    switch (step.position) {
      case "right":
        return {
          left: -8,
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
        };
      case "left":
        return {
          right: -8,
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
        };
      case "top":
        return {
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
        };
      case "bottom":
        return {
          top: -8,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
        };
      default:
        return {};
    }
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop overlay with spotlight effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={handleSkip}
          />

          {/* Spotlight highlight on target element */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="fixed pointer-events-none"
              style={{
                zIndex: 9999,
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: "0 0 0 4000px rgba(0, 0, 0, 0.6)",
                borderRadius: 12,
                border: "2px solid rgba(59, 130, 246, 0.5)",
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: step.position === "bottom" ? -10 : step.position === "top" ? 10 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{ ...getTooltipStyle(), zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointer */}
            <div
              className="absolute w-4 h-4 bg-white dark:bg-slate-800"
              style={getArrowStyle()}
            />

            {/* Content */}
            <div className="relative">
              {/* Header */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {step.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Step {currentStep + 1} of {onboardingSteps.length}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    aria-label="Skip onboarding"
                  >
                    <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pb-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 pb-4">
                {onboardingSteps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep
                        ? "bg-blue-600 dark:bg-blue-400"
                        : index < currentStep
                        ? "bg-blue-300 dark:bg-blue-700"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                    initial={false}
                    animate={{
                      scale: index === currentStep ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Skip tour
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLastStep ? "Get Started" : "Next"}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
