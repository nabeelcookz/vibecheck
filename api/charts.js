// GET /api/charts — what's popular now and what just dropped, for free:
//  - Charts come from Apple Music's keyless chart feed (updated daily).
//  - "Just dropped" comes from Gemini with Google Search grounding (free tier), falling back to
//    recently released songs already climbing Apple's chart.
// Vercel's CDN caches the response for 6 hours, so this runs at most ~4 times a day.
import { askGemini } from "../lib/gemini.js";
import { appleFeedUrl, parseAppleFeed } from "../lib/apple.js";
import { buildFreshPrompt, extractJson, cleanCharts } from "../lib/prompt.js";
import { SEED_CHARTS } from "../lib/seed.js";
import { send } from "../lib/http.js";

const CACHE_OK = "public, s-maxage=21600, stale-while-revalidate=86400";
const CACHE_FALLBACK = "public, s-maxage=600";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
  const country = /^[a-z]{2}$/.test(process.env.CHART_COUNTRY || "") ? process.env.CHART_COUNTRY : "us";
  const today = new Date();

  let charts;
  try {
    const r = await fetch(appleFeedUrl(country, 100));
    if (!r.ok) throw new Error(`Apple feed ${r.status}`);
    charts = parseAppleFeed(await r.json(), { today, country });
    if (charts.now.length < 5) throw new Error("too few chart entries");
  } catch (e) {
    console.error("charts:", e.message);
    return send(res, 200, { ...SEED_CHARTS, live: false }, { cache: CACHE_FALLBACK });
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await askGemini({ prompt: buildFreshPrompt(today.toISOString().slice(0, 10)), search: true });
      const out = extractJson(text);
      const fresh = cleanCharts({ fresh: out?.fresh }).fresh;
      if (fresh.length >= 4) {
        charts.fresh = fresh;
        charts.freshWhen = cleanCharts(out).freshWhen;
      }
    } catch (e) {
      console.error("fresh:", e.message); // keep Apple's recently released songs
    }
  }
  if (!charts.freshWhen) charts.freshWhen = "songs released in the last 3 weeks";

  send(res, 200, { ...charts, live: true }, { cache: CACHE_OK });
}
