import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionPlan } from "../src/questions.mjs";

test("buildQuestionPlan creates Taiwan-first questions for the selected event", () => {
  const plan = buildQuestionPlan({
    name: "AI Asia",
    marketPosition: "東南亞早期 AI B2B 入口",
    targetAudiences: ["台灣 AI 應用公司", "GPU/伺服器基礎設施商"],
    competitors: ["AI EXPO KOREA", "日本 AI Expo"],
  });

  assert.ok(plan.some((item) => item.language === "zh-Hant"));
  assert.ok(plan.some((item) => item.type === "競爭比較型"));
  assert.ok(plan.every((item) => item.question.includes("AI Asia")));
  assert.ok(
    plan.some((item) => item.question.includes("AI EXPO KOREA")),
    "competition questions should include configured competitors",
  );
});
