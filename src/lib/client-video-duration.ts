import { profileVideoDurationError } from "@/lib/video-duration-policy";

export const PROFILE_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export async function readBrowserVideoDuration(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    return await new Promise<number | null>((resolve) => {
      const timeout = window.setTimeout(() => finish(null), 12_000);
      const finish = (value: number | null) => {
        window.clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        video.pause();
        video.removeAttribute("src");
        resolve(value);
      };
      video.onloadedmetadata = () => finish(
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null,
      );
      video.onerror = () => finish(null);
      try {
        video.src = objectUrl;
      } catch (cause) {
        console.error("[video-metadata] Safari não aceitou a URL temporária.", cause);
        finish(null);
      }
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateProfileVideoInBrowser(file: File) {
  if (!PROFILE_VIDEO_MIME_TYPES.has(file.type)) {
    return { duration: null, error: "Escolha um vídeo MP4, WebM ou MOV." };
  }
  const duration = await readBrowserVideoDuration(file);
  return { duration, error: duration === null ? null : profileVideoDurationError(duration) };
}
