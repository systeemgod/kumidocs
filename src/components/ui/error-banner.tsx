import { Button } from "@/components/ui/button";

interface ErrorBannerAction {
  label: string;
  onClick: () => void;
  variant?: "outline" | "ghost";
}

interface ErrorBannerProps {
  message: string | undefined;
  /** "error" (red) or "warning" (amber). Defaults to "error". */
  variant?: "error" | "warning";
  actions: ErrorBannerAction[];
}

const VARIANT_STYLES = {
  error: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
  },
} as const;

export default function ErrorBanner({
  message,
  variant = "error",
  actions,
}: ErrorBannerProps): JSX.Element | false {
  if (message === undefined || message === "") {
    return false;
  }
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      className={`${styles.bg} ${styles.border} border-b px-4 py-2 flex items-center gap-2 text-sm ${styles.text}`}
    >
      <span className="flex-1">{message}</span>
      {actions.map((action, idx) => (
        <Button
          key={idx}
          size="sm"
          variant={action.variant ?? "outline"}
          className="h-6 text-xs"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
