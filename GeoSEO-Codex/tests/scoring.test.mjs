import assert from "node:assert/strict";
import test from "node:test";
import { buildEventReport, scoreModelResponse, shouldScanEvent } from "../src/scoring.mjs";

test("shouldScanEvent respects event frequency", () => {
  assert.equal(shouldScanEvent({ frequency: "biweekly", lastScannedAt: "2026-08-02T01:00:00.000Z" }, new Date("2026-08-16T01:00:00.000Z")), true);
  assert.equal(shouldScanEvent({ frequency: "monthly", lastScannedAt: "2026-08-02T01:00:00.000Z" }, new Date("2026-08-16T01:00:00.000Z")), false);
});

test("scoreModelResponse tracks event, brand, official URL, and competitors separately", () => {
  const score = scoreModelResponse(
    "AI EXPO KOREA is relevant. Sunrise Expo provides details at https://sunriseexpo.com/event/aiexpokorea/.",
    {
      eventNames: ["AI EXPO KOREA", "韓國AI展"],
      brandNames: ["Sunrise Expo", "昇揚展覽"],
      officialDomain: "sunriseexpo.com",
      competitors: ["Japan AI Expo"],
    },
  );

  assert.equal(score.eventMentioned, true);
  assert.equal(score.brandMentioned, true);
  assert.equal(score.officialUrlCited, true);
  assert.deepEqual(score.competitorsMentioned, []);
  assert.ok(score.total >= 80);
});

test("buildEventReport uses real SEO audit output instead of metadata estimates", () => {
  const report = buildEventReport({
    event: {
      id: "cybersec-asia",
      name: "CyberSec Asia",
      url: "https://sunriseexpo.com/event/cybersec-asia-html/",
      frequency: "monthly",
      marketPosition: "泰國與 CLMVT 資安市場入口",
      targetAudiences: ["台灣資安公司"],
      eventNames: ["CyberSec Asia", "泰國亞洲資安展"],
      brandNames: ["Sunrise Expo", "昇揚展覽"],
      competitors: ["GISEC Global"],
    },
    scannedAt: "2026-08-19T01:00:00.000Z",
    seoAudit: {
      score: 47,
      status: "scored",
      signals: { title: { passed: false, points: 0, maxPoints: 12, detail: "缺少 title" } },
      issues: ["title 缺失或長度不佳"],
      summary: { title: "" },
    },
    modelOutputs: [
      { provider: "Claude", question: "CyberSec Asia 是什麼？", questionType: "direct_event", answer: "CyberSec Asia is useful for Thailand. GISEC Global is larger." },
      { provider: "ChatGPT", question: "官方來源？", questionType: "official_source", answer: "CyberSec Asia info is available from Sunrise Expo at https://sunriseexpo.com/event/cybersec-asia-html/." },
    ],
  });

  assert.equal(report.eventId, "cybersec-asia");
  assert.equal(report.providers.length, 2);
  assert.ok(report.taiwanGeoScore > 0);
  assert.equal(report.seoScore, 47);
  assert.equal(report.seoStatus, "scored");
  assert.deepEqual(report.seoIssues, ["title 缺失或長度不佳"]);
  assert.ok(report.recommendations.some((item) => item.includes("SEO：title 缺失或長度不佳")));
  assert.ok(report.competitors.some((item) => item.name === "GISEC Global"));
});
