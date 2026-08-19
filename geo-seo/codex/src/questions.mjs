export function buildQuestionPlan(event) {
  const audiences = event.targetAudiences?.length
    ? event.targetAudiences
    : ["台灣 B2B 科技公司"];
  const competitors = event.competitors?.length ? event.competitors : ["其他亞洲展會"];
  const position = event.marketPosition ?? "海外市場拓展入口";

  return [
    {
      type: "展名型",
      language: "zh-Hant",
      question: `${event.name} 是什麼展？對台灣企業有什麼重點？`,
    },
    {
      type: "參展決策型",
      language: "zh-Hant",
      question: `台灣企業如果想透過 ${event.name} 拓展海外市場，是否值得列入展會計畫？`,
    },
    {
      type: "產業需求型",
      language: "zh-Hant",
      question: `${audiences[0]} 適合參加 ${event.name} 嗎？可以接觸哪些買主？`,
    },
    {
      type: "市場進入型",
      language: "zh-Hant",
      question: `${event.name} 作為${position}，台灣廠商應該如何評估？`,
    },
    {
      type: "競爭比較型",
      language: "zh-Hant",
      question: `${event.name} 跟 ${competitors[0]} 相比，哪一個更適合台灣企業？`,
    },
  ];
}
