"use client";

import { ConnectButton } from "@/components/web3/ConnectButton";
import Link from "next/link";

export default function BuyPolicyPage() {
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buy Earthquake Policy</h1>
        <p className="text-gray-600 mb-8">Set your trigger conditions and coverage amount.</p>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <form className="space-y-6">
            {/* Coverage Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Amount (USDC)
              </label>
              <input
                type="number"
                placeholder="1000"
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
              />
              <p className="text-sm text-gray-500 mt-1">Premium: 1% of coverage (paid in USDC)</p>
            </div>

            {/* Trigger Magnitude */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Trigger Magnitude
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="6.0"
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
              />
              <p className="text-sm text-gray-500 mt-1">Payout triggers when earthquake magnitude meets or exceeds this value</p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="-41.2858"
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="174.7780"
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Radius (km)
              </label>
              <input
                type="number"
                placeholder="50"
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
              />
              <p className="text-sm text-gray-500 mt-1">How far from the center point should coverage extend? (1-500 km)</p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Policy Summary</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Coverage: <span className="font-medium">-- USDC</span></p>
                <p>Premium (1%): <span className="font-medium">-- USDC</span></p>
                <p>Trigger: <span className="font-medium">Magnitude ≥ -- at --km radius</span></p>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50"
            >
              Connect Wallet to Buy Policy
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
