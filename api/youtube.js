// GET /api/youtube?q=<title artist> — finds the best YouTube video ID for a song so the
// in-app player can autoplay the queue. Uses YouTube Data API v3 (search costs 100 quota units;
// the free quota is 10,000/day), so results are cached at the CDN for a week.
import { send, rateLimit } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
  const q = String(req.query?.q || "").trim().slice(0, 200);
  if (!q) return send(res, 400, { error: "q_required" });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return send(res, 501, { error: "youtube_not_configured" });
  if (!rateLimit(req, res, { max: 120 })) return;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoCategoryId: "10", // Music
    maxResults: "3",
    q: `${q} official audio`,
    key,
  }).toString();

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`YouTube ${r.status}`);
    const data = await r.json();
    const items = (data.items || []).filter((i) => i.id?.videoId);
    // Prefer official uploads ("- Topic" channels or the artist's VEVO).
    const best = items.find((i) => /topic|vevo/i.test(i.snippet?.channelTitle || "")) || items[0];
    if (!best) return send(res, 404, { error: "not_found" }, { cache: "public, s-maxage=86400" });
    send(res, 200, { id: best.id.videoId, title: best.snippet?.title || "" }, { cache: "public, s-maxage=604800" });
  } catch (e) {
    console.error("youtube:", e.message);
    send(res, 502, { error: "upstream_failed" });
  }
}
