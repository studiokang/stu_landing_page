/**
 * Vercel Serverless — 브라우저 대신 서버에서 Supabase로 INSERT (service_role)
 *
 * Vercel Environment Variables (하나 이상 조합):
 *   SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (권장) 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY (anon이면 RLS insert 필요)
 */

function readBodyStream(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try {
        var raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  try {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* URL: 전용 이름 또는 이미 넣어 둔 NEXT_PUBLIC_* */
  var baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  /* 키: service_role(권장) 또는 anon/publishable — RLS가 anon insert 허용이어야 함 */
  var serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  if (!baseUrl || !serviceKey) {
    return res.status(500).json({
      error: 'Missing env',
      hint: 'Vercel에 SUPABASE_URL(또는 NEXT_PUBLIC_SUPABASE_URL)과 SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.'
    });
  }

  var payload = req.body;
  if (payload === undefined || payload === null) {
    try {
      payload = await readBodyStream(req);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  } else if (typeof payload === 'string') {
    try {
      payload = payload ? JSON.parse(payload) : {};
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  if (!payload || typeof payload !== 'object') {
    payload = {};
  }

  var email = (payload && payload.email) ? String(payload.email).trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  var restUrl = baseUrl.replace(/\/$/, '') + '/rest/v1/contact_emails';
  var r = await fetch(restUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ email: email })
  });

  if (!r.ok) {
    var errText = await r.text();
    return res.status(502).json({
      error: 'Supabase error',
      status: r.status,
      detail: errText.slice(0, 500)
    });
  }

  return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-email', err);
    return res.status(500).json({
      error: 'Internal error',
      message: err && err.message ? String(err.message) : 'unknown'
    });
  }
};
