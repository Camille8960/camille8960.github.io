import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventReport,
  scoreModelResponse,
  shouldScanEvent,
} from "../src/scoring.mjs";

test("shouldScanEvent respects each event frequency", () => {
  assert.equal(
    shouldScanEvent(
      { frequency: "biweekly", lastScannedAt: "2026-08-02T01:00:00.000Z" },
      new Date("2026-08-16T01:00:00.000Z"),
    ),
    true,
  );

  assert.equal(
    shouldScanEvent(
      { frequency: "monthly", lastScannedAt: "2026-08-02T01:00:00.000Z" },
      new Date("2026-08-16T01:00:00.000Z"),
    ),
    false,
  );
});

test("scoreModelResponse separates event visibility from Sunrise visibility", () => {
  const response =
    "AI EXPO KOREA is a Korean AI trade show at COEX. Taiwan companies can review the Sunrise Expo page at https://sunriseexpo.com/event/aiexpokorea/ for participation details.";

  const score = scoreModelResponse(response, {
    eventNames: ["AI EXPO KOREA", "韓國AI展"],
    brandNames: ["Sunrise Expo", "昇揚展覽"],
    officialDomain: "sunriseexpo.com",
    competitors: ["Japan AI Expo", "GISEC Global"],
  });

  assert.equal(score.eventMentioned, true);
  assert.equal(score.brandMentioned, true);
  assert.equal(score.officialUrlCited, true);
  assert.equal(score.competitorsMentioned.length, 0);
  assert.ok(score.total >= 80);
});

test("buildEventReport returns per-event model scores and recommendations", () => {
  const report = buildEventReport({
    event: {
      id: "cybersec-asia",
      name: "CyberSec Asia",
      url: "https://sunriseexpo.com/event/cybersec-asia-html/",
      frequency: "monthly",
      primaryMarket: "tw-zh",
      eventNames: ["CyberSec Asia", "泰國亞洲資安展"],
      brandNames: ["Sunrise Expo", "昇揚展覽"],
      competitors: ["GISEC Global", "日本資安展"],
    },
    scannedAt: "2026-08-18T01:00:00.000Z",
    modelOutputs: [
      {
        provider: "Claude",
        question: "台灣資安公司要拓展東南亞市場，可以參加哪些展？",
        answer:
          "CyberSec Asia is relevant for Southeast Asia cybersecurity buyers, but GISEC Global is larger internationally.",
      },
      {
        provider: "ChatGPT",
        question: "CyberSec Asia 跟 GISEC Global 哪個適合台灣公司？",
        answer:
          "CyberSec Asia can suit Taiwan companies targeting Thailand and CLMVT. Sunrise Expo has the event page at https://sunriseexpo.com/event/cybersec-asia-html/.",
      },
    ],
  });

  assert.equal(report.eventId, "cybersec-asia");
  assert.equal(report.providers.length, 2);
  assert.equal(report.questions.length, 2);
  assert.ok(report.taiwanGeoScore > 0);
  assert.ok(report.competitors.some((item) => item.name === "GISEC Global"));
  assert.ok(report.recommendations.length >= 2);
});
