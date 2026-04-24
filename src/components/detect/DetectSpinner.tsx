export default function DetectSpinner() {
  return (
    <div
      className="flex items-center justify-center text-[var(--brand-accent)] dark:text-[var(--brand-accent-dark)]"
      role="status"
      aria-label="Detekcia prebieha"
    >
      <svg
        className="h-14 w-14"
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="28"
          cy="28"
          r="22"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="5"
        />
        <path
          className="detect-spinner-wheel stroke-current"
          d="M28 6a22 22 0 0 1 18.92 10.76"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
