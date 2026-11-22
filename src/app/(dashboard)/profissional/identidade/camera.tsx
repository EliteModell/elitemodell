"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./wizard.module.css";

export default function Camera({ facing, onPhoto, close }: {
  facing: "user" | "environment";
  onPhoto: (file: File) => void;
  close: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (cancelled || !video.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.current.srcObject = stream;
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facing]);

  function capture() {
    const element = video.current;
    if (!element?.videoWidth || !element.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(element, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onPhoto(new File([blob], "captura.jpg", { type: "image/jpeg" }));
      else setError(true);
    }, "image/jpeg", 0.94);
  }

  return <div className={styles.cameraPanel}>
    {error ? <p role="alert">Câmera indisponível. Confira as permissões do navegador e tente novamente.</p> : <>
      <div className={styles.liveFrame}>
        <video ref={video} autoPlay muted playsInline onPlaying={() => setReady(true)} aria-label="Prévia da câmera" />
        <div aria-hidden="true" />
      </div>
      <button type="button" disabled={!ready} onClick={capture}>Tirar foto</button>
    </>}
    <button type="button" className={styles.secondary} onClick={close}>Fechar câmera</button>
  </div>;
}
