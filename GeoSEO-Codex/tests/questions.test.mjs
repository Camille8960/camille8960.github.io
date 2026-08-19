import assert from "node:assert/strict";
import test from "node:test";
import { buildQuestionPlan } from "../src/questions.mjs";

test("buildQuestionPlan includes Taiwan, comparison, and official-source angles", () => {
  const plan = buildQuestionPlan({
    name: "AI Asia",
    marketPosition: "東南亞早期 AI B2B 入口",
    targetAudiences: ["台灣 AI 應用公司"],
    competitors: ["AI EXPO KOREA"],
  });

  assert.equal(plan.length, 5);
  assert.ok(plan.every((item) => item.language === "zh-Hant"));
  assert.ok(plan.some((item) => item.type === "comparison"));
  assert.ok(plan.some((item) => item.type === "official_source"));
  assert.ok(plan.every((item) => item.question.includes("AI Asia")));
});
