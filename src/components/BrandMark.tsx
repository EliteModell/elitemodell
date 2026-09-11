import Image from "next/image";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
};

export function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <Image
      src="/brand/elite-modell-logo-transparent.svg"
      alt="Elite Modell"
      width={720}
      height={210}
      priority={priority}
      className={className}
      style={{ display: "block", width: "100%", height: "auto", objectFit: "contain", opacity: 1, filter: "none" }}
    />
  );
}
