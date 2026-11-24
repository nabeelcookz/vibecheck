// Pure helpers for reading YouTube / YouTube Music playlists (unit-tested).

/** True for YouTube's built-in private lists: Liked Music (LM), Liked videos (LL), Watch later (WL). */
export function isPrivateAutoList(input) {
  const s = String(input || "").trim();
  let id = s;
  try { id = new URL(s).searchParams.get("list") || ""; } catch {}
  return /^(LM|LL|WL)$/.test(id);
}

/** True for auto-generated Mixes / radio ("RD…" IDs). They're built per listener and the API can't read them. */
export function isMix(input) {
  const s = String(input || "").trim();
  let id = s;
  try { id = new URL(s).searchParams.get("list") || ""; } catch {}
  return /^RD/.test(id);
}

/** Accepts a playlist URL (youtube.com or music.youtube.com) or a bare ID. Returns the ID or "". */
export function parseListId(input) {
  const s = String(input || "").trim();
  let id = "";
  try {
    id = new URL(s).searchParams.get("list") || "";
  } catch {
    id = s;
  }
  // Playlist IDs are letters, digits, - and _. Private auto-lists like "LM" (Liked Music) or "WL" can't be read with an API key.
  return /^[A-Za-z0-9_-]{10,64}$/.test(id) ? id : "";
}

const JUNK = /\s*[([](official|lyric|lyrics|audio|video|visuali[sz]er|music video|mv|hd|hq|4k|explicit|clean|remaster(ed)?)[^)\]]*[)\]]/gi;

/**
 * Turns one playlistItems snippet into { t, a, id }, or null if it isn't a usable song.
 * YouTube Music tracks come from "Artist - Topic" channels, where the title is just the song name.
 * Regular music videos usually look like "Artist - Song (Official Video)".
 */
export function songFromItem(snippet) {
  if (!snippet) return null;
  const rawTitle = String(snippet.title || "").trim();
  const id = snippet.resourceId?.videoId || "";
  if (!rawTitle || !id || /^(deleted|private) video$/i.test(rawTitle)) return null;

  const channel = String(snippet.videoOwnerChannelTitle || "").trim();
  const title = rawTitle.replace(JUNK, "").replace(/\s{2,}/g, " ").trim();

  if (/ - Topic$/i.test(channel)) {
    return { t: title.slice(0, 120), a: channel.replace(/ - Topic$/i, "").slice(0, 120), id };
  }
  const dash = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { t: dash[2].trim().slice(0, 120), a: dash[1].trim().slice(0, 120), id };

  const artist = channel.replace(/VEVO$/i, "").replace(/\s*(official)?\s*$/i, "").trim();
  return { t: title.slice(0, 120), a: (artist || "Unknown artist").slice(0, 120), id };
}
