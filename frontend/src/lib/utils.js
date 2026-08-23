import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function resolveStorageUrl(path) {
  if (!path || path === "#" || typeof path !== "string") return null;
  if (path.startsWith("data:")) return path;

  // Determine current API Base URL
  const apiBase = (import.meta.env.VITE_API_BASE_URL || (typeof window !== "undefined" && window.location.origin.includes("vercel.app") ? "https://fsuu-project.onrender.com" : "http://localhost:8000")).replace(/\/+$/, "");

  // If path contains localhost:8000 or 127.0.0.1:8000, replace with actual apiBase
  if (path.includes("localhost:8000") || path.includes("127.0.0.1:8000")) {
    const storagePart = path.split("/storage/")[1] || path.split("/storage")[1] || "";
    return `${apiBase}/storage/${storagePart.replace(/^\/+/, "")}`;
  }

  // If it is already an HTTPS URL (or cloud storage like Cloudinary/AWS S3), return as is
  if (path.startsWith("https://")) return path;

  // If it is an HTTP URL on render, upgrade to HTTPS
  if (path.startsWith("http://") && path.includes("onrender.com")) {
    return path.replace("http://", "https://");
  }

  // If it is a relative storage path (e.g. "/storage/endorsements/xyz.pdf" or "endorsements/xyz.pdf")
  const cleanPath = path.replace(/^\/?storage\//, "").replace(/^\/+/, "");
  return `${apiBase}/storage/${cleanPath}`;
}

/**
 * Opens any document (PDF, PNG, JPG, WEBP, or Cloudinary raw file) directly in another browser tab
 * WITHOUT downloading it, by converting it to an in-memory typed Blob URL.
 */
export async function openFileInNewTab(url) {
  if (!url) return;

  // 1. Data URL (Base64)
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(",");
      const isPdfDoc = parts[0].includes("pdf");
      const mime = parts[0].match(/:(.*?);/)?.[1] || (isPdfDoc ? "application/pdf" : "image/jpeg");
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      return;
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  }

  // 2. Resolve remote URL
  let resolvedUrl = resolveStorageUrl(url);

  // If Cloudinary raw upload or image PDF, try to fetch as blob with true content type to prevent auto-download
  let newTab = null;
  try {
    newTab = window.open("about:blank", "_blank");

    let response = await fetch(resolvedUrl, { mode: "cors" }).catch(() => null);

    // If Cloudinary returned 401/404 on direct PDF delivery, auto fallback to Cloudinary PNG preview
    if ((!response || !response.ok) && resolvedUrl.includes("res.cloudinary.com") && resolvedUrl.includes("/image/upload/") && resolvedUrl.toLowerCase().includes(".pdf")) {
      const pngUrl = resolvedUrl.replace(/\.pdf(\?.*)?$/i, ".png$1");
      response = await fetch(pngUrl, { mode: "cors" }).catch(() => null);
      if (response && response.ok) {
        resolvedUrl = pngUrl;
      } else if (newTab) {
        newTab.location.href = pngUrl;
        return;
      }
    }

    if (!response || !response.ok) {
      // If server returned 401/403/404, check if it's Cloudinary PDF and use PNG
      if (resolvedUrl.includes("res.cloudinary.com") && resolvedUrl.includes("/image/upload/") && resolvedUrl.toLowerCase().includes(".pdf")) {
        const fallbackPng = resolvedUrl.replace(/\.pdf(\?.*)?$/i, ".png$1");
        if (newTab) newTab.location.href = fallbackPng;
        else window.open(fallbackPng, "_blank", "noopener,noreferrer");
        return;
      }

      if (newTab) {
        newTab.location.href = resolvedUrl;
      } else {
        window.open(resolvedUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Sniff MIME type from file magic byte signatures
    let mimeType = "image/png";
    if (uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46) {
      mimeType = "application/pdf";
    } else if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47) {
      mimeType = "image/png";
    } else if (uint8[0] === 0xFF && uint8[1] === 0xD8 && uint8[2] === 0xFF) {
      mimeType = "image/jpeg";
    } else if (uint8[0] === 0x47 && uint8[1] === 0x49 && uint8[2] === 0x46) {
      mimeType = "image/gif";
    } else if (uint8[0] === 0x52 && uint8[1] === 0x49 && uint8[2] === 0x46 && uint8[3] === 0x46) {
      mimeType = "image/webp";
    } else if (response.headers.get("content-type") && !response.headers.get("content-type").includes("octet-stream")) {
      mimeType = response.headers.get("content-type");
    }

    const blob = new Blob([uint8], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    if (newTab) {
      newTab.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
  } catch {
    // If CORS or network error prevents fetch, check Cloudinary PDF fallback
    if (resolvedUrl.includes("res.cloudinary.com") && resolvedUrl.includes("/image/upload/") && resolvedUrl.toLowerCase().includes(".pdf")) {
      resolvedUrl = resolvedUrl.replace(/\.pdf(\?.*)?$/i, ".png$1");
    }

    if (newTab) {
      newTab.location.href = resolvedUrl;
    } else {
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    }
  }
}
