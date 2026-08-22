const DEFAULT_TIMEOUT_MS = 20000;

const CHECKS = [
  ["fetchable", 12],
  ["title", 12],
  ["metaDescription", 14],
  ["h1", 10],
  ["canonical", 8],
  ["structuredData", 12],
  ["internalLinks", 8],
  ["imageAlt", 8],
  ["indexability", 8],
  ["contentDepth", 8],
];

export async function fetchSeoAudit(url, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "SunriseExpo-GeoSEO-Codex/1.0 (+https://sunriseexpo.com/)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await response.text();
    return auditSeoHtml({
      url: response.url || url,
      html,
      status: response.status,
      contentType: response.headers?.get?.("content-type") ?? "",
    });
  } catch (error) {
    return {
      score: 0,
      status: "fetch_error",
      signals: {},
      issues: [`無法抓取頁面：${error?.name === "AbortError" ? "逾時" : "請檢查網址或伺服器回應"}`],
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function auditSeoHtml({ url, html, status = 200, contentType = "" }) {
  const pageUrl = safeUrl(url);
  const source = String(html ?? "");
  const text = visibleText(source);
  const title = decodeHtml(extractFirst(source, /<title[^>]*>([\s\S]*?)<\/title>/i)).trim();
  const description = decodeHtml(extractMeta(source, "description")).trim();
  const canonical = decodeHtml(extractLink(source, "canonical")).trim();
  const h1s = [...source.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => decodeHtml(stripTags(match[1])).trim())
    .filter(Boolean);
  const robots = decodeHtml(extractMeta(source, "robots")).toLowerCase();
  const jsonLdCount = (source.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi) ?? []).length;
  const links = extractLinks(source, pageUrl);
  const images = extractImages(source);

  const signals = {
    fetchable: signal(status >= 200 && status < 400 && isHtml(contentType, source), 12, `HTTP ${status}`),
    title: signal(title.length >= 10 && title.length <= 70, 12, title || "缺少 title"),
    metaDescription: signal(description.length >= 50 && description.length <= 180, 14, description || "缺少 meta description"),
    h1: signal(h1s.length >= 1 && h1s.length <= 2, 10, h1s.length ? `${h1s.length} 個 H1` : "缺少 H1"),
    canonical: signal(Boolean(canonical), 8, canonical || "缺少 canonical"),
    structuredData: signal(jsonLdCount > 0, 12, jsonLdCount ? `${jsonLdCount} 組 JSON-LD` : "缺少 JSON-LD schema"),
    internalLinks: signal(links.internal >= 3, 8, `${links.internal} 個內部連結`),
    imageAlt: signal(images.total === 0 || images.altCoverage >= 0.8, 8, images.total ? `${Math.round(images.altCoverage * 100)}% 圖片有 alt` : "沒有圖片"),
    indexability: signal(!robots.includes("noindex"), 8, robots || "可索引"),
    contentDepth: signal(text.length >= 600, 8, `${text.length} 字元可見文字`),
  };

  const issues = [];
  if (!signals.fetchable.passed) issues.push("頁面無法正常讀取或不是 HTML");
  if (!signals.title.passed) issues.push("title 缺失或長度不佳");
  if (!signals.metaDescription.passed) issues.push("meta description 缺失或長度不足");
  if (!signals.h1.passed) issues.push("H1 缺失或數量異常");
  if (!signals.canonical.passed) issues.push("canonical 缺失");
  if (!signals.structuredData.passed) issues.push("schema 結構化資料缺失");
  if (!signals.internalLinks.passed) issues.push("內部連結不足");
  if (!signals.imageAlt.passed) issues.push("圖片 alt 覆蓋率不足");
  if (!signals.indexability.passed) issues.push("頁面含 noindex");
  if (!signals.contentDepth.passed) issues.push("頁面可見文字內容不足");

  return {
    score: clamp(Object.values(signals).reduce((sum, item) => sum + item.points, 0), 0, 100),
    status: "scored",
    signals,
    issues,
    summary: {
      title,
      metaDescription: description,
      visibleTextSample: text.slice(0, 5000),
      h1Count: h1s.length,
      canonical,
      jsonLdCount,
      internalLinks: links.internal,
      externalLinks: links.external,
      imageCount: images.total,
      imageAltCoverage: images.altCoverage,
      visibleTextLength: text.length,
    },
  };
}

function signal(passed, maxPoints, detail) {
  return { passed, points: passed ? maxPoints : 0, maxPoints, detail };
}

function extractFirst(source, pattern) {
  return source.match(pattern)?.[1] ?? "";
}

function extractMeta(source, name) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escapeRegExp(name)}["'])[^>]*>`, "i");
  return extractAttribute(source.match(pattern)?.[0] ?? "", "content");
}

function extractLink(source, rel) {
  const pattern = new RegExp(`<link\\b(?=[^>]*rel=["'][^"']*${escapeRegExp(rel)}[^"']*["'])[^>]*>`, "i");
  return extractAttribute(source.match(pattern)?.[0] ?? "", "href");
}

function extractAttribute(tag, name) {
  const pattern = new RegExp(`${name}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1] ?? "";
}

function extractLinks(source, pageUrl) {
  const host = pageUrl?.hostname ?? "";
  let internal = 0;
  let external = 0;

  for (const match of source.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const linked = safeUrl(href, pageUrl);
    if (!linked) continue;
    if (!linked.hostname || linked.hostname === host) internal += 1;
    else external += 1;
  }

  return { internal, external };
}

function extractImages(source) {
  const images = [...source.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  if (!images.length) return { total: 0, withAlt: 0, altCoverage: 1 };
  const withAlt = images.filter((tag) => extractAttribute(tag, "alt").trim().length > 0).length;
  return { total: images.length, withAlt, altCoverage: withAlt / images.length };
}

function visibleText(source) {
  return decodeHtml(source)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ");
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#039;/gi, "'");
}

function isHtml(contentType, source) {
  return !contentType || contentType.includes("html") || /^\s*<!doctype html|<html[\s>]/i.test(source);
}

function safeUrl(value, base) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
