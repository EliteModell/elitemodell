function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg bg-white/[0.04] ${className ?? ""}`}
    />
  );
}

export default function PremiumSkeleton() {
  return (
    <div className="space-y-5">
      {/* Hero skeleton */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0b0e] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_252px] lg:items-center">
          <div>
            <Bone className="mb-4 h-3 w-28" />
            <Bone className="h-9 w-3/4" />
            <Bone className="mt-2 h-9 w-1/2" />
            <Bone className="mt-4 h-3.5 w-2/3" />
            <div className="mt-6 flex gap-3">
              <Bone className="h-10 w-36 rounded-lg" />
              <Bone className="h-10 w-32 rounded-lg" />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
            <div className="flex items-center gap-3.5">
              <Bone className="h-11 w-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Bone className="h-3.5 w-28" />
                <Bone className="h-3 w-36" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between">
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-12" />
              </div>
              <Bone className="h-[3px] w-full rounded-full" />
            </div>
            <Bone className="mt-4 h-10 w-full rounded-lg" />
          </div>
        </div>
      </section>

      {/* Stats skeleton */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <Bone className="mb-3 h-9 w-9 rounded-lg" />
            <Bone className="h-7 w-16" />
            <Bone className="mt-2 h-3 w-24" />
          </div>
        ))}
      </section>

      {/* Professionals skeleton */}
      <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        <div className="mb-5 flex justify-between">
          <div className="space-y-2">
            <Bone className="h-3 w-16" />
            <Bone className="h-5 w-48" />
          </div>
          <Bone className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-white/[0.06]">
              <Bone className="aspect-[3/4] rounded-none" />
              <div className="p-3 space-y-2">
                <Bone className="h-3.5 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Properties + Onboarding */}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
          <div className="mb-5 space-y-2">
            <Bone className="h-3 w-14" />
            <Bone className="h-5 w-40" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-white/[0.06] p-3">
                <Bone className="h-[68px] w-[84px] shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3.5 w-4/5" />
                  <Bone className="h-3 w-3/5" />
                  <Bone className="h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
          <div className="mb-5 space-y-2">
            <Bone className="h-3 w-12" />
            <Bone className="h-5 w-36" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-white/[0.06] p-3">
                <Bone className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-3 w-3/4" />
                  <Bone className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
