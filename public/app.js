// Vibecheck front end. No framework, no build step: one ES module.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const key = (s) => `${s.t} — ${s.a}`.toLowerCase().trim();

const FEEL = ["Motivated", "Sad", "Main character", "Sleep", "Workout", "Chill", "Romantic", "Nostalgic"];
const GENRES = ["Pop", "Hip-hop", "R&B", "Country", "Latin", "Afrobeats", "K-pop", "Indie", "Rock", "Electronic", "Arabic pop", "Jazz", "Soul", "Lo-fi", "Classical", "Metal"];
const SVC = {
  ytmusic: { n: "YouTube Music", u: (q) => `https://music.youtube.com/search?q=${q}` },
  apple: { n: "Apple Music", u: (q) => `https://music.apple.com/search?term=${q}` },
  spotify: { n: "Spotify", u: (q) => `https://open.spotify.com/search/${q}` },
  youtube: { n: "YouTube", u: (q) => `https://www.youtube.com/results?search_query=${q}` },
};

/* ---------------- state (persisted in localStorage) ---------------- */
const STORE = "vibecheck.v1";
const OLD_STORE = "star_boa.v1"; // the app used to be called STAR_BOA; carry old data over
const blank = () => ({ genres: [], artists: "", notes: "", svc: "ytmusic", ratings: [], seen: [], moodLog: [], queue: [], qi: 0, qMood: "", qFeel: "", qWords: "", qPlaylist: "", yt: {}, imports: [] });
let P = load();
let charts = loadCharts();
let feel = "";

function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(STORE) || localStorage.getItem(OLD_STORE) || "{}") }; } catch { return blank(); }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(P)); $("memPill").innerHTML = "Memory: <b>saved on this device</b>"; }
  catch { $("memPill").innerHTML = "Memory: <b>not available</b>"; }
}
function loadCharts() {
  try { return JSON.parse(localStorage.getItem("vibecheck.charts")) || { now: [], fresh: [], year: [] }; } catch { return { now: [], fresh: [], year: [] }; }
}

