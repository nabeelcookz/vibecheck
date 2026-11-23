// Fallback chart data used when the live refresh fails or no API key is configured.
// Researched November 24, 2026 (Billboard Hot 100, Spotify Global weekly, New Music Friday Nov 20).
export const SEED_CHARTS = {
  updated: "2026-11-24",
  period: "late Oct to mid Nov 2026",
  freshWhen: "New Music Friday, Nov 20, 2026",
  now: [
    { t: "Choosin' Texas", a: "Ella Langley", g: "Country", s: "Hot 100 No. 1", x: "Record 26 weeks at No. 1" },
    { t: "Housewife", a: "Tate McRae", g: "Pop", s: "Spotify Global No. 1" },
    { t: "Dracula", a: "Tame Impala & JENNIE", g: "Psych-pop", s: "Hot 100 top 5" },
    { t: "BbY WOW", a: "KAROL G, Judeline & rusowsky", g: "Latin", s: "Spotify Global top 3" },
    { t: "Boston", a: "Stella Lefty", g: "Country", s: "Hot 100 top 5" },
    { t: "Nicole Kidman", a: "ADÉLA", g: "Pop", s: "Spotify Global top 5" },
    { t: "Ain't In LA", a: "ADÉLA", g: "Pop", s: "Spotify Global top 5" },
    { t: "Been By Now", a: "Morgan Wallen", g: "Country", s: "Hot 100 top 5" },
    { t: "Patient Zero", a: "Taylor Swift", g: "Pop", s: "Spotify Global top 10" },
    { t: "the cure", a: "Olivia Rodrigo", g: "Pop rock", s: "Spotify Global top 10" },
  ],
  fresh: [
    { t: "A Place To Go", a: "THE KID LAROI", g: "Pop", s: "Out Nov 20" },
    { t: "The Vacation Song", a: "Kacey Musgraves", g: "Country", s: "Out Nov 20" },
    { t: "Where's Our Love", a: "Macklemore", g: "Hip-hop", s: "Out Nov 20" },
    { t: "Evil", a: "CHVRCHES", g: "Synth-pop", s: "Out Nov 20" },
    { t: "Come Back Home", a: "Blondie", g: "Rock", s: "Out Nov 20" },
    { t: "Piece of Your Love", a: "MEDUZA & Chromeo", g: "Dance", s: "Out Nov 20" },
    { t: "Be Free", a: "BLOND:ISH & HAYLA", g: "Dance", s: "Out Nov 20" },
    { t: "Innerbloom XI", a: "RÜFÜS DU SOL & Hans Zimmer", g: "Electronic", s: "Out Nov 20" },
  ],
  year: [
    { t: "hate that i made you love me", a: "Ariana Grande", g: "Pop", s: "Spotify Song of Summer" },
    { t: "Dai Dai", a: "Shakira & Burna Boy", g: "Afro-Latin", s: "World Cup anthem" },
    { t: "Rein Me In", a: "Sam Fender & Olivia Dean", g: "Indie rock", s: "Spotify Song of Summer" },
    { t: "Die With A Smile", a: "Lady Gaga & Bruno Mars", g: "Pop ballad", s: "Most-streamed of 2026" },
  ],
};
