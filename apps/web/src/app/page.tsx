import { Header } from "@/components/layout/Header";
import HomeClient from "@/components/landing/HomeClient";
import { GEONET } from "@/lib/chains";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <HomeClient />
        <div className="mt-16 text-center text-ink-400 text-xs">
          <p>
            Earthquake data sourced from GeoNet (CC BY 3.0 NZ) &middot; Updated every{" "}
            {GEONET.POLL_INTERVAL_MS / 1000}s
          </p>
        </div>
      </div>
    </main>
  );
}
