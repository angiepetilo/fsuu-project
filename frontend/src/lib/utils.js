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
