// 真實抓取展會頁面，分析 on-page 技術面 SEO 訊號。
// 這一段完全不需要呼叫任何 AI，純粹是抓 HTML 分析結構，
// 在 GitHub Actions 的環境裡跑，不受 Claude 沙盒的網路白名單限制。

export async function analyzeOnPageSeo(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SunriseGeoSeoBot/1.0)" },
  });
  if (!res.ok) {
    throw new Error(`抓取 ${url} 失敗：HTTP ${res.status}`);
  }
  const html = await res.text();

  const title = matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc = matchOne(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i,
  ) || matchOne(html, /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);

  const h1s = matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  const h2s = matchAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  const h3s = matchAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi);

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgsWithAlt = imgTags.filter((tag) => /alt=["'][^"']+["']/i.test(tag));
  const altCoverage = imgTags.length ? imgsWithAlt.length / imgTags.length : null;

  const hasJsonLdSchema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const hasMicrodataSchema = /itemtype=["']https?:\/\/schema\.org\//i.test(html);
  const hasSchema = hasJsonLdSchema || hasMicrodataSchema;

  const titleQuality = scoreTitle(title);
  const metaQuality = scoreMeta(metaDesc);
  const headingQuality = scoreHeadings(h1s, h2s, h3s);
  const altQuality = altCoverage === null ? 5 : Math.round(altCoverage * 10);
  const schemaQuality = hasSchema ? 10 : 0;

  const onpageSubscore =
    ((titleQuality + metaQuality + headingQuality + altQuality + schemaQuality) / 50) * 40;

  return {
    onpage_subscore: round1(onpageSubscore),
    breakdown: {
      title_quality: titleQuality,
      meta_desc_quality: metaQuality,
      heading_structure: headingQuality,
      image_alt_coverage: altQuality,
      structured_data: schemaQuality,
    },
    raw: {
      title,
      meta_description: metaDesc,
      h1_count: h1s.length,
      h2_count: h2s.length,
      h3_count: h3s.length,
      image_count: imgTags.length,
      images_with_alt: imgsWithAlt.length,
      has_schema_org: hasSchema,
    },
  };
}

function scoreTitle(title) {
  if (!title) return 0;
  const len = title.trim().length;
  if (len === 0) return 0;
  if (len < 10) return 4;
  if (len > 70) return 6;
  return 9;
}

function scoreMeta(meta) {
  if (!meta) return 0;
  const len = meta.trim().length;
  if (len === 0) return 0;
  if (len < 40) return 4;
  if (len > 200) return 6;
  return 9;
}

function scoreHeadings(h1s, h2s, h3s) {
  let score = 0;
  if (h1s.length === 1) score += 5;
  else if (h1s.length > 1) score += 2;
  if (h2s.length >= 2) score += 3;
  if (h3s.length >= 1) score += 2;
  return Math.min(score, 10);
}

function matchOne(html, regex) {
  const m = html.match(regex);
  return m ? decodeEntities(stripTags(m[1])).trim() : null;
}

function matchAll(html, regex) {
  return [...html.matchAll(regex)].map((m) => decodeEntities(stripTags(m[1])).trim());
}

function stripTags(str) {
  return String(str).replace(/<[^>]+>/g, " ");
}

function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
