"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import Navbar from "@/components/Navbar";
import { controlledMediaAssetId, controlledMediaVariantUrl } from "@/lib/public-professional-media";
import {
  readProfessionalNavigationPreview,
  subscribeProfessionalNavigationPreview,
} from "@/lib/professional-navigation-preview";
import styles from "@/app/profissionais/[slug]/profile.module.css";

function slugFromPathname(pathname: string) {
  const match = pathname.match(/^\/profissionais\/([^/?#]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function ProfessionalProfileTransition({ slug }: { slug?: string }) {
  const pathname = usePathname();
  const resolvedSlug = slug ?? slugFromPathname(pathname);
  const preview = useSyncExternalStore(
    subscribeProfessionalNavigationPreview,
    () => readProfessionalNavigationPreview(resolvedSlug),
    () => null,
  );
  const previewImage = preview?.image ? controlledMediaVariantUrl(preview.image, "card") : null;

  return (
    <div className={styles.transitionPage}>
      <Navbar />
      <div className={styles.previewCover} data-testid="profile-navigation-preview">
        {previewImage ? (
          <Image src={previewImage} alt="" fill
            unoptimized={Boolean(controlledMediaAssetId(preview?.image))}
            loading="eager" fetchPriority="high" sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 15%" }} />
        ) : null}
        <div className={styles.previewShade} />
        <div className={styles.previewIdentity}>
          <h1>{preview?.displayName ?? "Abrindo perfil"}</h1>
          <span>{preview?.city ? `${preview.city}${preview.state ? `, ${preview.state}` : ""}` : "Perfil verificado Elite Modell"}</span>
        </div>
      </div>
      <div className={styles.previewSummary}>
        <div className={styles.previewAvatar}>
          {previewImage ? (
            <Image src={previewImage} alt="" fill
              unoptimized={Boolean(controlledMediaAssetId(preview?.image))}
              loading="eager" sizes="84px"
              style={{ objectFit: "cover", objectPosition: "top" }} />
          ) : null}
        </div>
        <div className={styles.previewDetails} aria-label="Carregando dados do perfil">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
