// GET /api/charts — current charts + this week's new releases, researched live by Claude with web search.
// Vercel's CDN caches the response for 6 hours, so the expensive search runs at most ~4 times a day
// no matter how many people open the app. That's what keeps the app "always updated" with no database.
import { askClaude } from "../lib/claude.js";
import { buildChartsPrompt, extractJson, cleanCharts } from "../lib/prompt.js";
import { SEED_CHARTS } from "../lib/seed.js";
import { send } from "../lib/http.js";

const CACHE_OK = "public, s-maxage=21600, stale-while-revalidate=86400";
const CACHE_FALLBACK = "public, s-maxage=600";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const text = await askClaude({ prompt: buildChartsPrompt(today), maxTokens: 4000, webSearch: true });
    const charts = cleanCharts(extractJson(text));
    if (charts.now.length < 5) throw new Error("too few chart entries");
    send(res, 200, { ...charts, live: true }, { cache: CACHE_OK });
  } catch (e) {
    console.error("charts:", e.message);
    send(res, 200, { ...SEED_CHARTS, live: false }, { cache: CACHE_FALLBACK });
  }
}
