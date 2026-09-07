// Trailing slash trimmed because every caller passes a path that starts with
// one, and "https://api.example.com/" would otherwise produce "//chat/". Some
// hosts serve that as a redirect, which drops the Authorization header.
const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export const wsUrl = (path: string) =>
  `${API_BASE.replace(/^http/, "ws")}${path}`;

/**
 * Idle clip that loops on the stage until the live avatar takes over. Served
 * from public/, so it needs re-exporting from Simli if SIMLI_FACE_ID changes -
 * otherwise the loop and the live avatar are different people.
 */
export const IDLE_VIDEO_URL =
  import.meta.env.VITE_IDLE_VIDEO_URL ?? "/avatar-idle.mp4";