/* ---------------- rendering ---------------- */
const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${255 + (h % 70)} 90% ${55 + (h % 15)}%)`; };
const rateOf = (s) => P.ratings.find((x) => key(x) === key(s))?.r || 0;
const svcOrder = () => { const m = SVC[P.svc] ? P.svc : "ytmusic"; return [m, ...Object.keys(SVC).filter((x) => x !== m)]; };
const q = (s) => encodeURIComponent(`${s.t} ${s.a}`);

function rateRow(src, i, s) {
  const r = rateOf(s);
  let h = `<div class="rate" role="group" aria-label="Rate ${esc(s.t)} 1 to 10">`;
  for (let n = 1; n <= 10; n++) h += `<button type="button" data-act="rate" data-src="${src}" data-i="${i}" data-r="${n}" aria-pressed="${r === n}">${n}</button>`;
  return h + "</div>";
}
function links(s, { first = true } = {}) {
  return svcOrder().map((x, j) => `<a class="btn${first && j === 0 ? " on" : ""}" href="${SVC[x].u(q(s))}" target="_blank" rel="noopener">${SVC[x].n}</a>`).join("");
}
function card(s, i, src) {
  const r = rateOf(s);
  const isQ = src === "queue";
  return `<li class="song${isQ && i === P.qi ? " cur" : ""}">
    <div class="lbl"><i style="--h:${hue(key(s))}"></i></div>
    <div>
      <div class="t">${esc(s.t)}</div><div class="a">${esc(s.a)}</div>
      ${s.why || s.x ? `<p class="why">${esc(s.why || s.x)}</p>` : ""}
      <div class="tags">${s.g ? `<span class="tag">${esc(s.g)}</span>` : ""}${s.s ? `<span class="tag src">${esc(s.s)}</span>` : ""}</div>
      <p class="rq">${r ? `You rated it <span class="score">${r}/10</span>` : "Rate it 1–10"}</p>
      ${rateRow(src, i, s)}
      <div class="acts">${isQ ? `<button type="button" data-act="jump" data-i="${i}">${i === P.qi ? "Now playing" : "Play this"}</button>` : ""}${links(s)}</div>
    </div></li>`;
}
const SRC = { queue: () => P.queue, fresh: () => charts.fresh, now: () => charts.now, year: () => charts.year };

function renderCharts() {
  const empty = `<p class="empty">Nothing here yet.</p>`;
  $("trendFresh").innerHTML = charts.fresh?.length ? charts.fresh.map((s, i) => card(s, i, "fresh")).join("") : empty;
  $("trendNow").innerHTML = charts.now?.length ? charts.now.map((s, i) => card(s, i, "now")).join("") : empty;
  $("trendYear").innerHTML = charts.year?.length ? charts.year.map((s, i) => card(s, i, "year")).join("") : empty;
  $("freshWhen").textContent = charts.freshWhen ? `From ${charts.freshWhen}.` : "";
  if (charts.updated) $("chartWhen").textContent = `Updated ${charts.updated}${charts.period ? ` · ${charts.period}` : ""}${charts.live === false ? " · offline copy" : ""}.`;
}
function renderQueue() {
  $("picks").innerHTML = P.queue.map((s, i) => card(s, i, "queue")).join("");
  $("picksHead").hidden = !P.queue.length;
  renderNP();
}
function renderNP() {
  const s = P.queue[P.qi];
  $("np").hidden = !s;
  if (!s) return;
  $("npT").textContent = s.t;
  $("npA").textContent = s.a;
  $("npWhy").textContent = s.why || "";
  $("npMood").textContent = P.qMood ? `Queue for: ${P.qMood}` : "Your queue";
  const r = rateOf(s);
  $("npQ").innerHTML = r ? `You rated it <span class="score">${r}/10</span>. Tap to change.` : "How much do you like it, 1–10?";
  $("npRate").innerHTML = rateRow("queue", P.qi, s);
  $("npAlt").innerHTML = links(s, { first: false });
  $("npPos").textContent = `Song ${P.qi + 1} of ${P.queue.length}${ytReady ? " · plays the next one automatically" : ""}`;
  $("openPl").hidden = !P.qPlaylist;
  if (P.qPlaylist) $("openPl").href = P.qPlaylist;
  $("mkPl").hidden = Boolean(P.qPlaylist);
  $("prev").disabled = P.qi <= 0;
  $("next").textContent = P.qi >= P.queue.length - 1 ? "More" : "Next";
}
function chips(el, all, sel, attr = "data-v") {
  el.innerHTML = all.map(([v, label]) => `<button type="button" ${attr}="${esc(v)}" aria-pressed="${sel.includes(v)}">${esc(label)}</button>`).join("");
}
function renderTaste() {
  chips($("svc"), Object.entries(SVC).map(([k, v]) => [k, v.n]), [SVC[P.svc] ? P.svc : "ytmusic"], "data-svc");
  chips($("genres"), GENRES.map((g) => [g, g]), P.genres, "data-genre");
  if (document.activeElement !== $("artists")) $("artists").value = P.artists;
  if (document.activeElement !== $("notes")) $("notes").value = P.notes;
  $("plList").innerHTML = P.imports.map((p) => `<span>${esc(p.title)} · ${p.n} songs<button type="button" aria-label="Remove ${esc(p.title)}" data-rmpl="${esc(p.id)}">×</button></span>`).join("");
  const rated = P.ratings.filter((r) => r.src !== "playlist").sort((a, b) => b.r - a.r || (b.at || 0) - (a.at || 0));
  $("ratedList").innerHTML = rated.length
    ? rated.map((s) => `<span><b class="score">${s.r}</b>&nbsp;${esc(s.t)} · ${esc(s.a)}${s.m ? ` <i>(${esc(s.m)})</i>` : ""}<button type="button" aria-label="Remove ${esc(s.t)}" data-unrate="${esc(key(s))}">×</button></span>`).join("")
    : `<p class="empty">Nothing rated yet. Rate any song 1–10 and it shows up here.</p>`;
}
function renderFeel() { chips($("feel"), FEEL.map((f) => [f, f]), feel ? [feel] : [], "data-feel"); }
function renderAll() { renderQueue(); renderCharts(); renderTaste(); renderFeel(); }

/* ---------------- API ---------------- */
function passcode() { try { return localStorage.getItem("vibecheck.pass") || localStorage.getItem("star_boa.pass") || ""; } catch { return ""; } }
async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "content-type": "application/json", "x-app-passcode": passcode(), ...(opts.headers || {}) } });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && data.error === "passcode_required") { await askPasscode(); return api(path, opts); }
  if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status, code: data.error });
  return data;
}
function askPasscode() {
  return new Promise((resolve) => {
    const d = $("passDlg");
    d.addEventListener("close", () => { try { localStorage.setItem("vibecheck.pass", $("passInput").value); } catch {} resolve(); }, { once: true });
    d.showModal();
  });
}
async function refreshCharts() {
  try {
    const c = await api("/api/charts");
    if (c?.now?.length) { charts = c; try { localStorage.setItem("vibecheck.charts", JSON.stringify(c)); } catch {} renderCharts(); }
  } catch { if (!charts.now?.length) $("chartWhen").textContent = "Couldn't load charts. Check your connection."; }
}

let busy = false;
// mode: "new" (from the mood picker), "more" (append when the queue runs out), "refresh" (swap in a fresh queue, same mood)
async function makeQueue(mode = "new") {
  const more = mode === "more", reuse = mode !== "new";
  if (busy) return;
  const msg = $("goMsg");
  msg.className = "msg";
  const words = $("words").value.trim();
  const f = reuse ? P.qFeel : feel;
  const w = reuse ? P.qWords : words;
  if (!f && !w) { msg.className = "msg err"; msg.textContent = "Pick a mood or type how you feel first."; return; }
  busy = true; $("go").disabled = true; $("refresh").disabled = true; $("hero").classList.add("spin"); $("heroTitle").textContent = "Building your queue…";
  try {
    const { picks } = await api("/api/picks", {
      method: "POST",
      body: JSON.stringify({
        feel: f, words: w,
        profile: { genres: P.genres, artists: P.artists, notes: P.notes, ratings: P.ratings, seen: P.seen, moodLog: P.moodLog },
        charts: { now: charts.now || [], fresh: charts.fresh || [] },
      }),
    });
    const label = [f, w].filter(Boolean).join(": ");
    if (more) P.queue = P.queue.concat(picks); else { P.queue = picks; P.qi = 0; }
    P.qMood = label; P.qFeel = f; P.qWords = w;
    if (mode === "new") P.moodLog = [{ m: label, at: Date.now() }, ...P.moodLog].slice(0, 30);
    P.qPlaylist = ""; // the queue changed, so any YouTube playlist made from it is stale
    P.seen = P.seen.concat(picks.map(key)).slice(-200);
    save(); renderQueue();
    msg.textContent = mode === "refresh" ? "Fresh queue, same mood." : "Queue ready. Rate songs 1–10 as they play; the next queue learns from it.";
    if (more) step(1);
    else if (mode === "refresh") { $("plStatus").textContent = "Fresh queue ready."; if (player) playCurrent(); }
    else $("np").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  } catch (e) {
    msg.className = "msg err";
    msg.textContent = e.status === 429 ? "Hit the free daily limit. Try again in a little while." : "Couldn't build a queue that time. Try again.";
  } finally {
    busy = false; $("go").disabled = false; $("refresh").disabled = false; $("hero").classList.remove("spin"); $("heroTitle").textContent = "How are you feeling?";
  }
}

/* ---------------- YouTube player (autoplays the queue) ---------------- */
let player = null, ytReady = false, ytOff = false, playing = false;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = resolve;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = reject;
    document.head.append(s);
  });
}
async function videoId(s) {
  const k = key(s);
  if (P.yt[k]) return P.yt[k];
  const { id } = await api(`/api/youtube?q=${q(s)}`);
  P.yt[k] = id; save();
  return id;
}
async function playCurrent() {
  const s = P.queue[P.qi];
  if (!s || ytOff) return;
  let id;
  try { id = await videoId(s); }
  catch (e) {
    if (e.status === 501) { ytOff = true; $("playPause").textContent = "Open in app"; renderNP(); return; }
    return step(1); // couldn't find this one; skip it
  }
  $("playerBox").hidden = false;
  if (!player) {
    await loadYT();
    player = new YT.Player("ytPlayer", {
      videoId: id,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onReady: (e) => { ytReady = true; e.target.playVideo(); renderNP(); },
        onStateChange: (e) => {
          playing = e.data === YT.PlayerState.PLAYING;
          $("playPause").textContent = playing ? "Pause" : "Play";
          if (e.data === YT.PlayerState.ENDED) next();
        },
        onError: () => next(),
      },
    });
  } else {
    player.loadVideoById(id);
  }
}
function step(d) {
  P.qi = Math.max(0, Math.min(P.queue.length - 1, P.qi + d));
  save(); renderQueue();
  if (player) playCurrent();
}
function next() { if (P.qi >= P.queue.length - 1) makeQueue("more"); else step(1); }

/* ---------------- one-tap YouTube playlist ---------------- */
// youtube.com/watch_videos?video_ids=a,b,c opens the videos as a playlist in YouTube's app or site,
// with no sign-in. From there you can save it to your library.
async function makePlaylist() {
  const status = $("plStatus");
  const songs = P.queue.slice(0, 25);
  if (!songs.length) return;
  status.className = "msg"; status.textContent = "Finding your songs on YouTube…";
  $("mkPl").disabled = true;
  const ids = [];
  try {
    for (let i = 0; i < songs.length; i += 4) {
      const batch = await Promise.allSettled(songs.slice(i, i + 4).map(videoId));
      for (const r of batch) {
        if (r.status === "fulfilled" && r.value) ids.push(r.value);
        else if (r.reason?.status === 501) throw r.reason;
      }
      status.textContent = `Finding your songs on YouTube… ${Math.min(i + 4, songs.length)}/${songs.length}`;
    }
    if (!ids.length) throw new Error("none found");
    P.qPlaylist = `https://www.youtube.com/watch_videos?video_ids=${ids.join(",")}`;
    save(); renderNP();
    status.textContent = `Playlist ready with ${ids.length} songs. Tap Open, then use Save in YouTube to keep it.`;
  } catch (e) {
    status.className = "msg err";
    status.textContent = e.status === 501 ? "YouTube playlists need the YouTube API key set up on the server."
      : e.status === 429 ? "Hit today's YouTube lookup limit. Try again tomorrow."
      : "Couldn't build the playlist. Try again.";
  } finally {
    $("mkPl").disabled = false;
  }
}

