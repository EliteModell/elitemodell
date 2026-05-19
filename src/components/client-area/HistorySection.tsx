import Link from "next/link";
import { CirclePlus, UserRound } from "lucide-react";

export default function HistorySection() {
  return (
    <section className="bg-[#e7edf0] px-5 py-12">
      <span className="inline-flex rounded-full bg-[#fff4da] px-4 py-1.5 text-sm font-black text-[#a9822d]">
        exclusivo premium
      </span>
      <h2 className="mt-7 text-[30px] font-black text-[#202a30]">Histórico de perfis</h2>

      <div className="py-16 text-center text-[#617781]">
        <UserRound className="mx-auto h-20 w-20 stroke-[1.7]" />
        <p className="mx-auto mt-7 max-w-[360px] text-[22px] leading-8">
          Você ainda não possui nenhum perfil acessado no seu histórico.
        </p>
        <Link href="/profissionais" className="mt-7 inline-flex items-center gap-2 text-[20px] text-[#617781] underline">
          <CirclePlus className="h-6 w-6" />
          Encontre acompanhantes
        </Link>
      </div>
    </section>
  );
}
