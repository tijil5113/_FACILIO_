export const APP_NAME = "FACILIO";
export const APP_TAGLINE = "Understand and clean data safely";
export const APP_VERSION = "0.1.0";

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, "");
  }
  return "";
}
