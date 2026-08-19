# 昇揚展覽 GEO/SEO 掃描引擎

這是給 GitHub Actions 用的掃描引擎，取代原本在 Claude 排程 session 裡跑的方式——
因為那個沙盒環境對外部 API(OpenAI/Anthropic)的網路連線在「無人在線的背景排程」情境下不穩定，
容易卡住。GitHub Actions 的機器沒有這個限制，跑起來更可靠。

## 這支引擎做什麼

1. 讀 `config.json`，看哪些展會「狀態=active」且已經到了該掃描的頻率(每週/每兩週/每月)
2. **真實抓網頁**分析 on-page SEO(title/meta/標題結構/圖片alt/schema.org)——純 HTML 解析，不靠AI
3. 用 Claude 官方 `web_search` 工具**實際查 Google 排名**(不是用固定或假造的排名)
4. 用 Claude 跟 ChatGPT**兩邊都開網路搜尋**回答同樣兩個問題(泛用問法 + 品牌/服務問法)，公平比較
5. 再用 Claude 當「裁判」，把兩邊的回答整理成結構化分數 + 具體的加強建議(action_items)
6. 把結果**累加**進 `../data/history.json`(不會覆蓋掉之前的紀錄，可以看趨勢)
7. 用 `../template.html` 重新產生 `../index.html`

## 需要的 Secrets(在 GitHub repo 的 Settings → Secrets and variables → Actions 設定)

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

(選填，可以指定模型版本：`OPENAI_MODEL`、`ANTHROPIC_MODEL`)

## 新增/停用展會

編輯 `config.json`，在 `exhibitions` 陣列裡新增一筆，或把某個展會的 `status` 改成 `"inactive"`。

## 手動測試

```bash
cd geo-seo/engine
OPENAI_API_KEY=xxx ANTHROPIC_API_KEY=xxx npm run scan
```

加 `--force` 會忽略「到期判斷」，強制對所有 active 的展會重新掃一次：

```bash
npm run scan:force
```
