export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 137" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M65 6 C91 20 113 20 121 20 C121 96 105 118 65 130 C25 118 9 96 9 20 C17 20 39 20 65 6 Z"
        fill="none"
        stroke="#1F6F52"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="65" cy="82" r="5" fill="#1F6F52" />
      <path d="M45 82 a20 20 0 0 1 40 0" fill="none" stroke="#1F6F52" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M33 82 a32 32 0 0 1 64 0"
        fill="none"
        stroke="#1F6F52"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function Logo({ className = "", markClassName = "h-9 w-9" }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex translate-y-1 items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="text-xl font-bold leading-none tracking-tight text-ink-900">
        Quake<span className="text-shield-600">Shield</span>
      </span>
    </span>
  );
}
