// Small helpers shared by the API routes.

export function send(res, status, data, { cache } = {}) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", cache || "no-store");
  res.end(JSON.stringify(data));
}

/** Optional shared passcode so strangers can't spend your API credits. Set APP_PASSCODE to enable. */
export function checkPasscode(req, res) {
  const need = process.env.APP_PASSCODE;
  if (!need) return true;
  if (req.headers["x-app-passcode"] === need) return true;
  send(res, 401, { error: "passcode_required" });
  return false;
}

// Best-effort in-memory rate limit per IP (resets when the serverless instance recycles).
const hits = new Map();
export function rateLimit(req, res, { max = 20, windowMs = 60 * 60 * 1000 } = {}) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    send(res, 429, { error: "rate_limited" });
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
