// POST /api/picks — builds a mood queue from the listener's profile and ratings.
// Body: { profile, feel, words, charts: { now, fresh } }
import { askGemini } from "../lib/gemini.js";
import { buildPicksPrompt, extractJson, cleanPicks, sanitizeProfile } from "../lib/prompt.js";
import { send, checkPasscode, rateLimit } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
  if (!checkPasscode(req, res) || !rateLimit(req, res, { max: 30 })) return;

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (JSON.stringify(body).length > 100_000) return send(res, 413, { error: "too_large" });
  if (!body.feel && !body.words) return send(res, 400, { error: "mood_required" });

  const charts = { now: (body.charts?.now || []).slice(0, 15), fresh: (body.charts?.fresh || []).slice(0, 15) };
  try {
    const text = await askGemini({ prompt: buildPicksPrompt({ ...body, charts }), json: true });
    const profile = sanitizeProfile(body.profile);
    const picks = cleanPicks(extractJson(text), {
      seen: profile.seen.concat(profile.ratings.map((r) => `${r.t} — ${r.a}`)),
      fresh: charts.fresh,
    });
    if (!picks.length) return send(res, 502, { error: "no_picks" });
    send(res, 200, { picks });
  } catch (e) {
    console.error("picks:", e.message);
    send(res, e.status === 429 ? 429 : e.status || 500, { error: e.status === 429 ? "rate_limited" : "upstream_failed" });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
