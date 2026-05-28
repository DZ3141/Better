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
    const { email, password } = await request.json();

    if (!email || !password) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'Email and password are required.' }, 400);
    }

    if (!isSupabaseConfigured || !supabase) {
      // Mock fallback for local testing
      if (email.includes('admin') || email.includes('parts')) {
        return corsResponse({
          success: true,
          user: { id: 'mock-user-id', email, role: 'user', password_reset_required: false },
          licenseKey: 'mock-license-key',
          dealerAccount: { id: 'mock-dealer-id', name: 'Mock Dealer Auto Group' }
        });
      }
      return corsResponse({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' }, 401);
    }

    // 1. Sign in with password via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return corsResponse({ error: 'INVALID_CREDENTIALS', message: authError?.message || 'Invalid credentials.' }, 401);
    }

    const userId = authData.user.id;

    // 2. Fetch user profile from public.users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return corsResponse({ error: 'USER_NOT_FOUND', message: 'User profile not found in database.' }, 404);
    }

    // 3. Fetch dealer account
    const { data: dealer, error: dealerError } = await supabase
      .from('dealer_accounts')
      .select('*')
      .eq('id', userProfile.dealer_account_id)
      .single();

    // 4. Fetch assigned license for the user
    const { data: license, error: licError } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (licError || !license) {
      return corsResponse({ error: 'NO_LICENSE_ASSIGNED', message: 'No license seat is assigned to this user profile. Please contact your dealer administrator.' }, 403);
    }

    return corsResponse({
      success: true,
      user: {
        id: userId,
        email: userProfile.email,
        role: userProfile.role,
        password_reset_required: userProfile.password_reset_required
      },
      licenseKey: license.id,
      dealerAccount: dealer ? { id: dealer.id, name: dealer.name } : null
    });

  } catch (err: any) {
    console.error('API login error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
