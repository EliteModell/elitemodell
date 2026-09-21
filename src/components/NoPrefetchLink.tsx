import NextLink from "next/link";
import type { ComponentProps } from "react";

export function NoPrefetchLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
