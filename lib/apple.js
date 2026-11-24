// Apple Music charts from Apple's free, keyless Marketing Tools feed (refreshed daily).
// https://rss.marketingtools.apple.com

export const appleFeedUrl = (country = "us", limit = 100) =>
  `https://rss.marketingtools.apple.com/api/v2/${encodeURIComponent(country)}/music/most-played/${limit}/songs.json`;

const genreOf = (r) => {
  const names = (r.genres || []).map((g) => (typeof g === "string" ? g : g?.name || "").replace(/\s*\(id \d+\)$/, ""));
  return names.find((n) => n && n !== "Music") || "";
};

/**
 * Turn Apple's feed into STAR_BOA's chart shape.
 * - now:   the current top songs
 * - fresh: charting songs released in the last `freshDays` days (default 30)
 * - year:  biggest songs released this year that aren't already in `now`
 */
export function parseAppleFeed(json, { today = new Date(), country = "us", freshDays = 30, top = 12 } = {}) {
  const results = Array.isArray(json?.feed?.results) ? json.feed.results : [];
  const songs = results
    .filter((r) => r?.name && r?.artistName)
    .map((r, i) => ({
      t: String(r.name).slice(0, 120),
      a: String(r.artistName).slice(0, 120),
      g: genreOf(r),
      released: String(r.releaseDate || ""),
      rank: i + 1,
    }));

  const day = 86400000;
  const now = today.getTime();
  const age = (s) => (s.released ? (now - Date.parse(s.released)) / day : Infinity);
  const year = String(today.getUTCFullYear());
  const C = country.toUpperCase();
  const label = (s) => ({ t: s.t, a: s.a, g: s.g });

  const nowList = songs.slice(0, top).map((s) => ({ ...label(s), s: `Apple Music ${C} No. ${s.rank}` }));
  const nowKeys = new Set(nowList.map((s) => `${s.t}|${s.a}`));
  const fresh = songs
    .filter((s) => age(s) >= 0 && age(s) <= freshDays)
    .slice(0, 12)
    .map((s) => ({ ...label(s), s: `Out ${s.released}`, x: `No. ${s.rank} on Apple Music ${C}` }));
  const yearList = songs
    .filter((s) => s.released.startsWith(year) && !nowKeys.has(`${s.t}|${s.a}`))
    .slice(0, 5)
    .map((s) => ({ ...label(s), s: `Apple Music ${C} No. ${s.rank}` }));

  return {
    updated: today.toISOString().slice(0, 10),
    period: `Apple Music ${C} most played, updated daily`,
    now: nowList,
    fresh,
    year: yearList,
  };
}
