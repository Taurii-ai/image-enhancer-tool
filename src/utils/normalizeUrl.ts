export function normalizeUrl(value: unknown): string {
  if (!value) throw new Error("No URL provided");

  // Already a URL instance
  if (value instanceof URL) return value.href;

  // Plain string
  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("blob:") ||
      value.startsWith("data:")
    ) {
      return value;
    }
    try {
      return new URL(value).href;
    } catch {
      throw new Error("Invalid URL string");
    }
  }

  // Objects often look like { url: "https://..." }
  if (typeof value === "object" && value !== null) {
    const maybe = (value as any).url ?? (value as any).href;
    if (maybe) return normalizeUrl(maybe);
  }

  // Functions sneak in here (your previous bug)
  if (typeof value === "function") {
    throw new Error("Got a function instead of a URL string");
  }

  throw new Error("Unsupported URL type");
}