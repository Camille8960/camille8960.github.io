// 呼叫 Claude 跟 ChatGPT，兩邊都開網路搜尋，公平比較。
// 用兩種問法：泛用問法(不提公司)、品牌/服務問法(明確問該找誰代理)。

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.1";

export function buildQuestions(exhibition) {
  return {
    generic: `我們公司在考慮參加海外展覽，最近在看${exhibition.name}這類的展覽，可以推薦一下這個產業/地區目前有哪些值得參加的展覽嗎？`,
    branded: `我們公司想去參加${exhibition.name}這個展覽設攤，除了自己直接跟主辦單位申請之外，台灣有沒有推薦的代理商、參展顧問或展務服務公司可以協助處理攤位申請、報名跟現場執行？`,
  };
}

export async function askClaude(question) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 未設定");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: question }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API 失敗 ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  const answer = textBlocks.map((b) => b.text).join("\n").trim();
  const usedSearch = (data.content || []).some((b) => b.type === "server_tool_use" || b.type === "web_search_tool_result");
  const citations = textBlocks.flatMap((b) => b.citations || []).map((c) => c.url).filter(Boolean);

  return { answer, usedSearch, citations };
}

export async function askChatGPT(question) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 未設定");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      tools: [{ type: "web_search" }],
      input: question,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API 失敗 ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  let answer = data.output_text;
  let usedSearch = false;
  const citations = [];

  if (!answer) {
    const messageItem = (data.output || []).find((item) => item.type === "message");
    answer = (messageItem?.content || [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text)
      .join("\n")
      .trim();
  }
  usedSearch = (data.output || []).some((item) => item.type === "web_search_call");
  for (const item of data.output || []) {
    for (const c of item.content || []) {
      for (const a of c.annotations || []) {
        if (a.url) citations.push(a.url);
      }
    }
  }

  return { answer: answer || "", usedSearch, citations };
}

// 用 Claude 當「裁判」，把兩邊的原始回答整理成結構化評分 + 加強建議。
// 這一步是這個工具最重要的部分：使用者最在意「我該怎麼改進」。
export async function analyzeResults({ exhibition, company, seoFacts, claudeAnswers, chatgptAnswers }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 未設定");

  const prompt = buildAnalysisPrompt({ exhibition, company, seoFacts, claudeAnswers, chatgptAnswers });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 3000,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude 分析呼叫失敗 ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const textBlocks = (data.content || []).filter((b) => b.type === "text");
  const raw = "{" + textBlocks.map((b) => b.text).join("\n");
  return extractJson(raw);
}

function buildAnalysisPrompt({ exhibition, company, seoFacts, claudeAnswers, chatgptAnswers }) {
  return `你是一個客觀、嚴格的品牌能見度分析師，正在幫「${company.name}(${company.name_en})」分析他們代理的展覽「${exhibition.name}」在 AI 助理裡的能見度。你的工作是誠實分析，不要因為其中一組答案來自Claude自己就偏袒它，要一樣嚴格。

以下是實測資料：

【網頁 on-page SEO 技術面實測】
${JSON.stringify(seoFacts.raw, null, 2)}

【Claude 的回答】
問題1(泛用問法)：${claudeAnswers.generic.question}
回答：${claudeAnswers.generic.answer}
(是否有使用網路搜尋：${claudeAnswers.generic.usedSearch ? "是" : "否"})

問題2(品牌/服務問法)：${claudeAnswers.branded.question}
回答：${claudeAnswers.branded.answer}
(是否有使用網路搜尋：${claudeAnswers.branded.usedSearch ? "是" : "否"})

【ChatGPT 的回答】
問題1(泛用問法)：${chatgptAnswers.generic.question}
回答：${chatgptAnswers.generic.answer}
(是否有使用網路搜尋：${chatgptAnswers.generic.usedSearch ? "是" : "否"})

問題2(品牌/服務問法)：${chatgptAnswers.branded.question}
回答：${chatgptAnswers.branded.answer}
(是否有使用網路搜尋：${chatgptAnswers.branded.usedSearch ? "是" : "否"})

請針對Claude跟ChatGPT「各自」分析，套用以下計分規則(0-100)：
- 泛用問法(40分) = 有沒有提到${company.name}/${company.name_en}(有=20分,沒有=0) + 醒目程度(0-10) + 展會資訊正確性(0-10)
- 品牌問法(60分) = 有沒有提到${company.name}(有=25分,沒有=0) + 醒目程度/排序(0-20) + 服務描述正確性(0-15)

請只回傳一個JSON物件(不要有任何JSON以外的文字、不要用markdown code fence)，格式如下(第一個字元已經是「{」，你接著往下寫)：
{
  "geo_claude": {
    "total": <數字0-100>,
    "generic_subscore": <數字0-40>,
    "branded_subscore": <數字0-60>,
    "key_findings": ["<條列式重點1，一句話講完一件事實，不要寫成一大段>", "<條列式重點2>", "<條列式重點3，最多4條>"],
    "cited_url": <true/false，回答裡有沒有引用官網網址>,
    "competitor_mentions": ["<有提到的競爭代理商或官方組團管道，沒有就空陣列>"],
    "question_type_breakdown": [
      {"type": "展名型(泛用)", "question": "<問題1原文>", "mentioned": <true/false>, "note": "<簡短說明>"},
      {"type": "參展決策型(品牌/服務)", "question": "<問題2原文>", "mentioned": <true/false>, "note": "<簡短說明>"}
    ]
  },
  "geo_chatgpt": { "<同上格式，key_findings也要條列式>" },
  "insight_summary": "<一段話總結這次最重要的發現，要具體，例如比較Claude跟ChatGPT的差異、跟SEO實測結果的關聯>",
  "action_items": [
    {"issue": "<弱點一句話>", "signal": "<這次測到的具體證據，要引用回答裡的實際內容或數字，不要空泛帶過>", "recommendation": "<具體可執行的建議，要講清楚「做什麼」「放在哪裡」「怎麼做」，讓使用者看了就知道下一步要做什麼動作，不要寫「可以考慮...」這種模糊的話>", "priority": "高/中/低"}
  ]
}
key_findings的規則：每一條就是「一個事實」，用最短的話講完，不要在一條裡塞兩三件事，不要寫成完整段落。例如寫「品牌問法中被具名推薦，但排在TAITRA官方組團之後」，不要寫「在品牌問法情境下，雖然...但是...同時...」這種長句。
action_items的recommendation規則：要像在下工作指令一樣具體，例如「在展會頁面第一段加入這句話：『昇揚展覽為OO展台灣官方代理』」，而不是「加強公司在頁面上的曝光」這種空話。
action_items請列3-5條，依重要性排序(最重要的排最前面)，一定要具體、有根據、可執行，不要空泛。`;
}

function extractJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("分析結果沒有找到JSON: " + raw.slice(0, 300));
  const jsonStr = raw.slice(start, end + 1);
  return JSON.parse(jsonStr);
}
