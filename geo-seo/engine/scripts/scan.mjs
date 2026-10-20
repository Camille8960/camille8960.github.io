import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeOnPageSeo } from "../src/seo.mjs";
import { buildQuestions, askClaude, askChatGPT, analyzeResults } from "../src/geo.mjs";
import { estimateSearchVisibility } from "../src/search-visibility.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const engineRoot = dirname(scriptDir);
const geoSeoRoot = dirname(engineRoot);

const forceMode = process.argv.includes("--force");
// --engines=claude 只掃 Claude；預設 claude,chatgpt 兩邊都掃
const enginesArg = process.argv.find((a) => a.startsWith("--engines="))?.split("=")[1] || "claude,chatgpt";
const engines = new Set(enginesArg.split(",").map((e) => e.trim().toLowerCase()));
const onlyKey = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];

const FREQUENCY_DAYS = { weekly: 7, biweekly: 14, monthly: 30 };

async function main() {
  const config = JSON.parse(await readFile(join(engineRoot, "config.json"), "utf8"));
  const historyPath = join(geoSeoRoot, "data", "history.json");
  const history = await readJsonSafe(historyPath, { exhibitions: {} });

  const today = new Date().toISOString().slice(0, 10);
  const results = [];

  for (const exhibition of config.exhibitions) {
    if (exhibition.status !== "active") continue;
    if (onlyKey && exhibition.key !== onlyKey) continue;

    const record = history.exhibitions[exhibition.key];
    const lastEntry = record?.entries?.[record.entries.length - 1];
    const due = forceMode || shouldScan(lastEntry?.date, exhibition.frequency, today);

    if (!due) {
      console.log(`[跳過] ${exhibition.name}：還沒到期(上次 ${lastEntry?.date ?? "從未"})`);
      continue;
    }

    console.log(`[掃描中] ${exhibition.name} ...`);
    try {
      const entry = await scanOneExhibition(config.company, exhibition, today);
      if (!history.exhibitions[exhibition.key]) {
        history.exhibitions[exhibition.key] = {
          name: exhibition.name,
          name_zh: exhibition.name_zh,
          url: exhibition.url,
          entries: [],
        };
      }
      history.exhibitions[exhibition.key].entries.push(entry);
      results.push({ key: exhibition.key, name: exhibition.name, entry });
      console.log(`[完成] ${exhibition.name}：SEO ${entry.seo.total} / Claude ${entry.geo_claude ? entry.geo_claude.total : '失敗'} / ChatGPT ${entry.geo_chatgpt ? entry.geo_chatgpt.total : (engines.has('chatgpt') ? '失敗' : '略過')}`);
      if (entry.errors && entry.errors.length) {
        console.error(`[部分失敗] ${exhibition.name}：${entry.errors.join(' | ')}`);
        results[results.length - 1].partial_errors = entry.errors;
      }
    } catch (err) {
      console.error(`[失敗] ${exhibition.name}：${err.message}`);
      results.push({ key: exhibition.key, name: exhibition.name, error: err.message });
    }
  }

  await writeFile(historyPath, JSON.stringify(history, null, 2) + "\n");
  console.log(`已寫入 ${historyPath}`);

  const template = await readFile(join(geoSeoRoot, "template.html"), "utf8");
  const rendered = template.replace("__DASHBOARD_DATA__", JSON.stringify(history));
  await writeFile(join(geoSeoRoot, "index.html"), rendered);
  console.log(`已重新產生 ${join(geoSeoRoot, "index.html")}`);

  await writeFile(
    join(engineRoot, "last-run-summary.json"),
    JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2) + "\n",
  );

  const failed = results.filter((r) => r.error || (r.partial_errors && r.partial_errors.length));
  if (failed.length > 0) {
    console.error(`本次有 ${failed.length} 個展會失敗或部分失敗，已保留成功的部分並寫入。`);
    process.exitCode = 1; // 讓 GitHub Actions 標記為失敗，會寄通知信
  }
}

