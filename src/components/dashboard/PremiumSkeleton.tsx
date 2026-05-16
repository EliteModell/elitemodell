export default function PremiumSkeleton() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="premium-shimmer absolute inset-0" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="h-6 w-44 rounded-full bg-white/10" />
            <div className="mt-6 h-11 w-3/4 rounded-[8px] bg-white/10" />
            <div className="mt-3 h-11 w-1/2 rounded-[8px] bg-white/10" />
            <div className="mt-6 h-4 w-2/3 rounded-full bg-white/8" />
          </div>
          <div className="h-44 rounded-[8px] border border-white/8 bg-black/20" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
            <div className="h-11 w-11 rounded-[8px] bg-white/10" />
            <div className="mt-8 h-7 w-20 rounded-[8px] bg-white/10" />
            <div className="mt-3 h-4 w-28 rounded-full bg-white/8" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="h-96 rounded-[8px] border border-white/10 bg-white/[0.04]" />
        <div className="h-96 rounded-[8px] border border-white/10 bg-white/[0.04]" />
      </section>
    </div>
  );
}
