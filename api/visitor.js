// api/visitor.js - Vercel Serverless Function for Real-Time Active Visitor Count
const activeVisitorsMap = new Map();

export default function handler(req, res) {
  // CORS Headers for production
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      body = {};
    }
  }

  const visitorId = body.visitorId || req.query.id || req.query.visitorId;
  const action = body.action || req.query.action || 'heartbeat';

  const now = Date.now();

  if (visitorId) {
    if (action === 'leave') {
      activeVisitorsMap.delete(visitorId);
    } else {
      activeVisitorsMap.set(visitorId, now);
    }
  }

  // Purge stale sessions (> 10 seconds since last heartbeat)
  for (const [vid, lastSeen] of activeVisitorsMap.entries()) {
    if (now - lastSeen > 10000) {
      activeVisitorsMap.delete(vid);
    }
  }

  const count = Math.max(1, activeVisitorsMap.size);

  res.status(200).json({ count });
}