async function scanOneExhibition(company, exhibition, today) {
  const seoFacts = await analyzeOnPageSeo(exhibition.url);
  const searchVisibility = await estimateSearchVisibility(exhibition, company);
  const seoTotal =
    searchVisibility.search_visibility_subscore === null
      ? null
      : round1(seoFacts.onpage_subscore + searchVisibility.search_visibility_subscore);

  const questions = buildQuestions(exhibition);

  // 四個請求各自獨立：某一個失敗不影響其他的結果（花了錢的結果一定要保留）
  const settled = await Promise.allSettled([
    askClaude(questions.generic),
    askClaude(questions.branded),
    engines.has("chatgpt") ? askChatGPT(questions.generic) : Promise.resolve(null),
    engines.has("chatgpt") ? askChatGPT(questions.branded) : Promise.resolve(null),
  ]);
  const [cG, cB, oG, oB] = settled;
  const errors = [];
  const reasonOf = (r) => (r.reason && r.reason.message) || String(r.reason);
  if (cG.status === "rejected") errors.push(`Claude(泛用問法)：${reasonOf(cG)}`);
  if (cB.status === "rejected") errors.push(`Claude(品牌問法)：${reasonOf(cB)}`);
  if (oG.status === "rejected") errors.push(`ChatGPT(泛用問法)：${reasonOf(oG)}`);
  if (oB.status === "rejected") errors.push(`ChatGPT(品牌問法)：${reasonOf(oB)}`);

  // 一個引擎的兩題都成功才算該引擎有資料
  const claudeOk = engines.has("claude") && cG.status === "fulfilled" && cB.status === "fulfilled";
  const chatgptOk = engines.has("chatgpt") && oG.status === "fulfilled" && oB.status === "fulfilled";
  if (!claudeOk && !chatgptOk) {
    throw new Error("沒有任何引擎取得回答：" + errors.join(" | "));
  }

  const claudeAnswers = claudeOk
    ? {
        generic: { question: questions.generic, ...cG.value },
        branded: { question: questions.branded, ...cB.value },
      }
    : null;
  const chatgptAnswers = chatgptOk
    ? {
        generic: { question: questions.generic, ...oG.value },
        branded: { question: questions.branded, ...oB.value },
      }
    : null;

  // 評分失敗也不要丟掉已經拿到的原始回答
  let analysis;
  try {
    analysis = await analyzeResults({ exhibition, company, seoFacts, claudeAnswers, chatgptAnswers });
  } catch (err) {
    errors.push(`評分分析：${err.message}`);
    analysis = { geo_claude: null, geo_chatgpt: null, insight_summary: "", action_items: [] };
  }

  return {
    date: today,
    questions_asked: questions,
    seo: {
      total: seoTotal,
      onpage_subscore: seoFacts.onpage_subscore,
      search_visibility_subscore: searchVisibility.search_visibility_subscore,
      breakdown: {
        ...seoFacts.breakdown,
        keyword_rankings: searchVisibility.keyword_rankings,
        keywords_tracked: searchVisibility.keywords_tracked,
      },
      search_debug: searchVisibility.debug || null,
    },
    geo_claude: claudeAnswers && analysis.geo_claude
      ? {
          ...analysis.geo_claude,
          used_web_search: claudeAnswers.generic.usedSearch || claudeAnswers.branded.usedSearch,
          raw_citations: [...claudeAnswers.generic.citations, ...claudeAnswers.branded.citations],
        }
      : null,
    geo_chatgpt: chatgptAnswers && analysis.geo_chatgpt
      ? {
          ...analysis.geo_chatgpt,
          used_web_search: chatgptAnswers.generic.usedSearch || chatgptAnswers.branded.usedSearch,
          raw_citations: [...chatgptAnswers.generic.citations, ...chatgptAnswers.branded.citations],
        }
      : null,
    insight_summary: analysis.insight_summary,
    action_items: analysis.action_items,
    raw_answers: {
      claude: claudeAnswers,
      chatgpt: chatgptAnswers,
    },
    errors,
  };
}

function shouldScan(lastDate, frequency, todayStr) {
  if (!lastDate) return true;
  const days = FREQUENCY_DAYS[frequency] ?? 14;
  const last = new Date(lastDate + "T00:00:00Z");
  const today = new Date(todayStr + "T00:00:00Z");
  const diffDays = (today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000);
  return diffDays >= days;
}

async function readJsonSafe(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

main().catch((err) => {
  console.error("排程失敗：", err);
  process.exitCode = 1;
});
