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
    const {
      licenseKey,
      deviceFingerprint,
      partNumber,
      customerNumber,
      customerName,
      franchise,
      listPrice,
      optimizedPrice,
      cost,
      reimbursementRate,
      reimbAmount,
      marginAchieved,
      optimizationType
    } = body;

    if (!licenseKey || !deviceFingerprint || !partNumber || !listPrice || !cost) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'Required fields missing.' }, 400);
    }

    const isMockLicense = licenseKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(licenseKey);

    if (!isSupabaseConfigured || !supabase || isMockLicense) {
      return corsResponse({ success: true, message: 'Mock result saved.' });
    }

    // 1. Validate session
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('license_id', licenseKey)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (!session) {
      return corsResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    // 2. Retrieve user and dealer details
    const { data: license } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseKey)
      .single();

    if (!license) {
      return corsResponse({ error: 'INVALID_LICENSE' }, 404);
    }

    // 3. Save price result
    await supabase.from('price_results').insert({
      dealer_account_id: license.dealer_account_id,
      user_id: license.user_id,
      part_number: partNumber,
      customer_number: customerNumber || null,
      customer_name: customerName || null,
      franchise: franchise || null,
      original_price: Number(listPrice),
      optimized_price: Number(optimizedPrice),
      reimb_amount: Number(reimbAmount),
      cost: Number(cost),
      margin_achieved: Number(marginAchieved),
      optimization_type: optimizationType || 'optimize'
    });

    return corsResponse({ success: true });

  } catch (err: any) {
    console.error('Error saving result:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
