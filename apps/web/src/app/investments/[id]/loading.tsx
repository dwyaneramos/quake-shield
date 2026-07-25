import { Skeleton } from "@/components/ui/Skeleton";

export default function RegionInvestmentLoading() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-4 w-24" />

        <div className="flex items-center justify-between gap-4 mt-3 mb-8">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24 mt-2" />
          </div>
          <div className="text-right">
            <Skeleton className="h-9 w-20 ml-auto" />
            <Skeleton className="h-4 w-20 mt-1 ml-auto" />
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
              <Skeleton className="h-5 w-28 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-6 w-16 mb-1" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <Skeleton className="h-3 w-40 mb-2" />
                <Skeleton className="h-9 w-16" />
              </div>
              <div className="px-2 pb-2 h-[160px]">
                <Skeleton className="h-full w-full" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
              <Skeleton className="h-5 w-16 mb-1" />
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="h-12 w-full rounded-lg mb-3" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
