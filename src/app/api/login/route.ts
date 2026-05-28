import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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

    // Use admin client if available to bypass RLS policies on the server side
    const client = supabaseAdmin || supabase;
    
    if (!supabaseAdmin) {
      console.warn('[LOGIN API] supabaseAdmin client is not initialized. Database queries might be restricted by RLS.');
    }

    // 1. Fetch user profile from public.users by email first (case-insensitive)
    const { data: userProfile, error: profileError } = await client
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('[LOGIN API] Error fetching user profile:', profileError);
      return corsResponse({ error: 'DB_ERROR', message: 'Failed to query user profile.' }, 500);
    }

    if (!userProfile) {
      return corsResponse({ error: 'USER_NOT_FOUND', message: 'No account found for this email address. Please contact your dealer administrator.' }, 404);
    }

    // 2. Determine if logging in with temporary passcode
    const isTempLogin = !!(userProfile.temp_password && userProfile.temp_password === password);
    let passwordResetRequired = false;

    if (isTempLogin) {
      // Temp login is valid! We skip standard Supabase Auth check
      passwordResetRequired = true;
      console.log(`[LOGIN API] Successful temporary login for user: ${email}`);
    } else {
      // 3. Standard login via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        console.warn(`[LOGIN API] Auth signInWithPassword failed for ${email}:`, authError?.message);
        return corsResponse({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }, 401);
      }

      passwordResetRequired = userProfile.password_reset_required || false;
      console.log(`[LOGIN API] Successful auth login for user: ${email}`);
    }

    // 4. Fetch associated dealer account
    const dealerId = userProfile.dealer_account_id;
    if (!dealerId) {
      return corsResponse({ error: 'DEALER_NOT_ASSIGNED', message: 'No dealer account is assigned to this user profile. Please contact support.' }, 403);
    }

    const isMockDealer = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealerId);
    let dealer = null;

    if (!isMockDealer) {
      const { data: dealerData, error: dealerError } = await client
        .from('dealer_accounts')
        .select('*')
        .eq('id', dealerId)
        .maybeSingle();

      if (dealerError) {
        console.error('[LOGIN API] Error fetching dealer account:', dealerError);
        return corsResponse({ error: 'DB_ERROR', message: 'Failed to query dealer account.' }, 500);
      }
      dealer = dealerData;
    } else {
      dealer = { id: dealerId, name: 'Hendrick Automotive Group' };
    }

    if (!dealer) {
      return corsResponse({ error: 'DEALER_NOT_FOUND', message: 'Your assigned dealer account could not be found.' }, 404);
    }

    // 5. Fetch assigned license for the user
    const userId = userProfile.id;
    const isMockUser = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    let license = null;

    if (!isMockUser) {
      const { data: licenseData, error: licenseError } = await client
        .from('licenses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (licenseError) {
        console.error('[LOGIN API] Error fetching license:', licenseError);
        return corsResponse({ error: 'DB_ERROR', message: 'Failed to query user license seat.' }, 500);
      }
      license = licenseData;
    } else {
      license = { id: `lic-mock-${userId}`, dealer_account_id: dealerId, user_id: userId };
    }

    if (!license) {
      return corsResponse({ error: 'NO_LICENSE_ASSIGNED', message: 'No license seat is assigned to this user profile. Please contact your dealer administrator.' }, 403);
    }

    return corsResponse({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        password_reset_required: passwordResetRequired
      },
      licenseKey: license.id,
      dealerAccount: { id: dealer.id, name: dealer.name }
    });

  } catch (err: any) {
    console.error('API login error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
