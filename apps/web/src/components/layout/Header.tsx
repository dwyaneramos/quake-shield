"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { ConnectButton } from "@/components/web3/ConnectButton";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quakes", label: "Live Quakes" },
  { href: "/policies", label: "Policies & Claims" },
  { href: "/policies/new", label: "Buy Policy" },
  { href: "/investments", label: "Investments" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-ink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
        <Link href="/" aria-label="QuakeShield home">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-shield-50 text-shield-700" : "text-ink-600 hover:text-ink-900 hover:bg-ink-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
