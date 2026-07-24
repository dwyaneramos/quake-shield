import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-shield-50/40 to-white">
      <Header />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <span className="inline-block bg-quake-50 text-quake-700 text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full mb-6">
            Parametric insurance for Aotearoa
          </span>
          <h1 className="text-5xl font-bold text-ink-900 sm:text-6xl">
            Earthquake cover that <span className="text-shield-600">pays itself out.</span>
          </h1>
          <p className="mt-6 text-xl text-ink-600 max-w-2xl mx-auto">
            No adjusters, no six-year claims, no middleman. Set a trigger, pay a premium into the
            pool, and get paid in minutes the moment GeoNet confirms the shake.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-shield-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/quakes"
              className="bg-ink-50 text-ink-700 px-8 py-3 rounded-lg font-semibold hover:bg-ink-100 transition-colors"
            >
              View Live Quakes
            </Link>
          </div>
        </div>
      </div>

      {/* Why */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-2xl border border-ink-100 p-8 shadow-sm">
          <p className="text-ink-700 leading-relaxed">
            Canterbury families are <span className="font-semibold text-ink-900">still</span>{" "}
            settling earthquake claims more than a decade after 2011. QuakeShield replaces that
            slow, discretionary process with a smart contract: the payout condition is agreed
            up front, GeoNet is the referee, and the contract can&rsquo;t drag its feet or deny a
            claim it already agreed to pay.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-16 border-y border-ink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-ink-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Step number={1} title="Set Your Trigger" description="Choose magnitude, location, and radius for coverage." />
            <Step number={2} title="Pay Premium" description="Pay a small premium in USDC to the shared insurance pool." />
            <Step number={3} title="Oracle Monitors" description="Our oracle watches GeoNet for matching earthquakes, 24/7." />
            <Step number={4} title="Auto Payout" description="If the trigger fires, USDC lands in your wallet — instantly, on-chain." />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-ink-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Stat value="< 1 min" label="Average Payout Time" />
            <Stat value="1%" label="Premium Rate" />
            <Stat value="100%" label="On-Chain Transparency" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-ink-900 text-ink-300 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>Built for the NZ Web3 Hackathon</p>
          <p className="mt-2 text-sm">Earthquake data sourced from GeoNet (CC BY 3.0 NZ)</p>
        </div>
      </footer>
    </main>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-shield-100 text-shield-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-ink-900 mb-2">{title}</h3>
      <p className="text-ink-600">{description}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-shield-600">{value}</div>
      <div className="mt-2 text-ink-600">{label}</div>
    </div>
  );
}
