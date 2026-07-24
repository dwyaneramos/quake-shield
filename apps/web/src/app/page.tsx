import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
            <span className="text-quake-500">Quake</span>
            <span className="text-shield-500">Shield</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Parametric earthquake insurance for New Zealand. Automatic payouts when GeoNet data meets your policy triggers. No middleman, no delays.
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
              className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              View Live Quakes
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Step number={1} title="Set Your Trigger" description="Choose magnitude, location, and radius for coverage." />
            <Step number={2} title="Pay Premium" description="Pay a small premium in USDC to the insurance pool." />
            <Step number={3} title="Oracle Monitors" description="Our oracle watches GeoNet for matching earthquakes." />
            <Step number={4} title="Auto Payout" description="If trigger fires, USDC is sent to your wallet instantly." />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Stat value="< 1 min" label="Average Payout Time" />
            <Stat value="1%" label="Premium Rate" />
            <Stat value="100%" label="On-Chain Transparency" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>Built for NZ Web3 Hackathon 2026</p>
          <p className="mt-2 text-sm">Data sourced from GeoNet (CC BY 3.0 NZ)</p>
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
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold text-shield-600">{value}</div>
      <div className="mt-2 text-gray-600">{label}</div>
    </div>
  );
}
