export function normalizeUrl(value: unknown): string {
  if (!value) throw new Error("No URL provided");

  // Already a URL object
  if (value instanceof URL) return value.href;

  // Plain string
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Valid absolute forms
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:")
    ) {
      return trimmed;
    }

    // Relative path → resolve against current origin
    return new URL(trimmed, window.location.origin).href;
  }

  // Object style { url: "..." }
  if (typeof value === "object" && value !== null) {
    const maybe = (value as any).url ?? (value as any).href;
    if (maybe) return normalizeUrl(maybe);
  }

  throw new Error("Unsupported URL type");
}