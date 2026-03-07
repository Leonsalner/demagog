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
    badge: "border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300",
    dot: "bg-green-700",
  },
  Nepravda: {
    badge: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300",
    dot: "bg-red-700",
  },
  Zavádzajúce: {
    badge: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "bg-amber-700",
  },
  Neoveriteľné: {
    badge: "border-gray-300 bg-gray-100 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
