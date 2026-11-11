export const DOMAIN = "arena.chowderr.dev";
export const SITE_URL = `https://${DOMAIN}/`;
export const SITE_URL_TOKEN = "%SITE_URL%";

export function fillSiteUrl(html: string): string {
  return html.split(SITE_URL_TOKEN).join(SITE_URL);
}
