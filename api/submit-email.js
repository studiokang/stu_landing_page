/**
 * Vercel Serverless — 브라우저 대신 서버에서 Supabase로 INSERT (service_role)
 *
 * Vercel → 프로젝트 → Settings → Environment Variables 에 추가:
 *   SUPABASE_URL          = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = Settings → API 의 secret service_role (JWT eyJ... 형태)
 *
 * (NEXT_PUBLIC_* 와 달리 서버 전용이라 클라이언트에 노출되지 않음)
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
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var baseUrl = process.env.SUPABASE_URL || '';
  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!baseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
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
};
