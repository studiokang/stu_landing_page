/**
 * Vercel Serverless — 협업 문의 폼 → Supabase collaboration_inquiries INSERT (service_role)
 * 이후 선택적으로 Resend로 알림 메일 발송 (기본 수신: business@studiokang.ai, jieuny@promlabs.ai)
 *
 * Supabase:
 *   SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (권장) 또는 anon 키 + RLS insert 정책
 *
 * 알림 메일 (선택 — RESEND_API_KEY 없으면 DB만 저장하고 메일은 생략):
 *   RESEND_API_KEY
 *   COLLAB_NOTIFY_EMAIL (미설정 시 위 두 주소 — 쉼표로 덮어쓰기 가능, 예: a@x.com,b@y.com)
 *   RESEND_FROM (기본: STUDIOKANG <onboarding@resend.dev> — 운영 시 도메인 인증 후 noreply@studiokang.ai 등으로 변경)
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

function trimStr(s, max) {
  if (s == null || s === undefined) return '';
  var t = String(s).trim();
  if (max && t.length > max) t = t.slice(0, max);
  return t;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 쉼표 구분 수신자 — COLLAB_NOTIFY_EMAIL 미설정 시 business + jieuny 고정 */
function parseNotifyEmails(raw) {
  var defaults = ['business@studiokang.ai', 'jieuny@promlabs.ai'];
  if (!raw || !String(raw).trim()) return defaults.slice();
  var list = String(raw).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  return list.length ? list : defaults.slice();
}

/**
 * Resend REST API — https://resend.com/docs/api-reference/emails/send-email
 * 실패해도 예외를 던지지 않음 (DB 저장은 이미 성공한 상태)
 */
function sendCollaborationNotifyEmail(env, row) {
  var apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('submit-collaboration: RESEND_API_KEY 없음 — 알림 메일 생략');
    return Promise.resolve();
  }

  var toList = parseNotifyEmails(env.COLLAB_NOTIFY_EMAIL || '');
  var from = (env.RESEND_FROM || 'STUDIOKANG <onboarding@resend.dev>').trim();
  var typesStr = (row.types && row.types.length) ? row.types.join(', ') : '(선택 없음)';
  var companyLine = row.companyName ? row.companyName : '(없음)';

  var text =
    '[협업 문의 폼 제출]\n\n' +
    '회사명: ' + companyLine + '\n' +
    '이름: ' + row.contactName + '\n' +
    '이메일: ' + row.email + '\n' +
    '연락처: ' + (row.phone || '(없음)') + '\n' +
    '협업 유형: ' + typesStr + '\n\n' +
    '--- 상세 내용 ---\n' +
    row.detail + '\n';

  var html =
    '<p style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;">' +
    '<strong>협업 문의</strong> (웹 폼)</p>' +
    '<table style="font-family:sans-serif;font-size:13px;border-collapse:collapse;margin:12px 0;">' +
    '<tr><td style="padding:4px 16px 4px 0;color:#666;">회사명</td><td>' + escapeHtml(companyLine) + '</td></tr>' +
    '<tr><td style="padding:4px 16px 4px 0;color:#666;">이름</td><td>' + escapeHtml(row.contactName) + '</td></tr>' +
    '<tr><td style="padding:4px 16px 4px 0;color:#666;">이메일</td><td><a href="mailto:' + escapeHtml(row.email) + '">' + escapeHtml(row.email) + '</a></td></tr>' +
    '<tr><td style="padding:4px 16px 4px 0;color:#666;">연락처</td><td>' + escapeHtml(row.phone || '(없음)') + '</td></tr>' +
    '<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top;">협업 유형</td><td>' + escapeHtml(typesStr) + '</td></tr>' +
    '</table>' +
    '<p style="font-family:sans-serif;font-size:13px;color:#666;">상세 내용</p>' +
    '<pre style="font-family:ui-monospace,monospace;font-size:12px;background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-word;">' +
    escapeHtml(row.detail) + '</pre>';

  var subj = '[협업 문의] ' + (row.companyName ? row.companyName + ' · ' : '') + row.contactName;
  if (subj.length > 180) subj = subj.slice(0, 177) + '…';

  var body = {
    from: from,
    to: toList,
    subject: subj,
    text: text,
    html: html,
    reply_to: [row.email]
  };

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (t) {
        console.error('submit-collaboration: Resend HTTP ' + res.status, t.slice(0, 500));
      });
    }
  }).catch(function (err) {
    console.error('submit-collaboration: Resend fetch error', err);
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

    var baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    var serviceKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim();
    if (!baseUrl || !serviceKey) {
      return res.status(500).json({
        error: 'Missing env',
        hint: 'Vercel에 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY(또는 anon 키)를 설정하세요.'
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

    var companyName = trimStr(payload.company_name, 500);
    var contactName = trimStr(payload.contact_name, 200);
    var email = trimStr(payload.email, 254);
    var phone = trimStr(payload.phone, 80);
    var detail = trimStr(payload.detail, 12000);

    var types = payload.collaboration_types;
    if (!Array.isArray(types)) {
      types = [];
    }
    types = types
      .map(function (t) { return trimStr(t, 120); })
      .filter(Boolean)
      .slice(0, 16);

    if (!contactName) {
      return res.status(400).json({ error: '이름이 필요합니다.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '유효한 이메일이 필요합니다.' });
    }
    if (!detail) {
      return res.status(400).json({ error: '상세 내용이 필요합니다.' });
    }

    var restUrl = baseUrl.replace(/\/$/, '') + '/rest/v1/collaboration_inquiries';
    var r = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        company_name: companyName || null,
        contact_name: contactName,
        email: email,
        phone: phone || null,
        collaboration_types: types,
        detail: detail
      })
    });

    if (!r.ok) {
      var errText = await r.text();
      return res.status(502).json({
        error: 'Supabase error',
        status: r.status,
        detail: errText.slice(0, 500)
      });
    }

    await sendCollaborationNotifyEmail(process.env, {
      companyName: companyName,
      contactName: contactName,
      email: email,
      phone: phone,
      types: types,
      detail: detail
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-collaboration', err);
    return res.status(500).json({
      error: 'Internal error',
      message: err && err.message ? String(err.message) : 'unknown'
    });
  }
};
