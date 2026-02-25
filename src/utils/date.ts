import { SITE_TIMEZONE } from "@/site.config";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: SITE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}
