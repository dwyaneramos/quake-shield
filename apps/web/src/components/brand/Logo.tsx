export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M24 2 L44 10 V26 C44 40.5 35.6 50.4 24 54 C12.4 50.4 4 40.5 4 26 V10 Z"
        fill="url(#shield-gradient)"
        stroke="#12664a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 30 H16 L19.5 21 L24 39 L27.5 25 L30.5 30 H39"
        stroke="#fd9d24"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <defs>
        <linearGradient id="shield-gradient" x1="4" y1="2" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#45b98d" />
          <stop offset="1" stopColor="#15805c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className = "", markClassName = "h-9 w-9" }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="text-xl font-bold tracking-tight text-ink-900">
        Quake<span className="text-shield-600">Shield</span>
      </span>
    </span>
  );
}
