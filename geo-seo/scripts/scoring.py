"""
GEO/SEO 展會能見度評分模組 — Sunrise Expo(昇揚展覽)

這個模組把「這次掃描蒐集到的事實」轉成 0-100 的分數，評分規則固定，
這樣同一個展會在不同期(每兩週)之間的分數才有可比性，不會因為
「這次判得比較嚴/鬆」而失真。

每次掃描時，實際的「蒐集事實」(抓網頁內容、Google搜尋排名、
問Claude/ChatGPT拿到的回答)是由 Claude 在排程執行當下用
WebFetch / WebSearch / Agent(子代理) / OpenAI API 完成，
再把結果整理成這裡定義的 SeoFacts / GeoFacts 結構，丟進
score_seo() / score_geo() 算出最終分數。
"""

from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# SEO 評分 — 滿分 100，分兩大塊：
#   on-page 技術面 (40分)：title / meta description / 標題結構 / 圖片alt / 結構化資料
#   搜尋能見度 (60分)：針對一組關鍵字，在 Google 搜尋結果中的排名位置
# ---------------------------------------------------------------------------

@dataclass
class SeoFacts:
    title_quality: int          # 0-10，title是否包含展名關鍵字、長度是否適中(<=60字)
    meta_desc_quality: int      # 0-10，meta description是否包含展名/日期/地點/公司，長度70-155字元佳
    heading_structure: int      # 0-10，H1是否唯一且對應展名，H2/H3是否有清楚的資訊架構(含FAQ更佳)
    image_alt_coverage: int     # 0-10，圖片alt文字覆蓋率(0=幾乎沒有, 10=幾乎全部都有描述性alt)
    structured_data: int        # 0-10，是否有 schema.org 結構化資料(Event/Organization等)
    keyword_rankings: list[Optional[int]] = field(default_factory=list)
    # keyword_rankings: 每個追蹤關鍵字在 Google 搜尋結果的名次(1-10內填實際名次；
    # 10名外或抓不到就填 None)。建議至少包含：
    #   1) 英文展名關鍵字 (例如 "AI Expo Korea 2026")
    #   2) 中文展名+代理關鍵字 (例如 "AI EXPO KOREA 台灣代理")
    #   3) 中文展名+動作關鍵字 (例如 "AI EXPO KOREA 參展")


def _rank_score(rank: Optional[int]) -> float:
    """單一關鍵字排名 -> 0/10/20分"""
    if rank is None:
        return 0.0
    if rank <= 3:
        return 20.0
    if rank <= 10:
        return 10.0
    return 0.0


def score_seo(facts: SeoFacts) -> dict:
    onpage_raw = (
        facts.title_quality
        + facts.meta_desc_quality
        + facts.heading_structure
        + facts.image_alt_coverage
        + facts.structured_data
    )  # 0-50
    onpage_score = onpage_raw / 50 * 40  # 換算成 0-40

    if facts.keyword_rankings:
        rank_total = sum(_rank_score(r) for r in facts.keyword_rankings)
        rank_max = 20 * len(facts.keyword_rankings)
        search_score = rank_total / rank_max * 60
    else:
        search_score = 0.0

    total = round(onpage_score + search_score, 1)

    return {
        "total": total,
        "onpage_subscore": round(onpage_score, 1),
        "search_visibility_subscore": round(search_score, 1),
        "breakdown": {
            "title_quality": facts.title_quality,
            "meta_desc_quality": facts.meta_desc_quality,
            "heading_structure": facts.heading_structure,
            "image_alt_coverage": facts.image_alt_coverage,
            "structured_data": facts.structured_data,
            "keyword_rankings": facts.keyword_rankings,
        },
    }


# ---------------------------------------------------------------------------
# GEO 評分 — 滿分 100，每個AI引擎(Claude / ChatGPT)各評一次。
# 每次掃描動態生成問題，分兩種問法各測一輪：
#   generic  (泛用問法，只問展會/產業，不提公司)   — 40分
#   branded  (品牌/服務問法，問「誰是代理商/顧問」) — 60分
# branded 配分較高，因為這是使用者「準備行動」時最可能被回答的場景，
# 對展位銷售的實際轉換影響也最大。
# ---------------------------------------------------------------------------

