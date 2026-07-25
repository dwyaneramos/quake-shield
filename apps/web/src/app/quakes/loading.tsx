import { Skeleton } from "@/components/ui/Skeleton";

export default function QuakesLoading() {
  return (
    <div className="min-h-screen bg-ink-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-ink-100 p-4 text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-ink-100 overflow-hidden mb-8">
          <div className="p-4 border-b border-ink-100">
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-[480px]" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-ink-100 overflow-hidden">
          <div className="p-5 border-b border-ink-100 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="divide-y divide-ink-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
