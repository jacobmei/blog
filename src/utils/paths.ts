export function withBase(path = ""): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const normalizedPath = path.replace(/^\/+/, "");
  if (!normalizedPath) return base;

  return `${base}${normalizedPath}`;
}
