// frontend/src/components/ui/input.tsx

import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors",
            className,
          )}
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: `1px solid ${error ? "var(--accent-red)" : "var(--border-color)"}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error
              ? "var(--accent-red)"
              : "var(--accent-blue)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? "var(--accent-red)"
              : "var(--border-color)";
          }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--accent-red)" }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
