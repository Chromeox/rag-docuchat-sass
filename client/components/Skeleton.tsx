"use client";

type SkeletonVariant = "text" | "avatar" | "card" | "conversation";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  /** Width in pixels, percentage, or Tailwind class. Only used for text/card variants */
  width?: string | number;
  /** Height in pixels or Tailwind class. Only used for text/card variants */
  height?: string | number;
  /** Size for avatar variant (default: 40) */
  size?: number;
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean;
}

/**
 * Reusable skeleton loader component with multiple variants
 *
 * Variants:
 * - text: Single line text placeholder
 * - avatar: Circular placeholder for profile images
 * - card: Rectangular card placeholder
 * - conversation: Conversation list item shape (matches ConversationItem)
 */
export function Skeleton({
  variant = "text",
  className = "",
  width,
  height,
  size = 40,
  shimmer = false,
}: SkeletonProps) {
  const baseClasses = `bg-slate-200 dark:bg-slate-700 ${shimmer ? "skeleton-shimmer" : "animate-pulse"}`;

  const getWidthStyle = () => {
    if (!width) return undefined;
    if (typeof width === "number") return `${width}px`;
    return width;
  };

  const getHeightStyle = () => {
    if (!height) return undefined;
    if (typeof height === "number") return `${height}px`;
    return height;
  };

  switch (variant) {
    case "avatar":
      return (
        <div
          className={`${baseClasses} rounded-full flex-shrink-0 ${className}`}
          style={{ width: size, height: size }}
        />
      );

    case "card":
      return (
        <div
          className={`${baseClasses} rounded-lg ${className}`}
          style={{
            width: getWidthStyle() || "100%",
            height: getHeightStyle() || "120px",
          }}
        />
      );

    case "conversation":
      return (
        <div className={`px-2 py-1 ${className}`}>
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg">
            {/* Icon placeholder */}
            <div
              className={`${baseClasses} rounded-md flex-shrink-0`}
              style={{ width: 20, height: 20 }}
            />
            {/* Text content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title line */}
              <div
                className={`${baseClasses} rounded h-4`}
                style={{ width: "75%" }}
              />
              {/* Subtitle/date line */}
              <div
                className={`${baseClasses} rounded h-3`}
                style={{ width: "45%" }}
              />
            </div>
          </div>
        </div>
      );

    case "text":
    default:
      return (
        <div
          className={`${baseClasses} rounded ${className}`}
          style={{
            width: getWidthStyle() || "100%",
            height: getHeightStyle() || "16px",
          }}
        />
      );
  }
}

/**
 * Helper component to render multiple conversation skeletons
 */
export function ConversationSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-1 py-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant="conversation" />
      ))}
    </div>
  );
}
