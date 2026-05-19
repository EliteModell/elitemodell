export default function AppRouteLoading() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-[760px]">
        <div className="mb-5 h-11 w-40 rounded-[8px] bg-white/[0.07]" />
        <div className="rounded-[10px] border border-[#d4a843]/14 bg-white/[0.035] p-5">
          <div className="h-6 w-2/3 rounded-full bg-white/[0.08]" />
          <div className="mt-4 h-4 w-5/6 rounded-full bg-white/[0.06]" />
          <div className="mt-2 h-4 w-1/2 rounded-full bg-white/[0.06]" />
        </div>
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-[10px] border border-white/8 bg-white/[0.045]" />
          ))}
        </div>
      </div>
    </div>
  );
}
