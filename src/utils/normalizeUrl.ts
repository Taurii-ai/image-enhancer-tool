// Normalizes anything (string | URL | unknown) to a plain URL string,
// or throws a descriptive error so the UI can handle it.
export function normalizeUrl(value: unknown): string {
  if (!value) throw new Error("No URL provided");

  // Already a URL instance
  if (value instanceof URL) return value.href;

  // Plain string
  if (typeof value === "string") {
    // Be lenient: allow blob:, data:, http(s):
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("blob:") ||
      value.startsWith("data:")
    ) {
      return value;
    }
    // If someone passed "[object Object]" or a function string, fail loudly
    if (value.includes("url() {") || value.includes("[object")) {
      throw new Error("Got a function/object instead of a URL string");
    }
    // As a fallback, try URL parsing, then return .href
    try {
      return new URL(value).href;
    } catch {
      throw new Error("Invalid URL string");
    }
  }

  // Functions sneak in here (your console shows a function body)
  if (typeof value === "function") {
    throw new Error("A function was passed where a URL string was expected");
  }

  // Objects/arrays — try to find a url field
  if (typeof value === "object") {
    const maybe = (value as any)?.url ?? (value as any)?.href ?? null;
    if (maybe) return normalizeUrl(maybe);
  }

  throw new Error("Unsupported URL type");
}