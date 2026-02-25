const MATTERS_SUFFIX_RE = /\s*[-–—]\s*豆泥\s*[-–—]\s*matters\s*$/iu;

export function cleanPostTitle(title: string): string {
  return title.replace(MATTERS_SUFFIX_RE, "").trim();
}
