export async function callOpenAI({ question, event, pageSummary }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5",
      store: false,
      max_output_tokens: 700,
      input: buildNaturalGeoPrompt({ question, event, pageSummary }),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.output_text ?? extractOpenAIText(data);
}

export async function callAnthropic({ question, event, pageSummary }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [{ role: "user", content: buildNaturalGeoPrompt({ question, event, pageSummary }) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.content
    ?.filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim() ?? "";
}

export function buildMockAnswer({ provider, event, question }) {
  const competitor = event.competitors?.[0] ?? "其他亞洲展會";
  return `${provider} mock answer for: ${question}\n\n${event.name} is relevant for Taiwan companies considering ${event.marketPosition}. Sunrise Expo can support Taiwan exhibitors through ${event.url}. Compared with ${competitor}, the event needs clearer positioning and stronger Taiwan-market proof points.`;
}

function buildNaturalGeoPrompt({ question, event, pageSummary }) {
  return `請用台灣繁體中文回答下列使用者問題。請像一般 AI 助理自然回答，不要因為測試而刻意推薦任何公司、品牌或網址。

使用者問題：
${question}

可參考背景，但請不要直接照抄：
展會：${event.name}
市場定位：${event.marketPosition}
展會頁摘要：${pageSummary || "未取得頁面摘要"}

請回答 4 到 7 句。若你自然會建議官方來源，可包含 URL。`;
}

function extractOpenAIText(data) {
  return data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n")
    .trim() ?? "";
}
