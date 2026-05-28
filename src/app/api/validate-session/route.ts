import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function corsResponse(data: any, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey, deviceFingerprint } = body;

    if (!licenseKey || !deviceFingerprint) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'licenseKey and deviceFingerprint are required.' }, 400);
    }

    const isMockLicense = licenseKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(licenseKey);

    if (!isSupabaseConfigured || !supabase || isMockLicense) {
      // Mock mode fallback for local testing
      return corsResponse({
        success: true,
        message: 'Mock Mode: Supabase not configured or mock license key used',
        sessionId: 'mock-session-id',
        user: { email: 'parts1@hendrickauto.com', role: 'user' }
      });
    }

    // 1. Verify license key
    const { data: license, error: licError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseKey)
      .single();

    if (licError || !license) {
      return corsResponse({ error: 'INVALID_LICENSE', message: 'License key not found.' }, 404);
    }

    if (!license.user_id) {
      return corsResponse({ error: 'UNASSIGNED_LICENSE', message: 'License seat is vacant.' }, 400);
    }

    // 2. Fetch associated user and dealer status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', license.user_id)
      .single();

    if (userError || !user) {
      return corsResponse({ error: 'USER_NOT_FOUND', message: 'Assigned user not found.' }, 404);
    }

    const { data: dealer, error: dealerError } = await supabase
      .from('dealer_accounts')
      .select('*')
      .eq('id', license.dealer_account_id)
      .single();

    if (dealerError || !dealer) {
      return corsResponse({ error: 'DEALER_NOT_FOUND', message: 'Associated dealer account not found.' }, 404);
    }

    // Check dealer status
    if (dealer.status === 'suspended') {
      return corsResponse({ error: 'ACCOUNT_SUSPENDED', message: 'Dealer account is suspended.' }, 403);
    }
    if (dealer.status === 'expired') {
      return corsResponse({ error: 'ACCOUNT_EXPIRED', message: 'Dealer account has expired.' }, 403);
    }
    if (dealer.status === 'trial') {
      const trialEnd = new Date(dealer.trial_ends_at);
      if (trialEnd < new Date()) {
        return corsResponse({ error: 'TRIAL_EXPIRED', message: 'Dealer trial period has expired.' }, 403);
      }
    }

    // 3. Check for session conflict (one active device fingerprint per license key)
    const { data: existingSession, error: sessError } = await supabase
      .from('sessions')
      .select('*')
      .eq('license_id', licenseKey)
      .maybeSingle();

    if (existingSession && existingSession.device_fingerprint !== deviceFingerprint) {
      // Check if session was active within the last hour
      const lastSeen = new Date(existingSession.last_seen);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastSeen > oneHourAgo) {
        return corsResponse({ error: 'SESSION_CONFLICT', message: 'License is already active on another device.' }, 409);
      } else {
        // Abandoned session: delete it
        await supabase.from('sessions').delete().eq('id', existingSession.id);
      }
    }

    // 4. Create or update session
    const { data: session, error: upsertError } = await supabase
      .from('sessions')
      .upsert({
        license_id: licenseKey,
        device_fingerprint: deviceFingerprint,
        last_seen: new Date().toISOString()
      }, { onConflict: 'license_id' })
      .select()
      .single();

    if (upsertError || !session) {
      return corsResponse({ error: 'SESSION_ERROR', message: 'Failed to establish device session.' }, 500);
    }

    // 5. Log in extension_sessions
    await supabase.from('extension_sessions').insert({
      license_id: licenseKey,
      user_id: license.user_id,
      dealer_account_id: license.dealer_account_id
    });

    return corsResponse({
      success: true,
      sessionId: session.id,
      user: { email: user.email, role: user.role }
    });

  } catch (err: any) {
    console.error('Session validation error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
