// frontend/src/app/login/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "signin" | "signup";

interface FieldError {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// ---------------------------------------------------------------------------
// Password-strength indicator (0–4)
// ---------------------------------------------------------------------------

function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "#ef4444", "#f97316", "#22c55e", "#10b981"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      response?: {
        data?: {
          error?: { message?: string };
          message?: string;
          detail?: unknown;
        };
      };
      message?: string;
    };
    if (e.response?.data?.error?.message) return e.response.data.error.message;
    if (typeof e.response?.data?.message === "string") {
      return e.response.data.message;
    }
    // FastAPI validation errors
    const detail = e.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg ?? "Validation error";
    }
    if (typeof detail === "string") return detail;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return "Something went wrong. Please try again.";
}

function isAliasedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) return false;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  // Matches backend anti-alias policy.
  if (local.includes("+")) return true;
  if (domain.startsWith("yahoo.") || domain === "ymail.com") {
    return local.includes("-");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "4px 0",
      }}
    >
      <div
        style={{ flex: 1, height: 1, backgroundColor: "var(--border-color)" }}
      />
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>or</span>
      <div
        style={{ flex: 1, height: 1, backgroundColor: "var(--border-color)" }}
      />
    </div>
  );
}

function FormField({
  label,
  id,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  rightSlot,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            padding: "10px 14px",
            paddingRight: rightSlot ? 42 : 14,
            backgroundColor: "var(--bg-primary)",
            border: `1px solid ${error ? "var(--accent-red)" : "var(--border-color)"}`,
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color .15s",
          }}
          onFocus={(e) => {
            if (!error)
              e.currentTarget.style.borderColor = "var(--accent-purple)";
          }}
          onBlur={(e) => {
            if (!error)
              e.currentTarget.style.borderColor = "var(--border-color)";
          }}
        />
        {rightSlot && (
          <div
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <span style={{ fontSize: 12, color: "var(--accent-red)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function PasswordField({
  label,
  id,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  showStrength,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
}) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? passwordStrength(value) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FormField
        label={label}
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        error={error}
        placeholder={placeholder}
        autoComplete={autoComplete}
        rightSlot={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
            }}
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      {showStrength && value && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  n <= strength
                    ? STRENGTH_COLORS[strength]
                    : "var(--border-color)",
                transition: "background-color .2s",
              }}
            />
          ))}
          <span
            style={{
              fontSize: 11,
              color: STRENGTH_COLORS[strength],
              marginLeft: 6,
              minWidth: 40,
            }}
          >
            {STRENGTH_LABELS[strength]}
          </span>
        </div>
      )}
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%",
        padding: "11px 0",
        backgroundColor: loading
          ? "var(--accent-purple-muted, #5b21b6)"
          : "var(--accent-purple)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "opacity .15s",
        opacity: loading ? 0.75 : 1,
      }}
    >
      {loading && (
        <svg
          className="animate-spin"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
          <path
            d="M4 12a8 8 0 018-8"
            strokeOpacity={0.75}
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

function AlertBox({
  message,
  type = "error",
}: {
  message: string;
  type?: "error" | "success";
}) {
  const isError = type === "error";
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.5,
        backgroundColor: isError ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)",
        color: isError ? "var(--accent-red)" : "#22c55e",
        border: `1px solid ${isError ? "rgba(239,68,68,.25)" : "rgba(34,197,94,.25)"}`,
      }}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign-in panel
// ---------------------------------------------------------------------------

