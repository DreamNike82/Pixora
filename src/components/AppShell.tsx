import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Icon from "./Icon";
import Logo from "./Logo";

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Спільна оболонка кабінету у стилі лендінгу:
 * та сама шапка (h-24, max-w 1340, прозора з рамкою) поверх темного hero-блоку,
 * контент на бежевому фоні та той самий футер.
 */
export default function AppShell({ eyebrow, title, subtitle, actions, children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#f7f0e9] text-[#2a211e]">
      <div className="relative bg-[#3d0d1a] text-white">
        <header className="absolute inset-x-0 top-0 z-50 border-b border-white/15">
          <div className="mx-auto flex h-24 max-w-[1340px] items-center px-5 sm:px-8">
            <Logo light href="/" />
            <nav className="ml-auto hidden items-center gap-9 text-[13px] text-white/75 lg:flex">
              <Link to="/" className="nav-link">Головна</Link>
              <Link to="/dashboard" className="nav-link">Мої галереї</Link>
              <Link to="/dashboard/billing" className="nav-link">Тариф</Link>
              <Link to="/dashboard/settings" className="nav-link">Профіль</Link>
            </nav>
            <div className="ml-9 hidden items-center gap-3 lg:flex">
              {user && <span className="max-w-[220px] truncate text-[13px] text-white/60">{user.email}</span>}
              <button onClick={handleLogout} className="px-4 py-2 text-sm text-white/85">Вийти</button>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="ml-auto text-white lg:hidden" aria-label="Відкрити меню">
              <Icon name={menuOpen ? "close" : "menu"} size={26} />
            </button>
          </div>
          {menuOpen && (
            <nav className="border-t border-white/10 bg-[#45101d] px-5 py-5 text-white lg:hidden">
              <div className="flex flex-col gap-4 text-sm">
                <Link to="/" onClick={() => setMenuOpen(false)}>Головна</Link>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Мої галереї</Link>
                <Link to="/dashboard/billing" onClick={() => setMenuOpen(false)}>Тариф</Link>
                <Link to="/dashboard/settings" onClick={() => setMenuOpen(false)}>Профіль</Link>
                {user && <span className="truncate text-white/55">{user.email}</span>}
                <button className="text-left" onClick={handleLogout}>Вийти</button>
              </div>
            </nav>
          )}
        </header>

        <section className="relative">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(39,5,14,.94)_0%,rgba(58,9,23,.75)_48%,rgba(58,9,23,.35)_100%)]" />
          <div className="pointer-events-none absolute right-[-30px] top-1/2 -translate-y-1/2 text-[320px] leading-none text-white/[.04]">✣</div>
          <div className="relative mx-auto flex max-w-[1340px] flex-col justify-between gap-8 px-5 pb-16 pt-36 sm:px-8 sm:pb-20 lg:flex-row lg:items-end">
            <div className="max-w-[760px]">
              <p className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-[#e6c1b7]">
                <span className="h-px w-10 bg-[#d9a79c]" /> {eyebrow}
              </p>
              <h1 className="font-serif text-[44px] font-medium leading-[0.95] tracking-[-0.025em] sm:text-[60px] lg:text-[72px]">{title}</h1>
              {subtitle && <p className="mt-5 text-base leading-7 text-white/72">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
          </div>
        </section>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#211a18] px-5 py-10 text-white/55 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 sm:flex-row sm:items-center">
          <Logo light />
          <p className="text-xs sm:ml-auto">© 2026 PIXORA. Створено для фотографів.</p>
          <div className="flex gap-6 text-xs"><a href="#">Умови</a><a href="#">Конфіденційність</a><a href="#">Підтримка</a></div>
        </div>
      </footer>
    </div>
  );
}
