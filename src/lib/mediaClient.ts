// Client-side media helpers: convert image→WebP, video→WebM, then upload to /api/upload.
// convertVideoToWebM lazy-loads @ffmpeg/ffmpeg so it doesn't bloat the initial bundle.

import { ADMIN_PASSWORD_KEY, ADMIN_USERNAME_KEY } from "./constants";

// ── Image → WebP via Canvas ───────────────────────────────────────────────────

export function convertImageToWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context not available")); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("WebP conversion failed"))),
        "image/webp",
        quality,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.src = objectUrl;
  });
}

// ── Video → WebM via ffmpeg.wasm (lazy-loaded) ────────────────────────────────
//
// Uses the single-threaded @ffmpeg/core (not -mt) — no COOP/COEP headers needed.
// Core (~31 MB) is fetched from unpkg on first use; subsequent calls reuse the cached blob URL.
//
// For faster encoding with multi-threading, swap the baseURL to:
//   https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm
// and add these headers to public/_headers for /admin/* routes:
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: require-corp

export async function convertVideoToWebM(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(Math.round(progress * 100)));
  }

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const inputName = `input.${ext}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec([
    "-i", inputName,
    "-c:v", "libvpx-vp9",
    "-crf", "33",
    "-b:v", "0",
    "-c:a", "libopus",
    "-b:a", "96k",
    "output.webm",
  ]);

  const raw = await ffmpeg.readFile("output.webm");
  await ffmpeg.terminate();

  const bytes = raw instanceof Uint8Array ? raw : new TextEncoder().encode(raw as string);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "video/webm" });
}

// ── Upload to /api/upload ─────────────────────────────────────────────────────

export async function uploadMedia(
  blob: Blob,
  folder: string,
  filenameBase: string,
): Promise<{ url: string; key: string; contentType: string }> {
  const username = localStorage.getItem(ADMIN_USERNAME_KEY) ?? "";
  const password = localStorage.getItem(ADMIN_PASSWORD_KEY) ?? "";

  const mimeToExt: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "video/webm": "webm",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
  };
  const ext = mimeToExt[blob.type] ?? "bin";
  const fd = new FormData();
  fd.append("file", new File([blob], `${filenameBase}.${ext}`, { type: blob.type }));
  fd.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "x-admin-username": username,
      "x-admin-password": password,
    },
    body: fd,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error((body.error as string | undefined) ?? `Upload failed (${res.status})`);
  }

  return res.json() as Promise<{ url: string; key: string; contentType: string }>;
}
