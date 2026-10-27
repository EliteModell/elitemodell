import {
  MAX_PROFILE_VIDEO_BYTES,
  profileVideoDurationError,
} from "@/lib/video-duration-policy";

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
      const finish = (value: number | null) => {
        video.removeAttribute("src");
        video.load();
        resolve(value);
      };
      video.onloadedmetadata = () => finish(
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null,
      );
      video.onerror = () => finish(null);
      video.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateProfileVideoInBrowser(file: File) {
  if (!PROFILE_VIDEO_MIME_TYPES.has(file.type)) {
    return { duration: null, error: "Escolha um vídeo MP4, WebM ou MOV." };
  }
  if (file.size > MAX_PROFILE_VIDEO_BYTES) {
    return { duration: null, error: "Cada vídeo pode ter no máximo 50 MB." };
  }
  const duration = await readBrowserVideoDuration(file);
  return { duration, error: duration === null ? null : profileVideoDurationError(duration) };
}
