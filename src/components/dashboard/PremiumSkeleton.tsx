export default function PremiumSkeleton() {
  return (
    <div className="premium-enter space-y-6">
      <section className="premium-surface relative overflow-hidden rounded-[8px] p-5 sm:p-7">
        <div className="premium-shimmer absolute inset-0" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="premium-skeleton h-6 w-44 rounded-full" />
            <div className="premium-skeleton mt-6 h-11 w-3/4 rounded-[8px]" />
            <div className="premium-skeleton mt-3 h-11 w-1/2 rounded-[8px]" />
            <div className="premium-skeleton mt-6 h-4 w-2/3 rounded-full" />
          </div>
          <div className="premium-skeleton h-44 rounded-[8px] border border-white/8" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="premium-card h-40 rounded-[8px] p-4">
            <div className="premium-skeleton h-11 w-11 rounded-[8px]" />
            <div className="premium-skeleton mt-8 h-7 w-20 rounded-[8px]" />
            <div className="premium-skeleton mt-3 h-4 w-28 rounded-full" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="premium-skeleton h-96 rounded-[8px] border border-white/10" />
        <div className="premium-skeleton h-96 rounded-[8px] border border-white/10" />
      </section>
    </div>
  );
}
