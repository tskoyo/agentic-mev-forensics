"use client";

import { LogoIcon, MoonIcon, SunIcon } from "./primitives/icons";

interface Props {
  dark: boolean;
  onToggleDark: () => void;
}

export function Header({ dark, onToggleDark }: Props) {
  return (
    <header className="h-11 shrink-0 bg-surface border-b border-border-s flex items-center px-5 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-green flex items-center justify-center">
          <LogoIcon />
        </div>
        <span className="text-[13px] font-semibold text-text-p tracking-[-0.01em]">
          MEV Forensics
        </span>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onToggleDark}
        className="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border border-border-d text-[11px] font-medium text-text-s cursor-pointer transition-colors"
        style={{ background: dark ? "var(--surface)" : "var(--sunken)" }}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
        {dark ? "Light" : "Dark"}
      </button>
    </header>
  );
}
