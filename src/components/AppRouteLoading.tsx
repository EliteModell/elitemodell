export default function AppRouteLoading() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 text-white">
      <div className="premium-enter mx-auto w-full max-w-[820px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="premium-skeleton h-11 w-40 rounded-[8px]" />
          <div className="premium-skeleton hidden h-10 w-10 rounded-[8px] sm:block" />
        </div>
        <div className="premium-surface relative overflow-hidden rounded-[8px] p-5 sm:p-6">
          <div className="premium-shimmer absolute inset-0" />
          <div className="relative">
            <div className="premium-skeleton h-6 w-2/3 rounded-full" />
            <div className="premium-skeleton mt-4 h-4 w-5/6 rounded-full" />
            <div className="premium-skeleton mt-2 h-4 w-1/2 rounded-full" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="premium-card rounded-[8px] p-4">
              <div className="premium-skeleton h-10 w-10 rounded-[8px]" />
              <div className="premium-skeleton mt-5 h-4 w-3/4 rounded-full" />
              <div className="premium-skeleton mt-2 h-3 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
