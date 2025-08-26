export function normalizeUrl(value: unknown): string {
  if (!value) throw new Error("No URL provided");

  // Already a URL
  if (value instanceof URL) return value.href;

  // Plain string
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Already usable as src
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:")
    ) {
      return trimmed;
    }

    // Relative URL from backend → make it absolute
    if (trimmed.startsWith("/")) {
      return `${window.location.origin}${trimmed}`;
    }

    // Handle bare keys (like "image-enhancer-tool-4pd2...") by treating them as relative
    if (/^[a-zA-Z0-9_\-]/.test(trimmed)) {
      return `${window.location.origin}/${trimmed}`;
    }

    throw new Error(`Invalid URL string: "${trimmed}"`);
  }

  // Object style { url: "..." }
  if (typeof value === "object" && value !== null) {
    const maybe = (value as any).url ?? (value as any).href;
    if (maybe) return normalizeUrl(maybe);
  }

  throw new Error("Unsupported URL type");
}