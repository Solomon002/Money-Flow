import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown, Crown, LogOut, Settings, Upload } from "lucide-react";

type UserMenuProps = {
  name?: string;
  email?: string;
  onSignOut: () => void;
};

export default function UserMenu({ name, email, onSignOut }: UserMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-slate-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {name?.charAt(0).toUpperCase()}
        </span>

        <span className="text-left">
          <span className="block text-sm font-semibold text-slate-900">
            {name}
          </span>

          <span className="block text-xs text-slate-500">{email}</span>
        </span>

        <ChevronDown
          size={16}
          className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <Link
            to="/app/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Settings size={16} className="text-slate-500" />
            {t("nav.settings")}
          </Link>

          <Link
            to="/app/pro"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Crown size={16} className="text-emerald-600" />
            MoneyFlow Pro
          </Link>

          <Link
            to="/app/transactions/import"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Upload size={16} className="text-slate-500" />
            {t("transactions.import")}
          </Link>

          <div className="my-1 h-px bg-slate-100" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={`${itemClass} text-red-600 hover:bg-red-50`}
          >
            <LogOut size={16} />
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
