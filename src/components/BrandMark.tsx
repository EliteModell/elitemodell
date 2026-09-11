import Image from "next/image";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  variant?: "symbol" | "full";
};

export function BrandMark({ className, priority = false, variant = "symbol" }: BrandMarkProps) {
  const isFullLogo = variant === "full";

  return (
    <Image
      src={
        isFullLogo
          ? "/brand/elite-modell-official-v20260911.jpg"
          : "/brand/elite-modell-symbol-v20260911.png"
      }
      alt="Elite Modell"
      width={isFullLogo ? 1254 : 734}
      height={isFullLogo ? 1254 : 734}
      priority={priority}
      className={className}
      style={{ display: "block", width: "100%", height: "auto", objectFit: "contain", opacity: 1, filter: "none" }}
    />
  );
}
