import { VERDICT_THEME } from "@/lib/verdict-theme";
import { Verdict } from "@/types";

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md";
}

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export default function VerdictBadge({
  verdict,
  size = "md",
}: VerdictBadgeProps) {
  const styles = VERDICT_THEME[verdict];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${styles.badge} ${sizeStyles[size]}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${styles.badgeDot}`}
      />
      {verdict}
    </span>
  );
}
