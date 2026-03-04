// frontend/src/components/ui/textarea.tsx

import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
        <textarea
          ref={ref}
          className={clsx(
            "w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-vertical",
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

Textarea.displayName = "Textarea";

export default Textarea;
