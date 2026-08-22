import assert from "node:assert/strict";
import test from "node:test";
import { auditSeoHtml } from "../src/seo.mjs";

test("auditSeoHtml scores real page SEO signals from HTML", () => {
  const html = `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <title>AI EXPO KOREA 台灣參展窗口｜Sunrise Expo</title>
        <meta name="description" content="AI EXPO KOREA 韓國人工智慧展台灣參展資訊，包含展會亮點、適合產業、買主輪廓與昇揚展覽官方參展窗口。">
        <link rel="canonical" href="https://sunriseexpo.com/event/aiexpokorea/">
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Event","name":"AI EXPO KOREA"}</script>
      </head>
      <body>
        <h1>AI EXPO KOREA 韓國人工智慧展</h1>
        <p>${"台灣 AI、Edge AI、半導體、機器視覺與智慧製造企業可透過 Sunrise Expo 評估參展、買主媒合與韓國市場切入。".repeat(18)}</p>
        <a href="https://sunriseexpo.com/event/aiexpokorea/apply/">參展報名</a>
        <a href="/contact/">聯絡我們</a>
        <a href="/event/">更多展會</a>
        <a href="https://www.aiexpo.co.kr/">韓國主辦單位</a>
        <img src="booth.jpg" alt="AI EXPO KOREA 展位示意">
        <img src="buyers.jpg" alt="韓國 AI 買主交流">
      </body>
    </html>`;

  const audit = auditSeoHtml({
    url: "https://sunriseexpo.com/event/aiexpokorea/",
    html,
    status: 200,
  });

  assert.equal(audit.status, "scored");
  assert.ok(audit.score >= 90);
  assert.equal(audit.signals.title.passed, true);
  assert.equal(audit.signals.metaDescription.passed, true);
  assert.equal(audit.signals.structuredData.passed, true);
  assert.equal(audit.signals.imageAlt.passed, true);
});

test("auditSeoHtml reports concrete issues for weak pages", () => {
  const audit = auditSeoHtml({
    url: "https://sunriseexpo.com/event/weak/",
    html: "<html><head><title>AI</title></head><body><h1></h1><img src=\"x.jpg\"></body></html>",
    status: 200,
  });

  assert.equal(audit.status, "scored");
  assert.ok(audit.score < 55);
  assert.ok(audit.issues.includes("meta description 缺失或長度不足"));
  assert.ok(audit.issues.includes("圖片 alt 覆蓋率不足"));
});
