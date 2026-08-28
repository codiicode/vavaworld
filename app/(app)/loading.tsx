/**
 * Route-transition skeleton for (app) pages. Rendered by Next.js the
 * instant a navigation starts - before the target route's JS + data
 * finish loading - so switching pages paints immediately instead of
 * freezing on the old view. Individual heavy routes (map, marketplace)
 * override this with their own loading.tsx.
 */
export default function AppLoading() {
  const bar = 'animate-pulse rounded-md bg-white/40';
  return (
    <div
      className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] px-4 py-6 md:px-8 md:py-8"
      aria-hidden
    >
      <div className="mb-6">
        <div className={`${bar} mb-2 h-3 w-24`} />
        <div className={`${bar} h-8 w-64`} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/30" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/30" />
        ))}
      </div>
    </div>
  );
}
