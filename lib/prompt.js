// Pure, dependency-free helpers shared by the API routes.
// Kept separate from the HTTP layer so they can be unit-tested with `node --test`.

export const MOOD_HINTS = {
  Motivated: "uplifting, motivational songs that build belief and momentum; anthemic choruses, hopeful lyrics",
  Sad: "sad songs to sit with the feeling; do NOT try to cheer them up; emotional, slow-to-mid tempo, honest lyrics",
  "Main character": "songs that make them feel like the main character of a film: confident, cinematic, swagger",
  Sleep: "songs to fall asleep to: very calm, soft, slow, minimal drums, no sudden loud parts",
  Workout: "high energy, strong beat (roughly 120-160 BPM), hard-hitting, keeps the pace up the whole way",
  Chill: "relaxed, easygoing songs",
  Romantic: "romantic, warm love songs",
  Nostalgic: "nostalgic songs that feel like memories",
};

export const songKey = (s) => `${s.t} — ${s.a}`.toLowerCase().trim();

const str = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

/** Clamp and clean everything the browser sends, so prompts stay small and safe. */
export function sanitizeProfile(raw = {}) {
  const list = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  const song = (x) => ({ t: str(x?.t, 120), a: str(x?.a, 120), g: str(x?.g, 40) });
  return {
    genres: list(raw.genres, 20).map((g) => str(g, 30)).filter(Boolean),
    artists: str(raw.artists, 400),
    notes: str(raw.notes, 800),
    ratings: list(raw.ratings, 300)
      .map((r) => ({ ...song(r), r: Math.max(1, Math.min(10, Math.round(Number(r?.r) || 0))), m: str(r?.m, 30) }))
      .filter((r) => r.t && r.a && r.r),
    seen: list(raw.seen, 200).map((x) => str(x, 250)).filter(Boolean),
    moodLog: list(raw.moodLog, 10).map((x) => str(x?.m ?? x, 140)).filter(Boolean),
  };
}

/** Average rating per genre, e.g. "Pop 7.5 (4), Country 3.0 (2)". */
export function genreAverages(ratings) {
  const by = {};
  for (const r of ratings) if (r.g) (by[r.g] ||= []).push(r.r);
  return Object.entries(by)
    .map(([g, a]) => [g, a.reduce((x, y) => x + y, 0) / a.length, a.length])
    .sort((x, y) => y[1] - x[1])
    .map(([g, avg, n]) => `${g} ${avg.toFixed(1)} (${n})`)
    .join(", ");
}

export function buildPicksPrompt({ profile, feel = "", words = "", charts = {} }) {
  const p = sanitizeProfile(profile);
  feel = str(feel, 30);
  words = str(words, 140);
  const want = [feel, words].filter(Boolean).join(": ") || "anything that fits their taste";
  const sameMood = p.ratings.filter((r) => feel && r.m === feel).slice(0, 40);
  const fmt = (s) => `${s.t} by ${s.a}${s.g ? ` (${s.g})` : ""}`;
  const count = feel === "Sleep" ? 12 : 10;

  return `You are a music recommender with excellent, eclectic taste. Build a ${count}-song listening queue for this listener's current mood, ordered so it flows well. Match the mood they asked for; never try to change or fix it.

CURRENT MOOD: ${want}${MOOD_HINTS[feel] ? `\nWHAT THIS MOOD MEANS FOR THEM: ${MOOD_HINTS[feel]}` : ""}
RECENT MOODS: ${p.moodLog.slice(0, 5).join("; ") || "none"}

LISTENER PROFILE
- Genres: ${p.genres.join(", ") || "not given"}
- Favourite artists: ${p.artists || "not given"}
- Notes: ${p.notes || "none"}
- Ratings given in THIS mood (weigh these most): ${sameMood.map((s) => `${s.r}/10 ${fmt(s)}`).join("; ") || "none yet"}
- All ratings, 10 = love, 1 = hate. Lean toward the sound of 8-10s, away from 1-4s. A low score in a different mood does not mean they dislike it for this mood:
${p.ratings.slice(0, 60).map((s) => `  ${s.r}/10 ${fmt(s)}${s.m ? ` [mood: ${s.m}]` : ""}`).join("\n") || "  none yet"}
- Average rating by genre: ${genreAverages(p.ratings) || "not enough data"}

CHARTING NOW: ${(charts.now || []).map(fmt).join("; ") || "unknown"}
JUST RELEASED: ${(charts.fresh || []).map(fmt).join("; ") || "unknown"}

DO NOT recommend (already shown or rated): ${p.seen.slice(-120).concat(p.ratings.map(songKey)).join("; ") || "none"}

RULES: Only real, released songs you are confident exist, credited to the right artist. Include 1-3 songs from the charting or just-released lists only when they genuinely fit (set "trending": true for those). If the profile is empty, give a varied, crowd-pleasing mix. "why" is one short sentence linking the song to their mood and taste, addressed to them as "you".
Return ONLY JSON: {"picks":[{"title":"","artist":"","genre":"","why":"","trending":false}]}`;
}

export function buildFreshPrompt(today) {
  return `Today is ${today}. Search the web for the most notable new songs (singles or album focus tracks) released in the last 7 days, including the latest New Music Friday, across pop, hip-hop, R&B, Latin, Afrobeats, K-pop, Arabic pop, country, dance and rock.
Only include songs you found in sources from the last 10 days. Never fill gaps from memory.
Return ONLY JSON, no prose:
{"freshWhen":"<e.g. New Music Friday, Nov 20>","fresh":[{"t":"title","a":"artist","g":"short genre","s":"Out <Mon D>"}]}
Use 8-12 items.`;
}

/** Find the first JSON object in model text (models sometimes wrap it in prose or code fences). */
export function extractJson(text) {
  const s = String(text || "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

export function cleanPicks(out, { seen = [], fresh = [] } = {}) {
  const block = new Set(seen.map((x) => String(x).toLowerCase()));
  const freshKeys = new Set(fresh.map(songKey));
  const res = [];
  for (const p of Array.isArray(out?.picks) ? out.picks : []) {
    const s = { t: str(p?.title, 120), a: str(p?.artist, 120), g: str(p?.genre, 40), why: str(p?.why, 240) };
    if (!s.t || !s.a || block.has(songKey(s)) || res.some((x) => songKey(x) === songKey(s))) continue;
    s.s = p?.trending ? (freshKeys.has(songKey(s)) ? "New this week" : "Trending") : "";
    res.push(s);
    if (res.length === 12) break;
  }
  return res;
}

export function cleanCharts(out) {
  const list = (a, n) =>
    (Array.isArray(a) ? a : [])
      .map((x) => ({ t: str(x?.t, 120), a: str(x?.a, 120), g: str(x?.g, 40), s: str(x?.s, 50), x: str(x?.x, 160) }))
      .filter((x) => x.t && x.a)
      .slice(0, n);
  return {
    updated: str(out?.updated, 20),
    period: str(out?.period, 80),
    freshWhen: str(out?.freshWhen, 80),
    now: list(out?.now, 15),
    fresh: list(out?.fresh, 15),
    year: list(out?.year, 6),
  };
}
