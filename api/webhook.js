import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;

  const entries = String(signatureHeader)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const timestamp = entries.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = entries
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestamp || !signatures.length) return false;

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return json(res, 500, { ok: false, error: 'stripe_webhook_secret_missing' });
    }

    const rawBody = await getRawBody(req);
    const signatureHeader = req.headers['stripe-signature'];

    const isValidSignature = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValidSignature) {
      return json(res, 400, { ok: false, error: 'invalid_stripe_signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8') || '{}');

    if (event.type !== 'checkout.session.completed') {
      return json(res, 200, { ok: true, ignored: true, event_type: event.type || 'unknown' });
    }

    const session = event?.data?.object || {};
    if (session.payment_status !== 'paid') {
      return json(res, 200, { ok: true, ignored: true, reason: 'session_not_paid' });
    }

    const memberId = String(session?.metadata?.member_id || '').trim();
    const coinAmount = Number(session?.metadata?.coin_amount || 0);

    if (!memberId) {
      return json(res, 400, { ok: false, error: 'member_id_required' });
    }

    if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
      return json(res, 400, { ok: false, error: 'coin_amount_invalid' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return json(res, 500, { ok: false, error: 'server_env_missing' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: readError } = await admin
      .from('member_profiles')
      .select('coin_balance')
      .eq('member_id', memberId)
      .maybeSingle();

    if (readError) {
      return json(res, 500, { ok: false, error: `profile_read_failed:${readError.message}` });
    }

    const currentBalance = Number(profile?.coin_balance || 0);
    const nextBalance = currentBalance + coinAmount;

    const { error: writeError } = await admin
      .from('member_profiles')
      .upsert({ member_id: memberId, coin_balance: nextBalance }, { onConflict: 'member_id' });

    if (writeError) {
      return json(res, 500, { ok: false, error: `profile_update_failed:${writeError.message}` });
    }

    return json(res, 200, {
      ok: true,
      coins_added: coinAmount,
      coin_balance: nextBalance,
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error?.message || 'unexpected_error',
    });
  }
}