@dataclass
class GeoFacts:
    engine: str  # "Claude" or "ChatGPT"
    # generic 問法 (滿分40)
    generic_mentioned: bool
    generic_prominence: int      # 0-10，沒提到就是0；有提到依醒目程度給分
    generic_accuracy: int        # 0-10，展會本身資訊(日期/地點/主題)是否正確
    # branded 問法 (滿分60)
    branded_mentioned: bool
    branded_prominence: int      # 0-20，沒提到就是0；有提到依「排序/是否為首選」給分
    branded_accuracy: int        # 0-15，公司/服務描述是否正確(代理身份/服務內容/連結)
    notes: str = ""
    # --- 以下為輔助診斷欄位，不計入總分，但會顯示在dashboard協助判斷「該怎麼改進」---
    cited_url: bool = False              # 回答中是否實際提到/引用 sunriseexpo.com 這個網址(不只是提公司名)
    competitor_mentions: list[str] = field(default_factory=list)  # 回答中出現的其他競爭對象(展會/代理商/官方管道)
    question_type_breakdown: list[dict] = field(default_factory=list)
    # question_type_breakdown 範例:
    # [{"type": "展名型", "question": "...", "mentioned": True, "note": "..."}]


def score_geo(facts: GeoFacts) -> dict:
    generic_subtotal = (
        (20 if facts.generic_mentioned else 0)
        + facts.generic_prominence
        + facts.generic_accuracy
    )  # 上限 40 (20+10+10)
    branded_subtotal = (
        (25 if facts.branded_mentioned else 0)
        + facts.branded_prominence
        + facts.branded_accuracy
    )  # 上限 60 (25+20+15)

    total = round(generic_subtotal + branded_subtotal, 1)

    return {
        "engine": facts.engine,
        "total": total,
        "generic_subscore": generic_subtotal,
        "branded_subscore": branded_subtotal,
        "notes": facts.notes,
        "cited_url": facts.cited_url,
        "competitor_mentions": facts.competitor_mentions,
        "question_type_breakdown": facts.question_type_breakdown,
    }


@dataclass
class ActionItem:
    issue: str            # 弱點(一句話)
    signal: str            # 這次掃描測到的具體訊號/證據
    recommendation: str    # 建議怎麼做(具體可執行)
    priority: str           # "高" / "中" / "低"


if __name__ == "__main__":
    # AI EXPO KOREA — 2026-08-18 首次掃描（基準值）
    seo_facts = SeoFacts(
        title_quality=9,
        meta_desc_quality=9,
        heading_structure=9,
        image_alt_coverage=4,
        structured_data=2,
        keyword_rankings=[None, 6, 5],  # 英文詞完全沒進前10 / 中文長尾詞第6 / 第5
    )
    seo_result = score_seo(seo_facts)
    print("SEO:", seo_result)

    claude_facts = GeoFacts(
        engine="Claude",
        generic_mentioned=False,
        generic_prominence=0,
        generic_accuracy=6,
        branded_mentioned=True,
        branded_prominence=15,
        branded_accuracy=14,
        notes="泛用問法完全未被提及；品牌問法中被完整具名介紹，但排在TAITRA官方組團之後",
        cited_url=True,
        competitor_mentions=["TAITRA / 駐首爾台灣貿易中心（官方組團）", "ACE Forum（過去辦過相關行程，資訊不完整）"],
        question_type_breakdown=[
            {"type": "展名型(泛用)", "question": "韓國有哪些值得參加的AI相關展覽？", "mentioned": False,
             "note": "只列展會本身，未提及任何代理商"},
            {"type": "參展決策型(品牌/服務)", "question": "台灣廠商參加AI EXPO KOREA，有推薦的代理商嗎？", "mentioned": True,
             "note": "唯一被完整具名介紹的民間代理商，但排在TAITRA官方路線之後"},
        ],
    )
    claude_result = score_geo(claude_facts)
    print("GEO Claude:", claude_result)
