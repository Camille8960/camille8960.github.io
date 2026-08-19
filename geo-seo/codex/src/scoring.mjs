const DAY_MS = 24 * 60 * 60 * 1000;

const FREQUENCY_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export function shouldScanEvent(event, now = new Date()) {
  if (!event.lastScannedAt) return true;
  const intervalDays = FREQUENCY_DAYS[event.frequency] ?? 14;
  const lastScanned = new Date(event.lastScannedAt);
  if (Number.isNaN(lastScanned.getTime())) return true;
  return now.getTime() - lastScanned.getTime() >= intervalDays * DAY_MS;
}

export function scoreModelResponse(answer, event) {
  const normalized = normalize(answer);
  const eventMentioned = includesAny(normalized, event.eventNames);
  const brandMentioned = includesAny(normalized, event.brandNames);
  const officialUrlCited = normalized.includes(normalize(event.officialDomain));
  const competitorsMentioned = (event.competitors ?? []).filter((competitor) =>
    normalized.includes(normalize(competitor)),
  );

  const signals = {
    eventMention: eventMentioned ? 30 : 0,
    brandMention: brandMentioned ? 25 : 0,
    officialUrl: officialUrlCited ? 25 : 0,
    competitorPenalty: Math.min(competitorsMentioned.length * 10, 20),
    answerPresence: normalized.length > 80 ? 20 : 8,
  };

  const total = clamp(
    signals.eventMention +
      signals.brandMention +
      signals.officialUrl +
      signals.answerPresence -
      signals.competitorPenalty,
    0,
    100,
  );

  return {
    total,
    eventMentioned,
    brandMentioned,
    officialUrlCited,
    competitorsMentioned,
    signals,
  };
}

export function buildEventReport({ event, scannedAt, modelOutputs }) {
  const providers = modelOutputs.map((output) => {
    const score = scoreModelResponse(output.answer, {
      eventNames: event.eventNames,
      brandNames: event.brandNames,
      officialDomain: new URL(event.url).hostname,
      competitors: event.competitors,
    });

    return {
      provider: output.provider,
      question: output.question,
      answer: output.answer,
      score,
    };
  });

  const taiwanGeoScore = average(
    providers.map((provider) => provider.score.total),
  );
  const competitors = summarizeCompetitors(providers, event.competitors ?? []);

  return {
    eventId: event.id,
    eventName: event.name,
    url: event.url,
    frequency: event.frequency,
    scannedAt,
    status: "ai_scored",
    taiwanGeoScore,
    seoScore: estimateSeoScore(event),
    competitiveScore: clamp(
      100 - competitors.reduce((sum, item) => sum + item.count * 12, 0),
      0,
      100,
    ),
    providers,
    questions: modelOutputs.map((output) => output.question),
    competitors,
    recommendations: buildRecommendations(event, providers, competitors),
  };
}

function buildRecommendations(event, providers, competitors) {
  const brandMentions = providers.filter((item) => item.score.brandMentioned).length;
  const officialCitations = providers.filter(
    (item) => item.score.officialUrlCited,
  ).length;
  const recommendations = [];

  if (brandMentions < providers.length) {
    recommendations.push(
      `把 ${event.name} 與 Sunrise Expo/昇揚展覽的關係放在頁面首屏與第一段，讓 AI 在推薦展會時更容易連到台灣窗口。`,
    );
  }

  if (officialCitations < providers.length) {
    recommendations.push(
      "補 Event、FAQPage、Organization schema，FAQ 答案直接包含展名、展期、地點、Sunrise Expo 與目標客群。",
    );
  }

  if (competitors.length > 0) {
    recommendations.push(
      `新增「${event.name} vs ${competitors[0].name}」比較段，明確寫出適合台灣廠商的市場、買主與參展理由。`,
    );
  }

  recommendations.push(
    "新增台灣企業情境段落：目標產業、想找的買主、展前準備素材、適合用此展切入的原因。",
  );

  return recommendations;
}

function summarizeCompetitors(providers, competitors) {
  return competitors
    .map((competitor) => ({
      name: competitor,
      count: providers.filter((provider) =>
        provider.score.competitorsMentioned.includes(competitor),
      ).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function estimateSeoScore(event) {
  const fields = [
    event.name,
    event.url,
    event.primaryMarket,
    event.eventNames?.length,
    event.brandNames?.length,
    event.competitors?.length,
  ];
  return 60 + fields.filter(Boolean).length * 4;
}

function includesAny(normalizedText, values = []) {
  return values.some((value) => normalizedText.includes(normalize(value)));
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("en-US");
}

function average(values) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
