import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

const FEATURES = [
  {
    title: "Instant, automatic payouts",
    description:
      "No adjusters, no paperwork, no waiting. When GeoNet confirms a shake past your trigger, your payout lands on-chain in minutes.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    title: "Set your own trigger",
    description:
      "Choose the magnitude, radius, and coverage that fit your risk. Your policy, your terms.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.688 7.688 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
    ),
  },
  {
    title: "Backed by real investors",
    description:
      "Every policy is collateralized by DNZD invested behind specific regions, kept above a 150% reserve ratio at all times.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.03 8.4-7.19 9.632a1.5 1.5 0 01-.86.005C8.79 20.397 5.76 16.556 5.76 12V6.34a1.5 1.5 0 01.94-1.39l5.25-2.1a1.5 1.5 0 011.1 0l5.25 2.1a1.5 1.5 0 01.94 1.39V12z"
      />
    ),
  },
  {
    title: "Live seismic data",
    description:
      "Every trigger is settled against GeoNet's public earthquake feed — transparent, verifiable, and impossible to dispute.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
      />
    ),
  },
];

const STEPS = [
  {
    step: "1",
    title: "Pick your coverage",
    description: "Set a magnitude trigger, radius, and coverage amount that matches your risk.",
  },
  {
    step: "2",
    title: "Pay your premium",
    description: "Pay once in DNZD and your policy is live instantly — no underwriting, no delays.",
  },
  {
    step: "3",
    title: "Get paid automatically",
    description: "If GeoNet confirms a qualifying quake, your payout is triggered on-chain within minutes.",
  },
];

const INVEST_STEPS = [
  {
    step: "1",
    title: "Pick a region",
    description: "Choose an NZ region to back — Canterbury, Otago, Wellington, and more.",
  },
  {
    step: "2",
    title: "Invest DNZD",
    description: "Your capital backs that region's policies and sets its reserve ratio.",
  },
  {
    step: "3",
    title: "Earn every quiet fortnight",
    description: "No qualifying quake in the region means an automatic return, funded by premiums.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-shield-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-shield-200 rounded-full px-4 py-1.5 text-sm font-medium text-shield-700 mb-8 shadow-sm">
            <LogoMark className="h-4 w-4" />
            Live on-chain earthquake protection for New Zealand
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-ink-900 max-w-4xl mx-auto">
            Earthquake cover that{" "}
            <span className="text-shield-600">pays in minutes</span>, backed by
            investors who bet on quiet ground
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-ink-600 max-w-2xl mx-auto">
            QuakeShield is parametric earthquake insurance for New Zealand, funded
            by investors who back specific regions instead of a quake happening
            there. Policyholders set a trigger and get paid the instant GeoNet
            confirms it. Investors earn a fortnightly return for every region that
            stays quiet.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/policies/new"
              className="inline-flex items-center justify-center bg-shield-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg shadow-lg shadow-shield-600/20 hover:bg-shield-700 transition-colors"
            >
              Get Covered
            </Link>
            <Link
              href="/investments"
              className="inline-flex items-center justify-center border border-ink-200 text-ink-700 px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-ink-50 transition-colors"
            >
              Invest in a Region
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-400">
            Powered by GeoNet · Settled in DNZD · Fully on-chain
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-ink-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink-900">150%+</div>
            <div className="text-sm text-ink-500 mt-1">Minimum reserve ratio</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink-900">16</div>
            <div className="text-sm text-ink-500 mt-1">Investable NZ regions</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink-900">Fortnightly</div>
            <div className="text-sm text-ink-500 mt-1">Investor returns, paid automatically</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-ink-900">GeoNet</div>
            <div className="text-sm text-ink-500 mt-1">Verified seismic data</div>
          </div>
        </div>
      </section>

      {/* Two sides of one pool */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink-900">
            Two sides of one pool
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Policyholders and investors sit on opposite sides of the same bet —
            and both get paid automatically, on-chain.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/policies/new"
            className="group rounded-2xl border border-ink-100 bg-white p-8 shadow-sm hover:shadow-md hover:border-shield-300 transition-all"
          >
            <div className="w-12 h-12 bg-shield-100 text-shield-600 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.03 8.4-7.19 9.632a1.5 1.5 0 01-.86.005C8.79 20.397 5.76 16.556 5.76 12V6.34a1.5 1.5 0 01.94-1.39l5.25-2.1a1.5 1.5 0 011.1 0l5.25 2.1a1.5 1.5 0 01.94 1.39V12z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-ink-900 mb-2">
              I want cover — bet a quake happens
            </h3>
            <p className="text-ink-600 mb-4">
              Set a magnitude trigger, radius, and coverage amount. Pay a premium
              and get an instant on-chain payout if GeoNet confirms a qualifying
              quake.
            </p>
            <span className="text-shield-600 font-semibold group-hover:text-shield-700">
              Buy a policy →
            </span>
          </Link>
          <Link
            href="/investments"
            className="group rounded-2xl border border-ink-100 bg-white p-8 shadow-sm hover:shadow-md hover:border-shield-300 transition-all"
          >
            <div className="w-12 h-12 bg-quake-100 text-quake-600 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-ink-900 mb-2">
              I want to invest — bet a quake doesn&rsquo;t
            </h3>
            <p className="text-ink-600 mb-4">
              Back a region with DNZD. Earn a return every fortnight it stays
              quiet, priced dynamically by how active that region has been
              lately. Withdraw anytime.
            </p>
            <span className="text-quake-600 font-semibold group-hover:text-quake-700">
              Explore regions →
            </span>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink-900">
            Insurance, rebuilt for the on-chain era
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Traditional earthquake insurance is slow, opaque, and full of fine
            print. QuakeShield replaces all of it with code.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl border border-ink-100 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-shield-100 text-shield-600 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {feature.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-ink-900 mb-1.5">{feature.title}</h3>
              <p className="text-sm text-ink-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works: insurance */}
      <section className="bg-ink-50/60 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-900">
              Covered in three steps
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              From sign-up to payout, everything runs on-chain and in the open.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-shield-600 text-white font-bold text-xl flex items-center justify-center mb-5 shadow-lg shadow-shield-600/20">
                  {step.step}
                </div>
                <h3 className="font-semibold text-lg text-ink-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-ink-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works: investing */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-900">
              Investing, in three steps
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              Your capital is what makes instant payouts possible — and what
              makes it worth backing quiet ground.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {INVEST_STEPS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-quake-500 text-white font-bold text-xl flex items-center justify-center mb-5 shadow-lg shadow-quake-500/20">
                  {step.step}
                </div>
                <h3 className="font-semibold text-lg text-ink-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-ink-600">{step.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-ink-400 mt-10 max-w-xl mx-auto">
            Investing carries risk: if a significant quake strikes a region you&rsquo;ve
            backed, payouts there are charged against invested capital before
            anything else.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-shield-700 px-6 py-16 sm:px-16 text-center">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 35%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Don&rsquo;t wait for the next big one
            </h2>
            <p className="mt-4 text-lg text-shield-100 max-w-xl mx-auto">
              Get covered in minutes, or put your capital behind the regions you
              think will stay quiet — guaranteed by code, not a claims department.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/policies/new"
                className="inline-flex items-center justify-center bg-white text-shield-700 px-8 py-3.5 rounded-xl font-semibold text-lg shadow-lg hover:bg-shield-50 transition-colors"
              >
                Get Covered
              </Link>
              <Link
                href="/investments"
                className="inline-flex items-center justify-center border border-shield-300 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-shield-600 transition-colors"
              >
                Invest in a Region
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
