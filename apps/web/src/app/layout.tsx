import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuakeShield - Parametric Earthquake Insurance & Regional Investments",
  description:
    "Automatic, on-chain earthquake insurance for New Zealand, funded by investors who back specific regions. Policyholders get paid in minutes when GeoNet confirms a quake; investors earn a fortnightly return for every region that stays quiet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
