export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header skeleton */}
      <div className="h-8 w-64 bg-brand-navy rounded-xl animate-pulse mb-2" />
      <div className="h-4 w-32 bg-surface-2 rounded animate-pulse mb-10" />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar skeleton */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-brand-navy border border-line rounded-xl p-6 space-y-6">
            <div className="h-5 w-28 bg-surface-2 rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-surface-2 animate-pulse" />
                  <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="border-t border-line pt-6">
              <div className="h-5 w-20 bg-surface-2 rounded animate-pulse mb-3" />
              <div className="h-10 bg-surface-2 rounded-lg animate-pulse" />
            </div>
            <div className="border-t border-line pt-6">
              <div className="h-5 w-24 bg-surface-2 rounded animate-pulse mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-2 animate-pulse" />
                <div className="h-8 w-8 bg-surface-2 rounded animate-pulse" />
                <div className="w-8 h-8 rounded-lg bg-surface-2 animate-pulse" />
              </div>
            </div>
          </div>
        </aside>

        {/* Results skeleton */}
        <main className="flex-1 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-brand-navy border border-line rounded-xl p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-8 w-16 bg-brand-gold/20 rounded" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-surface-2 rounded mb-2" />
                  <div className="h-4 w-32 bg-surface-2 rounded mb-4" />
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-6 w-28 bg-surface-2 rounded-full" />
                    ))}
                  </div>
                </div>
                <div className="h-10 w-24 bg-brand-gold/20 rounded-xl" />
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
