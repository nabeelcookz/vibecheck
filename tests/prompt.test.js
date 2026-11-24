import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeProfile, genreAverages, buildPicksPrompt, buildFreshPrompt,
  extractJson, cleanPicks, cleanCharts, songKey,
} from "../lib/prompt.js";

test("sanitizeProfile clamps ratings to 1-10 and drops junk", () => {
  const p = sanitizeProfile({
    ratings: [
      { t: "A", a: "X", r: 14 },
      { t: "B", a: "Y", r: -3 },
      { t: "", a: "Z", r: 5 },
      { t: "C", a: "W", r: "7.6", m: "Sad" },
    ],
    genres: ["Pop", 42, ""],
  });
  assert.deepEqual(p.ratings.map((r) => r.r), [10, 1, 8]);
  assert.equal(p.ratings[2].m, "Sad");
  assert.deepEqual(p.genres, ["Pop", "42"]);
});

test("sanitizeProfile strips control characters and caps length", () => {
  const p = sanitizeProfile({ notes: "hi\u0000there" + "x".repeat(2000) });
  assert.ok(!p.notes.includes("\u0000"));
  assert.equal(p.notes.length, 800);
});

test("genreAverages sorts best genres first", () => {
  const out = genreAverages([
    { g: "Country", r: 2 }, { g: "R&B", r: 9 }, { g: "R&B", r: 8 }, { g: "", r: 5 },
  ]);
  assert.equal(out, "R&B 8.5 (2), Country 2.0 (1)");
});

test("picks prompt weighs same-mood ratings and includes mood hint", () => {
  const prompt = buildPicksPrompt({
    feel: "Workout",
    profile: { ratings: [{ t: "Till I Collapse", a: "Eminem", r: 10, m: "Workout" }, { t: "Someone Like You", a: "Adele", r: 9, m: "Sad" }] },
  });
  assert.match(prompt, /CURRENT MOOD: Workout/);
  assert.match(prompt, /120-160 BPM/);
  assert.match(prompt, /THIS mood \(weigh these most\): 10\/10 Till I Collapse by Eminem/);
  assert.doesNotMatch(prompt, /THIS mood \(weigh these most\):[^\n]*Adele/);
});

test("sleep queues are longer", () => {
  assert.match(buildPicksPrompt({ feel: "Sleep" }), /12-song/);
  assert.match(buildPicksPrompt({ feel: "Sad" }), /10-song/);
});

test("new-releases prompt carries today's date", () => {
  assert.match(buildFreshPrompt("2026-11-24"), /Today is 2026-11-24/);
});

test("extractJson handles prose, code fences and braces inside strings", () => {
  assert.deepEqual(extractJson('Sure! ```json\n{"a":1,"b":"}"}\n```'), { a: 1, b: "}" });
  assert.equal(extractJson("no json here"), null);
  assert.equal(extractJson('{"broken": }'), null);
});

test("cleanPicks removes already-seen and duplicate songs and labels new releases", () => {
  const picks = cleanPicks(
    { picks: [
      { title: "Blinding Lights", artist: "The Weeknd", trending: false },
      { title: "Seen Song", artist: "Someone" },
      { title: "blinding lights", artist: "the weeknd" },
      { title: "A Place To Go", artist: "THE KID LAROI", trending: true },
      { title: "Choosin' Texas", artist: "Ella Langley", trending: true },
      { title: "", artist: "Nobody" },
    ] },
    { seen: ["seen song — someone"], fresh: [{ t: "A Place To Go", a: "THE KID LAROI" }] },
  );
  assert.deepEqual(picks.map((p) => p.t), ["Blinding Lights", "A Place To Go", "Choosin' Texas"]);
  assert.equal(picks[1].s, "New this week");
  assert.equal(picks[2].s, "Trending");
});

test("cleanCharts tolerates missing fields", () => {
  const c = cleanCharts({ now: [{ t: "A", a: "B" }, { t: "no artist" }], fresh: "nope" });
  assert.equal(c.now.length, 1);
  assert.deepEqual(c.fresh, []);
  assert.equal(songKey(c.now[0]), "a — b");
});