/* ---------------- events ---------------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.feel) { feel = feel === d.feel ? "" : d.feel; renderFeel(); return; }
  if (d.svc) { P.svc = d.svc; save(); renderAll(); return; }
  if (d.genre) { const j = P.genres.indexOf(d.genre); j < 0 ? P.genres.push(d.genre) : P.genres.splice(j, 1); save(); renderTaste(); return; }
  if (d.rmpl) {
    P.ratings = P.ratings.filter((r) => !(r.src === "playlist" && r.pl === d.rmpl));
    P.imports = P.imports.filter((p) => p.id !== d.rmpl);
    save(); renderAll(); $("plMsg").textContent = "Playlist removed. Songs you rated yourself were kept.";
    return;
  }
  if (d.unrate) { P.ratings = P.ratings.filter((x) => key(x) !== d.unrate); save(); renderAll(); return; }
  if (d.act === "jump") { P.qi = +d.i; save(); renderQueue(); playCurrent(); $("np").scrollIntoView({ block: "nearest" }); return; }
  if (d.act === "rate") {
    const s = SRC[d.src]()[+d.i];
    if (!s) return;
    P.ratings = [{ t: s.t, a: s.a, g: s.g || "", r: +d.r, m: d.src === "queue" ? P.qFeel : "", at: Date.now() }, ...P.ratings.filter((x) => key(x) !== key(s))].slice(0, 600);
    save(); renderAll();
    // Rating a song in the player before it ends means "next, please" only if it's low.
    if (b.closest("#np") && +d.r <= 3) setTimeout(next, 500);
    return;
  }
  switch (b.id) {
    case "prev": return step(-1);
    case "next": return next();
    case "mkPl": return makePlaylist();
    case "refresh": return makeQueue("refresh");
    case "playPause":
      if (ytOff) { window.open(SVC[svcOrder()[0]].u(q(P.queue[P.qi])), "_blank", "noopener"); return; }
      if (!player) return playCurrent();
      return playing ? player.pauseVideo() : player.playVideo();
    case "exportBtn": return copyData();
    case "importBtn": return importData();
    case "clear": return forget(b);
  }
});
$("askForm").addEventListener("submit", (e) => { e.preventDefault(); makeQueue("new"); });
$("importForm").addEventListener("submit", (e) => { e.preventDefault(); importPlaylist(); });

const PL_ERRORS = {
  bad_playlist_link: "That doesn't look like a playlist link. In YouTube Music, open the playlist and use ⋮ → Share → Copy link.",
  mix_not_playlist: "That's a YouTube Mix (auto-generated radio), not a playlist, and Mixes can't be read. Add the songs you like to one of your own playlists, set it to Unlisted, and import that link instead.",
  private_auto_list: "Liked Music is always private, so it can't be imported directly. In YouTube Music, open it, tap ⋮ → Save to playlist → New playlist, set it to Unlisted, then import that link.",
  playlist_not_found_or_private: "Couldn't open that playlist. Make sure it's Public or Unlisted, not Private. (Liked Music is always private: save it to a new Unlisted playlist first.)",
  youtube_not_configured: "Playlist import needs the YouTube API key set up on the server.",
  rate_limited: "Too many imports just now. Try again in a bit.",
};
async function importPlaylist() {
  const link = $("plLink").value.trim();
  const msg = $("plMsg");
  msg.className = "msg";
  if (!link) { msg.className = "msg err"; msg.textContent = "Paste a playlist link first."; return; }
  $("plGo").disabled = true; msg.textContent = "Reading your playlist…";
  try {
    const pl = await api(`/api/playlist?list=${encodeURIComponent(link)}`);
    const have = new Set(P.ratings.map(key));
    const fresh = pl.songs.filter((s) => !have.has(key(s)));
    for (const s of pl.songs) if (s.id) P.yt[key(s)] = s.id; // saves a YouTube search per song later
    P.ratings = P.ratings.concat(fresh.map((s) => ({ t: s.t, a: s.a, g: "", r: 8, m: "", src: "playlist", pl: pl.id, at: Date.now() }))).slice(0, 600);
    P.imports = [{ id: pl.id, title: pl.title, n: fresh.length, at: Date.now() }, ...P.imports.filter((p) => p.id !== pl.id)];
    save(); renderAll();
    $("plLink").value = "";
    const skipped = pl.songs.length - fresh.length;
    msg.textContent = `Imported ${fresh.length} songs from "${pl.title}"${skipped ? ` (${skipped} you'd already rated)` : ""}${pl.more ? ". Only the first 200 are read" : ""}. Your next queue will use them.`;
  } catch (e) {
    msg.className = "msg err";
    msg.textContent = PL_ERRORS[e.code] || "Couldn't import that playlist. Try again.";
  } finally {
    $("plGo").disabled = false;
  }
}
let typing = 0;
for (const id of ["artists", "notes"]) $(id).addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => { P.artists = $("artists").value.slice(0, 400); P.notes = $("notes").value.slice(0, 800); save(); }, 400);
});

async function copyData() {
  const out = JSON.stringify({ ...P, yt: {} });
  try { await navigator.clipboard.writeText(out); $("dataMsg").textContent = "Copied. Paste it into Vibecheck on your other device."; }
  catch { $("importBox").hidden = false; $("importBox").value = out; $("importBox").select(); $("dataMsg").textContent = "Copy the text above."; }
}
function importData() {
  const box = $("importBox");
  if (box.hidden || !box.value.trim()) { box.hidden = false; box.value = ""; box.focus(); $("dataMsg").textContent = "Paste your data, then tap Paste data again."; return; }
  try {
    const d = JSON.parse(box.value);
    if (!Array.isArray(d.ratings)) throw 0;
    P = { ...blank(), ...d }; save(); renderAll();
    box.hidden = true; $("dataMsg").textContent = `Imported ${P.ratings.length} ratings.`;
  } catch { $("dataMsg").textContent = "That doesn't look like Vibecheck data."; }
}
let armed = false;
function forget(b) {
  if (!armed) { armed = true; b.textContent = "Tap again to confirm"; setTimeout(() => { armed = false; b.textContent = "Forget everything"; }, 4000); return; }
  armed = false; b.textContent = "Forget everything";
  P = blank(); save(); renderAll(); $("dataMsg").textContent = "Done. Starting fresh.";
}

/* ---------------- routing ---------------- */
function route() {
  const v = ["mood", "trending", "taste"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "mood";
  for (const a of document.querySelectorAll("nav a")) a.dataset.v === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  for (const s of document.querySelectorAll("section")) s.hidden = s.id !== `v-${v}`;
}
addEventListener("hashchange", route);

route();
renderAll();
save();
refreshCharts();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
