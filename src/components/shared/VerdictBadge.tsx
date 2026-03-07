import { Verdict } from "@/types";

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md";
}

const verdictStyles: Record<
  Verdict,
  {
    badge: string;
    dot: string;
  }
> = {
  Pravda: {
    badge: "border-green-300 bg-green-100 text-green-800",
    dot: "bg-green-700",
  },
  Nepravda: {
    badge: "border-red-300 bg-red-100 text-red-800",
    dot: "bg-red-700",
  },
  Zavádzajúce: {
    badge: "border-amber-300 bg-amber-100 text-amber-800",
    dot: "bg-amber-700",
  },
  Neoveriteľné: {
    badge: "border-gray-300 bg-gray-100 text-gray-600",
    dot: "bg-gray-500",
  },
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export default function VerdictBadge({
  verdict,
  size = "md",
}: VerdictBadgeProps) {
  const styles = verdictStyles[verdict];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${styles.badge} ${sizeStyles[size]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {verdict}
    </span>
  );
}
