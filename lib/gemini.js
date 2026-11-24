// Minimal Google Gemini API client using fetch (no SDK dependency).
// Free tier: get a key at https://aistudio.google.com/apikey
// Docs: https://ai.google.dev/gemini-api/docs

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * @param {object} o
 * @param {string} o.prompt
 * @param {boolean} [o.json]    ask for a JSON response (not combinable with search)
 * @param {boolean} [o.search]  ground the answer in Google Search (free on gemini-2.5-flash, ~500 requests/day)
 */
export async function askGemini({ prompt, json = false, search = false, model, timeoutMs = 55000 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("GEMINI_API_KEY is not set"), { status: 500 });

  model ||= search
    ? process.env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash"
    : process.env.GEMINI_MODEL || "gemini-3.5-flash";

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, ...(json ? { responseMimeType: "application/json" } : {}) },
  };
  if (search) body.tools = [{ google_search: {} }];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      // 429 = free-tier limit reached; surface it so the client can say "try later".
      throw Object.assign(new Error(`Gemini ${r.status}: ${detail.slice(0, 300)}`), { status: r.status === 429 ? 429 : 502 });
    }
    const data = await r.json();
    return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  } finally {
    clearTimeout(timer);
  }
}
