// Minimal Claude Messages API client using fetch (no SDK dependency).
// Docs: https://platform.claude.com/docs/en/api/overview

const API_URL = "https://api.anthropic.com/v1/messages";

export async function askClaude({ prompt, maxTokens = 2000, webSearch = false, timeoutMs = 55000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error("ANTHROPIC_API_KEY is not set"), { status: 500 });

  const body = {
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (webSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw Object.assign(new Error(`Claude API ${r.status}: ${detail.slice(0, 300)}`), { status: 502 });
    }
    const data = await r.json();
    // With web search, the answer is the text blocks after the tool results; join all text.
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  } finally {
    clearTimeout(timer);
  }
}
