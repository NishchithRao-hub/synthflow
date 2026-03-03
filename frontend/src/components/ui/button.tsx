// frontend/src/components/ui/button.tsx

import clsx from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--accent-blue)",
    color: "white",
  },
  secondary: {
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
  },
  danger: {
    backgroundColor: "var(--accent-red)",
    color: "white",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      className,
      disabled,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-opacity",
          sizeClasses[size],
          (disabled || loading) && "opacity-50 cursor-not-allowed",
          className,
        )}
        style={{ ...variantStyles[variant], ...style }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
