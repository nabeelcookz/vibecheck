// GET /api/playlist?list=<playlist URL or ID> — reads a public or unlisted YouTube / YouTube Music
// playlist so its songs can seed the listener's taste. Uses the same free YOUTUBE_API_KEY:
// each page of 50 songs costs 1 quota unit (vs 100 for a search), so imports are cheap.
import { parseListId, songFromItem, isPrivateAutoList } from "../lib/youtube.js";
import { send, rateLimit } from "../lib/http.js";

const API = "https://www.googleapis.com/youtube/v3";
const MAX_PAGES = 4; // up to 200 songs

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return send(res, 501, { error: "youtube_not_configured" });
  if (isPrivateAutoList(req.query?.list)) return send(res, 400, { error: "private_auto_list" });
  const list = parseListId(req.query?.list);
  if (!list) return send(res, 400, { error: "bad_playlist_link" });
  if (!rateLimit(req, res, { max: 20 })) return;

  try {
    const meta = await yt("playlists", { part: "snippet", id: list, key });
    const title = meta.items?.[0]?.snippet?.title;
    if (!title) return send(res, 404, { error: "playlist_not_found_or_private" });

    const songs = [];
    const seen = new Set();
    let pageToken = "";
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await yt("playlistItems", { part: "snippet", playlistId: list, maxResults: "50", key, ...(pageToken ? { pageToken } : {}) });
      for (const item of data.items || []) {
        const s = songFromItem(item.snippet);
        const k = s && `${s.t}|${s.a}`.toLowerCase();
        if (s && !seen.has(k)) { seen.add(k); songs.push(s); }
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    send(res, 200, { id: list, title: String(title).slice(0, 120), songs, more: Boolean(pageToken) }, { cache: "public, s-maxage=3600" });
  } catch (e) {
    console.error("playlist:", e.message);
    send(res, e.status === 404 ? 404 : 502, { error: e.status === 404 ? "playlist_not_found_or_private" : "upstream_failed" });
  }
}

async function yt(path, params) {
  const url = new URL(`${API}/${path}`);
  url.search = new URLSearchParams(params).toString();
  const r = await fetch(url);
  if (!r.ok) throw Object.assign(new Error(`YouTube ${path} ${r.status}`), { status: r.status });
  return r.json();
}
