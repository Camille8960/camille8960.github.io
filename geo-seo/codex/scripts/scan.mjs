import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuestionPlan } from "../src/questions.mjs";
import { buildEventReport, shouldScanEvent } from "../src/scoring.mjs";
import { buildMockAnswer, callAnthropic, callOpenAI } from "../src/providers.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mockMode = process.argv.includes("--mock");
const forceMode = process.argv.includes("--force");

const eventsConfig = JSON.parse(await readFile(join(root, "events.json"), "utf8"));
const previous = await readPreviousResults();
const scannedAt = new Date().toISOString();

const reports = [];
const previousApiResultsAreUsable = previous.mode === "api";

for (const event of eventsConfig.events) {
  const previousReport = previous.reports?.find((report) => report.eventId === event.id);
  const eventWithHistory = {
    ...event,
    lastScannedAt: previousApiResultsAreUsable ? previousReport?.scannedAt : null,
  };

  if (!forceMode && !shouldScanEvent(eventWithHistory, new Date(scannedAt))) {
    reports.push(previousReport);
    continue;
  }

  const pageSummary = await fetchPageSummary(event.url);
  const questions = buildQuestionPlan(event);
  const modelOutputs = [];

  for (const question of questions) {
    for (const provider of ["Claude", "ChatGPT"]) {
      const answer = mockMode
        ? buildMockAnswer({ provider, event, question: question.question })
        : await callProvider(provider, {
            question: question.question,
            event,
            pageSummary,
          });

      modelOutputs.push({
        provider,
        question: question.question,
        questionType: question.type,
        language: question.language,
        answer,
      });
    }
  }

  reports.push(buildEventReport({ event, scannedAt, modelOutputs }));
}

const output = {
  generatedAt: scannedAt,
  mode: mockMode ? "mock" : "api",
  message: mockMode
    ? "這是 mock 掃描，用於測試 dashboard 流程；正式分數需使用 API 模式。"
    : "正式 Claude / ChatGPT API 掃描結果。",
  reports: reports.filter(Boolean),
};

await mkdir(join(root, "data"), { recursive: true });
await writeFile(join(root, "data", "latest-results.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.reports.length} reports to data/latest-results.json`);

async function callProvider(provider, input) {
  if (provider === "Claude") return callAnthropic(input);
  return callOpenAI(input);
}

async function fetchPageSummary(url) {
  const response = await fetch(url);
  if (!response.ok) return "";
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readPreviousResults() {
  try {
    return JSON.parse(await readFile(join(root, "data", "latest-results.json"), "utf8"));
  } catch {
    return { reports: [] };
  }
}
