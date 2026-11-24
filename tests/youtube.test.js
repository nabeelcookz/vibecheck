import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListId, songFromItem, isPrivateAutoList, isMix } from "../lib/youtube.js";
import { buildPicksPrompt } from "../lib/prompt.js";

test("parseListId reads YouTube Music, YouTube and bare IDs", () => {
  assert.equal(parseListId("https://music.youtube.com/playlist?list=PLabcdefghij123&si=xyz"), "PLabcdefghij123");
  assert.equal(parseListId("https://www.youtube.com/watch?v=abc&list=OLAK5uy_kPm-123456"), "OLAK5uy_kPm-123456");
  assert.equal(parseListId("PLabcdefghij123"), "PLabcdefghij123");
});

test("detects Liked Music and other private auto-lists", () => {
  assert.equal(isPrivateAutoList("https://music.youtube.com/playlist?list=LM"), true);
  assert.equal(isPrivateAutoList("WL"), true);
  assert.equal(isPrivateAutoList("https://music.youtube.com/playlist?list=PLabcdefghij123"), false);
});

test("detects auto-generated Mixes", () => {
  assert.equal(isMix("https://youtube.com/playlist?list=RDwkz07LzGpcY&playnext=1&si=abc"), true);
  assert.equal(isMix("https://music.youtube.com/playlist?list=PLabcdefghij123"), false);
});

test("parseListId rejects private auto-lists and junk", () => {
  assert.equal(parseListId("https://music.youtube.com/playlist?list=LM"), "");
  assert.equal(parseListId("not a link"), "");
  assert.equal(parseListId(""), "");
});

const item = (title, channel, id = "vid12345678") => ({ title, videoOwnerChannelTitle: channel, resourceId: { videoId: id } });

test("YouTube Music 'Topic' tracks use the channel as the artist", () => {
  assert.deepEqual(songFromItem(item("Blinding Lights", "The Weeknd - Topic")), { t: "Blinding Lights", a: "The Weeknd", id: "vid12345678" });
});

test("music videos split 'Artist - Song' and drop (Official Video) tags", () => {
  assert.deepEqual(songFromItem(item("Dua Lipa - Go Easy (Official Music Video)", "Dua Lipa")), { t: "Go Easy", a: "Dua Lipa", id: "vid12345678" });
  assert.equal(songFromItem(item("Amr Diab - Tamally Maak [Lyrics]", "Some Channel")).t, "Tamally Maak");
});

test("falls back to the channel name, minus VEVO", () => {
  assert.deepEqual(songFromItem(item("Hello", "AdeleVEVO")), { t: "Hello", a: "Adele", id: "vid12345678" });
});

test("skips deleted and private videos", () => {
  assert.equal(songFromItem(item("Deleted video", "")), null);
  assert.equal(songFromItem(item("Private video", "")), null);
  assert.equal(songFromItem({ title: "No id" }), null);
});

test("prompt separates hand ratings from imported playlist songs", () => {
  const ratings = [{ t: "Mine", a: "Me", r: 9 }];
  for (let i = 0; i < 120; i++) ratings.push({ t: `Imported ${i}`, a: "Band", r: 8, src: "playlist" });
  const p = buildPicksPrompt({ feel: "Chill", profile: { ratings } });
  assert.match(p, /9\/10 Mine by Me/);
  assert.match(p, /From their own playlists \(120 songs/);
  assert.doesNotMatch(p, /8\/10 Imported/); // imported songs aren't listed as hand ratings
  assert.match(p, /Imported 0 by Band/);
  assert.match(p, /Imported 100 by Band/); // sample spans the whole library
});
