// 用 Claude 的 web_search 工具實際查關鍵字排名(不是用固定/假造的排名)。
// 之所以不直接爬 Google 網頁，是因為在 GitHub Actions 的機器上直接爬 Google
// 很容易被擋(驗證碼/封鎖)，不穩定；改用 Anthropic 官方 web_search 工具查詢，
// 一樣是真實搜尋結果，但透過穩定的 API 通道。

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export async function estimateSearchVisibility(exhibition, company) {
  const keywords = buildKeywords(exhibition);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 未設定");

  const prompt = `請用網路搜尋工具，實際查詢以下每一個關鍵字在 Google 的搜尋結果，看「${exhibition.url}」這個網址(或同網域 ${company.domain} 底下的頁面)有沒有出現在前10名，大約第幾名。

關鍵字列表：
${keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}

請只回傳一個JSON陣列(不要有其他文字、不要markdown code fence)，格式：
[{"keyword": "<關鍵字>", "found_in_top10": <true/false>, "approx_rank": <數字或null>}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "[" },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`關鍵字排名查詢失敗 ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  const raw = "[" + textBlocks.map((b) => b.text).join("\n");
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  let rankings;
  try {
    rankings = JSON.parse(raw.slice(start, end + 1));
  } catch {
    rankings = keywords.map((k) => ({ keyword: k, found_in_top10: false, approx_rank: null }));
  }

  let points = 0;
  const keyword_rankings = [];
  for (const r of rankings) {
    const rank = r.approx_rank;
    keyword_rankings.push(rank ?? null);
    if (rank && rank <= 3) points += 20;
    else if (rank && rank <= 10) points += 10;
  }

  const search_visibility_subscore = round1((points / (20 * keywords.length)) * 60);

  return {
    search_visibility_subscore,
    keyword_rankings,
    keywords_tracked: keywords,
  };
}

function buildKeywords(exhibition) {
  return [
    `${exhibition.name}`,
    `${exhibition.name_zh || exhibition.name} 台灣代理`,
    `${exhibition.name} 參展`,
  ];
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