function SignInPanel({
  onGoogleSuccess,
}: {
  onGoogleSuccess: (cred: string) => Promise<void>;
}) {
  const { loginWithEmail } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldError>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): boolean {
    const e: FieldError = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const showResendVerification =
    !!apiError && apiError.toLowerCase().includes("verify your email");

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      await loginWithEmail(email, password);
      router.push("/dashboard");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(cred: string) {
    setGoogleLoading(true);
    setApiError(null);
    try {
      await onGoogleSuccess(cred);
      router.push("/dashboard");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {apiError && <AlertBox message={apiError} />}
      {showResendVerification && (
        <p
          style={{
            margin: "-8px 0 0",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Didn&apos;t get the verification email?{" "}
          <Link
            href={`/resend-verification${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            style={{ color: "var(--accent-purple)", textDecoration: "none" }}
          >
            Resend verification link
          </Link>
        </p>
      )}

      <FormField
        label="Email address"
        id="signin-email"
        type="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <PasswordField
          label="Password"
          id="signin-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <div style={{ textAlign: "right" }}>
          <Link
            href="/forgot-password"
            style={{
              fontSize: 12,
              color: "var(--accent-purple)",
              textDecoration: "none",
            }}
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <SubmitButton loading={loading}>Sign in</SubmitButton>

      <Divider />

      <div style={{ display: "flex", justifyContent: "center" }}>
        {googleLoading ? (
          <div
            style={{
              padding: "10px 0",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Signing in with Google…
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(r) => r.credential && handleGoogle(r.credential)}
            onError={() =>
              setApiError("Google sign-in was cancelled or failed")
            }
            theme="filled_black"
            size="large"
            width="350"
            text="signin_with"
          />
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sign-up panel
// ---------------------------------------------------------------------------

function SignUpPanel({
  onGoogleSuccess,
}: {
  onGoogleSuccess: (cred: string) => Promise<void>;
}) {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldError>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): boolean {
    const e: FieldError = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "Enter a valid email address";
    else if (isAliasedEmail(email)) {
      e.email =
        "Please use your primary email address (aliases are not allowed).";
    }
    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password))
      e.password = "Must include an uppercase letter";
    else if (!/[a-z]/.test(password))
      e.password = "Must include a lowercase letter";
    else if (!/[0-9]/.test(password)) e.password = "Must include a number";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const result = await register(name.trim(), email, password);
      if (result.needsVerification) {
        setSuccessMsg(
          "Account created! Check your inbox for a verification link before signing in.",
        );
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(cred: string) {
    setGoogleLoading(true);
    setApiError(null);
    try {
      await onGoogleSuccess(cred);
      router.push("/dashboard");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  if (successMsg) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40 }}>📬</div>
        <AlertBox message={successMsg} type="success" />
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Didn&apos;t receive it?{" "}
          <Link
            href={`/resend-verification?email=${encodeURIComponent(email)}`}
            style={{ color: "var(--accent-purple)", textDecoration: "none" }}
          >
            Resend verification email
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {apiError && <AlertBox message={apiError} />}

      <FormField
        label="Full name"
        id="signup-name"
        value={name}
        onChange={setName}
        error={errors.name}
        placeholder="Jane Doe"
        autoComplete="name"
      />

      <FormField
        label="Email address"
        id="signup-email"
        type="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <PasswordField
        label="Password"
        id="signup-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        showStrength
      />

      <PasswordField
        label="Confirm password"
        id="signup-confirm"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
        placeholder="Repeat your password"
        autoComplete="new-password"
      />

      <SubmitButton loading={loading}>Create account</SubmitButton>

      <Divider />

      <div style={{ display: "flex", justifyContent: "center" }}>
        {googleLoading ? (
          <div
            style={{
              padding: "10px 0",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Signing up with Google…
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(r) => r.credential && handleGoogle(r.credential)}
            onError={() =>
              setApiError("Google sign-in was cancelled or failed")
            }
            theme="filled_black"
            size="large"
            width="350"
            text="signup_with"
          />
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-primary)", padding: "24px 16px" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "32px 40px 0", textAlign: "center" }}>
          <Image
            src="/logo.png"
            alt="SynthFlow"
            width={52}
            height={52}
            className="rounded-xl"
            style={{ display: "inline-block", marginBottom: 12 }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            SynthFlow
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            AI-powered workflow automation
          </p>
        </div>

        {/* Tabs */}
        <div style={{ padding: "24px 40px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              backgroundColor: "var(--bg-primary)",
              borderRadius: 8,
              padding: 4,
              gap: 4,
            }}
          >
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 0",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all .15s",
                  backgroundColor: tab === t ? "var(--bg-card)" : "transparent",
                  color:
                    tab === t ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.2)" : "none",
                }}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div style={{ padding: "24px 40px 32px" }}>
          {tab === "signin" ? (
            <SignInPanel onGoogleSuccess={login} />
          ) : (
            <SignUpPanel onGoogleSuccess={login} />
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            margin: 0,
            padding: "16px 40px 24px",
            fontSize: 11,
            textAlign: "center",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
