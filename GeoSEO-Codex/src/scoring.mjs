const DAY_MS = 24 * 60 * 60 * 1000;
const FREQUENCY_DAYS = { weekly: 7, biweekly: 14, monthly: 30 };

export function shouldScanEvent(event, now = new Date()) {
  if (!event.lastScannedAt) return true;
  const days = FREQUENCY_DAYS[event.frequency] ?? 14;
  const last = new Date(event.lastScannedAt);
  if (Number.isNaN(last.getTime())) return true;
  return now.getTime() - last.getTime() >= days * DAY_MS;
}

export function scoreModelResponse(answer, event) {
  const text = normalize(answer);
  const eventMentioned = includesAny(text, event.eventNames);
  const brandMentioned = includesAny(text, event.brandNames);
  const officialUrlCited = text.includes(normalize(event.officialDomain));
  const competitorsMentioned = (event.competitors ?? []).filter((name) => text.includes(normalize(name)));

  const signals = {
    eventMention: eventMentioned ? 30 : 0,
    brandMention: brandMentioned ? 25 : 0,
    officialUrl: officialUrlCited ? 25 : 0,
    answerPresence: text.length > 80 ? 20 : 8,
    competitorPenalty: Math.min(competitorsMentioned.length * 8, 20),
  };

  return {
    total: clamp(signals.eventMention + signals.brandMention + signals.officialUrl + signals.answerPresence - signals.competitorPenalty, 0, 100),
    eventMentioned,
    brandMentioned,
    officialUrlCited,
    competitorsMentioned,
    signals,
  };
}

export function buildEventReport({ event, scannedAt, modelOutputs }) {
  const officialDomain = new URL(event.url).hostname;
  const providers = modelOutputs.map((output) => ({
    provider: output.provider,
    question: output.question,
    questionType: output.questionType,
    answer: output.answer,
    score: scoreModelResponse(output.answer, {
      eventNames: event.eventNames,
      brandNames: event.brandNames,
      officialDomain,
      competitors: event.competitors,
    }),
  }));
  const competitors = summarizeCompetitors(providers, event.competitors ?? []);

  return {
    eventId: event.id,
    eventName: event.name,
    url: event.url,
    frequency: event.frequency,
    scannedAt,
    status: "ai_scored",
    taiwanGeoScore: average(providers.map((item) => item.score.total)),
    seoScore: estimateSeoScore(event),
    competitiveScore: clamp(100 - competitors.reduce((sum, item) => sum + item.count * 10, 0), 0, 100),
    providers,
    questions: [...new Set(modelOutputs.map((output) => output.question))],
    competitors,
    recommendations: buildRecommendations(event, providers, competitors),
  };
}

function buildRecommendations(event, providers, competitors) {
  const recommendations = [];
  const brandMentionRate = providers.filter((item) => item.score.brandMentioned).length / Math.max(providers.length, 1);
  const urlRate = providers.filter((item) => item.score.officialUrlCited).length / Math.max(providers.length, 1);

  if (brandMentionRate < 0.8) {
    recommendations.push(`在 ${event.name} 頁面首屏與 FAQ 明確寫出 Sunrise Expo/昇揚展覽是台灣參展窗口。`);
  }
  if (urlRate < 0.8) {
    recommendations.push("增加 Event、FAQPage、Organization schema，並在 FAQ 內自然包含官方網址。");
  }
  if (competitors.length) {
    recommendations.push(`新增「${event.name} vs ${competitors[0].name}」比較段，說明市場、買主、台灣廠商適合度。`);
  }
  recommendations.push("補一段台灣企業參展情境：適合產業、買主類型、展前準備、參展窗口與下一步 CTA。");
  return recommendations;
}

function summarizeCompetitors(providers, competitors) {
  return competitors
    .map((name) => ({
      name,
      count: providers.filter((provider) => provider.score.competitorsMentioned.includes(name)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function estimateSeoScore(event) {
  const fields = [event.name, event.url, event.marketPosition, event.eventNames?.length, event.brandNames?.length, event.targetAudiences?.length];
  return 60 + fields.filter(Boolean).length * 4;
}

function includesAny(text, values = []) {
  return values.some((value) => text.includes(normalize(value)));
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("en-US");
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
