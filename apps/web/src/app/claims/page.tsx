"use client";

import { ConnectButton } from "@/components/web3/ConnectButton";
import Link from "next/link";

export default function ClaimsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-quake-500">Quake</span>
            <span className="text-shield-500">Shield</span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Claims History</h1>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Your Payouts</h2>
            <p className="text-sm text-gray-500 mt-1">Automatic payouts from triggered policies</p>
          </div>
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-1">No claims yet</p>
            <p className="text-gray-500 mb-4">When an earthquake triggers your policy, payout appears here.</p>
            <Link
              href="/policies/new"
              className="inline-block bg-shield-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
            >
              Buy Your First Policy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
