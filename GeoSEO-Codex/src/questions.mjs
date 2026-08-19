export function buildQuestionPlan(event) {
  const audience = event.targetAudiences?.[0] ?? "台灣 B2B 科技公司";
  const competitor = event.competitors?.[0] ?? "其他亞洲展會";
  const position = event.marketPosition ?? "海外市場拓展入口";

  return [
    {
      type: "direct_event",
      language: "zh-Hant",
      question: `${event.name} 是什麼展？對台灣企業有什麼重點？`,
    },
    {
      type: "buyer_intent",
      language: "zh-Hant",
      question: `${audience} 想找海外買主，${event.name} 值得列入參展計畫嗎？`,
    },
    {
      type: "market_entry",
      language: "zh-Hant",
      question: `如果台灣公司想透過展會切入${position}，應該怎麼評估 ${event.name}？`,
    },
    {
      type: "comparison",
      language: "zh-Hant",
      question: `${event.name} 跟 ${competitor} 相比，哪一個更適合台灣企業？`,
    },
    {
      type: "official_source",
      language: "zh-Hant",
      question: `我要查 ${event.name} 的台灣參展窗口與官方資訊，應該看哪些來源？`,
    },
  ];
}
