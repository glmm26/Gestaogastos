const buckets = new Map();

function rateLimit(key, { max, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= max;
}

function getClientKey(req) {
  return req.socket.remoteAddress || 'unknown';
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > 30 * 60 * 1000) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();

module.exports = { rateLimit, getClientKey };
