import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildQuestionPlan } from "../src/questions.mjs";
import { buildEventReport, shouldScanEvent } from "../src/scoring.mjs";
import { fetchSeoAudit } from "../src/seo.mjs";
import { buildMockAnswer, callAnthropic, callOpenAI } from "../src/providers.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mockMode = process.argv.includes("--mock");
const forceMode = process.argv.includes("--force");
const eventsConfig = JSON.parse(await readFile(join(root, "events.json"), "utf8"));
const previous = await readPreviousResults();
const scannedAt = new Date().toISOString();
const reports = [];

for (const event of eventsConfig.events) {
  const previousReport = previous.mode === "api"
    ? previous.reports?.find((report) => report.eventId === event.id)
    : null;
  const eventWithHistory = { ...event, lastScannedAt: previousReport?.scannedAt };

  if (!forceMode && !mockMode && !shouldScanEvent(eventWithHistory, new Date(scannedAt))) {
    reports.push(previousReport);
    continue;
  }

  const page = await fetchPage(event.url);
  const seoAudit = mockMode
    ? null
    : page.seoAudit;
  const modelOutputs = [];

  for (const question of buildQuestionPlan(event)) {
    for (const provider of ["Claude", "ChatGPT"]) {
      const answer = mockMode
        ? buildMockAnswer({ provider, event, question: question.question })
        : await callProvider(provider, { question: question.question, event, pageSummary: page.summary });

      modelOutputs.push({
        provider,
        question: question.question,
        questionType: question.type,
        language: question.language,
        answer,
      });
    }
  }

  reports.push(buildEventReport({ event, scannedAt, modelOutputs, seoAudit }));
}

const output = {
  generatedAt: scannedAt,
  mode: mockMode ? "mock" : "api",
  message: mockMode ? "這是 mock 掃描；正式分數需使用 API 模式。" : "正式 Claude / ChatGPT API 掃描結果。",
  reports: reports.filter(Boolean),
};

await mkdir(join(root, "data"), { recursive: true });
await writeFile(join(root, "data", "latest-results.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.reports.length} reports to data/latest-results.json`);

async function callProvider(provider, input) {
  if (provider === "Claude") return callAnthropic(input);
  return callOpenAI(input);
}

async function fetchPage(url) {
  const seoAudit = await fetchSeoAudit(url);
  return {
    seoAudit,
    summary: summarizeSeoAudit(seoAudit),
  };
}

function summarizeSeoAudit(seoAudit) {
  const summary = seoAudit?.summary ?? {};
  const issueText = (seoAudit?.issues ?? []).slice(0, 6).join("；");
  return [
    summary.title,
    summary.metaDescription,
    summary.visibleTextSample,
    `SEO score: ${seoAudit?.score ?? 0}`,
    issueText ? `SEO issues: ${issueText}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 6000);
}

async function readPreviousResults() {
  try {
    return JSON.parse(await readFile(join(root, "data", "latest-results.json"), "utf8"));
  } catch {
    return { reports: [] };
  }
}
