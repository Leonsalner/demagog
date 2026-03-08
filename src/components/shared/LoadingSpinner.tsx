interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeClassName = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export default function LoadingSpinner({
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center text-[var(--brand-accent)] dark:text-[var(--brand-accent-dark)]" role="status">
      <svg
        className={`animate-spin ${sizeClassName[size]}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="4"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          className="stroke-current"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Načítava sa</span>
    </div>
  );
}
