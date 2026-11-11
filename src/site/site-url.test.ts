import { describe, expect, it } from "vitest";
import html from "../../index.html?raw";
import { DOMAIN, fillSiteUrl, SITE_URL, SITE_URL_TOKEN } from "./site-url";

describe("site address", () => {
  it("is a bare domain served from the root", () => {
    expect(DOMAIN).toMatch(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);
    expect(SITE_URL).toBe(`https://${DOMAIN}/`);
  });

  it("is never hard-coded in index.html", () => {
    expect(html).not.toContain("github.io");
    expect(html).not.toContain(DOMAIN);
    expect(html).toContain(SITE_URL_TOKEN);
  });

  it("fills every preview tag in index.html", () => {
    const filled = fillSiteUrl(html);
    expect(filled).not.toContain(SITE_URL_TOKEN);
    expect(filled).toContain(`<link rel="canonical" href="${SITE_URL}" />`);
    expect(filled).toContain(`content="${SITE_URL}og.jpg"`);
    expect(filled).toContain(`content="${SITE_URL}card.jpg"`);
  });
});
