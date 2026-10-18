import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // Поки перевіряємо сесію, нічого не показуємо, щоб не «блимало» редіректом
  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f0e9] text-sm text-[#766961]">Завантаження…</div>;
  }
  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
