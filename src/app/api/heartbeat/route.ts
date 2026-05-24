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

    if (!isSupabaseConfigured || !supabase) {
      return corsResponse({ success: true, message: 'Mock Mode heartbeat success' });
    }

    // Update last_seen on session matching licenseKey and deviceFingerprint
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('license_id', licenseKey)
      .eq('device_fingerprint', deviceFingerprint)
      .select()
      .maybeSingle();

    if (updateError || !updatedSession) {
      return corsResponse({ error: 'NO_SESSION', message: 'No active session found matching license and device.' }, 401);
    }

    return corsResponse({ success: true });
  } catch (err: any) {
    console.error('Heartbeat error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
