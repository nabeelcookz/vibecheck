import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAppleFeed, appleFeedUrl } from "../lib/apple.js";

const feed = {
  feed: {
    results: [
      { name: "Choosin' Texas", artistName: "Ella Langley", releaseDate: "2025-10-17", genres: [{ name: "Country" }, { name: "Music" }] },
      { name: "Last Thing You Need", artistName: "Morgan Wallen", releaseDate: "2026-09-17", genres: [{ name: "Country" }] },
      { name: "All I Want for Christmas Is You", artistName: "Mariah Carey", releaseDate: "1994-10-28", genres: ["Music (id 34)", "Holiday (id 8)"] },
      { name: "Brand New", artistName: "Fresh Artist", releaseDate: "2026-11-20", genres: [{ name: "Pop" }] },
      { name: "", artistName: "Broken" },
    ],
  },
};
const today = new Date("2026-11-24T12:00:00Z");

test("parses ranks, labels and genres", () => {
  const c = parseAppleFeed(feed, { today, country: "ae" });
  assert.equal(c.now[0].t, "Choosin' Texas");
  assert.equal(c.now[0].s, "Apple Music AE No. 1");
  assert.equal(c.now[0].g, "Country");
  assert.equal(c.now[2].g, "Holiday");
  assert.equal(c.now.length, 4); // the entry with no title is dropped
});

test("fresh = charting songs released in the last 3 weeks", () => {
  const c = parseAppleFeed(feed, { today });
  assert.deepEqual(c.fresh.map((s) => s.t), ["Brand New"]);
  assert.equal(c.fresh[0].s, "Out 2026-11-20");
});

test("year excludes songs already in the top list", () => {
  const c = parseAppleFeed(feed, { today, top: 1 });
  assert.deepEqual(c.year.map((s) => s.t), ["Last Thing You Need", "Brand New"]);
});

test("handles an empty or malformed feed", () => {
  assert.deepEqual(parseAppleFeed(null, { today }).now, []);
  assert.deepEqual(parseAppleFeed({ feed: { results: "x" } }, { today }).fresh, []);
});

test("feed URL is country-scoped", () => {
  assert.equal(appleFeedUrl("gb", 50), "https://rss.marketingtools.apple.com/api/v2/gb/music/most-played/50/songs.json");
});
