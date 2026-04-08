import { createClient } from '@supabase/supabase-js';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const incomingSecret = req.headers['x-webhook-secret'];
      if (!incomingSecret || incomingSecret !== configuredSecret) {
        return json(res, 401, { ok: false, error: 'unauthorized_webhook' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const memberId = String(payload.member_id || '').trim();
    const coinAmount = Number(payload.coin_amount || 0);

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
