// 用 Google Custom Search JSON API 查「真正的 Google 排名」。
// 舊版用 Claude 的 web_search 工具去猜排名，但 Claude 的搜尋後端跟真正的
// Google 搜尋(含台灣在地化、AI Overview)不是同一套索引，查出來的名次會跟
// 使用者自己在 Google 上看到的不一樣。改成直接打 Google 官方的
// Custom Search API，才能拿到跟真人搜尋一致的排名。
//
// 需要兩個環境變數：
//   GOOGLE_SEARCH_API_KEY - Google Cloud 申請的 API 金鑰
//   GOOGLE_SEARCH_CX      - Programmable Search Engine 的搜尋引擎 ID

export async function estimateSearchVisibility(exhibition, company) {
  const keywords = buildKeywords(exhibition);
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    // 沒設定 Google 搜尋 API 金鑰時，不要假裝有查，明確標記「未檢測」，
    // 分數用 null 表示，而不是誤導性的 0 分。
    return {
      search_visibility_subscore: null,
      keyword_rankings: keywords.map(() => null),
      keywords_tracked: keywords,
      note: "尚未設定 GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX，此項目未檢測",
    };
  }

  let points = 0;
  const keyword_rankings = [];

  for (const keyword of keywords) {
    const rank = await searchKeywordRank(keyword, company.domain, apiKey, cx);
    keyword_rankings.push(rank);
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

async function searchKeywordRank(query, domain, apiKey, cx) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "tw"); // 台灣在地化
  url.searchParams.set("hl", "zh-TW");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.error(`Google 搜尋 API 失敗(關鍵字:${query}) ${res.status}: ${text.slice(0, 300)}`);
    return null; // 單一關鍵字查詢失敗不要讓整個掃描中斷，標記未知即可
  }

  const data = await res.json();
  const items = data.items || [];
  const idx = items.findIndex((item) => {
    try {
      const host = new URL(item.link).hostname.replace(/^www\./, "");
      return host === domain.replace(/^www\./, "") || host.endsWith("." + domain.replace(/^www\./, ""));
    } catch {
      return false;
    }
  });

  return idx === -1 ? null : idx + 1;
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
