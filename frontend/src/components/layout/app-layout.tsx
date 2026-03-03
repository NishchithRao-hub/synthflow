// frontend/src/components/layout/app-layout.tsx

"use client";

import Sidebar from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export default function AppLayout({
  children,
  userName,
  userEmail,
  onLogout,
}: AppLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Sidebar userName={userName} userEmail={userEmail} onLogout={onLogout} />
      <main
        className="min-h-screen"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  );
}
