// GET /api/charts — what's popular now and what just dropped, for free:
//  - Charts come from Apple Music's keyless chart feed (updated daily).
//  - "Just dropped" = songs released in the last 30 days that are already on Apple's chart.
//    Optionally (GEMINI_SEARCH=on) Gemini with Google Search finds this week's releases instead.
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

  // "Just dropped": try search-grounded Gemini models in order; keep Apple's list if all fail.
  // `freshSource` / `freshNote` say what happened (status codes only, never keys), to make issues easy to spot.
  charts.freshSource = "apple";
  // Search grounding isn't included in Gemini's free tier for current models (requests return 429),
  // so it only runs when you opt in with GEMINI_SEARCH=on (e.g. after enabling billing).
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_SEARCH === "on") {
    // Gemini 2.5 is closed to new accounts, so try current Flash models. Stay inside the 60 s function limit.
    const models = [...new Set([process.env.GEMINI_SEARCH_MODEL, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"].filter(Boolean))];
    const notes = [];
    const deadline = Date.now() + 45000;
    for (const model of models) {
      const left = deadline - Date.now();
      if (left < 8000) { notes.push(`${model}: skipped (time)`); continue; }
      try {
        const text = await askGemini({ prompt: buildFreshPrompt(today.toISOString().slice(0, 10)), search: true, model, timeoutMs: Math.min(25000, left) });
        const out = extractJson(text);
        const fresh = cleanCharts({ fresh: out?.fresh }).fresh;
        if (fresh.length < 4) { notes.push(`${model}: ${fresh.length} songs parsed`); continue; }
        charts.fresh = fresh;
        charts.freshWhen = cleanCharts(out).freshWhen || "this week's releases";
        charts.freshSource = model;
        break;
      } catch (e) {
        const code = e.name === "AbortError" ? "timeout" : e.status === 429 ? "429 free limit" : (e.message.match(/Gemini (\d+)/)?.[1] || "error");
        notes.push(`${model}: ${code}`);
        console.error("fresh:", model, e.message);
      }
    }
    if (charts.freshSource === "apple") charts.freshNote = notes.join("; ");
  }
  if (!charts.freshWhen) charts.freshWhen = "songs released in the last month that are already charting";

  // If new releases fell back to Apple, retry sooner than the usual 6 hours.
  const cache = charts.freshSource === "apple" && process.env.GEMINI_SEARCH === "on" ? "public, s-maxage=3600" : CACHE_OK;
  send(res, 200, { ...charts, live: true }, { cache });
}
