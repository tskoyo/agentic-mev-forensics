// Icon set used across the MEV Forensics UI. All icons inherit `currentColor`
// for stroke unless explicitly overridden, so they swap with theme cleanly.

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={className ?? "text-text-t shrink-0 cursor-pointer"}
    >
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11V3h8" />
    </svg>
  );
}

export function ExtLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={className ?? "text-text-t shrink-0 cursor-pointer opacity-60"}
    >
      <path d="M7 3H3v10h10V9" />
      <path d="M10 2h4v4" />
      <line x1="14" y1="2" x2="7" y2="9" />
    </svg>
  );
}

export function ChevronIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`text-amber shrink-0 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      } ${className ?? ""}`}
    >
      <path d="M3 5l4 4 4-4" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22" height="22" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={className ?? "text-text-t"}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}

export function StackIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={className ?? "text-text-t"}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      className={className ?? "text-white"}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      className={className}
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12"   y1="1"     x2="12"    y2="3" />
      <line x1="12"   y1="21"    x2="12"    y2="23" />
      <line x1="4.22" y1="4.22"  x2="5.64"  y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"    y1="12"    x2="3"     y2="12" />
      <line x1="21"   y1="12"    x2="23"    y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
    </svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12"
      fill="none" stroke="white" strokeWidth="1.8"
      className={className}
    >
      <circle cx="5" cy="5" r="3.5" />
      <line x1="8" y1="8" x2="11" y2="11" />
    </svg>
  );
}

export function MinusInCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={className ?? "text-text-t shrink-0 mt-[1px]"}
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M5 8h6" />
    </svg>
  );
}

export function ChevronDownTinyIcon({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`text-text-t transition-transform duration-150 ${
        open ? "" : "-rotate-90"
      } ml-0.5 ${className ?? ""}`}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}
